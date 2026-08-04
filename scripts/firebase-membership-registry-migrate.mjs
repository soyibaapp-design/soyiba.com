import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const args = new Set(process.argv.slice(2));
const shouldRun = args.has('--confirm');
const shouldDeleteUserCc = args.has('--delete-user-cc');
const shouldReadGoogleSheet = args.has('--from-google-sheet');
const shouldReplaceRegistry = args.has('--replace-registry');
const env = loadEnvFile(resolve(process.cwd(), '.env'));
const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  env.FIREBASE_SERVICE_ACCOUNT_PATH;
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const tsvPath = process.env.SOYIBA_MIEMBROS_IBA_TSV_PATH || resolve(process.cwd(), 'TSV', 'MiembrosIBA.tsv');
const firestoreDatabaseId = process.env.FIREBASE_FIRESTORE_DATABASE_ID || env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || 'soyibadb';
const miembrosIbaSpreadsheetId =
  process.env.SOYIBA_MIEMBROS_IBA_SPREADSHEET_ID ||
  env.SOYIBA_MIEMBROS_IBA_SPREADSHEET_ID ||
  '1Sk6f6mScrMTcXfa-psxoY4boa_1gqJmFt7anP-lpErM';
const miembrosIbaSheetGid = Number(process.env.SOYIBA_MIEMBROS_IBA_GID || env.SOYIBA_MIEMBROS_IBA_GID || '1721819683');

const registryRows = await loadRegistryRows();

if (!shouldRun) {
  console.log(
    JSON.stringify(
      {
        dryRun: true,
        source: shouldReadGoogleSheet ? `google-sheet:${miembrosIbaSpreadsheetId}:${miembrosIbaSheetGid}` : tsvPath,
        registryRows: registryRows.length,
        firestoreDatabaseId,
        replaceRegistry: shouldReplaceRegistry,
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
const existingRegistrySnapshot = await db.collection('memberRegistry').get();
const now = new Date().toISOString();
const registryRecords = new Map();
const existingRegistryRecords = new Map(existingRegistrySnapshot.docs.map((item) => [item.id, item.data()]));

for (const row of registryRows) {
  const ccHash = sha256Hex(row.cc);
  const existing = existingRegistryRecords.get(ccHash) || {};
  const claimedUserId = row.claimedUserId || stringValue(existing.claimedUserId);
  const claimedEmailHash = row.claimedEmail ? sha256Hex(row.claimedEmail) : stringValue(existing.claimedEmailHash);
  const claimedAt = row.claimedAt || stringValue(existing.claimedAt);
  const claimStatus = row.claimStatus || stringValue(existing.claimStatus);
  const claimNotes = row.claimNotes || stringValue(existing.claimNotes);
  registryRecords.set(ccHash, {
    ccHash,
    ccLast4: row.cc.slice(-4),
    emailHash: row.email ? sha256Hex(row.email) : '',
    estado: row.estado || 'Activo',
    active: isActiveState(row.estado || 'Activo'),
    ...(claimedUserId ? { claimedUserId } : {}),
    ...(claimedEmailHash ? { claimedEmailHash } : {}),
    ...(claimedAt ? { claimedAt } : {}),
    ...(claimStatus ? { claimStatus } : {}),
    ...(claimNotes ? { claimNotes } : {}),
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

    if (registryRecords.has(ccHash)) {
      const existing = registryRecords.get(ccHash);
      registryRecords.set(ccHash, {
        ...existing,
        emailHash: existing.emailHash || emailHash,
        claimedUserId: existing.claimedUserId || item.id,
        claimedEmailHash: existing.claimedEmailHash || emailHash,
        claimedAt: existing.claimedAt || stringValue(data.miembroValidadoAt || data.updatedAt || now),
        claimStatus: existing.claimStatus || stringValue(data.miembroValidacionEstado || 'validado'),
        claimNotes: existing.claimNotes || stringValue(data.miembroValidacionNotas),
      });
    }
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
let registryDeleted = 0;
let usersUpdated = 0;

for (const recordChunk of chunk(Array.from(registryRecords.values()), 400)) {
  const batch = db.batch();

  for (const record of recordChunk) {
    batch.set(db.collection('memberRegistry').doc(record.ccHash), record, { merge: true });
    registryWritten += 1;
  }

  await batch.commit();
}

if (shouldReplaceRegistry) {
  const registryIds = new Set(registryRecords.keys());

  for (const staleChunk of chunk(
    existingRegistrySnapshot.docs.filter((item) => !registryIds.has(item.id)),
    400,
  )) {
    const batch = db.batch();

    for (const item of staleChunk) {
      batch.delete(item.ref);
      registryDeleted += 1;
    }

    await batch.commit();
  }
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
      source: shouldReadGoogleSheet ? `google-sheet:${miembrosIbaSpreadsheetId}:${miembrosIbaSheetGid}` : tsvPath,
      firestoreDatabaseId,
      registryRows: registryRows.length,
      registryWritten,
      registryDeleted,
      existingRegistryBefore: existingRegistrySnapshot.size,
      usersScanned: usersSnapshot.size,
      usersUpdated,
      deletedRawUserCc: shouldDeleteUserCc,
      replacedRegistry: shouldReplaceRegistry,
    },
    null,
    2,
  ),
  );

async function loadRegistryRows() {
  const rows = shouldReadGoogleSheet ? await readRegistryRowsFromGoogleSheet() : parseTsvIfExists(tsvPath);
  return rows.map(normalizeRegistryRow).filter((row) => row.cc);
}

async function readRegistryRowsFromGoogleSheet() {
  const token = await getGoogleAccessToken();
  const metadata = await googleApiRequest(
    `https://sheets.googleapis.com/v4/spreadsheets/${miembrosIbaSpreadsheetId}?fields=sheets(properties(sheetId,title,gridProperties(rowCount,columnCount)))`,
    token,
  );
  const sheet = metadata.sheets
    ?.map((item) => item.properties)
    .find((properties) => Number(properties.sheetId) === miembrosIbaSheetGid);

  if (!sheet?.title) {
    throw new Error(`Sheet gid not found: ${miembrosIbaSheetGid}`);
  }

  const columnCount = Math.max(12, Math.min(Number(sheet.gridProperties?.columnCount || 26), 52));
  const endColumn = columnName(columnCount);
  const range = `${quoteSheetName(sheet.title)}!A:${endColumn}`;
  const values = await googleApiRequest(
    `https://sheets.googleapis.com/v4/spreadsheets/${miembrosIbaSpreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`,
    token,
  );
  const [headers = [], ...lines] = values.values || [];
  const normalizedHeaders = headers.map((header) => normalizeHeader(header));

  return lines
    .filter((line) => line.some((value) => stringValue(value)))
    .map((line) =>
      Object.fromEntries(
        line.map((value, index) => [normalizedHeaders[index] || `column_${index + 1}`, stringValue(value)]),
      ),
    );
}

async function getGoogleAccessToken() {
  const { GoogleAuth } = await import('google-auth-library');
  const credentials = serviceAccountJson ? JSON.parse(serviceAccountJson) : undefined;
  const auth = credentials
    ? new GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] })
    : new GoogleAuth({ keyFile: serviceAccountPath, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  return accessToken.token;
}

async function googleApiRequest(url, token) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  const text = await response.text();
  let body;

  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  if (!response.ok) {
    throw new Error(
      `Google Sheets API ${response.status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`,
    );
  }

  return body;
}

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

function quoteSheetName(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function columnName(position) {
  let name = '';
  let value = position;

  while (value > 0) {
    value -= 1;
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26);
  }

  return name || 'Z';
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
