import { callAppsScript } from '../../services/appsScriptClient';
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
  publicador?: boolean;
  publicadorEco?: boolean;
  publicadorEvento?: boolean;
  verificado?: boolean;
  active?: boolean;
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
};

export type UpdateProfilePayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tiempoIba: string;
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
};

const AUTH_LOGIN_RETRY_DELAYS_MS: number[] = [];
const AUTH_LOGIN_TIMEOUT_MS = 15000;
const AUTH_LOGIN_TRANSIENT_ERROR =
  'No fue posible iniciar sesión. Intenta nuevamente.';

type AuthResult =
  | { ok: true; session: SoyibaSession }
  | { ok: false; error: string };

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
      return { ok: true, session: await signInWithFirebaseEmailPassword(normalizedEmail, password) };
    } catch {
      return { ok: false, error: 'Correo o contrasena invalidos.' };
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

  if (!firstName || !lastName || !normalizedEmail || !phone || !payload.password) {
    return { ok: false, error: 'Completa todos los campos para crear tu cuenta.' };
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
        verificado: false,
        active: true,
      },
    }),
  );

  return normalizeAuthResponse(response, 'No fue posible crear la cuenta.');
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
              visibleDirectorio: true,
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

  return {
    ok: true,
    session: {
      ...result.session,
      user,
    },
  };
}
