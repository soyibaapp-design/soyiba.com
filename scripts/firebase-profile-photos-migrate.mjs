import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const args = new Set(process.argv.slice(2));
const shouldRun = args.has('--confirm');
const env = loadEnvFile(resolve(process.cwd(), '.env'));
const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  env.FIREBASE_SERVICE_ACCOUNT_PATH;
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const firestoreDatabaseId = process.env.FIREBASE_FIRESTORE_DATABASE_ID || env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || 'soyibadb';
const storageBucketName = process.env.FIREBASE_STORAGE_BUCKET || env.VITE_FIREBASE_STORAGE_BUCKET || 'soyiba.firebasestorage.app';

initializeFirebaseAdmin();

const auth = getAuth();
const db = getFirestore(firestoreDatabaseId);
const bucket = getStorage().bucket(storageBucketName);
const usersSnapshot = await db.collection('users').get();
const candidates = [];
const authSyncCandidates = [];

for (const item of usersSnapshot.docs) {
  const data = item.data();
  const photoUrl = stringValue(data.photoUrl || data.photo_url);

  if (isDataImage(photoUrl)) {
    candidates.push({ id: item.id, email: stringValue(data.email), photoUrl });
    continue;
  }

  if (isHttpUrl(photoUrl)) {
    const authUser = await auth.getUser(item.id).catch(() => null);

    if (authUser && authUser.photoURL !== photoUrl) {
      authSyncCandidates.push({ id: item.id, email: stringValue(data.email), photoUrl });
    }
  }
}

if (!shouldRun) {
  console.log(
    JSON.stringify(
      {
        dryRun: true,
        firestoreDatabaseId,
        storageBucketName,
        base64PhotosToUpload: candidates.length,
        authPhotoUrlsToSync: authSyncCandidates.length,
        action: 'Add --confirm to upload profile photos and update Firebase Auth + Firestore.',
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

let uploaded = 0;
let authSynced = 0;

for (const user of candidates) {
  const parsed = parseDataImage(user.photoUrl);
  const token = randomUUID();
  const filePath = `profile-photos/${user.id}/migrated-${Date.now()}-${uploaded}.${parsed.extension}`;
  const file = bucket.file(filePath);

  await file.save(parsed.buffer, {
    resumable: false,
    metadata: {
      contentType: parsed.contentType,
      metadata: {
        firebaseStorageDownloadTokens: token,
        ownerUid: user.id,
        soyibaUserId: user.id,
        soyibaUserEmail: user.email,
      },
    },
  });

  const encodedPath = encodeURIComponent(filePath);
  const nextPhotoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;
  await Promise.all([
    auth.updateUser(user.id, { photoURL: nextPhotoUrl }).catch(() => undefined),
    db.collection('users').doc(user.id).set(
      {
        photoUrl: nextPhotoUrl,
        updatedAt: new Date().toISOString(),
        updatedAtServer: FieldValue.serverTimestamp(),
      },
      { merge: true },
    ),
  ]);
  uploaded += 1;
}

for (const user of authSyncCandidates) {
  await auth.updateUser(user.id, { photoURL: user.photoUrl }).catch(() => undefined);
  authSynced += 1;
}

console.log(
  JSON.stringify(
    {
      firestoreDatabaseId,
      storageBucketName,
      uploaded,
      authSynced,
    },
    null,
    2,
  ),
);

function initializeFirebaseAdmin() {
  if (getApps().length) {
    return;
  }

  if (serviceAccountJson) {
    initializeApp({ credential: cert(JSON.parse(serviceAccountJson)), storageBucket: storageBucketName });
    return;
  }

  if (serviceAccountPath) {
    initializeApp({ credential: cert(JSON.parse(readFileSync(serviceAccountPath, 'utf8'))), storageBucket: storageBucketName });
    return;
  }

  throw new Error(
    'Missing service account. Set FIREBASE_SERVICE_ACCOUNT_PATH, GOOGLE_APPLICATION_CREDENTIALS, or FIREBASE_SERVICE_ACCOUNT_JSON.',
  );
}

function parseDataImage(value) {
  const match = String(value || '').match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i);

  if (!match) {
    throw new Error('Invalid data image.');
  }

  const contentType = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
  const extension = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';

  return {
    contentType,
    extension,
    buffer: Buffer.from(match[2], 'base64'),
  };
}

function isDataImage(value) {
  return /^data:image\/(?:jpeg|jpg|png|webp);base64,/i.test(String(value || ''));
}

function isHttpUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function stringValue(value) {
  return String(value ?? '').trim();
}

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return {};
  }

  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separatorIndex = line.indexOf('=');
        return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)];
      }),
  );
}
