import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const args = new Set(process.argv.slice(2));
const shouldRun = args.has('--confirm');
const shouldDeleteUserCc = args.has('--delete-user-cc');
const env = loadEnvFile(resolve(process.cwd(), '.env'));
const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  env.FIREBASE_SERVICE_ACCOUNT_PATH;
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const tsvPath = process.env.SOYIBA_MIEMBROS_IBA_TSV_PATH || resolve(process.cwd(), 'TSV', 'MiembrosIBA.tsv');
const firestoreDatabaseId = process.env.FIREBASE_FIRESTORE_DATABASE_ID || env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || 'soyibadb';

const registryRows = parseTsvIfExists(tsvPath).map(normalizeRegistryRow).filter((row) => row.cc);

if (!shouldRun) {
  console.log(
    JSON.stringify(
      {
        dryRun: true,
        source: tsvPath,
        registryRows: registryRows.length,
        firestoreDatabaseId,
        action: 'Add --confirm to import into Firebase Firestore.',
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

initializeFirebaseAdmin();

const db = getFirestore(firestoreDatabaseId);
const usersSnapshot = await db.collection('users').get();
const now = new Date().toISOString();
const registryRecords = new Map();

for (const row of registryRows) {
  const ccHash = sha256Hex(row.cc);
  registryRecords.set(ccHash, {
    ccHash,
    ccLast4: row.cc.slice(-4),
    emailHash: row.email ? sha256Hex(row.email) : '',
    estado: row.estado || 'Activo',
    active: isActiveState(row.estado || 'Activo'),
    claimedUserId: row.claimedUserId,
    claimedEmailHash: row.claimedEmail ? sha256Hex(row.claimedEmail) : '',
    claimedAt: row.claimedAt,
    claimStatus: row.claimStatus,
    claimNotes: row.claimNotes,
    source: 'google-sheets-miembrosiba',
    migratedAt: now,
  });
}

const userPatches = new Map();

for (const item of usersSnapshot.docs) {
  const data = item.data();
  const normalizedEmail = stringValue(data.email).toLowerCase();
  const emailHash = normalizedEmail ? sha256Hex(normalizedEmail) : '';
  const cc = normalizeCc(data.cc);
  const patch = {};

  if (emailHash && data.emailHash !== emailHash) {
    patch.emailHash = emailHash;
  }

  if (cc) {
    const ccHash = sha256Hex(cc);
    patch.ccHash = ccHash;
    patch.ccLast4 = cc.slice(-4);

    const existing = registryRecords.get(ccHash) || {};
    registryRecords.set(ccHash, {
      ccHash,
      ccLast4: cc.slice(-4),
      emailHash: existing.emailHash || emailHash,
      estado: existing.estado || 'Activo',
      active: existing.active === undefined ? true : existing.active,
      claimedUserId: existing.claimedUserId || item.id,
      claimedEmailHash: existing.claimedEmailHash || emailHash,
      claimedAt: existing.claimedAt || stringValue(data.miembroValidadoAt || data.updatedAt || now),
      claimStatus: existing.claimStatus || stringValue(data.miembroValidacionEstado || 'validado'),
      claimNotes: existing.claimNotes || stringValue(data.miembroValidacionNotas),
      source: existing.source || 'firebase-users-existing-claim',
      migratedAt: existing.migratedAt || now,
    });
  }

  if (shouldDeleteUserCc && data.cc !== undefined) {
    patch.cc = FieldValue.delete();
  }

  if (Object.keys(patch).length) {
    patch.updatedAtServer = FieldValue.serverTimestamp();
    userPatches.set(item.id, patch);
  }
}

let registryWritten = 0;
let usersUpdated = 0;

for (const recordChunk of chunk(Array.from(registryRecords.values()), 400)) {
  const batch = db.batch();

  for (const record of recordChunk) {
    batch.set(db.collection('memberRegistry').doc(record.ccHash), record, { merge: true });
    registryWritten += 1;
  }

  await batch.commit();
}

for (const userChunk of chunk(Array.from(userPatches.entries()), 400)) {
  const batch = db.batch();

  for (const [userId, patch] of userChunk) {
    batch.set(db.collection('users').doc(userId), patch, { merge: true });
    usersUpdated += 1;
  }

  await batch.commit();
}

console.log(
  JSON.stringify(
    {
      source: tsvPath,
      firestoreDatabaseId,
      registryRows: registryRows.length,
      registryWritten,
      usersScanned: usersSnapshot.size,
      usersUpdated,
      deletedRawUserCc: shouldDeleteUserCc,
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
    initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
    return;
  }

  if (serviceAccountPath) {
    initializeApp({ credential: cert(JSON.parse(readFileSync(serviceAccountPath, 'utf8'))) });
    return;
  }

  throw new Error(
    'Missing service account. Set FIREBASE_SERVICE_ACCOUNT_PATH, GOOGLE_APPLICATION_CREDENTIALS, or FIREBASE_SERVICE_ACCOUNT_JSON.',
  );
}

function parseTsvIfExists(path) {
  if (!existsSync(path)) {
    return [];
  }

  const [headerLine, ...lines] = readFileSync(path, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
  const headers = splitTsvLine(headerLine).map((header) => normalizeHeader(header));

  return lines
    .filter((line) => line.trim())
    .map((line) =>
      Object.fromEntries(
        splitTsvLine(line).map((value, index) => [headers[index] || `column_${index + 1}`, value.trim()]),
      ),
    );
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
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

function splitTsvLine(line) {
  return String(line || '').split('\t');
}

function normalizeRegistryRow(row) {
  return {
    cc: normalizeCc(valueFrom(row.cc, row.cedula, row.cedula_ciudadania, row.documento, row.numero_documento)),
    email: stringValue(valueFrom(row.email, row.correo, row.correo_electronico, row.correo_electronico)).toLowerCase(),
    estado: stringValue(valueFrom(row.estado, row.status)) || 'Activo',
    claimedUserId: stringValue(valueFrom(row.claimed_user_id, row.claimedUserId)),
    claimedEmail: stringValue(valueFrom(row.claimed_email, row.claimedEmail)).toLowerCase(),
    claimedAt: stringValue(valueFrom(row.claimed_at, row.claimedAt)),
    claimStatus: stringValue(valueFrom(row.claim_status, row.claimStatus)),
    claimNotes: stringValue(valueFrom(row.claim_notes, row.claimNotes)),
  };
}

function normalizeHeader(value) {
  return stringValue(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeCc(value) {
  return stringValue(value).replace(/\D/g, '');
}

function isActiveState(value) {
  const normalized = normalizeHeader(value);
  return normalized === 'activo' || normalized === 'active' || normalized === '';
}

function sha256Hex(value) {
  return createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function chunk(items, size) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function stringValue(value) {
  return String(value ?? '').trim();
}

function valueFrom(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');
}
