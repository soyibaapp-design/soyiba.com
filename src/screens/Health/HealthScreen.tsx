import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Clock3,
  Globe2,
  LoaderCircle,
  MapPin,
  PhoneCall,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  UserRound,
  UsersRound,
  Wifi,
} from 'lucide-react';
import type { SoyibaSession, SoyibaUser } from '../Auth/auth.service';
import {
  forceLogoutHealthSessions,
  getHealthDashboard,
  type HealthDashboard,
  type HealthSessionRecord,
} from './health.service';

type HealthScreenProps = {
  session: SoyibaSession;
  onBack: () => void;
  onModalOpenChange?: (open: boolean) => void;
};

export function HealthScreen({ session, onBack, onModalOpenChange }: HealthScreenProps) {
  const [dashboard, setDashboard] = useState<HealthDashboard | null>(null);
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const canManage = isManager(session.user);

  useEffect(() => {
    onModalOpenChange?.(revoking);
    return () => onModalOpenChange?.(false);
  }, [revoking, onModalOpenChange]);

  useEffect(() => {
    if (!canManage) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function refreshHealth(silent = false) {
      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError('');

      try {
        const nextDashboard = await getHealthDashboard(session);

        if (!mounted) {
          return;
        }

        setDashboard(nextDashboard);
        setSelectedIds((current) =>
          current.filter((sessionId) => nextDashboard.sessions.some((item) => item.sessionId === sessionId)),
        );
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar el health.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    refreshHealth();
    const interval = window.setInterval(() => refreshHealth(true), 20000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [canManage, session]);

  const filteredSessions = useMemo(() => {
    const sessions = dashboard?.sessions || [];
    const needle = query.trim().toLowerCase();

    if (!needle) {
      return sessions;
    }

    return sessions.filter((item) =>
      [
        item.name,
        item.email,
        item.role,
        item.ipAddress,
        item.page,
        item.userAgent,
        item.callSummary,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [dashboard, query]);

  async function handleRefresh() {
    setRefreshing(true);
    setError('');

    try {
      setDashboard(await getHealthDashboard(session));
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'No fue posible refrescar el health.');
    } finally {
      setRefreshing(false);
    }
  }

  async function handleForceLogout() {
    if (!selectedIds.length) {
      return;
    }

    setRevoking(true);
    setError('');
    setMessage('');

    try {
      const count = await forceLogoutHealthSessions(session, selectedIds);
      setMessage(`${count} sesion${count === 1 ? '' : 'es'} marcada${count === 1 ? '' : 's'} para cierre.`);
      setSelectedIds([]);
      setDashboard(await getHealthDashboard(session));
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : 'No fue posible cerrar las sesiones.');
    } finally {
      setRevoking(false);
    }
  }

  function toggleSession(sessionId: string) {
    setSelectedIds((current) =>
      current.includes(sessionId) ? current.filter((item) => item !== sessionId) : [...current, sessionId],
    );
  }

  if (!canManage) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.22 }}
        className="space-y-4 pb-4"
      >
        <BackButton onBack={onBack} />
        <section className="rounded-[20px] border border-[#FFD1CF] bg-[#FFF7F6] p-5 text-center shadow-[0_18px_42px_rgba(230,55,55,0.08)]">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#FFE8E8] text-[#E63737]">
            <ShieldAlert size={28} />
          </div>
          <h1 className="mt-4 text-lg font-black text-[#0B1F5B]">Acceso restringido</h1>
          <p className="mt-2 text-sm font-bold leading-5 text-[#637295]">Tu rol actual no permite ver el health de la app.</p>
        </section>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.22 }}
      className="space-y-4 pb-4"
    >
      <header className="relative -mx-4 -mt-5 overflow-hidden px-4 pb-5 pt-5">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#FFFFFF_0%,#F7FBFF_48%,#EAF8F2_100%)]" />
        <div className="relative flex items-start gap-3">
          <BackButton onBack={onBack} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase text-[#047857]">Health</p>
            <h1 className="mt-1 break-words text-2xl font-black leading-7 text-[#0B1F5B]">Estado de la app</h1>
            <p className="mt-1 text-sm font-semibold leading-5 text-[#637295]">Sesiones, llamadas activas e IP reportada.</p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="Refrescar health"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/70 bg-white/80 text-[#047857] shadow-[0_10px_24px_rgba(15,23,42,0.08)] disabled:opacity-60"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-2 min-[560px]:grid-cols-4">
        <SummaryTile label="Usuarios" value={dashboard?.activeUsers || 0} icon={UsersRound} tone="bg-[#E2F8EC] text-[#047857]" />
        <SummaryTile label="Sesiones" value={dashboard?.activeSessions || 0} icon={Wifi} tone="bg-[#EAF2FF] text-[#145CFF]" />
        <SummaryTile label="Llamadas" value={dashboard?.activeCalls || 0} icon={PhoneCall} tone="bg-[#FFF1DC] text-[#D46D00]" />
        <SummaryTile label="IPs" value={countReportedIps(dashboard)} icon={Globe2} tone="bg-[#F4ECFF] text-[#6D35FF]" />
      </section>

      <section className="rounded-[18px] border border-[#DCE6F5] bg-white p-3 shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-black text-[#0B1F5B]">Llamadas por usuario</h2>
            <p className="mt-0.5 text-[11px] font-bold text-[#637295]">Conteo actual reportado por cada navegador conectado.</p>
          </div>
          <Activity size={20} className="shrink-0 text-[#047857]" />
        </div>
        <div className="mt-3 space-y-2">
          {(dashboard?.callsByUser || []).length ? (
            dashboard?.callsByUser.map((item) => (
              <div key={item.userId || item.email || item.name} className="flex min-h-11 items-center gap-3 rounded-[12px] bg-[#F8FBFF] px-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#EAF2FF] text-[10px] font-black text-[#145CFF]">
                  {getInitials(item.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-xs font-black text-[#0B1F5B]">{item.name}</strong>
                  <small className="block truncate text-[10px] font-bold text-[#637295]">{item.sessionCount} sesion(es)</small>
                </span>
                <strong className="shrink-0 rounded-full bg-[#FFF1DC] px-3 py-1 text-[11px] font-black text-[#D46D00]">
                  {item.activeCallCount}
                </strong>
              </div>
            ))
          ) : (
            <p className="rounded-[12px] bg-[#F8FBFF] px-3 py-3 text-center text-[11px] font-bold text-[#728098]">Sin llamadas activas reportadas.</p>
          )}
        </div>
      </section>

      <label className="block">
        <span className="mb-1.5 block text-[10px] font-black text-[#52637C]">Buscar sesion</span>
        <span className="flex h-12 items-center gap-2 rounded-[14px] border border-[#DCE6F5] bg-white px-3 text-sm font-bold text-[#0B1F5B] shadow-[0_12px_26px_rgba(15,23,42,0.06)] focus-within:border-[#145CFF] focus-within:ring-4 focus-within:ring-blue-100">
          <Search size={18} className="shrink-0 text-[#8A99AE]" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre, correo, IP o pagina"
            className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#98A1BD]"
          />
        </span>
      </label>

      {selectedIds.length ? (
        <button
          type="button"
          onClick={handleForceLogout}
          disabled={revoking}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[13px] bg-[#E63737] px-4 text-xs font-black text-white shadow-[0_12px_26px_rgba(230,55,55,0.24)] disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {revoking ? <LoaderCircle size={16} className="animate-spin" /> : <Ban size={16} />}
          Cerrar {selectedIds.length} sesion{selectedIds.length === 1 ? '' : 'es'} seleccionada{selectedIds.length === 1 ? '' : 's'}
        </button>
      ) : null}

      {message ? <p className="rounded-[12px] border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] font-black text-emerald-700">{message}</p> : null}
      {error ? <p className="rounded-[12px] border border-rose-100 bg-rose-50 px-3 py-2 text-[11px] font-bold leading-4 text-rose-700">{error}</p> : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-black text-[#0B1F5B]">Sesiones conectadas</h2>
          <span className="shrink-0 rounded-full bg-[#EAF2FF] px-3 py-1 text-[10px] font-black text-[#145CFF]">{filteredSessions.length} activas</span>
        </div>

        {loading ? (
          <div className="flex h-36 items-center justify-center rounded-[18px] border border-[#DCE6F5] bg-white text-[#145CFF] shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
            <LoaderCircle size={24} className="animate-spin" />
          </div>
        ) : null}

        {!loading && !filteredSessions.length ? (
          <article className="rounded-[18px] border border-dashed border-[#B8C9E7] bg-white p-5 text-center shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#EAF2FF] text-[#145CFF]">
              <Server size={23} />
            </div>
            <p className="mt-3 text-sm font-black text-[#0B1F5B]">Sin sesiones activas</p>
          </article>
        ) : null}

        {!loading
          ? filteredSessions.map((item) => (
              <HealthSessionCard
                key={item.sessionId}
                sessionRecord={item}
                selected={selectedIds.includes(item.sessionId)}
                currentSession={isCurrentSession(item, session)}
                onToggle={() => toggleSession(item.sessionId)}
              />
            ))
          : null}
      </section>
    </motion.section>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      aria-label="Volver a perfil"
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/70 bg-white/80 text-[#0B1F5B] shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
    >
      <ArrowLeft size={18} />
    </button>
  );
}

function SummaryTile({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof UsersRound; tone: string }) {
  return (
    <article className="min-w-0 rounded-[16px] border border-[#E7EDF8] bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <span className={`grid h-10 w-10 place-items-center rounded-[12px] ${tone}`}>
        <Icon size={21} />
      </span>
      <strong className="mt-2 block text-2xl font-black leading-7 text-[#0B1F5B]">{value}</strong>
      <span className="block truncate text-[11px] font-bold text-[#637295]">{label}</span>
    </article>
  );
}

function HealthSessionCard({
  sessionRecord,
  selected,
  currentSession,
  onToggle,
}: {
  sessionRecord: HealthSessionRecord;
  selected: boolean;
  currentSession: boolean;
  onToggle: () => void;
}) {
  const callItems = parseCallSummary(sessionRecord.callSummary);

  return (
    <article className={`rounded-[18px] border bg-white p-3 shadow-[0_14px_32px_rgba(15,23,42,0.06)] ${selected ? 'border-[#E63737]' : 'border-[#DCE6F5]'}`}>
      <div className="grid min-w-0 grid-cols-[42px_minmax(0,1fr)_42px] items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-[#EAF2FF] text-[12px] font-black text-[#145CFF]">
          {getInitials(sessionRecord.name)}
        </div>
        <div className="min-w-0">
          <h3 className="flex min-w-0 items-center gap-1.5 text-sm font-black text-[#0B1F5B]">
            <span className="min-w-0 truncate">{sessionRecord.name}</span>
            {currentSession ? <span className="shrink-0 rounded-full bg-[#E2F8EC] px-2 py-0.5 text-[9px] font-black text-[#047857]">Tu sesion</span> : null}
          </h3>
          <p className="mt-0.5 truncate text-[11px] font-bold text-[#64748B]">{sessionRecord.email || 'Sin correo'}</p>
          <p className="mt-0.5 truncate text-[11px] font-bold text-[#64748B]">{sessionRecord.role || 'Usuario'}</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={selected}
          aria-label={`Seleccionar sesion de ${sessionRecord.name}`}
          className={`grid h-10 w-10 place-items-center rounded-[11px] border ${
            selected ? 'border-[#E63737] bg-[#FFE9E8] text-[#E63737]' : 'border-[#CBD8EA] bg-white text-[#64748B]'
          }`}
        >
          <CheckCircle2 size={18} />
        </button>
      </div>

      <div className="mt-3 grid gap-2 text-[11px] font-bold text-[#637295] min-[520px]:grid-cols-2">
        <SessionMeta icon={Clock3} label={formatRelativeTime(sessionRecord.lastSeenAt)} />
        <SessionMeta icon={MapPin} label={sessionRecord.ipAddress || 'IP no reportada'} />
        <SessionMeta icon={Server} label={sessionRecord.page || 'Pagina no reportada'} />
        <SessionMeta icon={PhoneCall} label={`${sessionRecord.activeCallCount} llamada(s) activa(s)`} />
      </div>

      {callItems.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {callItems.map((item) => (
            <span key={item.label} className="rounded-full bg-[#FFF1DC] px-2.5 py-1 text-[10px] font-black text-[#D46D00] ring-1 ring-[#FFD39A]">
              {item.label}: {item.count}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function SessionMeta({ icon: Icon, label }: { icon: typeof Clock3; label: string }) {
  return (
    <p className="flex min-w-0 items-center gap-1.5 rounded-[10px] bg-[#F8FBFF] px-2.5 py-2">
      <Icon size={14} className="shrink-0 text-[#8A99AE]" />
      <span className="min-w-0 truncate">{label}</span>
    </p>
  );
}

function parseCallSummary(value: string) {
  try {
    const parsed = JSON.parse(value || '{}') as Record<string, unknown>;
    return Object.entries(parsed)
      .map(([label, count]) => ({ label, count: Number(count) || 0 }))
      .filter((item) => item.count > 0);
  } catch {
    return [];
  }
}

function countReportedIps(dashboard: HealthDashboard | null) {
  return new Set((dashboard?.sessions || []).map((item) => item.ipAddress).filter(Boolean)).size;
}

function isCurrentSession(record: HealthSessionRecord, session: SoyibaSession) {
  return Boolean(
    (record.userId && session.user.id && record.userId === session.user.id) ||
      (record.email && session.user.email && record.email === session.user.email.trim().toLowerCase()),
  );
}

function isManager(user: Pick<SoyibaUser, 'rolSistema' | 'role'>) {
  return ['admin', 'moderador'].includes(String(user.rolSistema || user.role || '').trim().toLowerCase());
}

function getInitials(name: string) {
  return String(name || 'Usuario')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function formatRelativeTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Sin pulso';
  }

  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));

  if (seconds < 8) {
    return 'Ahora';
  }

  if (seconds < 60) {
    return `Hace ${seconds}s`;
  }

  const minutes = Math.round(seconds / 60);
  return `Hace ${minutes} min`;
}
