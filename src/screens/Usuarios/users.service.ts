import { callAppsScript } from '../../services/appsScriptClient';
import { getFirebaseApp } from '../../services/firebase';
import { isFirebaseAuthEnabled } from '../../services/firebaseAuth';
import type { SoyibaSession, SoyibaUser } from '../Auth/auth.service';

const LOCAL_USERS_STORAGE_KEY = 'soyiba.localManagedUsers';

export type ManagedUser = SoyibaUser & {
  active: boolean;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
};

export type ManagedUserAccessPayload = {
  rolSistema: string;
  tipoUsuario: string;
  tituloUsuario: string;
  estadoUsuario: string;
  publicador: boolean;
  publicadorEco: boolean;
  publicadorEvento: boolean;
  minorValidator: boolean;
  verificado: boolean;
  active: boolean;
};

type ManagedUsersResponse = {
  ok: boolean;
  users?: ManagedUser[];
  error?: string;
};

type UpdateManagedUserResponse = {
  ok: boolean;
  user?: ManagedUser;
  error?: string;
};

export type MinorValidationStatus = 'guardian_pending' | 'iba_pending' | 'approved' | 'rejected';

export type MinorValidationRequest = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  fechaNacimiento: string;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
  status: MinorValidationStatus;
  guardianApprovedAt: string;
  validatedAt: string;
  validatedByEmail: string;
  rejectionReason: string;
  createdAt: string;
  updatedAt: string;
};

type MinorValidationStatusResponse = {
  ok: boolean;
  status?: string;
  guardianApprovedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  error?: string;
};

export async function getManagedUsers(session: SoyibaSession): Promise<ManagedUser[]> {
  if (isFirebaseAuthEnabled()) {
    return getFirebaseManagedUsers(session);
  }

  const response = await callAppsScript<ManagedUsersResponse>(
    'Auth',
    'listUsers',
    {
      token: session.token,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
    },
    () => ({
      ok: true,
      users: getLocalManagedUsers(session),
    }),
  );

  if (!response.ok) {
    throw new Error(response.error || 'No fue posible cargar usuarios.');
  }

  return (response.users || []).map(normalizeManagedUser);
}

export async function updateManagedUser(
  session: SoyibaSession,
  targetUser: ManagedUser,
  payload: ManagedUserAccessPayload,
): Promise<ManagedUser> {
  const normalizedPayload = normalizeAccessPayload(payload);

  if (isFirebaseAuthEnabled()) {
    return updateFirebaseManagedUser(session, targetUser, normalizedPayload);
  }

  const response = await callAppsScript<UpdateManagedUserResponse>(
    'Auth',
    'updateUserAccess',
    {
      token: session.token,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      targetUserId: targetUser.id,
      targetEmail: targetUser.email,
      role: normalizedPayload.rolSistema,
      rolSistema: normalizedPayload.rolSistema,
      tipoUsuario: normalizedPayload.tipoUsuario,
      tituloUsuario: normalizedPayload.tituloUsuario,
      estadoUsuario: normalizedPayload.estadoUsuario,
      active: normalizedPayload.active,
      publicador: normalizedPayload.publicador,
      publicadorEco: normalizedPayload.publicadorEco,
      publicadorEvento: normalizedPayload.publicadorEvento,
      minorValidator: normalizedPayload.minorValidator,
      verificado: normalizedPayload.verificado,
    },
    () => updateLocalManagedUser(session, targetUser, normalizedPayload),
  );

  if (!response.ok || !response.user) {
    throw new Error(response.error || 'No fue posible actualizar el usuario.');
  }

  return normalizeManagedUser(response.user);
}

export async function getMinorValidationRequests(session: SoyibaSession): Promise<MinorValidationRequest[]> {
  if (!isFirebaseAuthEnabled()) {
    return [];
  }

  const app = getFirebaseApp();

  if (!app) {
    throw new Error('Firebase no esta configurado.');
  }

  const { collection, doc, getDocs, getFirestore, serverTimestamp, updateDoc } = await import('firebase/firestore');
  const db = getFirestore(app, getFirebaseUsersDatabaseId());
  const snapshot = await getDocs(collection(db, 'minorValidationRequests'));
  const requests = snapshot.docs
    .map((item) => normalizeMinorValidationRequest({ id: item.id, ...item.data() }))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  await Promise.all(
    requests
      .filter((request) => request.status === 'guardian_pending')
      .map(async (request) => {
        try {
          const status = await fetchGuardianApprovalStatus(request.id);
          if (status.status === 'iba_pending') {
            const updatedAt = new Date().toISOString();
            await updateDoc(doc(db, 'minorValidationRequests', request.id), {
              status: 'iba_pending',
              guardianApprovedAt: status.guardianApprovedAt || updatedAt,
              updatedAt,
              updatedAtServer: serverTimestamp(),
            });
            request.status = 'iba_pending';
            request.guardianApprovedAt = status.guardianApprovedAt || updatedAt;
            request.updatedAt = updatedAt;
          }
        } catch {
          // La cola sigue usable aunque la sincronizacion del correo falle temporalmente.
        }
      }),
  );

  return requests;
}

export async function reviewMinorValidationRequest(
  session: SoyibaSession,
  request: MinorValidationRequest,
  decision: 'approved' | 'rejected',
  rejectionReason = '',
) {
  if (!isFirebaseAuthEnabled()) {
    throw new Error('La validacion de menores requiere Firebase.');
  }

  const app = getFirebaseApp();

  if (!app) {
    throw new Error('Firebase no esta configurado.');
  }

  const { doc, getFirestore, serverTimestamp, updateDoc } = await import('firebase/firestore');
  const db = getFirestore(app, getFirebaseUsersDatabaseId());
  const updatedAt = new Date().toISOString();
  const approved = decision === 'approved';

  await updateDoc(doc(db, 'minorValidationRequests', request.id), {
    status: decision,
    validatedByUserId: session.user.id,
    validatedByEmail: session.user.email,
    validatedAt: updatedAt,
    rejectionReason: approved ? '' : rejectionReason,
    updatedAt,
    updatedAtServer: serverTimestamp(),
  });

  await updateDoc(doc(db, 'users', request.userId), {
    estadoUsuario: approved ? 'Activo' : 'Bloqueado',
    status: approved ? 'active' : 'minor_rejected',
    active: approved,
    minorValidationStatus: decision,
    minorValidationReviewedAt: updatedAt,
    minorValidationReviewedByUserId: session.user.id,
    minorValidationReviewedByEmail: session.user.email,
    minorValidationRejectionReason: approved ? '' : rejectionReason,
    updatedAt,
    updatedAtServer: serverTimestamp(),
  });

  await callAppsScript(
    'Auth',
    'reviewMinorValidationRequest',
    {
      requestId: request.id,
      decision,
      rejectionReason: approved ? '' : rejectionReason,
      reviewerUserId: session.user.id,
      reviewerEmail: session.user.email,
    },
    () => ({ ok: true }),
    { timeoutMs: 12000 },
  ).catch(() => undefined);
}

async function getFirebaseManagedUsers(session: SoyibaSession): Promise<ManagedUser[]> {
  const app = getFirebaseApp();

  if (!app) {
    throw new Error('Firebase no esta configurado.');
  }

  try {
    await ensureFirebaseUserSession(session);
    const { collection, getDocs, getFirestore } = await import('firebase/firestore');
    const databaseId = getFirebaseUsersDatabaseId();
    const snapshot = await getDocs(collection(getFirestore(app, databaseId), 'users'));
    return snapshot.docs
      .map((item) => normalizeManagedUser({ id: item.id, ...item.data() }))
      .sort((left, right) => getDisplaySortValue(left).localeCompare(getDisplaySortValue(right), 'es'));
  } catch (error) {
    const message = error instanceof Error ? error.message : '';

    if (/sesion activa de Firebase|Firebase no esta configurado/i.test(message)) {
      throw new Error(message);
    }

    throw new Error('No fue posible cargar usuarios desde Firebase. Revisa las reglas de Firestore.');
  }
}

async function ensureFirebaseUserSession(session: SoyibaSession) {
  const app = getFirebaseApp();

  if (!app) {
    throw new Error('Firebase no esta configurado.');
  }

  const { getAuth, onAuthStateChanged } = await import('firebase/auth');
  const auth = getAuth(app);
  const firebaseUser = auth.currentUser || (await waitForFirebaseUser(auth, onAuthStateChanged));
  const expectedEmail = stringValue(session.user.email).toLowerCase();

  if (!firebaseUser || (expectedEmail && firebaseUser.email?.toLowerCase() !== expectedEmail)) {
    throw new Error('No encontramos una sesion activa de Firebase para cargar usuarios.');
  }

  await firebaseUser.getIdToken(false);
}

function waitForFirebaseUser(
  auth: import('firebase/auth').Auth,
  onAuthStateChanged: typeof import('firebase/auth').onAuthStateChanged,
) {
  return new Promise<import('firebase/auth').User | null>((resolve) => {
    const timeoutId = globalThis.setTimeout(() => {
      unsubscribe();
      resolve(null);
    }, 6000);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      globalThis.clearTimeout(timeoutId);
      unsubscribe();
      resolve(user);
    });
  });
}

async function updateFirebaseManagedUser(
  session: SoyibaSession,
  targetUser: ManagedUser,
  payload: ManagedUserAccessPayload,
): Promise<ManagedUser> {
  const app = getFirebaseApp();

  if (!app) {
    throw new Error('Firebase no esta configurado.');
  }

  const updatedAt = new Date().toISOString();
  const nextUser = normalizeManagedUser({
    ...targetUser,
    ...payload,
    role: payload.rolSistema,
    rolSistema: payload.rolSistema,
    tituloUsuario: payload.tituloUsuario,
    status: payload.active ? 'active' : 'inactive',
    updatedAt,
  });

  try {
    const { doc, getFirestore, serverTimestamp, setDoc } = await import('firebase/firestore');
    await setDoc(
      doc(getFirestore(app, getFirebaseUsersDatabaseId()), 'users', nextUser.id),
      {
        role: nextUser.rolSistema,
        rolSistema: nextUser.rolSistema,
        tipoUsuario: nextUser.tipoUsuario,
        tituloUsuario: nextUser.tituloUsuario,
        estadoUsuario: nextUser.estadoUsuario,
        active: nextUser.active,
        status: nextUser.status,
        publicador: nextUser.publicador,
        publicadorEco: nextUser.publicadorEco,
        publicadorEvento: nextUser.publicadorEvento,
        minorValidator: nextUser.minorValidator,
        verificado: nextUser.verificado,
        updatedAt,
        updatedByUserId: session.user.id,
        updatedByEmail: session.user.email,
        updatedAtServer: serverTimestamp(),
      },
      { merge: true },
    );
  } catch {
    throw new Error('No fue posible actualizar el usuario en Firebase. Revisa las reglas de Firestore.');
  }

  return nextUser;
}

function getFirebaseUsersDatabaseId() {
  return String(import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || 'soyibadb').trim() || 'soyibadb';
}

function getDisplaySortValue(user: ManagedUser) {
  return `${user.name || ''} ${user.email || ''}`.trim().toLowerCase();
}

function normalizeAccessPayload(payload: ManagedUserAccessPayload): ManagedUserAccessPayload {
  const estadoUsuario = stringValue(payload.estadoUsuario) || 'Activo';
  const basePayload = {
    rolSistema: stringValue(payload.rolSistema) || 'Usuario',
    tipoUsuario: normalizeUserType(payload.tipoUsuario),
    tituloUsuario: normalizeUserTitle(payload.tituloUsuario || payload.tipoUsuario, payload.tipoUsuario),
    estadoUsuario,
    publicador: Boolean(payload.publicador),
    publicadorEco: Boolean(payload.publicadorEco),
    publicadorEvento: Boolean(payload.publicadorEvento),
    minorValidator: Boolean(payload.minorValidator),
    verificado: Boolean(payload.verificado),
    active: estadoUsuario === 'Activo' && Boolean(payload.active),
  };

  return applyAccessRules(basePayload);
}

function normalizeManagedUser(user: Partial<ManagedUser>): ManagedUser {
  const userRecord = user as Partial<ManagedUser> & {
    usuarioVerificado?: unknown;
    usuario_verificado?: unknown;
    verified?: unknown;
    fecha_nacimiento?: unknown;
  };
  const rolSistema = stringValue(user.rolSistema || user.role) || 'Usuario';
  const rawTipoUsuario = stringValue(user.tipoUsuario) || 'Asistente';
  const tipoUsuario = normalizeUserType(rawTipoUsuario);
  const tituloUsuario = normalizeUserTitle(user.tituloUsuario || rawTipoUsuario, tipoUsuario);
  const estadoUsuario = stringValue(user.estadoUsuario) || (toBoolean(user.active) ? 'Activo' : 'Inactivo');
  const active = user.active === undefined ? estadoUsuario === 'Activo' : toBoolean(user.active);
  const firstName = stringValue(user.firstName);
  const lastName = stringValue(user.lastName);
  const email = stringValue(user.email).toLowerCase();
  const name = stringValue(user.name) || [firstName, lastName].filter(Boolean).join(' ') || email || 'Usuario SOY IBA';

  return {
    id: stringValue(user.id || email),
    email,
    name,
    role: rolSistema,
    firstName,
    lastName,
    phone: stringValue(user.phone),
    tiempoIba: stringValue(user.tiempoIba),
    photoUrl: stringValue(user.photoUrl),
    tipoUsuario,
    tituloUsuario,
    rolSistema,
    estadoUsuario,
    publicador: toBoolean(user.publicador),
    publicadorEco: toBoolean(user.publicadorEco),
    publicadorEvento: toBoolean(user.publicadorEvento),
    minorValidator: toBoolean(user.minorValidator),
    verificado: toBoolean(userRecord.verificado ?? userRecord.usuarioVerificado ?? userRecord.usuario_verificado ?? userRecord.verified),
    fechaNacimiento: stringValue(userRecord.fechaNacimiento ?? userRecord.fecha_nacimiento),
    visibleDirectorio: user.visibleDirectorio === undefined ? false : toBoolean(user.visibleDirectorio),
    mostrarTelefono: user.mostrarTelefono === undefined ? false : toBoolean(user.mostrarTelefono),
    permitirWhatsapp: user.permitirWhatsapp === undefined ? false : toBoolean(user.permitirWhatsapp),
    mostrarFoto: user.mostrarFoto === undefined ? true : toBoolean(user.mostrarFoto),
    active,
    status: stringValue(user.status) || (active ? 'active' : 'inactive'),
    createdAt: stringValue(user.createdAt),
    updatedAt: stringValue(user.updatedAt),
    lastLoginAt: stringValue(user.lastLoginAt),
  };
}

async function fetchGuardianApprovalStatus(requestId: string) {
  const response = await callAppsScript<MinorValidationStatusResponse>(
    'Auth',
    'getMinorValidationRequestStatus',
    { requestId },
    undefined,
    { timeoutMs: 9000 },
  );

  if (!response.ok) {
    throw new Error(response.error || 'No fue posible consultar el estado del padre o madre.');
  }

  return {
    status: normalizeMinorValidationStatus(response.status),
    guardianApprovedAt: stringValue(response.guardianApprovedAt),
    reviewedAt: stringValue(response.reviewedAt),
    rejectionReason: stringValue(response.rejectionReason),
  };
}

function normalizeMinorValidationRequest(record: Record<string, unknown>): MinorValidationRequest {
  return {
    id: stringValue(record.id || record.requestId || record.request_id),
    userId: stringValue(record.userId || record.user_id),
    userName: stringValue(record.userName || record.user_name),
    userEmail: stringValue(record.userEmail || record.user_email).toLowerCase(),
    userPhone: stringValue(record.userPhone || record.user_phone),
    fechaNacimiento: stringValue(record.fechaNacimiento || record.fecha_nacimiento),
    guardianName: stringValue(record.guardianName || record.guardian_name),
    guardianEmail: stringValue(record.guardianEmail || record.guardian_email).toLowerCase(),
    guardianPhone: stringValue(record.guardianPhone || record.guardian_phone),
    status: normalizeMinorValidationStatus(record.status),
    guardianApprovedAt: stringValue(record.guardianApprovedAt || record.guardian_approved_at),
    validatedAt: stringValue(record.validatedAt || record.validated_at),
    validatedByEmail: stringValue(record.validatedByEmail || record.validated_by_email),
    rejectionReason: stringValue(record.rejectionReason || record.rejection_reason),
    createdAt: stringValue(record.createdAt || record.created_at),
    updatedAt: stringValue(record.updatedAt || record.updated_at),
  };
}

function normalizeMinorValidationStatus(value: unknown): MinorValidationStatus {
  const status = stringValue(value);

  if (status === 'iba_pending' || status === 'approved' || status === 'rejected') {
    return status;
  }

  return 'guardian_pending';
}

function getLocalManagedUsers(session: SoyibaSession) {
  const storedUsers = readLocalUsers();
  const users = storedUsers.length ? storedUsers : getSeedLocalUsers(session);
  const ensuredUsers = ensureCurrentUser(users, session).map(normalizeManagedUser);
  writeLocalUsers(ensuredUsers);
  return ensuredUsers;
}

function updateLocalManagedUser(
  session: SoyibaSession,
  targetUser: ManagedUser,
  payload: ManagedUserAccessPayload,
): UpdateManagedUserResponse {
  const users = getLocalManagedUsers(session);
  let updatedUser: ManagedUser | null = null;
  const nextUsers = users.map((user) => {
    if (!isSameUser(user, targetUser)) {
      return user;
    }

    updatedUser = normalizeManagedUser({
      ...user,
      ...payload,
      role: payload.rolSistema,
      rolSistema: payload.rolSistema,
      tituloUsuario: payload.tituloUsuario,
      status: payload.active ? 'active' : 'inactive',
      updatedAt: new Date().toISOString(),
    });
    return updatedUser;
  });

  if (!updatedUser) {
    updatedUser = normalizeManagedUser({
      ...targetUser,
      ...payload,
      role: payload.rolSistema,
      rolSistema: payload.rolSistema,
      tituloUsuario: payload.tituloUsuario,
      status: payload.active ? 'active' : 'inactive',
      updatedAt: new Date().toISOString(),
    });
    nextUsers.push(updatedUser);
  }

  writeLocalUsers(nextUsers);
  return { ok: true, user: updatedUser };
}

function getSeedLocalUsers(session: SoyibaSession): ManagedUser[] {
  const currentUser = normalizeManagedUser({
    ...session.user,
    rolSistema: session.user.rolSistema || 'Admin',
    role: session.user.rolSistema || session.user.role || 'Admin',
    estadoUsuario: session.user.estadoUsuario || 'Activo',
    active: session.user.active ?? true,
  });

  return [
    currentUser,
    normalizeManagedUser({
      id: 'local-publicaciones',
      email: 'publicaciones@soyiba.local',
      name: 'Equipo Publicaciones',
      firstName: 'Equipo',
      lastName: 'Publicaciones',
      phone: '3000000001',
      rolSistema: 'Moderador',
      tipoUsuario: 'Miembro',
      tituloUsuario: 'Servidor',
      estadoUsuario: 'Activo',
      publicador: true,
      publicadorEco: false,
      publicadorEvento: true,
      minorValidator: false,
      active: true,
    }),
    normalizeManagedUser({
      id: 'local-eco',
      email: 'eco@soyiba.local',
      name: 'Lider ECO',
      firstName: 'Lider',
      lastName: 'ECO',
      phone: '3000000002',
      rolSistema: 'Usuario',
      tipoUsuario: 'Miembro',
      tituloUsuario: 'Líder',
      estadoUsuario: 'Activo',
      publicador: false,
      publicadorEco: true,
      publicadorEvento: false,
      minorValidator: false,
      active: true,
    }),
    normalizeManagedUser({
      id: 'local-asistente',
      email: 'asistente@soyiba.local',
      name: 'Usuario Asistente',
      firstName: 'Usuario',
      lastName: 'Asistente',
      phone: '3000000003',
      rolSistema: 'Asistente',
      tipoUsuario: 'Asistente',
      tituloUsuario: 'Asistente',
      estadoUsuario: 'Pendiente',
      publicador: false,
      publicadorEco: false,
      publicadorEvento: false,
      minorValidator: false,
      active: false,
    }),
  ];
}

function ensureCurrentUser(users: ManagedUser[], session: SoyibaSession) {
  const currentIndex = users.findIndex((user) => isSameUser(user, session.user));
  const currentUser = normalizeManagedUser(session.user);

  if (currentIndex < 0) {
    return [currentUser, ...users];
  }

  return users.map((user, index) =>
    index === currentIndex
      ? normalizeManagedUser({
          ...currentUser,
          ...user,
          id: session.user.id || user.id,
          email: session.user.email || user.email,
          name: session.user.name || user.name,
          firstName: session.user.firstName || user.firstName,
          lastName: session.user.lastName || user.lastName,
          phone: session.user.phone || user.phone,
        })
      : user,
  );
}

function readLocalUsers(): ManagedUser[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(LOCAL_USERS_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored) as Array<Partial<ManagedUser>>;
    return Array.isArray(parsed) ? parsed.map(normalizeManagedUser) : [];
  } catch {
    return [];
  }
}

function writeLocalUsers(users: ManagedUser[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(LOCAL_USERS_STORAGE_KEY, JSON.stringify(users.map(normalizeManagedUser)));
  } catch {
    // Local storage can be disabled in private contexts.
  }
}

function isSameUser(left: Pick<SoyibaUser, 'id' | 'email'>, right: Pick<SoyibaUser, 'id' | 'email'>) {
  return Boolean(
    (left.id && right.id && left.id === right.id) ||
      (left.email && right.email && left.email.trim().toLowerCase() === right.email.trim().toLowerCase()),
  );
}

function stringValue(value: unknown) {
  return String(value ?? '').trim();
}

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }

  return ['true', '1', 'si', 'yes', 'active', 'activo'].includes(stringValue(value).toLowerCase());
}

const ASSISTANT_VALUE = 'Asistente';
const MEMBER_VALUE = 'Miembro';
const userTitleOptions = [
  ASSISTANT_VALUE,
  MEMBER_VALUE,
  'Servidor',
  'Líder',
  'Pastor',
  'Administrativo',
  'Maestro ED',
  'Maestro',
  'Líder de pastorales',
  'Equipo alabanza',
  'Moderador de grupo ECO',
  'Audiovisuales',
  'Creador de contenido',
];

function applyAccessRules(payload: ManagedUserAccessPayload): ManagedUserAccessPayload {
  if (isAssistantValue(payload.tipoUsuario)) {
    return {
      ...payload,
      rolSistema: ASSISTANT_VALUE,
      tipoUsuario: ASSISTANT_VALUE,
      tituloUsuario: ASSISTANT_VALUE,
      publicador: false,
      publicadorEco: false,
      publicadorEvento: false,
      minorValidator: false,
    };
  }

  return {
    ...payload,
    rolSistema: coerceMemberValue(payload.rolSistema),
    tipoUsuario: MEMBER_VALUE,
    tituloUsuario: coerceMemberValue(payload.tituloUsuario),
  };
}

function normalizeUserType(value: unknown) {
  return isAssistantValue(value) ? ASSISTANT_VALUE : MEMBER_VALUE;
}

function normalizeUserTitle(value: unknown, tipoUsuario: unknown) {
  const normalized = normalizeAccessText(value);
  if (normalized === 'musico') {
    return 'Equipo alabanza';
  }

  const match = userTitleOptions.find((option) => normalizeAccessText(option) === normalized);

  if (match) {
    return match;
  }

  return isAssistantValue(tipoUsuario) ? ASSISTANT_VALUE : MEMBER_VALUE;
}

function coerceMemberValue(value: string) {
  return value && !isAssistantValue(value) ? value : MEMBER_VALUE;
}

function isAssistantValue(value: unknown) {
  return normalizeAccessText(value) === 'asistente';
}

function normalizeAccessText(value: unknown) {
  return stringValue(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
