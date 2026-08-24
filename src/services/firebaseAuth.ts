import { getFirebaseApp } from './firebase';
import type { SoyibaSession, SoyibaUser } from '../screens/Auth/auth.service';

type FirebaseUserProfile = Partial<SoyibaUser> & {
  displayName?: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  tipo_usuario?: string;
  titulo_usuario?: string;
  rol_sistema?: string;
  estado_usuario?: string;
  usuario_verificado?: unknown;
  photo_url?: string;
  acepto_politica_datos?: unknown;
  fecha_aceptacion_politica?: string;
  politica_datos_version?: string;
  autorizacion_tratamiento_datos?: unknown;
  fecha_nacimiento?: string;
  registro_menor_edad?: unknown;
  autorizacion_acudiente?: unknown;
  guardian_name?: string;
  guardian_email?: string;
  guardian_phone?: string;
  minor_validation_status?: string;
  minor_validation_request_id?: string;
  visible_directorio?: unknown;
  mostrar_telefono?: unknown;
  permitir_whatsapp?: unknown;
  mostrar_foto?: unknown;
};

export function isFirebaseAuthEnabled() {
  return String(import.meta.env.VITE_AUTH_PROVIDER || '').trim().toLowerCase() === 'firebase';
}

export async function signInWithFirebaseEmailPassword(email: string, password: string): Promise<SoyibaSession> {
  const app = getFirebaseApp();

  if (!app) {
    throw new Error('Firebase no esta configurado.');
  }

  const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
  const auth = getAuth(app);
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const [token, tokenResult] = await Promise.all([credential.user.getIdToken(), credential.user.getIdTokenResult()]);
  const profile = await getFirebaseUserProfile(app, credential.user.uid);

  if (!Object.keys(profile).length) {
    throw new Error('No fue posible validar el estado de tu cuenta. Intenta nuevamente.');
  }

  return {
    token,
    user: buildSoyibaUserFromFirebase(credential.user, tokenResult.claims, profile),
  };
}

export async function refreshFirebaseSession(currentSession: SoyibaSession): Promise<SoyibaSession> {
  const app = getFirebaseApp();

  if (!app) {
    return currentSession;
  }

  const { getAuth, onAuthStateChanged } = await import('firebase/auth');
  const auth = getAuth(app);
  const firebaseUser = auth.currentUser || (await waitForCurrentFirebaseUser(auth, onAuthStateChanged));

  if (!firebaseUser || firebaseUser.email?.toLowerCase() !== currentSession.user.email.toLowerCase()) {
    return currentSession;
  }

  const [token, tokenResult] = await Promise.all([firebaseUser.getIdToken(), firebaseUser.getIdTokenResult()]);
  const profile = await getFirebaseUserProfile(app, firebaseUser.uid);

  return {
    token,
    user: {
      ...currentSession.user,
      ...buildSoyibaUserFromFirebase(firebaseUser, tokenResult.claims, { ...currentSession.user, ...profile }),
    },
  };
}

async function getFirebaseUserProfile(app: NonNullable<ReturnType<typeof getFirebaseApp>>, uid: string): Promise<FirebaseUserProfile> {
  const databaseId = String(import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || 'soyibadb').trim() || 'soyibadb';

  try {
    return await withTimeout(async () => {
      const { doc, getDoc, getFirestore } = await import('firebase/firestore');
      const snapshot = await getDoc(doc(getFirestore(app, databaseId), 'users', uid));
      return snapshot.exists() ? (snapshot.data() as FirebaseUserProfile) : {};
    }, 2200);
  } catch {
    return {};
  }
}

function withTimeout<T>(work: () => Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(() => reject(new Error('Firebase profile timeout')), timeoutMs);

    work()
      .then(resolve)
      .catch(reject)
      .finally(() => globalThis.clearTimeout(timeoutId));
  });
}

function waitForCurrentFirebaseUser(
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

function buildSoyibaUserFromFirebase(
  firebaseUser: import('firebase/auth').User,
  claims: Record<string, unknown>,
  profile: FirebaseUserProfile,
): SoyibaUser {
  const email = String(firebaseUser.email || profile.email || '').trim().toLowerCase();
  const firstName = stringValue(profile.firstName || profile.first_name || claims.firstName);
  const lastName = stringValue(profile.lastName || profile.last_name || claims.lastName);
  const displayName =
    stringValue(profile.name || profile.displayName || profile.display_name || firebaseUser.displayName) ||
    [firstName, lastName].filter(Boolean).join(' ') ||
    email ||
    'Usuario SOY IBA';
  const rolSistema = stringValue(profile.rolSistema || profile.rol_sistema || claims.rolSistema || claims.role) || 'Usuario';
  const tipoUsuario = stringValue(profile.tipoUsuario || profile.tipo_usuario || claims.tipoUsuario) || 'Asistente';
  const tituloUsuario = stringValue(profile.tituloUsuario || profile.titulo_usuario || claims.tituloUsuario) || tipoUsuario;
  const estadoUsuario = stringValue(profile.estadoUsuario || profile.estado_usuario || claims.estadoUsuario) || 'Activo';

  return {
    id: firebaseUser.uid,
    email,
    name: displayName,
    firstName,
    lastName,
    phone: stringValue(profile.phone || claims.phone),
    cc: stringValue(profile.cc),
    ccHash: stringValue(profile.ccHash),
    ccLast4: stringValue(profile.ccLast4),
    role: rolSistema,
    rolSistema,
    tipoUsuario,
    tituloUsuario,
    estadoUsuario,
    status: stringValue(profile.status || claims.status),
    tiempoIba: stringValue(profile.tiempoIba || claims.tiempoIba),
    photoUrl: stringValue(profile.photoUrl || profile.photo_url || firebaseUser.photoURL),
    publicador: toBoolean(profile.publicador ?? claims.publicador),
    publicadorEco: toBoolean(profile.publicadorEco ?? claims.publicadorEco),
    publicadorEvento: toBoolean(profile.publicadorEvento ?? claims.publicadorEvento),
    minorValidator: toBoolean(profile.minorValidator ?? claims.minorValidator),
    verificado: toBoolean(profile.verificado ?? profile.usuario_verificado ?? claims.verificado),
    aceptoPoliticaDatos: toBoolean(profile.aceptoPoliticaDatos ?? profile.acepto_politica_datos),
    fechaAceptacionPolitica: stringValue(profile.fechaAceptacionPolitica ?? profile.fecha_aceptacion_politica),
    politicaDatosVersion: stringValue(profile.politicaDatosVersion ?? profile.politica_datos_version),
    autorizacionTratamientoDatos: toBoolean(profile.autorizacionTratamientoDatos ?? profile.autorizacion_tratamiento_datos),
    fechaNacimiento: stringValue(profile.fechaNacimiento ?? profile.fecha_nacimiento),
    registroMenorEdad: toBoolean(profile.registroMenorEdad ?? profile.registro_menor_edad),
    autorizacionAcudiente: toBoolean(profile.autorizacionAcudiente ?? profile.autorizacion_acudiente),
    guardianName: stringValue(profile.guardianName ?? profile.guardian_name),
    guardianEmail: stringValue(profile.guardianEmail ?? profile.guardian_email),
    guardianPhone: stringValue(profile.guardianPhone ?? profile.guardian_phone),
    minorValidationStatus: stringValue(profile.minorValidationStatus ?? profile.minor_validation_status),
    minorValidationRequestId: stringValue(profile.minorValidationRequestId ?? profile.minor_validation_request_id),
    visibleDirectorio: toBoolean(profile.visibleDirectorio ?? profile.visible_directorio),
    mostrarTelefono: toBoolean(profile.mostrarTelefono ?? profile.mostrar_telefono),
    permitirWhatsapp: toBoolean(profile.permitirWhatsapp ?? profile.permitir_whatsapp),
    mostrarFoto: profile.mostrarFoto === undefined && profile.mostrar_foto === undefined ? true : toBoolean(profile.mostrarFoto ?? profile.mostrar_foto),
    active: profile.active === undefined ? estadoUsuario === 'Activo' : toBoolean(profile.active),
  };
}

function stringValue(value: unknown) {
  return String(value ?? '').trim();
}

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'si', 'sí', 'yes'].includes(String(value ?? '').trim().toLowerCase());
}
