import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const args = new Set(process.argv.slice(2));
const shouldRun = args.has('--confirm');
const env = loadEnvFile(resolve(process.cwd(), '.env'));
const webApiKey = process.env.FIREBASE_WEB_API_KEY || env.VITE_FIREBASE_API_KEY;
const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  env.FIREBASE_SERVICE_ACCOUNT_PATH;
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

const password = process.env.FIREBASE_IMPORT_TEST_PASSWORD || 'SoyibaTest#2026!';
const salt = process.env.FIREBASE_IMPORT_TEST_SALT || 'soyiba-migration-smoke-salt';
const timestamp = Date.now();

const variants = [
  {
    name: 'current_soyiba_hash_with_salt_colon',
    email: `soyiba-auth-import-current-${timestamp}@example.com`,
    passwordHash: hexToBuffer(sha256Hex(`${salt}:${password}`)),
    passwordSalt: Buffer.from(`${salt}:`, 'utf8'),
    expectation: 'Passes only if Firebase SHA256 applies salt before password.',
  },
  {
    name: 'current_soyiba_hash_with_plain_salt',
    email: `soyiba-auth-import-plain-${timestamp}@example.com`,
    passwordHash: hexToBuffer(sha256Hex(`${salt}:${password}`)),
    passwordSalt: Buffer.from(salt, 'utf8'),
    expectation: 'Checks whether Firebase can match the exact stored hash with plain salt.',
  },
  {
    name: 'firebase_sha256_control_password_then_salt',
    email: `soyiba-auth-import-control-${timestamp}@example.com`,
    passwordHash: hexToBuffer(sha256Hex(`${password}${salt}`)),
    passwordSalt: Buffer.from(salt, 'utf8'),
    expectation: 'Control case for Firebase SHA256 password+salt behavior.',
  },
];

if (!shouldRun) {
  console.log('Dry run only. Add --confirm to create temporary Firebase Auth users and delete them after the test.');
  printPlan();
  process.exit(0);
}

if (!webApiKey) {
  throw new Error('Missing Firebase web API key. Set FIREBASE_WEB_API_KEY or VITE_FIREBASE_API_KEY in .env.');
}

initializeFirebaseAdmin();

const auth = getAuth();
const users = variants.map((variant) => ({
  uid: `soyiba-auth-import-${variant.name}-${timestamp}`.slice(0, 128),
  email: variant.email,
  emailVerified: true,
  passwordHash: variant.passwordHash,
  passwordSalt: variant.passwordSalt,
  disabled: false,
}));

try {
  console.log('Importing temporary users...');
  const result = await auth.importUsers(users, {
    hash: {
      algorithm: 'SHA256',
      rounds: 1,
    },
  });

  console.log(
    JSON.stringify(
      {
        importSuccessCount: result.successCount,
        importFailureCount: result.failureCount,
        importErrors: result.errors.map((error) => ({
          index: error.index,
          message: error.error?.message || String(error.error),
        })),
      },
      null,
      2,
    ),
  );

  const signInResults = [];

  for (const variant of variants) {
    signInResults.push(await signInWithPassword(variant.email, password));
  }

  console.log(JSON.stringify({ signInResults }, null, 2));
  printConclusion(signInResults);
} finally {
  console.log('Deleting temporary users...');
  await auth.deleteUsers(users.map((user) => user.uid));
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

async function signInWithPassword(email, passwordValue) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${webApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password: passwordValue,
      returnSecureToken: true,
    }),
  });
  const body = await response.json().catch(() => ({}));

  return {
    email,
    ok: response.ok,
    status: response.status,
    error: body.error?.message || '',
  };
}

function printPlan() {
  console.log(
    JSON.stringify(
      {
        hashUsedBySoyiba: "SHA256(salt + ':' + password)",
        firebaseImportHashOptions: { algorithm: 'SHA256', rounds: 1 },
        variants: variants.map(({ name, email, expectation }) => ({ name, email, expectation })),
      },
      null,
      2,
    ),
  );
}

function printConclusion(signInResults) {
  if (signInResults.some((result) => result.error === 'PASSWORD_LOGIN_DISABLED')) {
    console.log('CONCLUSION: Email/password sign-in is disabled in Firebase Auth. Enable it and run this test again.');
    return;
  }

  const currentCompatible = signInResults.some(
    (result) => result.ok && result.email.includes('soyiba-auth-import-current-'),
  );
  const controlCompatible = signInResults.some(
    (result) => result.ok && result.email.includes('soyiba-auth-import-control-'),
  );

  if (currentCompatible) {
    console.log('CONCLUSION: The current SOYIBA hash can be imported directly into Firebase Auth.');
    return;
  }

  if (controlCompatible) {
    console.log(
      'CONCLUSION: Firebase SHA256 import works, but the current SOYIBA salt/password order is not directly compatible.',
    );
    return;
  }

  console.log('CONCLUSION: SHA256 import did not authenticate any tested variant. Use password reset migration.');
}

function sha256Hex(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function hexToBuffer(value) {
  return Buffer.from(value, 'hex');
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
