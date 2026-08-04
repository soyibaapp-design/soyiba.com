import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const args = new Set(process.argv.slice(2));
const shouldRun = args.has('--confirm');
const shouldSkipFirestore = args.has('--skip-firestore');
const env = loadEnvFile(resolve(process.cwd(), '.env'));
const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  env.FIREBASE_SERVICE_ACCOUNT_PATH;
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const tsvPath = process.env.SOYIBA_AUTH_TSV_PATH || resolve(process.cwd(), 'TSV', 'Auth.tsv');

const rows = parseTsv(tsvPath)
  .map(normalizeAuthRow)
  .filter((row) => row.email && row.passwordHash && row.salt);

const users = rows.map((row) => ({
  uid: row.id,
  email: row.email,
  emailVerified: true,
  displayName: row.name,
  photoURL: isValidHttpUrl(row.photoUrl) ? row.photoUrl : undefined,
  passwordHash: Buffer.from(row.passwordHash, 'hex'),
  passwordSalt: Buffer.from(`${row.salt}:`, 'utf8'),
  disabled: !row.active,
  customClaims: buildClaims(row),
}));

if (!shouldRun) {
  console.log(
    JSON.stringify(
      {
        dryRun: true,
        source: tsvPath,
        validUsers: users.length,
        skippedRows: parseTsv(tsvPath).length - users.length,
        action: 'Add --confirm to import into Firebase Auth.',
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

initializeFirebaseAdmin();

const auth = getAuth();
const chunks = chunk(users, 1000);
let successCount = 0;
let failureCount = 0;
const errors = [];

for (const userChunk of chunks) {
  const result = await auth.importUsers(userChunk, {
    hash: {
      algorithm: 'SHA256',
      rounds: 1,
    },
  });
  successCount += result.successCount;
  failureCount += result.failureCount;
  errors.push(
    ...result.errors.map((error) => ({
      index: error.index,
      email: userChunk[error.index]?.email || '',
      message: error.error?.message || String(error.error),
    })),
  );
}

if (!shouldSkipFirestore) {
  const db = getFirestore();
  const now = new Date().toISOString();

  for (const rowChunk of chunk(rows, 400)) {
    const batch = db.batch();

    for (const row of rowChunk) {
      batch.set(
        db.collection('users').doc(row.id),
        {
          ...row,
          migratedFrom: 'google-sheets-auth',
          migratedAt: now,
        },
        { merge: true },
      );
    }

    await batch.commit();
  }
}

console.log(
  JSON.stringify(
    {
      source: tsvPath,
      authImported: successCount,
      authFailed: failureCount,
      firestoreProfilesWritten: shouldSkipFirestore ? 0 : rows.length,
      errors,
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

function parseTsv(path) {
  if (!existsSync(path)) {
    throw new Error(`TSV not found: ${path}`);
  }

  const [headerLine, ...lines] = readFileSync(path, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
  const headers = splitTsvLine(headerLine).map((header) => header.trim());

  return lines
    .filter((line) => line.trim())
    .map((line) =>
      Object.fromEntries(
        splitTsvLine(line).map((value, index) => [headers[index] || `column_${index + 1}`, value.trim()]),
      ),
    );
}

function splitTsvLine(line) {
  return String(line || '').split('\t');
}

function normalizeAuthRow(row) {
  const email = stringValue(row.email).toLowerCase();
  const firstName = stringValue(row.first_name || row.firstName);
  const lastName = stringValue(row.last_name || row.lastName);
  const name = stringValue(row.display_name || row.displayName || [firstName, lastName].filter(Boolean).join(' ') || email);
  const estadoUsuario = stringValue(row.estado_usuario || row.estadoUsuario || (row.status === 'active' ? 'Activo' : 'Inactivo')) || 'Activo';
  const rolSistema = stringValue(row.rol_sistema || row.rolSistema || row.role) || 'Usuario';
  const tipoUsuario = stringValue(row.tipo_usuario || row.tipoUsuario) || 'Asistente';
  const tituloUsuario = stringValue(row.titulo_usuario || row.tituloUsuario) || tipoUsuario;

  return {
    id: stringValue(row.user_id || row.id || email),
    email,
    passwordHash: stringValue(row.password_hash || row.passwordHash),
    salt: stringValue(row.salt),
    name,
    firstName,
    lastName,
    phone: stringValue(row.phone),
    role: rolSistema,
    rolSistema,
    tipoUsuario,
    tituloUsuario,
    estadoUsuario,
    status: stringValue(row.status) || (estadoUsuario === 'Activo' ? 'active' : 'inactive'),
    createdAt: stringValue(row.created_at || row.createdAt),
    updatedAt: stringValue(row.updated_at || row.updatedAt),
    lastLoginAt: stringValue(row.last_login_at || row.lastLoginAt),
    fcmToken: stringValue(row.fcm_token || row.fcmToken),
    publicador: toBoolean(row.publicador),
    publicadorEco: toBoolean(row.publicador_eco || row.publicadorEco),
    publicadorEvento: toBoolean(row.publicador_evento || row.publicadorEvento),
    aceptoPoliticaDatos: toBoolean(row.acepto_politica_datos || row.aceptoPoliticaDatos),
    fechaAceptacionPolitica: stringValue(row.fecha_aceptacion_politica || row.fechaAceptacionPolitica),
    active: row.active === undefined || row.active === '' ? estadoUsuario === 'Activo' : toBoolean(row.active),
    tiempoIba: stringValue(row.tiempo_iba || row.tiempoIba),
    verificado: toBoolean(row.usuario_verificado || row.verificado),
    photoUrl: stringValue(row.photo_url || row.photoUrl),
    cc: stringValue(row.cc),
    miembroValidadoAt: stringValue(row.miembro_validado_at || row.miembroValidadoAt),
    miembroValidadoPor: stringValue(row.miembro_validado_por || row.miembroValidadoPor),
    miembroValidacionEstado: stringValue(row.miembro_validacion_estado || row.miembroValidacionEstado),
    miembroValidacionNotas: stringValue(row.miembro_validacion_notas || row.miembroValidacionNotas),
  };
}

function buildClaims(row) {
  return {
    role: row.rolSistema,
    rolSistema: row.rolSistema,
    tipoUsuario: row.tipoUsuario,
    tituloUsuario: row.tituloUsuario,
    estadoUsuario: row.estadoUsuario,
    publicador: row.publicador,
    publicadorEco: row.publicadorEco,
    publicadorEvento: row.publicadorEvento,
    verificado: row.verificado,
  };
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

function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'si', 'sí', 'yes', 'activo', 'active'].includes(String(value ?? '').trim().toLowerCase());
}

function isValidHttpUrl(value) {
  try {
    var url = new URL(String(value || ''));
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
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
