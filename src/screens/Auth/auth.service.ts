import { callAppsScript } from '../../services/appsScriptClient';

export type SoyibaUser = {
  id: string;
  email: string;
  name: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  tiempoIba?: string;
  photoUrl?: string;
  tipoUsuario?: 'Asistente' | 'Miembro' | string;
  tituloUsuario?: string;
  rolSistema?: 'Admin' | 'Moderador' | 'Usuario' | 'Pruebas' | string;
  estadoUsuario?: string;
  publicador?: boolean;
  publicadorEco?: boolean;
  publicadorEvento?: boolean;
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

type AuthResponse = {
  ok: boolean;
  token?: string;
  user?: SoyibaUser;
  error?: string;
};

type AuthResult =
  | { ok: true; session: SoyibaSession }
  | { ok: false; error: string };

export async function signInWithEmailPassword(email: string, password: string): Promise<AuthResult> {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return { ok: false, error: 'Ingresa correo y contraseña.' };
  }

  const response = await callAppsScript<AuthResponse>(
    'Auth',
    'login',
    { email: normalizedEmail, password },
    () => ({
      ok: true,
      token: 'local-dev-token',
      user: {
        id: 'local-user',
        email: normalizedEmail,
        name: normalizedEmail.split('@')[0] || 'Usuario',
        role: 'local',
        tipoUsuario: 'Asistente',
        tituloUsuario: 'Asistente',
        rolSistema: 'Usuario',
        estadoUsuario: 'Activo',
        publicador: false,
        publicadorEco: false,
        publicadorEvento: false,
        active: true,
      },
    }),
  );

  return normalizeAuthResponse(response, 'No fue posible iniciar sesión.');
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
  const normalizedEmail = normalizeEmail(payload.email);
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim();

  if (!firstName || !lastName || !normalizedEmail || !phone) {
    return { ok: false, error: 'Nombre, apellido, correo y celular son requeridos.' };
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
      email: normalizedEmail,
      tiempoIba,
      displayName,
    },
    () => ({
      ok: true,
      token: session.token,
      user: {
        ...session.user,
        email: normalizedEmail,
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

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function preserveLocalOnlyUserFields(result: AuthResult, currentSession: SoyibaSession): AuthResult {
  if (!result.ok || !currentSession.user.photoUrl) {
    return result;
  }

  return {
    ok: true,
    session: {
      ...result.session,
      user: {
        ...result.session.user,
        photoUrl: currentSession.user.photoUrl,
      },
    },
  };
}
