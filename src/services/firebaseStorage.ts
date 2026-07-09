import { getFirebaseApp, isFirebaseStorageConfigured } from './firebase';

type SoyibaStorageMediaType = 'image' | 'driveVideo';

type SoyibaStorageUploadOptions = {
  file: File;
  mediaType: SoyibaStorageMediaType;
  userId: string;
  userEmail: string;
};

export type SoyibaStorageUploadResult = {
  id: string;
  type: SoyibaStorageMediaType;
  url: string;
  title: string;
  storagePath: string;
};

export function canUploadToFirebaseStorage() {
  return isFirebaseStorageConfigured();
}

export async function uploadSoyibaMediaToStorage({
  file,
  mediaType,
  userId,
  userEmail,
}: SoyibaStorageUploadOptions): Promise<SoyibaStorageUploadResult> {
  const app = getFirebaseApp();

  if (!app || !isFirebaseStorageConfigured()) {
    throw new Error('Firebase Storage no esta configurado.');
  }

  const [{ getDownloadURL, getStorage, ref, uploadBytesResumable }, { getAuth, signInAnonymously }] = await Promise.all([
    import('firebase/storage'),
    import('firebase/auth'),
  ]);

  const auth = getAuth(app);

  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }

  const ownerUid = auth.currentUser?.uid || '';
  const storage = getStorage(app);
  const storagePath = buildStoragePath(file, mediaType, userId);
  const storageRef = ref(storage, storagePath);
  const snapshot = await new Promise<import('firebase/storage').UploadTaskSnapshot>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, {
      contentType: file.type || defaultMimeType(mediaType),
      customMetadata: {
        ownerUid,
        soyibaMediaType: mediaType,
        soyibaUserId: userId || 'unknown',
        soyibaUserEmail: userEmail || '',
        originalName: file.name,
      },
    });

    task.on('state_changed', undefined, reject, () => resolve(task.snapshot));
  });
  const url = await getDownloadURL(snapshot.ref);

  return {
    id: snapshot.metadata.fullPath,
    type: mediaType,
    url,
    title: file.name,
    storagePath: snapshot.metadata.fullPath,
  };
}

export async function deleteSoyibaMediaFromStorage(urlOrPath: string) {
  const app = getFirebaseApp();
  const storagePath = getFirebaseStoragePath(urlOrPath);

  if (!app || !isFirebaseStorageConfigured() || !storagePath) {
    return false;
  }

  const [{ deleteObject, getStorage, ref }, { getAuth, signInAnonymously }] = await Promise.all([
    import('firebase/storage'),
    import('firebase/auth'),
  ]);
  const auth = getAuth(app);

  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }

  await deleteObject(ref(getStorage(app), storagePath));
  return true;
}

export function getFirebaseStoragePath(urlOrPath: string) {
  const value = String(urlOrPath || '').trim();

  if (!value) {
    return '';
  }

  if (value.startsWith('publicaciones/')) {
    return value;
  }

  try {
    const parsed = new URL(value);
    const pathMatch = parsed.pathname.match(/\/o\/([^?]+)/);

    if (!pathMatch?.[1]) {
      return '';
    }

    return decodeURIComponent(pathMatch[1]);
  } catch {
    return '';
  }
}

function buildStoragePath(file: File, mediaType: SoyibaStorageMediaType, userId: string) {
  const folder = mediaType === 'image' ? 'imagenes' : 'videos';
  const safeUserId = sanitizePathSegment(userId || 'usuario');
  const safeFileName = sanitizeFileName(file.name || `soyiba-${Date.now()}`);
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return `publicaciones/${folder}/${year}-${month}/${safeUserId}/${nonce}-${safeFileName}`;
}

function sanitizePathSegment(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'usuario';
}

function sanitizeFileName(value: string) {
  const normalized = value.trim().replace(/[/\\?%*:|"<>]+/g, '-').replace(/\s+/g, '-');
  return normalized || 'archivo';
}

function defaultMimeType(mediaType: SoyibaStorageMediaType) {
  return mediaType === 'image' ? 'image/jpeg' : 'video/mp4';
}
