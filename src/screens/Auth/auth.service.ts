import { callAppsScript } from '../../services/appsScriptClient';

export type SoyibaUser = {
  id: string;
  email: string;
  name: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  cc?: string;
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

const AUTH_LOGIN_RETRY_DELAYS_MS = [900, 2200];

type AuthResult =
  | { ok: true; session: SoyibaSession }
  | { ok: false; error: string };

export type BasicAuthResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export type VerifyMembershipResult =
  | { ok: true; session: SoyibaSession; message: string }
  | { ok: false; error: string };

export async function signInWithEmailPassword(email: string, password: string): Promise<AuthResult> {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return { ok: false, error: 'Ingresa correo y contraseña.' };
  }

  const response = await callLoginWithRetry(normalizedEmail, password);

  return normalizeAuthResponse(response, 'No fue posible iniciar sesión.');
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

function isTransientAppsScriptError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return /respuesta no JSON|JSON invalido|Failed to fetch|NetworkError|Load failed/i.test(error.message);
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
