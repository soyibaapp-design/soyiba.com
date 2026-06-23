import { callAppsScript } from '../../services/appsScriptClient';
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

export async function getManagedUsers(session: SoyibaSession): Promise<ManagedUser[]> {
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
    },
    () => updateLocalManagedUser(session, targetUser, normalizedPayload),
  );

  if (!response.ok || !response.user) {
    throw new Error(response.error || 'No fue posible actualizar el usuario.');
  }

  return normalizeManagedUser(response.user);
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
    active: estadoUsuario === 'Activo' && Boolean(payload.active),
  };

  return applyAccessRules(basePayload);
}

function normalizeManagedUser(user: Partial<ManagedUser>): ManagedUser {
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
    active,
    status: stringValue(user.status) || (active ? 'active' : 'inactive'),
    createdAt: stringValue(user.createdAt),
    updatedAt: stringValue(user.updatedAt),
    lastLoginAt: stringValue(user.lastLoginAt),
  };
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
  'Músico',
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
