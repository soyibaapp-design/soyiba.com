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

  return {
    token,
    user: buildSoyibaUserFromFirebase(credential.user, tokenResult.claims, {}),
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
    tiempoIba: stringValue(profile.tiempoIba || claims.tiempoIba),
    photoUrl: stringValue(profile.photoUrl || profile.photo_url || firebaseUser.photoURL),
    publicador: toBoolean(profile.publicador ?? claims.publicador),
    publicadorEco: toBoolean(profile.publicadorEco ?? claims.publicadorEco),
    publicadorEvento: toBoolean(profile.publicadorEvento ?? claims.publicadorEvento),
    verificado: toBoolean(profile.verificado ?? profile.usuario_verificado ?? claims.verificado),
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
