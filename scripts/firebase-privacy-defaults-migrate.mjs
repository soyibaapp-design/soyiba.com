
import { pathToFileURL } from 'node:url';

const args = new Set(process.argv.slice(2));
const shouldRun = args.has('--confirm');
const projectId = process.env.FIREBASE_PROJECT_ID || 'soyiba';
const databaseId = process.env.FIREBASE_FIRESTORE_DATABASE_ID || 'soyibadb';

const accessToken = await getFirebaseCliAccessToken();
const users = await listDocuments('users');
const now = new Date().toISOString();
const summary = {
  dryRun: !shouldRun,
  projectId,
  databaseId,
  usersScanned: users.length,
  usersToUpdate: 0,
  userAlreadyAligned: 0,
  minorContactToRestrict: 0,
  memberDirectoryToUpsert: 0,
  userUpdatesCommitted: 0,
  memberDirectoryUpsertsCommitted: 0,
  sample: [],
};

for (const document of users) {
  const user = decodeDocument(document);
  const id = document.name.split('/').pop();
  const isMinor = isMinorUser(user);
  const nextUser = {
    ...user,
    id,
    visibleDirectorio: true,
    mostrarFoto: true,
    mostrarTelefono: isMinor ? false : user.mostrarTelefono,
    permitirWhatsapp: isMinor ? false : user.permitirWhatsapp,
  };
  const needsMinorContactRestriction = isMinor && (user.mostrarTelefono !== false || user.permitirWhatsapp !== false);
  const needsUserUpdate = user.visibleDirectorio !== true || user.mostrarFoto !== true || needsMinorContactRestriction;
  const eligibleForDirectory = isDirectoryEligibleUser(nextUser);

  if (needsUserUpdate) {
    summary.usersToUpdate += 1;
  } else {
    summary.userAlreadyAligned += 1;
  }

  if (needsMinorContactRestriction) {
    summary.minorContactToRestrict += 1;
  }

  if (eligibleForDirectory) {
    summary.memberDirectoryToUpsert += 1;
  }

  if (summary.sample.length < 12 && (needsUserUpdate || eligibleForDirectory)) {
    summary.sample.push({
      id,
      email: stringValue(user.email),
      name: getDisplayName(user),
      visibleDirectorioBefore: user.visibleDirectorio,
      mostrarFotoBefore: user.mostrarFoto,
      mostrarTelefonoBefore: user.mostrarTelefono,
      permitirWhatsappBefore: user.permitirWhatsapp,
      registroMenorEdad: isMinor,
      memberDirectory: eligibleForDirectory ? 'upsert' : 'skip',
    });
  }

  if (!shouldRun) {
    continue;
  }

  await patchDocument(`users/${id}`, {
    visibleDirectorio: true,
    mostrarFoto: true,
    ...(isMinor
      ? {
          mostrarTelefono: false,
          permitirWhatsapp: false,
        }
      : {}),
    updatedAt: now,
    updatedAtServer: now,
  });
  summary.userUpdatesCommitted += 1;

  if (eligibleForDirectory) {
    await patchDocument(`membersDirectory/${id}`, buildMemberDirectoryDoc(nextUser, now));
    summary.memberDirectoryUpsertsCommitted += 1;
  }
}

console.log(JSON.stringify(summary, null, 2));

async function getFirebaseCliAccessToken() {
  const auth = await import(pathToFileURL('C:/Users/User/AppData/Roaming/npm/node_modules/firebase-tools/lib/auth.js').href);
  const scopes = await import(pathToFileURL('C:/Users/User/AppData/Roaming/npm/node_modules/firebase-tools/lib/scopes.js').href);
  const account = auth.getGlobalDefaultAccount();

  if (!account?.tokens?.refresh_token) {
    throw new Error('No hay sesion activa de Firebase CLI. Ejecuta firebase login.');
  }

  const token = await auth.getAccessToken(account.tokens.refresh_token, [
    scopes.CLOUD_PLATFORM,
    scopes.FIREBASE_PLATFORM,
    scopes.OPENID,
    scopes.EMAIL,
  ]);

  return token.access_token;
}

async function listDocuments(collectionPath) {
  const docs = [];
  let pageToken = '';

  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/${collectionPath}`,
    );
    url.searchParams.set('pageSize', '300');
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Firestore list ${collectionPath} failed: ${response.status} ${await response.text()}`);
    }

    const body = await response.json();
    docs.push(...(body.documents || []));
    pageToken = body.nextPageToken || '';
  } while (pageToken);

  return docs;
}

async function patchDocument(path, values) {
  const url = new URL(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/${path}`);
  const fields = Object.keys(values);

  for (const field of fields) {
    url.searchParams.append('updateMask.fieldPaths', field);
  }

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: encodeFields(values),
    }),
  });

  if (!response.ok) {
    throw new Error(`Firestore patch ${path} failed: ${response.status} ${await response.text()}`);
  }
}

function buildMemberDirectoryDoc(user, updatedAt) {
  const isMinor = isMinorUser(user);
  const mostrarTelefono = isMinor ? false : booleanValue(user.mostrarTelefono);
  const permitirWhatsapp = isMinor ? false : booleanValue(user.permitirWhatsapp);

  return {
    id: user.id,
    nombre: stringValue(user.firstName) || getFirstNameFromDisplay(user.name),
    apellido: stringValue(user.lastName) || getLastNameFromDisplay(user.name),
    fotoUrl: stringValue(user.photoUrl),
    telefono: mostrarTelefono && permitirWhatsapp ? stringValue(user.phone) : '',
    rol: stringValue(user.rolSistema) || stringValue(user.role) || 'Miembro',
    rolSistema: stringValue(user.rolSistema) || stringValue(user.role) || 'Miembro',
    tituloUsuario: stringValue(user.tituloUsuario) || stringValue(user.tipoUsuario) || 'Miembro',
    tipoUsuario: 'Miembro',
    ministerio: '',
    grupoEco: '',
    sector: '',
    tiempoEnIBA: stringValue(user.tiempoIba),
    visibleDirectorio: true,
    mostrarTelefono,
    permitirWhatsapp,
    mostrarFoto: true,
    mostrarMinisterio: false,
    mostrarGrupoEco: false,
    verificado: booleanValue(user.verificado),
    estado: stringValue(user.estadoUsuario) || 'Activo',
    fechaRegistro: stringValue(user.createdAt),
    fechaActualizacion: updatedAt,
    updatedAtServer: updatedAt,
  };
}

function isDirectoryEligibleUser(user) {
  return isActiveUser(user) && normalizeText(user.tipoUsuario) === 'miembro' && user.visibleDirectorio === true;
}

function isMinorUser(user) {
  return booleanValue(user.registroMenorEdad ?? user.registro_menor_edad);
}

function isActiveUser(user) {
  const active = user.active === undefined ? normalizeText(user.estadoUsuario || 'Activo') === 'activo' : booleanValue(user.active);
  return active && ['activo', 'active'].includes(normalizeText(user.estadoUsuario || user.status || 'Activo'));
}

function decodeDocument(document) {
  const record = {};

  for (const [key, value] of Object.entries(document.fields || {})) {
    record[key] = decodeValue(value);
  }

  return record;
}

function decodeValue(value) {
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeValue);
  if ('mapValue' in value) return decodeDocument({ fields: value.mapValue.fields || {} });
  return undefined;
}

function encodeFields(values) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, encodeValue(key, value)]));
}

function encodeValue(key, value) {
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (value === null || value === undefined) return { nullValue: null };
  if (key === 'updatedAtServer' && typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) return { timestampValue: value };
  return { stringValue: String(value) };
}

function getDisplayName(user) {
  return [stringValue(user.firstName), stringValue(user.lastName)].filter(Boolean).join(' ').trim() || stringValue(user.name) || stringValue(user.email);
}

function getFirstNameFromDisplay(value) {
  return stringValue(value).split(/\s+/)[0] || '';
}

function getLastNameFromDisplay(value) {
  return stringValue(value).split(/\s+/).slice(1).join(' ');
}

function booleanValue(value) {
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'si', 'sí', 'yes', 'activo', 'active'].includes(normalizeText(value));
}

function stringValue(value) {
  return String(value ?? '').trim();
}

function normalizeText(value) {
  return stringValue(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
