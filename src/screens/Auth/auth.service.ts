import { callAppsScript, getAppsScriptEndpoint } from '../../services/appsScriptClient';
import { getFirebaseApp } from '../../services/firebase';
import { isFirebaseAuthEnabled, refreshFirebaseSession, signInWithFirebaseEmailPassword } from '../../services/firebaseAuth';

export type SoyibaUser = {
  id: string;
  email: string;
  name: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  cc?: string;
  ccHash?: string;
  ccLast4?: string;
  miembroValidadoAt?: string;
  miembroValidadoPor?: string;
  miembroValidacionEstado?: string;
  miembroValidacionNotas?: string;
  tiempoIba?: string;
  photoUrl?: string;
  tipoUsuario?: 'Asistente' | 'Miembro' | string;
  tituloUsuario?: string;
  rolSistema?: 'Admin' | 'Moderador' | 'Usuario' | 'Pruebas' | string;
  estadoUsuario?: string;
  status?: string;
  publicador?: boolean;
  publicadorEco?: boolean;
  publicadorEvento?: boolean;
  minorValidator?: boolean;
  verificado?: boolean;
  active?: boolean;
  aceptoPoliticaDatos?: boolean;
  fechaAceptacionPolitica?: string;
  politicaDatosVersion?: string;
  autorizacionTratamientoDatos?: boolean;
  fechaNacimiento?: string;
  registroMenorEdad?: boolean;
  autorizacionAcudiente?: boolean;
  guardianName?: string;
  guardianEmail?: string;
  guardianPhone?: string;
  minorValidationStatus?: string;
  minorValidationRequestId?: string;
  visibleDirectorio?: boolean;
  mostrarTelefono?: boolean;
  permitirWhatsapp?: boolean;
  mostrarFoto?: boolean;
};

export type SoyibaSession = {
  token: string;
  user: SoyibaUser;
};

export type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  fechaNacimiento: string;
  ageGroup: 'adult' | 'minor';
  guardianConsent: boolean;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
};

export type UpdateProfilePayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tiempoIba: string;
  visibleDirectorio: boolean;
  mostrarTelefono: boolean;
  permitirWhatsapp: boolean;
  mostrarFoto: boolean;
};

type BasicAuthResponse = {
  ok: boolean;
  error?: string;
  message?: string;
};

type AuthResponse = {
  ok: boolean;
  token?: string;
  user?: SoyibaUser;
  message?: string;
  error?: string;
  pending?: boolean;
  requestId?: string;
};

const AUTH_LOGIN_RETRY_DELAYS_MS: number[] = [];
const AUTH_LOGIN_TIMEOUT_MS = 15000;
const AUTH_LOGIN_TRANSIENT_ERROR =
  'No fue posible iniciar sesión. Intenta nuevamente.';
const PRIVACY_POLICY_VERSION = '2026-08-24';

type AuthResult =
  | { ok: true; session: SoyibaSession }
  | { ok: false; error: string; pending?: boolean; message?: string };

export type BasicAuthResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export type VerifyMembershipResult =
  | { ok: true; session: SoyibaSession; message: string }
  | { ok: false; error: string };

export function warmUpAuthService() {
  return callAppsScript<BasicAuthResponse>(
    'Auth',
    'health',
    {},
    () => ({ ok: true }),
    { timeoutMs: 7000 },
  ).catch(() => undefined);
}

export async function signInWithEmailPassword(email: string, password: string): Promise<AuthResult> {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return { ok: false, error: 'Ingresa correo y contraseña.' };
  }

  if (isFirebaseAuthEnabled()) {
    try {
      const session = await signInWithFirebaseEmailPassword(normalizedEmail, password);

      if (!isUserAllowedToSignIn(session.user)) {
        const pendingMessage = getPendingMinorSignInMessage(session.user);
        await signOutCurrentFirebaseUser().catch(() => undefined);

        if (pendingMessage) {
          return { ok: false, pending: true, message: pendingMessage, error: pendingMessage };
        }

        return { ok: false, error: getInactiveUserMessage(session.user) };
      }

      return { ok: true, session };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Correo o contrasena invalidos.' };
    }
  }

  let response: AuthResponse;

  try {
    response = await callLoginWithRetry(normalizedEmail, password);
  } catch (error) {
    if (isTransientAppsScriptError(error)) {
      return { ok: false, error: AUTH_LOGIN_TRANSIENT_ERROR };
    }

    throw error;
  }

  const result = normalizeAuthResponse(response, 'No fue posible iniciar sesión.');

  if (result.ok) {
    recordLoginInBackground(result.session);
  }

  return result;
}

async function signOutCurrentFirebaseUser() {
  const app = getFirebaseApp();

  if (!app) {
    return;
  }

  const { getAuth, signOut } = await import('firebase/auth');
  await signOut(getAuth(app));
}

function recordLoginInBackground(session: SoyibaSession) {
  callAppsScript<BasicAuthResponse>(
    'Auth',
    'recordLogin',
    {
      token: session.token,
      userId: session.user.id,
      email: session.user.email,
    },
    () => ({ ok: true }),
    { timeoutMs: 6000 },
  ).catch(() => undefined);
}
async function callLoginWithRetry(email: string, password: string) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= AUTH_LOGIN_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await callAppsScript<AuthResponse>(
        'Auth',
        'login',
        { email, password },
        () => ({
          ok: true,
          token: 'local-dev-token',
          user: {
            id: 'local-user',
            email,
            name: email.split('@')[0] || 'Usuario',
            role: 'local',
            tipoUsuario: 'Asistente',
            tituloUsuario: 'Asistente',
            rolSistema: 'Usuario',
            estadoUsuario: 'Activo',
            publicador: false,
            publicadorEco: false,
            publicadorEvento: false,
            minorValidator: false,
            verificado: false,
            active: true,
          },
        }),
        { timeoutMs: AUTH_LOGIN_TIMEOUT_MS },
      );
    } catch (error) {
      lastError = error;

      if (!isTransientAppsScriptError(error)) {
        break;
      }

      const retryDelay = AUTH_LOGIN_RETRY_DELAYS_MS[attempt];

      if (retryDelay === undefined) {
        break;
      }

      await wait(retryDelay);
    }
  }

  throw lastError;
}

export async function registerWithEmailPassword(payload: RegisterPayload): Promise<AuthResult> {
  const firstName = normalizeText(payload.firstName);
  const lastName = normalizeText(payload.lastName);
  const phone = normalizeText(payload.phone);
  const normalizedEmail = normalizeEmail(payload.email);
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim();
  const birthDate = normalizeBirthDate(payload.fechaNacimiento);
  const ageInfo = getBirthDateAgeInfo(birthDate);
  const guardianName = normalizeText(payload.guardianName);
  const guardianEmail = normalizeEmail(payload.guardianEmail);
  const guardianPhone = normalizeText(payload.guardianPhone);

  if (!firstName || !lastName || !normalizedEmail || !phone || !payload.password) {
    return { ok: false, error: 'Completa todos los campos para crear tu cuenta.' };
  }

  if (!ageInfo.ok) {
    return { ok: false, error: ageInfo.error };
  }

  const isMinor = ageInfo.age < 18;
  const ageGroup = isMinor ? 'minor' : 'adult';

  if (isMinor && !payload.guardianConsent) {
    return { ok: false, error: 'Para menores de edad se requiere autorización del representante legal.' };
  }

  if (isMinor && (!guardianName || !guardianEmail || !guardianPhone)) {
    return { ok: false, error: 'Para menores de edad ingresa nombre, correo y celular del representante legal.' };
  }

  if (isMinor && guardianEmail === normalizedEmail) {
    return { ok: false, error: 'El correo del representante legal debe ser diferente al correo de la cuenta del menor.' };
  }

  if (isFirebaseAuthEnabled()) {
    return registerWithFirebaseEmailPassword({
      firstName,
      lastName,
      email: normalizedEmail,
      phone,
      password: payload.password,
      fechaNacimiento: birthDate,
      ageGroup,
      guardianConsent: isMinor ? payload.guardianConsent : false,
      guardianName: isMinor ? guardianName : '',
      guardianEmail: isMinor ? guardianEmail : '',
      guardianPhone: isMinor ? guardianPhone : '',
    });
  }

  const response = await callAppsScript<AuthResponse>(
    'Auth',
    'register',
    {
      firstName,
      lastName,
      phone,
      email: normalizedEmail,
      password: payload.password,
      displayName,
      role: 'Usuario',
      tipoUsuario: 'Asistente',
      tituloUsuario: 'Asistente',
      rolSistema: 'Usuario',
      estadoUsuario: 'Activo',
      aceptoPoliticaDatos: true,
      politicaDatosVersion: PRIVACY_POLICY_VERSION,
      autorizacionTratamientoDatos: true,
      fechaNacimiento: birthDate,
      registroMenorEdad: isMinor,
      autorizacionAcudiente: isMinor ? payload.guardianConsent : false,
      guardianName: isMinor ? guardianName : '',
      guardianEmail: isMinor ? guardianEmail : '',
      guardianPhone: isMinor ? guardianPhone : '',
      appUrl: getAppBaseUrl(),
      visibleDirectorio: true,
      mostrarTelefono: false,
      permitirWhatsapp: false,
      mostrarFoto: true,
      verificado: false,
    },
    () => ({
      ok: true,
      token: 'local-dev-register-token',
      user: {
        id: 'local-user',
        email: normalizedEmail,
        name: displayName || firstName,
        firstName,
        lastName,
        phone,
        role: 'local',
        tipoUsuario: 'Asistente',
        tituloUsuario: 'Asistente',
        rolSistema: 'Usuario',
        estadoUsuario: 'Activo',
        publicador: false,
        publicadorEco: false,
        publicadorEvento: false,
        minorValidator: false,
        verificado: false,
        aceptoPoliticaDatos: true,
        fechaAceptacionPolitica: new Date().toISOString(),
        politicaDatosVersion: PRIVACY_POLICY_VERSION,
        autorizacionTratamientoDatos: true,
        fechaNacimiento: birthDate,
        registroMenorEdad: isMinor,
        autorizacionAcudiente: isMinor ? payload.guardianConsent : false,
        visibleDirectorio: true,
        mostrarTelefono: false,
        permitirWhatsapp: false,
        mostrarFoto: true,
        active: true,
      },
    }),
  );

  if (!response.ok && response.pending) {
    return {
      ok: false,
      pending: true,
      message: response.message || 'Registro recibido. Enviamos un correo al representante legal para continuar la validación.',
      error: response.message || 'Registro pendiente de validación.',
    };
  }

  return normalizeAuthResponse(response, 'No fue posible crear la cuenta.');
}

async function registerWithFirebaseEmailPassword(payload: RegisterPayload): Promise<AuthResult> {
  const app = getFirebaseApp();
  let registerStage = 'firebase-auth';
  let createdUserId = '';
  let createdMinorValidationRequestId = '';
  let createdUserProfile = false;
  let createdMinorValidationRequest = false;

  if (!app) {
    return { ok: false, error: 'Firebase no esta configurado.' };
  }

  try {
    const [{ createUserWithEmailAndPassword, getAuth, signOut, updateProfile }, { doc, getFirestore, serverTimestamp, setDoc }] = await Promise.all([
      import('firebase/auth'),
      import('firebase/firestore'),
    ]);
    const auth = getAuth(app);
    const credential = await createUserWithEmailAndPassword(auth, payload.email, payload.password);
    createdUserId = credential.user.uid;
    const displayName = [payload.firstName, payload.lastName].filter(Boolean).join(' ').trim();
    const now = new Date().toISOString();
    const isMinor = payload.ageGroup === 'minor';
    const requestId = isMinor ? createRequestId() : '';
    const minorStatus = isMinor ? 'guardian_pending' : 'not_required';
    const user: SoyibaUser = {
      id: credential.user.uid,
      email: payload.email,
      name: displayName || payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone,
      role: 'Usuario',
      rolSistema: 'Usuario',
      tipoUsuario: 'Asistente',
      tituloUsuario: 'Asistente',
      estadoUsuario: isMinor ? 'Pendiente representante' : 'Activo',
      publicador: false,
      publicadorEco: false,
      publicadorEvento: false,
      minorValidator: false,
      verificado: false,
      aceptoPoliticaDatos: true,
      fechaAceptacionPolitica: now,
      politicaDatosVersion: PRIVACY_POLICY_VERSION,
      autorizacionTratamientoDatos: true,
      fechaNacimiento: payload.fechaNacimiento,
      registroMenorEdad: isMinor,
      autorizacionAcudiente: isMinor ? payload.guardianConsent : false,
      guardianName: isMinor ? payload.guardianName : '',
      guardianEmail: isMinor ? payload.guardianEmail : '',
      guardianPhone: isMinor ? payload.guardianPhone : '',
      minorValidationStatus: minorStatus,
      minorValidationRequestId: requestId,
      visibleDirectorio: true,
      mostrarTelefono: false,
      permitirWhatsapp: false,
      mostrarFoto: true,
      active: !isMinor,
    };
    const db = getFirestore(app, getFirebaseAuthDatabaseId());

    await updateProfile(credential.user, { displayName });
    registerStage = 'user-profile';
    await setDoc(doc(db, 'users', credential.user.uid), {
      ...user,
      emailHash: await sha256Hex(payload.email),
      status: isMinor ? 'minor_pending_guardian' : 'active',
      aceptoPoliticaDatos: true,
      fechaAceptacionPolitica: now,
      politicaDatosVersion: PRIVACY_POLICY_VERSION,
      autorizacionTratamientoDatos: true,
      tratamientoDatosAutorizadoAt: now,
      fechaNacimiento: payload.fechaNacimiento,
      registroMenorEdad: isMinor,
      autorizacionAcudiente: isMinor ? payload.guardianConsent : false,
      guardianName: isMinor ? payload.guardianName : '',
      guardianEmail: isMinor ? payload.guardianEmail : '',
      guardianPhone: isMinor ? payload.guardianPhone : '',
      minorValidationStatus: minorStatus,
      minorValidationRequestId: requestId,
      visibleDirectorio: true,
      mostrarTelefono: false,
      permitirWhatsapp: false,
      mostrarFoto: true,
      createdAt: now,
      updatedAt: now,
      createdAtServer: serverTimestamp(),
      updatedAtServer: serverTimestamp(),
      migratedFrom: 'firebase-register',
    });
    createdUserProfile = true;

    if (isMinor) {
      registerStage = 'minor-validation-request';
      await setDoc(doc(db, 'minorValidationRequests', requestId), {
        id: requestId,
        userId: credential.user.uid,
        userEmail: payload.email,
        userName: displayName || payload.email,
        userPhone: payload.phone,
        fechaNacimiento: payload.fechaNacimiento,
        guardianName: payload.guardianName,
        guardianEmail: payload.guardianEmail,
        guardianPhone: payload.guardianPhone,
        status: 'guardian_pending',
        createdAt: now,
        updatedAt: now,
        createdAtServer: serverTimestamp(),
        updatedAtServer: serverTimestamp(),
      });
      createdMinorValidationRequestId = requestId;
      createdMinorValidationRequest = true;

      registerStage = 'guardian-email';
      await requestGuardianApprovalEmail({
        requestId,
        userId: credential.user.uid,
        userName: displayName || payload.email,
        userEmail: payload.email,
        userPhone: payload.phone,
        fechaNacimiento: payload.fechaNacimiento,
        guardianName: payload.guardianName,
        guardianEmail: payload.guardianEmail,
        guardianPhone: payload.guardianPhone,
      });
      registerStage = 'sign-out';
      await signOut(auth);

      return {
        ok: false,
        pending: true,
        message: 'Registro recibido. Enviamos un correo al representante legal; cuando apruebe, IBA revisará y activará la cuenta.',
        error: 'Registro pendiente de validación.',
      };
    }

    return {
      ok: true,
      session: {
        token: await credential.user.getIdToken(true),
        user,
      },
    };
  } catch (error) {
    await cleanupCreatedFirebaseRegisterDocs({
      userId: createdUserId,
      requestId: createdMinorValidationRequestId,
      createdUserProfile,
      createdMinorValidationRequest,
    }).catch(() => undefined);
    await cleanupCurrentFirebaseRegisterUser().catch(() => undefined);

    if (error instanceof Error && /permission-denied|missing or insufficient permissions/i.test(error.message)) {
      return { ok: false, error: getFirebaseRegisterPermissionError(registerStage) };
    }

    return { ok: false, error: getFirebaseRegisterError(error) };
  }
}

async function cleanupCreatedFirebaseRegisterDocs({
  userId,
  requestId,
  createdUserProfile,
  createdMinorValidationRequest,
}: {
  userId: string;
  requestId: string;
  createdUserProfile: boolean;
  createdMinorValidationRequest: boolean;
}) {
  const app = getFirebaseApp();

  if (!app || !userId) {
    return;
  }

  const { deleteDoc, doc, getFirestore } = await import('firebase/firestore');
  const db = getFirestore(app, getFirebaseAuthDatabaseId());
  const deletions: Array<Promise<void>> = [];

  if (createdMinorValidationRequest && requestId) {
    deletions.push(deleteDoc(doc(db, 'minorValidationRequests', requestId)));
  }

  if (createdUserProfile) {
    deletions.push(deleteDoc(doc(db, 'users', userId)));
  }

  await Promise.allSettled(deletions);
}

async function cleanupCurrentFirebaseRegisterUser() {
  const app = getFirebaseApp();

  if (!app) {
    return;
  }

  const { deleteUser, getAuth } = await import('firebase/auth');
  const user = getAuth(app).currentUser;

  if (user) {
    await deleteUser(user);
  }
}

type GuardianApprovalEmailPayload = {
  requestId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  fechaNacimiento: string;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
};

async function requestGuardianApprovalEmail(payload: GuardianApprovalEmailPayload) {
  const response = await callAppsScript<{ ok: boolean; error?: string }>(
    'Auth',
    'createMinorValidationRequest',
    {
      ...payload,
      appUrl: getAppBaseUrl(),
      approvalBaseUrl: getAppsScriptEndpoint('Auth'),
    },
    () => ({ ok: true }),
    { timeoutMs: 16000 },
  );

  if (!response.ok) {
    throw new Error(response.error || 'No fue posible enviar el correo al representante legal.');
  }
}

export async function updateUserProfile(session: SoyibaSession, payload: UpdateProfilePayload): Promise<AuthResult> {
  const firstName = normalizeText(payload.firstName);
  const lastName = normalizeText(payload.lastName);
  const phone = normalizeText(payload.phone);
  const tiempoIba = normalizeText(payload.tiempoIba);
  const normalizedEmail = normalizeEmail(session.user.email);
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim();

  if (!firstName || !lastName || !normalizedEmail || !phone) {
    return { ok: false, error: 'Nombre, apellido y celular son requeridos.' };
  }

  if (isFirebaseAuthEnabled()) {
    return updateUserProfileWithFirebase(session, {
      firstName,
      lastName,
      email: normalizedEmail,
      phone,
      tiempoIba,
      visibleDirectorio: Boolean(payload.visibleDirectorio),
      mostrarTelefono: Boolean(payload.mostrarTelefono),
      permitirWhatsapp: Boolean(payload.permitirWhatsapp),
      mostrarFoto: Boolean(payload.mostrarFoto),
    });
  }

  const response = await callAppsScript<AuthResponse>(
    'Auth',
    'updateProfile',
    {
      token: session.token,
      userId: session.user.id,
      currentEmail: session.user.email,
      firstName,
      lastName,
      phone,
      tiempoIba,
      displayName,
      visibleDirectorio: Boolean(payload.visibleDirectorio),
      mostrarTelefono: Boolean(payload.mostrarTelefono),
      permitirWhatsapp: Boolean(payload.permitirWhatsapp),
      mostrarFoto: Boolean(payload.mostrarFoto),
    },
    () => ({
      ok: true,
      token: session.token,
      user: {
        ...session.user,
        email: session.user.email,
        name: displayName,
        firstName,
        lastName,
        phone,
        tiempoIba,
        visibleDirectorio: Boolean(payload.visibleDirectorio),
        mostrarTelefono: Boolean(payload.mostrarTelefono),
        permitirWhatsapp: Boolean(payload.permitirWhatsapp),
        mostrarFoto: Boolean(payload.mostrarFoto),
      },
    }),
  );

  return preserveLocalOnlyUserFields(normalizeAuthResponse(response, 'No fue posible actualizar el perfil.'), session);
}

export async function updateUserPhoto(session: SoyibaSession, photoUrl: string): Promise<AuthResult> {
  const normalizedPhotoUrl = normalizeText(photoUrl);

  if (!normalizedPhotoUrl) {
    return { ok: false, error: 'Foto invalida.' };
  }

  if (isFirebaseAuthEnabled()) {
    return updateUserPhotoWithFirebase(session, normalizedPhotoUrl);
  }

  const response = await callAppsScript<AuthResponse>(
    'Auth',
    'updateProfilePhoto',
    {
      token: session.token,
      userId: session.user.id,
      email: session.user.email,
      photoUrl: normalizedPhotoUrl,
    },
    () => ({
      ok: true,
      token: session.token,
      user: {
        ...session.user,
        photoUrl: normalizedPhotoUrl,
      },
    }),
  );

  return preserveLocalOnlyUserFields(normalizeAuthResponse(response, 'No fue posible actualizar la foto.'), session);
}

async function updateUserProfileWithFirebase(session: SoyibaSession, payload: UpdateProfilePayload): Promise<AuthResult> {
  const app = getFirebaseApp();

  if (!app) {
    return { ok: false, error: 'Firebase no esta configurado.' };
  }

  try {
    const [{ getAuth, onAuthStateChanged, updateProfile }, { doc, getFirestore, serverTimestamp, setDoc }] = await Promise.all([
      import('firebase/auth'),
      import('firebase/firestore'),
    ]);
    const auth = getAuth(app);
    const firebaseUser = auth.currentUser || (await waitForFirebaseUser(auth, onAuthStateChanged));

    if (!firebaseUser || firebaseUser.uid !== session.user.id) {
      return { ok: false, error: 'No encontramos tu sesion de Firebase para actualizar el perfil.' };
    }

    const displayName = [payload.firstName, payload.lastName].filter(Boolean).join(' ').trim();
    const updatedAt = new Date().toISOString();

    const nextUser: SoyibaUser = {
      ...session.user,
      name: displayName,
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone,
      tiempoIba: payload.tiempoIba,
      visibleDirectorio: Boolean(payload.visibleDirectorio),
      mostrarTelefono: Boolean(payload.mostrarTelefono),
      permitirWhatsapp: Boolean(payload.permitirWhatsapp),
      mostrarFoto: Boolean(payload.mostrarFoto),
    };

    await Promise.all([
      updateProfile(firebaseUser, { displayName }),
      setDoc(
        doc(getFirestore(app, getFirebaseAuthDatabaseId()), 'users', session.user.id),
        {
          name: displayName,
          firstName: payload.firstName,
          lastName: payload.lastName,
          phone: payload.phone,
          tiempoIba: payload.tiempoIba,
          visibleDirectorio: Boolean(payload.visibleDirectorio),
          mostrarTelefono: Boolean(payload.mostrarTelefono),
          permitirWhatsapp: Boolean(payload.permitirWhatsapp),
          mostrarFoto: Boolean(payload.mostrarFoto),
          updatedAt,
          updatedAtServer: serverTimestamp(),
        },
        { merge: true },
      ),
    ]);
    await syncFirebaseMemberDirectoryDoc(app, nextUser);

    return {
      ok: true,
      session: {
        token: await firebaseUser.getIdToken(true),
        user: nextUser,
      },
    };
  } catch {
    return { ok: false, error: 'No fue posible actualizar el perfil en Firebase. Revisa las reglas de Firestore.' };
  }
}

async function updateUserPhotoWithFirebase(session: SoyibaSession, photoValue: string): Promise<AuthResult> {
  const app = getFirebaseApp();

  if (!app) {
    return { ok: false, error: 'Firebase no esta configurado.' };
  }

  try {
    const [{ getAuth, onAuthStateChanged, updateProfile }, { doc, getFirestore, serverTimestamp, setDoc }, { getDownloadURL, getStorage, ref, uploadBytes }] =
      await Promise.all([import('firebase/auth'), import('firebase/firestore'), import('firebase/storage')]);
    const auth = getAuth(app);
    const firebaseUser = auth.currentUser || (await waitForFirebaseUser(auth, onAuthStateChanged));

    if (!firebaseUser || firebaseUser.uid !== session.user.id) {
      return { ok: false, error: 'No encontramos tu sesion de Firebase para actualizar la foto.' };
    }

    const upload = dataUrlToProfilePhotoUpload(photoValue, session.user.id);
    const storageRef = ref(getStorage(app), upload.path);
    await uploadBytes(storageRef, upload.blob, {
      contentType: upload.contentType,
      customMetadata: {
        ownerUid: firebaseUser.uid,
        soyibaUserId: session.user.id,
        soyibaUserEmail: session.user.email,
      },
    });
    const nextPhotoUrl = await getDownloadURL(storageRef);
    const updatedAt = new Date().toISOString();

    await Promise.all([
      updateProfile(firebaseUser, { photoURL: nextPhotoUrl }),
      setDoc(
        doc(getFirestore(app, getFirebaseAuthDatabaseId()), 'users', session.user.id),
        {
          photoUrl: nextPhotoUrl,
          updatedAt,
          updatedAtServer: serverTimestamp(),
        },
        { merge: true },
      ),
    ]);

    await syncFirebaseMemberDirectoryDoc(app, {
      ...session.user,
      photoUrl: nextPhotoUrl,
    });

    return {
      ok: true,
      session: {
        token: session.token,
        user: {
          ...session.user,
          photoUrl: nextPhotoUrl,
        },
      },
    };
  } catch {
    return { ok: false, error: 'No fue posible actualizar la foto en Firebase.' };
  }
}

export async function updateUserPassword(session: SoyibaSession, currentPassword: string, newPassword: string): Promise<AuthResult> {
  if (!currentPassword || !newPassword) {
    return { ok: false, error: 'Ingresa la contraseña actual y la nueva contraseña.' };
  }

  if (isFirebaseAuthEnabled()) {
    return updateUserPasswordWithFirebase(session, currentPassword, newPassword);
  }

  const response = await callAppsScript<AuthResponse>(
    'Auth',
    'changePassword',
    {
      token: session.token,
      userId: session.user.id,
      email: session.user.email,
      currentPassword,
      newPassword,
    },
    () => ({
      ok: true,
      token: session.token,
      user: session.user,
    }),
  );

  return preserveLocalOnlyUserFields(normalizeAuthResponse(response, 'No fue posible actualizar la contraseña.'), session);
}

async function updateUserPasswordWithFirebase(session: SoyibaSession, currentPassword: string, newPassword: string): Promise<AuthResult> {
  const app = getFirebaseApp();

  if (!app) {
    return { ok: false, error: 'Firebase no esta configurado.' };
  }

  try {
    const { EmailAuthProvider, getAuth, onAuthStateChanged, reauthenticateWithCredential, updatePassword } = await import('firebase/auth');
    const auth = getAuth(app);
    const firebaseUser = auth.currentUser || (await waitForFirebaseUser(auth, onAuthStateChanged));

    if (!firebaseUser || firebaseUser.uid !== session.user.id || !firebaseUser.email) {
      return { ok: false, error: 'No encontramos tu sesion de Firebase para actualizar la contrasena.' };
    }

    await reauthenticateWithCredential(firebaseUser, EmailAuthProvider.credential(firebaseUser.email, currentPassword));
    await updatePassword(firebaseUser, newPassword);

    return {
      ok: true,
      session: {
        token: await firebaseUser.getIdToken(true),
        user: session.user,
      },
    };
  } catch (error) {
    return { ok: false, error: getFirebasePasswordError(error, 'No fue posible actualizar la contrasena en Firebase.') };
  }
}

export async function refreshCurrentSession(session: SoyibaSession): Promise<AuthResult> {
  if (!session.user.email && !session.user.id) {
    return { ok: false, error: 'No hay usuario para actualizar la sesión.' };
  }

  if (isFirebaseAuthEnabled()) {
    return { ok: true, session: await refreshFirebaseSession(session) };
  }

  const response = await callAppsScript<AuthResponse>(
    'Auth',
    'getCurrentUser',
    {
      token: session.token,
      userId: session.user.id,
      email: session.user.email,
    },
  );

  return preserveLocalOnlyUserFields(normalizeAuthResponse(response, 'No fue posible actualizar la sesión.'), session);
}

export async function verifyMembershipByCc(session: SoyibaSession, cc: string): Promise<VerifyMembershipResult> {
  const normalizedCc = normalizeCc(cc);

  if (!normalizedCc) {
    return { ok: false, error: 'Ingresa tu CC sin puntos ni comas.' };
  }

  if (isFirebaseAuthEnabled()) {
    return verifyMembershipByCcWithFirebase(session, normalizedCc);
  }

  const response = await callAppsScript<AuthResponse>(
    'Auth',
    'verifyMembershipByCc',
    {
      token: session.token,
      userId: session.user.id,
      email: session.user.email,
      cc: normalizedCc,
    },
  );

  const result = preserveLocalOnlyUserFields(normalizeAuthResponse(response, 'No fue posible validar tu CC.'), session);

  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    session: result.session,
    message: response.message || 'Tu CC fue validada. Ahora eres miembro SOY IBA.',
  };
}

async function verifyMembershipByCcWithFirebase(session: SoyibaSession, normalizedCc: string): Promise<VerifyMembershipResult> {
  const app = getFirebaseApp();

  if (!app) {
    return { ok: false, error: 'Firebase no esta configurado.' };
  }

  try {
    const { doc, getFirestore, runTransaction, serverTimestamp } = await import('firebase/firestore');
    const db = getFirestore(app, getFirebaseAuthDatabaseId());
    const ccHash = await sha256Hex(normalizedCc);
    const emailHash = await sha256Hex(normalizeEmail(session.user.email));
    const registryRef = doc(db, 'memberRegistry', ccHash);
    const userRef = doc(db, 'users', session.user.id);
    const updatedAt = new Date().toISOString();

    const result = await runTransaction(db, async (transaction) => {
      const registrySnapshot = await transaction.get(registryRef);

      if (!registrySnapshot.exists()) {
        return { ok: false as const, error: 'No encontramos esa CC en el listado de miembros IBA.' };
      }

      const registry = registrySnapshot.data() as {
        active?: unknown;
        estado?: unknown;
        emailHash?: unknown;
        claimedUserId?: unknown;
      };

      if (!toBoolean(registry.active) || normalizePlainText(registry.estado || 'Activo') === 'inactivo') {
        return { ok: false as const, error: 'Tu registro existe en MiembrosIBA, pero aparece inactivo.' };
      }

      const claimedUserId = normalizeText(registry.claimedUserId);

      if (claimedUserId && claimedUserId !== session.user.id) {
        return { ok: false as const, error: 'Esta CC ya fue reclamada por otra cuenta.' };
      }

      const emailMatches = normalizeText(registry.emailHash) && normalizeText(registry.emailHash) === emailHash;
      const claimStatus = emailMatches ? 'validado' : 'pendiente_revision';
      const claimNotes = emailMatches
        ? 'Validado automaticamente por correo coincidente.'
        : 'El correo del registro de MiembrosIBA no coincide con el correo de la cuenta o no esta definido.';

      transaction.set(
        registryRef,
        {
          claimedUserId: session.user.id,
          claimedEmailHash: emailHash,
          claimedAt: updatedAt,
          claimStatus,
          claimNotes,
          updatedAt,
          updatedAtServer: serverTimestamp(),
        },
        { merge: true },
      );

      const baseUserPatch = {
        ccHash,
        ccLast4: normalizedCc.slice(-4),
        miembroValidadoAt: emailMatches ? updatedAt : '',
        miembroValidadoPor: emailMatches ? 'memberRegistry.emailHash' : '',
        miembroValidacionEstado: claimStatus,
        miembroValidacionNotas: emailMatches ? '' : claimNotes,
        updatedAt,
        updatedAtServer: serverTimestamp(),
      };

      transaction.set(
        userRef,
        emailMatches
          ? {
              ...baseUserPatch,
              role: 'Miembro',
              tipoUsuario: 'Miembro',
              tituloUsuario: 'Miembro',
              rolSistema: 'Miembro',
              estadoUsuario: 'Activo',
              status: 'active',
              active: true,
              visibleDirectorio: Boolean(session.user.visibleDirectorio),
            }
          : baseUserPatch,
        { merge: true },
      );

      return {
        ok: true as const,
        emailMatches,
        claimStatus,
        claimNotes,
      };
    });

    if (!result.ok) {
      return result;
    }

    const nextUser: SoyibaUser = result.emailMatches
      ? {
          ...session.user,
          cc: normalizedCc,
          ccHash,
          ccLast4: normalizedCc.slice(-4),
          role: 'Miembro',
          tipoUsuario: 'Miembro',
          tituloUsuario: 'Miembro',
          rolSistema: 'Miembro',
          estadoUsuario: 'Activo',
          active: true,
          miembroValidadoAt: updatedAt,
          miembroValidadoPor: 'memberRegistry.emailHash',
          miembroValidacionEstado: 'validado',
          miembroValidacionNotas: '',
        }
      : {
          ...session.user,
          cc: normalizedCc,
          ccHash,
          ccLast4: normalizedCc.slice(-4),
          miembroValidadoAt: '',
          miembroValidadoPor: '',
          miembroValidacionEstado: result.claimStatus,
          miembroValidacionNotas: result.claimNotes,
        };

    await syncFirebaseMemberDirectoryDoc(app, nextUser);

    return {
      ok: true,
      session: {
        token: session.token,
        user: nextUser,
      },
      message: result.emailMatches
        ? 'Tu CC fue validada. Ahora eres miembro SOY IBA.'
        : 'Recibimos tu solicitud de membresia. Queda pendiente de revision por un administrador.',
    };
  } catch {
    return { ok: false, error: 'No fue posible validar tu CC en Firebase. Revisa las reglas de Firestore.' };
  }
}

export async function requestPasswordReset(email: string, appUrl: string): Promise<BasicAuthResult> {
  const normalizedEmail = normalizeEmail(email);
  const normalizedAppUrl = normalizeText(appUrl);

  if (!normalizedEmail) {
    return { ok: false, error: 'Ingresa tu correo electrónico.' };
  }

  if (isFirebaseAuthEnabled()) {
    return requestFirebasePasswordReset(normalizedEmail, normalizedAppUrl);
  }

  const response = await callAppsScript<BasicAuthResponse>(
    'Auth',
    'requestPasswordReset',
    { email: normalizedEmail, appUrl: normalizedAppUrl },
    () => ({
      ok: true,
      message: 'Si el correo está registrado, te enviaremos un enlace para restablecer tu contraseña.',
    }),
  );

  return normalizeBasicAuthResponse(response, 'No fue posible enviar el correo de recuperación.');
}

export async function completePasswordReset(email: string, token: string, newPassword: string): Promise<BasicAuthResult> {
  const normalizedEmail = normalizeEmail(email);
  const normalizedToken = normalizeText(token);

  if (isFirebaseAuthEnabled()) {
    if (!normalizedToken || !newPassword) {
      return { ok: false, error: 'El enlace de recuperacion de Firebase no esta completo.' };
    }

    return completeFirebasePasswordReset(normalizedToken, newPassword);
  }

  if (!normalizedEmail || !normalizedToken || !newPassword) {
    return { ok: false, error: 'El enlace de recuperación no está completo.' };
  }

  const response = await callAppsScript<BasicAuthResponse>(
    'Auth',
    'completePasswordReset',
    {
      email: normalizedEmail,
      token: normalizedToken,
      newPassword,
    },
    () => ({
      ok: true,
      message: 'Tu contraseña fue actualizada. Ya puedes iniciar sesión.',
    }),
  );

  return normalizeBasicAuthResponse(response, 'No fue posible restablecer la contraseña.');
}

export async function getPasswordResetEmailFromFirebaseCode(token: string) {
  const normalizedToken = normalizeText(token);
  const app = getFirebaseApp();

  if (!normalizedToken || !app || !isFirebaseAuthEnabled()) {
    return '';
  }

  try {
    const { getAuth, verifyPasswordResetCode } = await import('firebase/auth');
    return normalizeEmail(await verifyPasswordResetCode(getAuth(app), normalizedToken));
  } catch {
    return '';
  }
}

export async function approveMinorRegistrationByGuardian(requestId: string, token: string): Promise<BasicAuthResult> {
  const normalizedRequestId = normalizeText(requestId);
  const normalizedToken = normalizeText(token);

  if (!normalizedRequestId || !normalizedToken) {
    return { ok: false, error: 'El enlace de aprobación no está completo.' };
  }

  const response = await callAppsScript<BasicAuthResponse>(
    'Auth',
    'approveMinorByGuardian',
    {
      requestId: normalizedRequestId,
      token: normalizedToken,
    },
    () => ({ ok: false, error: 'La aprobación del menor requiere conexión con SOY IBA.' }),
    { timeoutMs: 16000 },
  );

  return normalizeBasicAuthResponse(response, 'No fue posible registrar la autorización.');
}

async function requestFirebasePasswordReset(email: string, appUrl: string): Promise<BasicAuthResult> {
  const app = getFirebaseApp();

  if (!app) {
    return { ok: false, error: 'Firebase no esta configurado.' };
  }

  try {
    const { getAuth, sendPasswordResetEmail } = await import('firebase/auth');
    await sendPasswordResetEmail(getAuth(app), email, appUrl ? { url: appUrl } : undefined);

    return {
      ok: true,
      message: 'Si el correo esta registrado, Firebase enviara un enlace para restablecer tu contrasena.',
    };
  } catch (error) {
    return { ok: false, error: getFirebasePasswordError(error, 'No fue posible enviar el correo de recuperacion en Firebase.') };
  }
}

async function completeFirebasePasswordReset(token: string, newPassword: string): Promise<BasicAuthResult> {
  const app = getFirebaseApp();

  if (!app) {
    return { ok: false, error: 'Firebase no esta configurado.' };
  }

  try {
    const { confirmPasswordReset, getAuth } = await import('firebase/auth');
    await confirmPasswordReset(getAuth(app), token, newPassword);

    return {
      ok: true,
      message: 'Tu contrasena fue actualizada en Firebase. Ya puedes iniciar sesion.',
    };
  } catch (error) {
    return { ok: false, error: getFirebasePasswordError(error, 'No fue posible restablecer la contrasena en Firebase.') };
  }
}

function normalizeAuthResponse(response: AuthResponse, fallbackError: string): AuthResult {
  if (!response.ok || !response.token || !response.user) {
    return { ok: false, error: response.error ?? fallbackError };
  }

  return {
    ok: true,
    session: {
      token: response.token,
      user: response.user,
    },
  };
}

function normalizeBasicAuthResponse(response: BasicAuthResponse, fallbackError: string): BasicAuthResult {
  if (!response.ok) {
    return { ok: false, error: response.error ?? fallbackError };
  }

  return { ok: true, message: response.message || 'Operación completada.' };
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function createRequestId() {
  if (globalThis.crypto && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }

  return `minor-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function getAppBaseUrl() {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.location.origin + window.location.pathname.replace(/[#?].*$/, '');
}

function isUserAllowedToSignIn(user: SoyibaUser) {
  const status = normalizePlainText(user.status || '');
  const minorStatus = normalizePlainText(user.minorValidationStatus || '');
  const active = user.active === undefined ? true : Boolean(user.active);

  if (status.startsWith('minor_pending') || ['guardian_pending', 'iba_pending', 'rejected'].includes(minorStatus)) {
    return false;
  }

  return active && !['inactive', 'inactivo', 'blocked', 'bloqueado'].includes(status);
}

function getInactiveUserMessage(user: SoyibaUser) {
  const pendingMinorMessage = getPendingMinorSignInMessage(user);

  if (pendingMinorMessage) {
    return pendingMinorMessage;
  }

  const minorStatus = normalizePlainText(user.minorValidationStatus || user.status || '');

  if (minorStatus.includes('reject')) {
    return 'La validación del menor fue rechazada. Contacta a IBA para más información.';
  }

  return 'Tu cuenta aún no está activa.';
}

function getPendingMinorSignInMessage(user: SoyibaUser) {
  const minorStatus = normalizePlainText(user.minorValidationStatus || user.status || '');

  if (minorStatus.includes('guardian')) {
    return 'Tu cuenta está pendiente de aprobación por tu representante legal.';
  }

  if (minorStatus.includes('iba')) {
    return 'Tu representante ya aprobó. La cuenta está pendiente de revisión por IBA.';
  }

  return '';
}

function normalizeBirthDate(value: unknown) {
  return normalizeText(value);
}

function getBirthDateAgeInfo(value: string): { ok: true; age: number } | { ok: false; error: string } {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return { ok: false, error: 'Ingresa tu fecha de nacimiento.' };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const birthDate = new Date(year, month - 1, day);

  if (birthDate.getFullYear() !== year || birthDate.getMonth() !== month - 1 || birthDate.getDate() !== day) {
    return { ok: false, error: 'La fecha de nacimiento no es valida.' };
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (birthDate > todayStart) {
    return { ok: false, error: 'La fecha de nacimiento no puede ser futura.' };
  }

  let age = todayStart.getFullYear() - year;
  const birthdayThisYear = new Date(todayStart.getFullYear(), month - 1, day);

  if (birthdayThisYear > todayStart) {
    age -= 1;
  }

  if (age > 120) {
    return { ok: false, error: 'Revisa la fecha de nacimiento ingresada.' };
  }

  return { ok: true, age };
}

function normalizeCc(value: unknown) {
  return normalizeText(value).replace(/\D/g, '');
}

function normalizePlainText(value: unknown) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'si', 'sí', 'yes', 'activo', 'active'].includes(normalizePlainText(value));
}

function getFirebaseAuthDatabaseId() {
  return String(import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || 'soyibadb').trim() || 'soyibadb';
}

async function sha256Hex(value: string) {
  const buffer = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function dataUrlToProfilePhotoUpload(value: string, userId: string) {
  const match = value.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i);

  if (!match) {
    throw new Error('Foto invalida.');
  }

  const contentType = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
  const extension = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return {
    blob: new Blob([bytes], { type: contentType }),
    contentType,
    path: `profile-photos/${sanitizeStoragePathSegment(userId)}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`,
  };
}

function sanitizeStoragePathSegment(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-') || 'usuario';
}

function waitForFirebaseUser(
  auth: import('firebase/auth').Auth,
  onAuthStateChanged: typeof import('firebase/auth').onAuthStateChanged,
) {
  return new Promise<import('firebase/auth').User | null>((resolve) => {
    const timeoutId = globalThis.setTimeout(() => {
      unsubscribe();
      resolve(null);
    }, 2500);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      globalThis.clearTimeout(timeoutId);
      unsubscribe();
      resolve(user);
    });
  });
}

function getFirebasePasswordError(error: unknown, fallback: string) {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code || '') : '';

  if (/auth\/wrong-password|auth\/invalid-credential|auth\/invalid-login-credentials/i.test(code)) {
    return 'La contrasena actual no es correcta.';
  }

  if (/auth\/weak-password/i.test(code)) {
    return 'La nueva contrasena es muy debil.';
  }

  if (/auth\/requires-recent-login/i.test(code)) {
    return 'Por seguridad, cierra sesion, vuelve a iniciar y cambia la contrasena nuevamente.';
  }

  if (/auth\/expired-action-code/i.test(code)) {
    return 'El enlace de recuperacion expiro. Solicita uno nuevo.';
  }

  if (/auth\/invalid-action-code/i.test(code)) {
    return 'El enlace de recuperacion no es valido o ya fue usado. Solicita uno nuevo.';
  }

  if (/auth\/user-not-found/i.test(code)) {
    return 'No encontramos una cuenta de Firebase con ese correo.';
  }

  return fallback;
}

function getFirebaseRegisterError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code || '') : '';
  const message = String(error instanceof Error ? error.message : error || '');

  if (/auth\/email-already-in-use/i.test(code)) {
    return 'Ya existe una cuenta con ese correo. Inicia sesion o recupera la contrasena.';
  }

  if (/auth\/invalid-email/i.test(code)) {
    return 'El correo no es valido.';
  }

  if (/auth\/weak-password/i.test(code)) {
    return 'La contrasena es muy debil.';
  }

  if (/accion no soportada|acción no soportada|createMinorValidationRequest/i.test(message)) {
    return 'La cuenta no quedó activa porque el Apps Script publicado todavía no tiene la validación de menores. Despliega GS/Auth/Code.gs y vuelve a intentar.';
  }

  if (/Apps Script|correo al representante legal|correo al padre|correo al acudiente/i.test(message)) {
    return message;
  }

  if (/permission-denied|missing or insufficient permissions/i.test(message)) {
    return 'La cuenta fue creada en Firebase Auth, pero Firestore bloqueo el perfil. Revisa las reglas de Firestore.';
  }

  return 'No fue posible crear la cuenta en Firebase.';
}

function getFirebaseRegisterPermissionError(stage: string) {
  if (stage === 'minor-validation-request') {
    return 'Firebase creó el perfil, pero Firestore bloqueó la solicitud de validación del menor. Revisa reglas de minorValidationRequests.';
  }

  if (stage === 'user-profile') {
    return 'La cuenta fue creada en Firebase Auth, pero Firestore bloqueó el perfil. Revisa las reglas de users.';
  }

  return 'Firestore bloqueó el registro. Revisa las reglas de seguridad.';
}

function isTransientAppsScriptError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return /respuesta no JSON|JSON invalido|tardo demasiado|Failed to fetch|NetworkError|Load failed/i.test(error.message);
}

function wait(delayMs: number) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, delayMs);
  });
}

function preserveLocalOnlyUserFields(result: AuthResult, currentSession: SoyibaSession): AuthResult {
  if (!result.ok) {
    return result;
  }

  const user = { ...result.session.user };

  if (!user.photoUrl && currentSession.user.photoUrl) {
    user.photoUrl = currentSession.user.photoUrl;
  }

  if (user.verificado === undefined) {
    user.verificado = currentSession.user.verificado;
  }

  if (user.visibleDirectorio === undefined) {
    user.visibleDirectorio = currentSession.user.visibleDirectorio;
  }

  if (user.mostrarTelefono === undefined) {
    user.mostrarTelefono = currentSession.user.mostrarTelefono;
  }

  if (user.permitirWhatsapp === undefined) {
    user.permitirWhatsapp = currentSession.user.permitirWhatsapp;
  }

  if (user.mostrarFoto === undefined) {
    user.mostrarFoto = currentSession.user.mostrarFoto;
  }

  return {
    ok: true,
    session: {
      ...result.session,
      user,
    },
  };
}

async function syncFirebaseMemberDirectoryDoc(app: NonNullable<ReturnType<typeof getFirebaseApp>>, user: SoyibaUser) {
  const { deleteDoc, doc, getFirestore, serverTimestamp, setDoc } = await import('firebase/firestore');
  const directoryRef = doc(getFirestore(app, getFirebaseAuthDatabaseId()), 'membersDirectory', user.id);

  if (!isDirectoryEligibleUser(user)) {
    await deleteDoc(directoryRef);
    return;
  }

  const mostrarTelefono = Boolean(user.mostrarTelefono);
  const permitirWhatsapp = Boolean(user.permitirWhatsapp);
  const mostrarFoto = user.mostrarFoto === undefined ? true : Boolean(user.mostrarFoto);

  await setDoc(directoryRef, {
    id: user.id,
    nombre: user.firstName || getFirstNameFromDisplay(user.name),
    apellido: user.lastName || getLastNameFromDisplay(user.name),
    fotoUrl: mostrarFoto ? (user.photoUrl || '') : '',
    telefono: mostrarTelefono && permitirWhatsapp ? (user.phone || '') : '',
    rol: user.rolSistema || user.role || 'Miembro',
    rolSistema: user.rolSistema || user.role || 'Miembro',
    tituloUsuario: user.tituloUsuario || user.tipoUsuario || 'Miembro',
    tipoUsuario: 'Miembro',
    ministerio: '',
    grupoEco: '',
    sector: '',
    tiempoEnIBA: user.tiempoIba || '',
    visibleDirectorio: true,
    mostrarTelefono,
    permitirWhatsapp,
    mostrarFoto,
    mostrarMinisterio: false,
    mostrarGrupoEco: false,
    verificado: Boolean(user.verificado),
    estado: user.estadoUsuario || 'Activo',
    fechaRegistro: '',
    fechaActualizacion: new Date().toISOString(),
    updatedAtServer: serverTimestamp(),
  });
}

function isDirectoryEligibleUser(user: SoyibaUser) {
  const active = user.active === undefined ? normalizePlainText(user.estadoUsuario || 'Activo') === 'activo' : Boolean(user.active);
  return active
    && normalizePlainText(user.estadoUsuario || 'Activo') === 'activo'
    && normalizePlainText(user.tipoUsuario) === 'miembro'
    && Boolean(user.visibleDirectorio);
}

function getFirstNameFromDisplay(value: unknown) {
  return normalizeText(value).split(/\s+/)[0] || '';
}

function getLastNameFromDisplay(value: unknown) {
  return normalizeText(value).split(/\s+/).slice(1).join(' ');
}
