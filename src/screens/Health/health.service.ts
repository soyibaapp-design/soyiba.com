import { useEffect, useRef } from 'react';
import { callAppsScript } from '../../services/appsScriptClient';
import { getClientCallSnapshot } from '../../services/clientActivity';
import type { SoyibaSession, SoyibaUser } from '../Auth/auth.service';

export type HealthSessionRecord = {
  sessionId: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  status: string;
  startedAt: string;
  lastSeenAt: string;
  endedAt: string;
  revokedAt: string;
  revokedByEmail: string;
  revokeReason: string;
  ipAddress: string;
  userAgent: string;
  page: string;
  activeCallCount: number;
  callSummary: string;
};

export type HealthCallsByUser = {
  userId: string;
  email: string;
  name: string;
  activeCallCount: number;
  sessionCount: number;
};

export type HealthDashboard = {
  generatedAt: string;
  activeUsers: number;
  activeSessions: number;
  activeCalls: number;
  sessions: HealthSessionRecord[];
  callsByUser: HealthCallsByUser[];
};

type HealthDashboardResponse = {
  ok: boolean;
  dashboard?: HealthDashboard;
  error?: string;
};

type HealthHeartbeatResponse = {
  ok: boolean;
  sessionRevoked?: boolean;
  revokedAt?: string;
  message?: string;
  error?: string;
};

type ForceLogoutResponse = {
  ok: boolean;
  revokedCount?: number;
  error?: string;
};

const HEARTBEAT_INTERVAL_MS = 15000;
const CLIENT_IP_CACHE_KEY = 'soyiba.health.clientIp';
const LOCAL_HEALTH_STORAGE_KEY = 'soyiba.localHealthSessions';
const SESSION_ID_PREFIX = 'soyiba.health.session';
const ACTIVE_WINDOW_MS = 2 * 60 * 1000;

export function useSoyibaHealthTelemetry(
  session: SoyibaSession | null,
  onForcedLogout: (message: string) => void,
) {
  const forcedLogoutRef = useRef(onForcedLogout);
  forcedLogoutRef.current = onForcedLogout;

  useEffect(() => {
    if (!session || session.token === 'public-viewer' || (!session.user.id && !session.user.email)) {
      return;
    }

    const activeSession = session;
    let cancelled = false;

    async function heartbeat(reason: string) {
      try {
        const response = await sendHealthHeartbeat(activeSession, reason);

        if (!cancelled && response.sessionRevoked) {
          forcedLogoutRef.current(response.message || 'Tu sesion fue cerrada por un administrador.');
        }
      } catch {
        // Health telemetry should never interrupt normal use of the app.
      }
    }

    heartbeat('start');
    const interval = window.setInterval(() => heartbeat('heartbeat'), HEARTBEAT_INTERVAL_MS);

    function handleVisible() {
      if (document.visibilityState === 'visible') {
        heartbeat('visible');
      }
    }

    window.addEventListener('focus', handleVisible);
    document.addEventListener('visibilitychange', handleVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', handleVisible);
      document.removeEventListener('visibilitychange', handleVisible);
      endHealthSession(activeSession).catch(() => undefined);
    };
  }, [session?.token, session?.user.id, session?.user.email]);
}

export async function getHealthDashboard(session: SoyibaSession): Promise<HealthDashboard> {
  const response = await callAppsScript<HealthDashboardResponse>(
    'Auth',
    'healthDashboard',
    {
      token: session.token,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
    },
    () => ({
      ok: true,
      dashboard: buildLocalHealthDashboard(),
    }),
  );

  if (!response.ok || !response.dashboard) {
    throw new Error(response.error || 'No fue posible cargar el health de la app.');
  }

  return normalizeDashboard(response.dashboard);
}

export async function forceLogoutHealthSessions(session: SoyibaSession, sessionIds: string[]) {
  const response = await callAppsScript<ForceLogoutResponse>(
    'Auth',
    'forceLogoutSessions',
    {
      token: session.token,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      sessionIds,
      reason: 'Cerrada desde Health SOY IBA',
    },
    () => forceLogoutLocalSessions(sessionIds),
  );

  if (!response.ok) {
    throw new Error(response.error || 'No fue posible cerrar las sesiones seleccionadas.');
  }

  return Number(response.revokedCount || 0);
}

async function sendHealthHeartbeat(session: SoyibaSession, reason: string): Promise<HealthHeartbeatResponse> {
  const sessionId = getClientSessionId(session);
  const ipAddress = await resolveClientIp();
  const callSnapshot = getClientCallSnapshot();
  const payload = {
    token: session.token,
    sessionId,
    userId: session.user.id,
    email: session.user.email,
    displayName: getDisplayName(session.user),
    role: session.user.rolSistema || session.user.role || 'Usuario',
    ipAddress,
    userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
    page: getCurrentPage(),
    reason,
    activeCallCount: callSnapshot.activeCallCount,
    callSummary: JSON.stringify(callSnapshot.activeCallsByAction),
    totalCalls: callSnapshot.totalCalls,
  };

  return callAppsScript<HealthHeartbeatResponse>(
    'Auth',
    'healthPing',
    payload,
    () => upsertLocalHealthSession(payload, session),
    { timeoutMs: 10000 },
  );
}

async function endHealthSession(session: SoyibaSession) {
  const sessionId = getClientSessionId(session);

  await callAppsScript(
    'Auth',
    'endHealthSession',
    {
      token: session.token,
      sessionId,
      userId: session.user.id,
      email: session.user.email,
    },
    () => endLocalHealthSession(sessionId),
    { timeoutMs: 6000 },
  );
}

function getClientSessionId(session: SoyibaSession) {
  const identity = [session.token, session.user.id || session.user.email].filter(Boolean).join('|');
  const storageKey = `${SESSION_ID_PREFIX}.${hashText(identity)}`;

  if (typeof window === 'undefined') {
    return `memory-${hashText(identity)}-${Date.now()}`;
  }

  try {
    const stored = window.localStorage.getItem(storageKey);

    if (stored) {
      return stored;
    }

    const nextId = createUuid();
    window.localStorage.setItem(storageKey, nextId);
    return nextId;
  } catch {
    return `memory-${hashText(identity)}-${Date.now()}`;
  }
}

async function resolveClientIp() {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    const cached = JSON.parse(window.localStorage.getItem(CLIENT_IP_CACHE_KEY) || 'null') as { ip?: string; expiresAt?: number } | null;

    if (cached?.ip && Number(cached.expiresAt || 0) > Date.now()) {
      return cached.ip;
    }
  } catch {
    // Continue and try to resolve it again.
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 2200);

  try {
    const response = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
    const payload = (await response.json()) as { ip?: string };
    const ip = String(payload.ip || '').trim();

    if (ip) {
      window.localStorage.setItem(CLIENT_IP_CACHE_KEY, JSON.stringify({ ip, expiresAt: Date.now() + 10 * 60 * 1000 }));
    }

    return ip;
  } catch {
    return '';
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function getCurrentPage() {
  if (typeof window === 'undefined') {
    return '';
  }

  return `${window.location.pathname}${window.location.hash || ''}`;
}

function upsertLocalHealthSession(
  payload: {
    sessionId: string;
    userId: string;
    email: string;
    displayName: string;
    role: string;
    ipAddress: string;
    userAgent: string;
    page: string;
    activeCallCount: number;
    callSummary: string;
  },
  session: SoyibaSession,
): HealthHeartbeatResponse {
  const sessions = readLocalHealthSessions();
  const now = new Date().toISOString();
  const existing = sessions.find((item) => item.sessionId === payload.sessionId);

  if (existing?.revokedAt) {
    return {
      ok: true,
      sessionRevoked: true,
      revokedAt: existing.revokedAt,
      message: existing.revokeReason || 'Tu sesion fue cerrada por un administrador.',
    };
  }

  const nextRecord: HealthSessionRecord = normalizeSessionRecord({
    ...(existing || {}),
    sessionId: payload.sessionId,
    userId: payload.userId || session.user.id || session.user.email,
    email: payload.email || session.user.email,
    name: payload.displayName || getDisplayName(session.user),
    role: payload.role || session.user.rolSistema || session.user.role || 'Usuario',
    status: 'active',
    startedAt: existing?.startedAt || now,
    lastSeenAt: now,
    endedAt: '',
    revokedAt: '',
    revokedByEmail: '',
    revokeReason: '',
    ipAddress: payload.ipAddress,
    userAgent: payload.userAgent,
    page: payload.page,
    activeCallCount: payload.activeCallCount,
    callSummary: payload.callSummary,
  });
  const nextSessions = existing
    ? sessions.map((item) => (item.sessionId === payload.sessionId ? nextRecord : item))
    : [nextRecord, ...sessions];

  writeLocalHealthSessions(nextSessions.slice(0, 80));
  return { ok: true };
}

function endLocalHealthSession(sessionId: string) {
  const now = new Date().toISOString();
  writeLocalHealthSessions(
    readLocalHealthSessions().map((item) =>
      item.sessionId === sessionId ? normalizeSessionRecord({ ...item, endedAt: now, status: 'ended', activeCallCount: 0 }) : item,
    ),
  );
  return { ok: true };
}

function forceLogoutLocalSessions(sessionIds: string[]): ForceLogoutResponse {
  const selected = new Set(sessionIds);
  const now = new Date().toISOString();
  let revokedCount = 0;

  writeLocalHealthSessions(
    readLocalHealthSessions().map((item) => {
      if (!selected.has(item.sessionId) || item.revokedAt) {
        return item;
      }

      revokedCount += 1;
      return normalizeSessionRecord({
        ...item,
        revokedAt: now,
        status: 'revoked',
        revokeReason: 'Cerrada desde Health SOY IBA',
        activeCallCount: 0,
      });
    }),
  );

  return { ok: true, revokedCount };
}

function buildLocalHealthDashboard(): HealthDashboard {
  const now = Date.now();
  const sessions = readLocalHealthSessions()
    .filter((item) => isActiveSession(item, now))
    .sort((left, right) => new Date(right.lastSeenAt).getTime() - new Date(left.lastSeenAt).getTime());
  const callsByUser = aggregateCallsByUser(sessions);

  return {
    generatedAt: new Date().toISOString(),
    activeUsers: callsByUser.length,
    activeSessions: sessions.length,
    activeCalls: sessions.reduce((total, item) => total + item.activeCallCount, 0),
    sessions,
    callsByUser,
  };
}

function readLocalHealthSessions(): HealthSessionRecord[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(LOCAL_HEALTH_STORAGE_KEY);
    const parsed = stored ? (JSON.parse(stored) as Array<Partial<HealthSessionRecord>>) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeSessionRecord) : [];
  } catch {
    return [];
  }
}

function writeLocalHealthSessions(sessions: HealthSessionRecord[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(LOCAL_HEALTH_STORAGE_KEY, JSON.stringify(sessions.map(normalizeSessionRecord)));
  } catch {
    // Local storage can be disabled in private contexts.
  }
}

function normalizeDashboard(dashboard: Partial<HealthDashboard>): HealthDashboard {
  const sessions = Array.isArray(dashboard.sessions) ? dashboard.sessions.map(normalizeSessionRecord) : [];
  const callsByUser = Array.isArray(dashboard.callsByUser)
    ? dashboard.callsByUser.map((item) => ({
        userId: stringValue(item.userId),
        email: stringValue(item.email),
        name: stringValue(item.name || item.email || item.userId || 'Usuario SOY IBA'),
        activeCallCount: numberValue(item.activeCallCount),
        sessionCount: numberValue(item.sessionCount),
      }))
    : aggregateCallsByUser(sessions);

  return {
    generatedAt: stringValue(dashboard.generatedAt) || new Date().toISOString(),
    activeUsers: numberValue(dashboard.activeUsers || callsByUser.length),
    activeSessions: numberValue(dashboard.activeSessions || sessions.length),
    activeCalls: numberValue(dashboard.activeCalls || sessions.reduce((total, item) => total + item.activeCallCount, 0)),
    sessions,
    callsByUser,
  };
}

function normalizeSessionRecord(record: Partial<HealthSessionRecord>): HealthSessionRecord {
  return {
    sessionId: stringValue(record.sessionId),
    userId: stringValue(record.userId),
    email: stringValue(record.email).toLowerCase(),
    name: stringValue(record.name || record.email || 'Usuario SOY IBA'),
    role: stringValue(record.role || 'Usuario'),
    status: stringValue(record.status || 'active'),
    startedAt: stringValue(record.startedAt),
    lastSeenAt: stringValue(record.lastSeenAt),
    endedAt: stringValue(record.endedAt),
    revokedAt: stringValue(record.revokedAt),
    revokedByEmail: stringValue(record.revokedByEmail),
    revokeReason: stringValue(record.revokeReason),
    ipAddress: stringValue(record.ipAddress),
    userAgent: stringValue(record.userAgent),
    page: stringValue(record.page),
    activeCallCount: numberValue(record.activeCallCount),
    callSummary: stringValue(record.callSummary),
  };
}

function aggregateCallsByUser(sessions: HealthSessionRecord[]): HealthCallsByUser[] {
  const byUser = new Map<string, HealthCallsByUser>();

  sessions.forEach((session) => {
    const key = session.userId || session.email || session.name;
    const current = byUser.get(key) || {
      userId: session.userId,
      email: session.email,
      name: session.name,
      activeCallCount: 0,
      sessionCount: 0,
    };

    current.activeCallCount += session.activeCallCount;
    current.sessionCount += 1;
    byUser.set(key, current);
  });

  return Array.from(byUser.values()).sort((left, right) => right.activeCallCount - left.activeCallCount || left.name.localeCompare(right.name));
}

function isActiveSession(session: HealthSessionRecord, now: number) {
  const lastSeenAt = new Date(session.lastSeenAt).getTime();
  return !session.revokedAt && !session.endedAt && Number.isFinite(lastSeenAt) && now - lastSeenAt <= ACTIVE_WINDOW_MS;
}

function getDisplayName(user: SoyibaUser) {
  return user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Usuario SOY IBA';
}

function createUuid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function hashText(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
}

function stringValue(value: unknown) {
  return String(value ?? '').trim();
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
