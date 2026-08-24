import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  Copy,
  Edit3,
  LoaderCircle,
  Mail,
  Megaphone,
  Phone,
  Save,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { SoyibaSession, SoyibaUser } from '../Auth/auth.service';
import {
  getMinorValidationRequests,
  getManagedUsers,
  reviewMinorValidationRequest,
  type MinorValidationRequest,
  updateManagedUser,
  type ManagedUser,
  type ManagedUserAccessPayload,
} from './users.service';

type UsersManagementScreenProps = {
  session: SoyibaSession;
  onBack: () => void;
  onSessionUpdated: (session: SoyibaSession) => void;
  onModalOpenChange?: (open: boolean) => void;
};

type PermissionKey = 'publicador' | 'publicadorEco' | 'publicadorEvento' | 'minorValidator';

const ASSISTANT_VALUE = 'Asistente';
const MEMBER_VALUE = 'Miembro';
const roleOptions = [ASSISTANT_VALUE, MEMBER_VALUE, 'Admin', 'Moderador', 'Usuario', 'Pruebas'];
const userTitleOptions = [
  ASSISTANT_VALUE,
  MEMBER_VALUE,
  'Servidor',
  'Líder',
  'Pastor',
  'Administrativo',
  'Maestro ED',
  'Maestro',
  'Líder de pastorales',
  'Equipo alabanza',
  'Moderador de grupo ECO',
  'Audiovisuales',
  'Creador de contenido',
];
const userStateOptions = ['Activo', 'Inactivo', 'Pendiente', 'Bloqueado'];
const permissionOptions: Array<{ id: PermissionKey; label: string; icon: LucideIcon; tone: string; description?: string }> = [
  { id: 'publicador', label: 'Publicaciones', icon: Megaphone, tone: 'bg-[#EAF2FF] text-[#145CFF]' },
  { id: 'publicadorEco', label: 'Grupos ECO', icon: UsersRound, tone: 'bg-[#F4ECFF] text-[#6D35FF]' },
  { id: 'publicadorEvento', label: 'Eventos', icon: CheckCircle2, tone: 'bg-[#E2F8EC] text-[#047857]' },
  { id: 'minorValidator', label: 'Validación de menores', icon: ShieldCheck, tone: 'bg-[#FFF1DC] text-[#D46D00]', description: 'Puede validar representantes legales' },
];

export function UsersManagementScreen({ session, onBack, onSessionUpdated, onModalOpenChange }: UsersManagementScreenProps) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [minorRequests, setMinorRequests] = useState<MinorValidationRequest[]>([]);
  const [minorRequestsLoading, setMinorRequestsLoading] = useState(true);
  const [minorRequestsError, setMinorRequestsError] = useState('');
  const [minorReviewBusyId, setMinorReviewBusyId] = useState('');
  const [minorValidationOpen, setMinorValidationOpen] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const canManage = isManager(session.user);
  const canValidateMinors = canManage || isMinorValidator(session.user);

  useEffect(() => {
    onModalOpenChange?.(Boolean(editingUser));
    return () => onModalOpenChange?.(false);
  }, [editingUser, onModalOpenChange]);

  useEffect(() => {
    if (!canManage) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError('');

    getManagedUsers(session)
      .then((items) => {
        if (!isMounted) return;
        setUsers(items);
      })
      .catch((loadError) => {
        if (!isMounted) return;
        setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar usuarios.');
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [canManage, session]);

  useEffect(() => {
    if (!canValidateMinors) {
      setMinorRequestsLoading(false);
      return;
    }

    let isMounted = true;
    setMinorRequestsLoading(true);
    setMinorRequestsError('');

    getMinorValidationRequests(session)
      .then((items) => {
        if (!isMounted) return;
        setMinorRequests(items);
      })
      .catch((loadError) => {
        if (!isMounted) return;
        setMinorRequestsError(loadError instanceof Error ? loadError.message : 'No fue posible cargar validaciones de menores.');
      })
      .finally(() => {
        if (isMounted) {
          setMinorRequestsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [canValidateMinors, session]);

  const filteredUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();

    if (!needle) {
      return users;
    }

    return users.filter((user) => {
      const haystack = [
        getDisplayName(user),
        user.email,
        user.phone,
        user.tipoUsuario,
        user.tituloUsuario,
        user.rolSistema || user.role,
        user.estadoUsuario,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [query, users]);

  const summary = useMemo(
    () => ({
      total: users.length,
      active: users.filter((user) => isActiveUser(user)).length,
      managers: users.filter((user) => isManager(user)).length,
      publishers: users.filter((user) => user.publicador || user.publicadorEco || user.publicadorEvento || user.minorValidator).length,
    }),
    [users],
  );

  async function handleSaveUserAccess(targetUser: ManagedUser, payload: ManagedUserAccessPayload) {
    const updatedUser = await updateManagedUser(session, targetUser, payload);

    setUsers((current) =>
      current.map((user) => (isSameUser(user, updatedUser) ? updatedUser : user)),
    );

    if (isSameUser(session.user, updatedUser)) {
      onSessionUpdated({
        ...session,
        user: {
          ...session.user,
          ...updatedUser,
        },
      });
    }

    setSavedMessage(`${getDisplayName(updatedUser)} actualizado.`);
    window.setTimeout(() => setSavedMessage(''), 2400);
    return updatedUser;
  }

  async function handleReviewMinorRequest(request: MinorValidationRequest, decision: 'approved' | 'rejected') {
    const rejectionReason = decision === 'rejected' ? window.prompt('Motivo del rechazo') || '' : '';

    if (decision === 'rejected' && !rejectionReason.trim()) {
      return;
    }

    setMinorReviewBusyId(request.id);
    setMinorRequestsError('');

    try {
      await reviewMinorValidationRequest(session, request, decision, rejectionReason.trim());
      setMinorRequests((current) =>
        current.map((item) =>
          item.id === request.id
            ? {
                ...item,
                status: decision,
                validatedAt: new Date().toISOString(),
                validatedByEmail: session.user.email,
                rejectionReason: decision === 'rejected' ? rejectionReason.trim() : '',
              }
            : item,
        ),
      );
      setSavedMessage(decision === 'approved' ? `${request.userName} activado.` : `${request.userName} rechazado.`);
      window.setTimeout(() => setSavedMessage(''), 2400);
    } catch (reviewError) {
      setMinorRequestsError(reviewError instanceof Error ? reviewError.message : 'No fue posible revisar la solicitud.');
    } finally {
      setMinorReviewBusyId('');
    }
  }

  if (!canValidateMinors) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.22 }}
        className="space-y-4 pb-4"
      >
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-[#CBD8EA] bg-white px-3 text-xs font-black text-[#0B1F5B] shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
        >
          <ArrowLeft size={16} />
          Volver
        </button>
        <section className="rounded-[20px] border border-[#FFD1CF] bg-[#FFF7F6] p-5 text-center shadow-[0_18px_42px_rgba(230,55,55,0.08)]">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#FFE8E8] text-[#E63737]">
            <ShieldCheck size={28} />
          </div>
          <h1 className="mt-4 text-lg font-black text-[#0B1F5B]">Acceso restringido</h1>
          <p className="mt-2 text-sm font-bold leading-5 text-[#637295]">Tu rol actual no permite administrar usuarios ni validar menores.</p>
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
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#FFFFFF_0%,#F4F8FF_52%,#EAF3FF_100%)]" />
        <div className="relative flex items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Volver a perfil"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/70 bg-white/80 text-[#0B1F5B] shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase text-[#145CFF]">Administración</p>
            <h1 className="mt-1 break-words text-2xl font-black leading-7 text-[#0B1F5B]">Gestión de usuarios</h1>
            <p className="mt-1 text-sm font-semibold leading-5 text-[#637295]">{canManage ? 'Roles, estados, tipos, permisos y menores.' : 'Validación de menores de edad.'}</p>
          </div>
        </div>
      </header>

      {canManage ? <section className="grid grid-cols-2 gap-2 min-[560px]:grid-cols-4">
        <SummaryTile label="Usuarios" value={summary.total} icon={UsersRound} tone="bg-[#EAF2FF] text-[#145CFF]" />
        <SummaryTile label="Activos" value={summary.active} icon={CheckCircle2} tone="bg-[#E2F8EC] text-[#047857]" />
        <SummaryTile label="Gestores" value={summary.managers} icon={ShieldCheck} tone="bg-[#FFE9E8] text-[#E63737]" />
        <SummaryTile label="Permisos" value={summary.publishers} icon={Megaphone} tone="bg-[#FFF1DC] text-[#D46D00]" />
      </section> : null}

        <MinorValidationPanel
          requests={minorRequests}
          loading={minorRequestsLoading}
          error={minorRequestsError}
          busyId={minorReviewBusyId}
          open={minorValidationOpen}
          onOpenChange={setMinorValidationOpen}
          onReview={handleReviewMinorRequest}
        />

      {canManage ? (
        <>
      <label className="block">
        <span className="mb-1.5 block text-[10px] font-black text-[#52637C]">Buscar usuario</span>
        <span className="flex h-12 items-center gap-2 rounded-[14px] border border-[#DCE6F5] bg-white px-3 text-sm font-bold text-[#0B1F5B] shadow-[0_12px_26px_rgba(15,23,42,0.06)] focus-within:border-[#145CFF] focus-within:ring-4 focus-within:ring-blue-100">
          <Search size={18} className="shrink-0 text-[#8A99AE]" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre, correo, rol o estado"
            className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#98A1BD]"
          />
        </span>
      </label>

      {savedMessage ? (
        <p className="rounded-[12px] border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] font-black text-emerald-700">{savedMessage}</p>
      ) : null}

      {error ? (
        <p className="rounded-[12px] border border-rose-100 bg-rose-50 px-3 py-2 text-[11px] font-bold leading-4 text-rose-700">{error}</p>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-black text-[#0B1F5B]">Listado</h2>
          <span className="shrink-0 rounded-full bg-[#EAF2FF] px-3 py-1 text-[10px] font-black text-[#145CFF]">{filteredUsers.length} registros</span>
        </div>

        {loading ? (
          <div className="flex h-36 items-center justify-center rounded-[18px] border border-[#DCE6F5] bg-white text-[#145CFF] shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
            <LoaderCircle size={24} className="animate-spin" />
          </div>
        ) : null}

        {!loading && !filteredUsers.length ? (
          <article className="rounded-[18px] border border-dashed border-[#B8C9E7] bg-white p-5 text-center shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#EAF2FF] text-[#145CFF]">
              <Search size={23} />
            </div>
            <p className="mt-3 text-sm font-black text-[#0B1F5B]">Sin resultados</p>
          </article>
        ) : null}

        {!loading
          ? filteredUsers.map((user) => (
              <UserAccessCard key={user.id || user.email} user={user} onEdit={() => setEditingUser(user)} />
            ))
          : null}
      </section>

      {editingUser ? (
        <EditUserAccessModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={(payload) => handleSaveUserAccess(editingUser, payload)}
          onSaved={(updatedUser) => {
            setEditingUser(null);
            setUsers((current) => current.map((user) => (isSameUser(user, updatedUser) ? updatedUser : user)));
          }}
        />
      ) : null}
        </>
      ) : null}
    </motion.section>
  );
}

function MinorValidationPanel({
  requests,
  loading,
  error,
  busyId,
  open,
  onOpenChange,
  onReview,
}: {
  requests: MinorValidationRequest[];
  loading: boolean;
  error: string;
  busyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReview: (request: MinorValidationRequest, decision: 'approved' | 'rejected') => void;
}) {
  const pendingIba = requests.filter((request) => request.status === 'iba_pending');
  const [copiedPhoneRequestId, setCopiedPhoneRequestId] = useState('');

  async function handleCopyGuardianPhone(request: MinorValidationRequest) {
    if (!request.guardianPhone) {
      return;
    }

    const copied = await copyTextToClipboard(request.guardianPhone);

    if (copied) {
      setCopiedPhoneRequestId(request.id);
      window.setTimeout(() => setCopiedPhoneRequestId((current) => (current === request.id ? '' : current)), 1800);
    }
  }

  return (
    <section className="space-y-3 rounded-[18px] border border-[#DCE6F5] bg-white p-3 shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <h2 className="text-base font-black text-[#0B1F5B]">Validación de menores</h2>
          <p className="mt-0.5 text-[11px] font-bold leading-4 text-[#637295]">Representante legal, revisión IBA y activación final.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-[#FFF1DC] px-3 py-1 text-[10px] font-black text-[#D46D00]">{pendingIba.length} por revisar</span>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#EAF2FF] text-[#145CFF]">
            <ChevronDown size={17} className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
          </span>
        </div>
      </button>

      {open ? (
        <div className="space-y-3">
          {error ? <p className="rounded-[12px] border border-rose-100 bg-rose-50 px-3 py-2 text-[11px] font-bold leading-4 text-rose-700">{error}</p> : null}

          {loading ? (
            <div className="flex h-24 items-center justify-center rounded-[14px] border border-[#DCE6F5] bg-[#F8FBFF] text-[#145CFF]">
              <LoaderCircle size={22} className="animate-spin" />
            </div>
          ) : null}

          {!loading && !requests.length ? (
            <article className="rounded-[14px] border border-dashed border-[#B8C9E7] bg-[#F8FBFF] p-4 text-center">
              <p className="text-sm font-black text-[#0B1F5B]">No hay solicitudes de menores.</p>
            </article>
          ) : null}

          {!loading
            ? requests.map((request) => {
                const canReview = request.status === 'iba_pending';
                const busy = busyId === request.id;

                return (
                  <article key={request.id} className="rounded-[14px] border border-[#E7EDF8] bg-[#F8FBFF] p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="break-words text-sm font-black text-[#0B1F5B]">{request.userName || request.userEmail}</h3>
                        <p className="mt-0.5 text-[11px] font-bold text-[#64748B]">{request.userEmail}</p>
                        <p className="mt-1 text-[11px] font-bold text-[#52637C]">Nacimiento: {request.fechaNacimiento || 'Sin fecha'}</p>
                      </div>
                      <MinorStatusBadge status={request.status} />
                    </div>
                    <div className="mt-3 grid gap-2 text-[11px] font-bold text-[#52637C] sm:grid-cols-2">
                      <span>Representante: {request.guardianName || 'Sin nombre'}</span>
                      <span>Correo: {request.guardianEmail || 'Sin correo'}</span>
                      <span>Celular menor: {request.userPhone || 'Sin celular'}</span>
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="min-w-0 break-words">Celular representante: {request.guardianPhone || 'Sin celular'}</span>
                        {request.guardianPhone ? (
                          <button
                            type="button"
                            onClick={() => handleCopyGuardianPhone(request)}
                            aria-label={`Copiar celular del representante de ${request.userName || request.userEmail}`}
                            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-[#145CFF] ring-1 ring-[#B8C9E7] transition hover:bg-[#EAF2FF]"
                          >
                            {copiedPhoneRequestId === request.id ? <CheckCircle2 size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                          </button>
                        ) : null}
                      </span>
                    </div>
                    {copiedPhoneRequestId === request.id ? <p className="mt-2 text-[11px] font-black text-[#047857]">Celular del representante copiado.</p> : null}
                    {request.guardianApprovedAt ? <p className="mt-2 text-[11px] font-black text-emerald-700">Representante aprobó: {formatDateTime(request.guardianApprovedAt)}</p> : null}
                    {request.validatedAt ? <p className="mt-2 text-[11px] font-black text-[#52637C]">Revisado por {request.validatedByEmail || 'IBA'}: {formatDateTime(request.validatedAt)}</p> : null}
                    {request.rejectionReason ? <p className="mt-2 text-[11px] font-bold text-rose-700">Motivo: {request.rejectionReason}</p> : null}
                    {canReview ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onReview(request, 'approved')}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-[11px] bg-[#047857] px-3 text-xs font-black text-white disabled:bg-slate-300"
                        >
                          {busy ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                          Activar cuenta
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onReview(request, 'rejected')}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-[11px] bg-[#B42318] px-3 text-xs font-black text-white disabled:bg-slate-300"
                        >
                          <X size={16} />
                          Rechazar
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })
            : null}
        </div>
      ) : null}
    </section>
  );
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Se intenta el fallback para navegadores embebidos o permisos restringidos.
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

function MinorStatusBadge({ status }: { status: MinorValidationRequest['status'] }) {
  const labelByStatus: Record<MinorValidationRequest['status'], string> = {
    guardian_pending: 'Pendiente representante',
    iba_pending: 'Pendiente IBA',
    approved: 'Aprobado',
    rejected: 'Rechazado',
  };
  const className =
    status === 'approved'
      ? 'bg-[#DDF8EA] text-[#037A46] ring-[#7BD6AA]/50'
      : status === 'rejected'
        ? 'bg-[#FFE8E8] text-[#B42318] ring-[#FFB6B2]/50'
        : 'bg-[#FFF1DC] text-[#D46D00] ring-[#FFD39A]';

  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ring-1 ${className}`}>{labelByStatus[status]}</span>;
}

function SummaryTile({ label, value, icon: Icon, tone }: { label: string; value: number; icon: LucideIcon; tone: string }) {
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

function UserAccessCard({ user, onEdit }: { user: ManagedUser; onEdit: () => void }) {
  const permissionLabels = getPermissionLabels(user);

  return (
    <article className="rounded-[18px] border border-[#DCE6F5] bg-white p-3 shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
      <div className="grid min-w-0 grid-cols-[48px_minmax(0,1fr)_42px] items-start gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-[#EAF2FF] text-sm font-black text-[#145CFF]">
          {getInitials(user)}
        </div>
        <div className="min-w-0">
          <h3 className="flex min-w-0 items-center gap-1.5 text-sm font-black text-[#0B1F5B]">
            <span className="min-w-0 truncate">{getDisplayName(user)}</span>
            <VerifiedBadge active={Boolean(user.verificado)} />
          </h3>
          <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] font-bold text-[#64748B]">
            <Mail size={13} className="shrink-0" />
            <span className="truncate">{user.email || 'Sin correo'}</span>
          </p>
          {user.phone ? (
            <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] font-bold text-[#64748B]">
              <Phone size={13} className="shrink-0" />
              <span className="truncate">{user.phone}</span>
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Editar ${getDisplayName(user)}`}
          className="grid h-10 w-10 place-items-center rounded-[11px] border border-[#145CFF]/40 bg-white text-[#145CFF] shadow-[0_10px_22px_rgba(20,92,255,0.10)]"
        >
          <Edit3 size={17} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Pill icon={ShieldCheck} label={user.rolSistema || user.role || 'Usuario'} className="bg-[#FFE9E8] text-[#E63737] ring-[#FFB6B2]/50" />
        <Pill icon={UserRound} label={user.tipoUsuario || 'Asistente'} className="bg-[#EAF2FF] text-[#145CFF] ring-[#B9D3FF]" />
        <Pill icon={UsersRound} label={user.tituloUsuario || user.tipoUsuario || 'Asistente'} className="bg-[#FFF1DC] text-[#D46D00] ring-[#FFD39A]" />
        {user.verificado ? <Pill icon={BadgeCheck} label="Verificado" className="bg-[#EAF2FF] text-[#145CFF] ring-[#B9D3FF]" /> : null}
        <Pill
          icon={CheckCircle2}
          label={user.estadoUsuario || (isActiveUser(user) ? 'Activo' : 'Inactivo')}
          className={isActiveUser(user) ? 'bg-[#DDF8EA] text-[#037A46] ring-[#7BD6AA]/50' : 'bg-[#EEF2F7] text-[#64748B] ring-[#CBD8EA]'}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {permissionLabels.length ? (
          permissionLabels.map((label) => (
            <span key={label} className="rounded-full bg-[#F8FBFF] px-2.5 py-1 text-[10px] font-black text-[#52637C] ring-1 ring-[#DCE6F5]">
              {label}
            </span>
          ))
        ) : (
          <span className="rounded-full bg-[#F8FBFF] px-2.5 py-1 text-[10px] font-black text-[#728098] ring-1 ring-[#DCE6F5]">Sin permisos de publicación</span>
        )}
      </div>
    </article>
  );
}

function EditUserAccessModal({
  user,
  onClose,
  onSave,
  onSaved,
}: {
  user: ManagedUser;
  onClose: () => void;
  onSave: (payload: ManagedUserAccessPayload) => Promise<ManagedUser>;
  onSaved: (user: ManagedUser) => void;
}) {
  const [form, setForm] = useState<ManagedUserAccessPayload>(() => getInitialAccessForm(user));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const assistantMode = isAssistantValue(form.tipoUsuario);
  const roleSelectOptions = getMemberOptions(roleOptions);
  const userTitleSelectOptions = getMemberOptions(userTitleOptions);

  function updateField<K extends keyof ManagedUserAccessPayload>(field: K, value: ManagedUserAccessPayload[K]) {
    setForm((current) => applyAccessRules({ ...current, [field]: value }));
  }

  function updateUserType(isMember: boolean) {
    setForm((current) => applyAccessRules({ ...current, tipoUsuario: isMember ? MEMBER_VALUE : ASSISTANT_VALUE }));
  }

  function updateState(value: string) {
    setForm((current) => ({
      ...current,
      estadoUsuario: value,
      active: value === 'Activo',
    }));
  }

  async function handleSubmit() {
    setSaving(true);
    setError('');

    try {
      const updatedUser = await onSave(form);
      onSaved(updatedUser);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No fue posible guardar los cambios.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0B1F5B]/30 px-3 pb-3 pt-12 backdrop-blur-sm min-[560px]:items-center" role="dialog" aria-modal="true">
      <motion.section
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="max-h-[calc(100vh-40px)] w-full max-w-xl overflow-hidden rounded-[20px] border border-white/80 bg-white shadow-[0_26px_70px_rgba(11,31,91,0.22)]"
      >
        <header className="flex min-h-16 items-start justify-between gap-3 border-b border-[#E3EAF5] px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-black text-[#0B1F5B]">Editar usuario</h2>
            <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] font-bold text-[#637295]">
              <span className="min-w-0 truncate">{getDisplayName(user)}</span>
              <VerifiedBadge active={Boolean(form.verificado)} />
            </p>
          </div>
          <button type="button" aria-label="Cerrar" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#0B1F5B]">
            <X size={20} />
          </button>
        </header>

        <div className="max-h-[calc(100vh-180px)] space-y-3 overflow-y-auto bg-[#F8FBFF] p-3.5">
          <section className="grid gap-3 rounded-[14px] border border-[#DCE6F5] bg-white p-3.5 min-[520px]:grid-cols-2">
            <UserTypeToggle isMember={!assistantMode} onChange={updateUserType} className="min-[520px]:col-span-2" />
            {!assistantMode ? (
              <>
                <AccessSelect label="Rol del sistema" value={form.rolSistema} options={roleSelectOptions} onChange={(value) => updateField('rolSistema', value)} icon={ShieldCheck} />
                <AccessSelect label="Título de usuario" value={form.tituloUsuario} options={userTitleSelectOptions} onChange={(value) => updateField('tituloUsuario', value)} icon={UsersRound} />
              </>
            ) : null}
            <AccessSelect label="Estado de usuario" value={form.estadoUsuario} options={userStateOptions} onChange={updateState} icon={CheckCircle2} className="min-[520px]:col-span-2" />
            <VerificationToggle checked={Boolean(form.verificado)} onChange={(checked) => updateField('verificado', checked)} className="min-[520px]:col-span-2" />
          </section>

          <section className="rounded-[14px] border border-[#DCE6F5] bg-white p-3.5">
            <h3 className="text-xs font-black text-[#0B1F5B]">Permisos</h3>
            <div className="mt-3 grid gap-2">
              {permissionOptions.map((permission) => (
                <PermissionToggle
                  key={permission.id}
                  icon={permission.icon}
                  label={permission.label}
                  tone={permission.tone}
                  description={permission.description}
                  checked={Boolean(form[permission.id])}
                  onChange={(checked) => updateField(permission.id, checked)}
                  disabled={assistantMode}
                />
              ))}
            </div>
          </section>

          {error ? <p className="rounded-[10px] bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700">{error}</p> : null}
        </div>

        <footer className="grid grid-cols-2 gap-3 border-t border-[#E3EAF5] bg-white p-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-11 rounded-[12px] border border-[#CBD8EA] bg-white text-xs font-black text-[#51617A] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[#062B70] px-4 text-xs font-black text-white shadow-[0_12px_26px_rgba(6,43,112,0.24)] disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
            Guardar
          </button>
        </footer>
      </motion.section>
    </div>
  );
}

function UserTypeToggle({ isMember, onChange, className = '' }: { isMember: boolean; onChange: (isMember: boolean) => void; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <span className="mb-1.5 block text-[10px] font-black text-[#52637C]">Tipo de usuario</span>
      <button
        type="button"
        role="switch"
        aria-checked={isMember}
        onClick={() => onChange(!isMember)}
        className="flex h-14 w-full items-center gap-3 rounded-[13px] border border-[#DCE6F5] bg-white px-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition focus:outline-none focus:ring-4 focus:ring-blue-100"
      >
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] ${isMember ? 'bg-[#E2F8EC] text-[#047857]' : 'bg-[#EAF2FF] text-[#145CFF]'}`}>
          <UserRound size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-black text-[#0B1F5B]">{isMember ? MEMBER_VALUE : ASSISTANT_VALUE}</span>
          <span className="mt-0.5 block text-[10px] font-bold text-[#637295]">{isMember ? 'Miembro' : 'Asistente'}</span>
        </span>
        <span className={`relative h-8 w-14 shrink-0 rounded-full p-1 transition ${isMember ? 'bg-[#047857]' : 'bg-[#CBD8EA]'}`}>
          <span className={`block h-6 w-6 rounded-full bg-white shadow-[0_6px_14px_rgba(15,23,42,0.18)] transition ${isMember ? 'translate-x-6' : 'translate-x-0'}`} />
        </span>
      </button>
    </div>
  );
}

function AccessSelect({
  label,
  value,
  options,
  onChange,
  icon: Icon,
  className = '',
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1.5 block text-[10px] font-black text-[#52637C]">{label}</span>
      <span className="flex h-11 items-center gap-2 rounded-[10px] border border-[#DCE6F5] bg-white px-3 text-xs font-bold text-[#0B1F5B] shadow-[0_10px_24px_rgba(15,23,42,0.04)] focus-within:border-[#145CFF] focus-within:ring-4 focus-within:ring-blue-100">
        <Icon size={16} className="shrink-0 text-[#8A99AE]" />
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-full min-w-0 flex-1 bg-transparent outline-none"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

function VerificationToggle({ checked, onChange, className = '' }: { checked: boolean; onChange: (checked: boolean) => void; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <span className="mb-1.5 block text-[10px] font-black text-[#52637C]">Insignia de verificacion</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="flex h-14 w-full items-center gap-3 rounded-[13px] border border-[#DCE6F5] bg-white px-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition focus:outline-none focus:ring-4 focus:ring-blue-100"
      >
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] ${checked ? 'bg-[#EAF2FF] text-[#145CFF]' : 'bg-[#EEF2F7] text-[#64748B]'}`}>
          <BadgeCheck size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-black text-[#0B1F5B]">Usuario verificado</span>
          <span className="mt-0.5 block text-[10px] font-bold text-[#637295]">{checked ? 'Activo' : 'Inactivo'}</span>
        </span>
        <span className={`relative h-8 w-14 shrink-0 rounded-full p-1 transition ${checked ? 'bg-[#145CFF]' : 'bg-[#CBD8EA]'}`}>
          <span className={`block h-6 w-6 rounded-full bg-white shadow-[0_6px_14px_rgba(15,23,42,0.18)] transition ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
        </span>
      </button>
    </div>
  );
}

function PermissionToggle({
  icon: Icon,
  label,
  tone,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  icon: LucideIcon;
  label: string;
  tone: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex min-h-[58px] items-center gap-3 rounded-[13px] border p-2.5 text-left transition ${
        checked ? 'border-[#145CFF]/25 bg-[#F8FBFF] ring-1 ring-[#145CFF]/15' : 'border-[#E1E8F3] bg-white'
      } ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
    >
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] ${tone}`}>
        <Icon size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-black text-[#0B1F5B]">{label}</span>
        <span className="mt-0.5 block text-[10px] font-bold text-[#637295]">{description || (checked ? 'Activo' : 'Inactivo')}</span>
      </span>
      <span className={`relative h-8 w-14 shrink-0 rounded-full p-1 transition ${checked ? 'bg-[#145CFF]' : 'bg-[#CBD8EA]'}`}>
        <span className={`block h-6 w-6 rounded-full bg-white shadow-[0_6px_14px_rgba(15,23,42,0.18)] transition ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
      </span>
    </button>
  );
}

function Pill({ icon: Icon, label, className }: { icon: LucideIcon; label: string; className: string }) {
  return (
    <span className={`inline-flex h-8 max-w-full items-center gap-1.5 rounded-full px-3 text-[11px] font-black ring-1 ${className}`}>
      <Icon size={14} className="shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
}

function VerifiedBadge({ active }: { active: boolean }) {
  if (!active) {
    return null;
  }

  return <BadgeCheck size={15} aria-label="Usuario verificado" className="shrink-0 fill-[#EAF2FF] text-[#145CFF]" />;
}

function getInitialAccessForm(user: ManagedUser): ManagedUserAccessPayload {
  const estadoUsuario = user.estadoUsuario || (isActiveUser(user) ? 'Activo' : 'Inactivo');
  const rawTipoUsuario = user.tipoUsuario || ASSISTANT_VALUE;
  const tipoUsuario = normalizeUserType(rawTipoUsuario);

  return applyAccessRules({
    rolSistema: user.rolSistema || user.role || 'Usuario',
    tipoUsuario,
    tituloUsuario: normalizeUserTitle(user.tituloUsuario || rawTipoUsuario, tipoUsuario),
    estadoUsuario,
    publicador: Boolean(user.publicador),
    publicadorEco: Boolean(user.publicadorEco),
    publicadorEvento: Boolean(user.publicadorEvento),
    minorValidator: Boolean(user.minorValidator),
    verificado: Boolean(user.verificado),
    active: estadoUsuario === 'Activo',
  });
}

function getDisplayName(user: Pick<SoyibaUser, 'name' | 'firstName' | 'lastName' | 'email'>) {
  return user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Usuario SOY IBA';
}

function getInitials(user: ManagedUser) {
  return getDisplayName(user)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function getPermissionLabels(user: ManagedUser) {
  return [
    user.publicador ? 'Publicaciones' : '',
    user.publicadorEco ? 'Grupos ECO' : '',
    user.publicadorEvento ? 'Eventos' : '',
    user.minorValidator ? 'Validación menores' : '',
  ].filter(Boolean);
}

function applyAccessRules(form: ManagedUserAccessPayload): ManagedUserAccessPayload {
  if (isAssistantValue(form.tipoUsuario)) {
    return getAssistantAccessForm(form);
  }

  return getMemberAccessForm(form);
}

function getAssistantAccessForm(form: ManagedUserAccessPayload): ManagedUserAccessPayload {
  return {
    ...form,
    rolSistema: ASSISTANT_VALUE,
    tipoUsuario: ASSISTANT_VALUE,
    tituloUsuario: ASSISTANT_VALUE,
    publicador: false,
    publicadorEco: false,
    publicadorEvento: false,
    minorValidator: false,
  };
}

function getMemberAccessForm(form: ManagedUserAccessPayload): ManagedUserAccessPayload {
  return {
    ...form,
    rolSistema: coerceMemberValue(form.rolSistema),
    tipoUsuario: MEMBER_VALUE,
    tituloUsuario: coerceMemberValue(normalizeUserTitle(form.tituloUsuario, MEMBER_VALUE)),
  };
}

function getMemberOptions(options: string[]) {
  return options.filter((option) => !isAssistantValue(option));
}

function coerceMemberValue(value: string) {
  return value && !isAssistantValue(value) ? value : MEMBER_VALUE;
}

function normalizeUserType(value: string) {
  return isAssistantValue(value) ? ASSISTANT_VALUE : MEMBER_VALUE;
}

function normalizeUserTitle(value: string, tipoUsuario: string) {
  const normalized = normalizeAccessText(value);
  if (normalized === 'musico') {
    return 'Equipo alabanza';
  }

  const match = userTitleOptions.find((option) => normalizeAccessText(option) === normalized);

  if (match) {
    return match;
  }

  return isAssistantValue(tipoUsuario) ? ASSISTANT_VALUE : MEMBER_VALUE;
}

function isAssistantValue(value: unknown) {
  return normalizeAccessText(value) === 'asistente';
}

function normalizeAccessText(value: unknown) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isManager(user: Pick<SoyibaUser, 'rolSistema' | 'role'>) {
  return ['admin', 'moderador'].includes(String(user.rolSistema || user.role || '').trim().toLowerCase());
}

function isMinorValidator(user: SoyibaUser) {
  return user.minorValidator === true || ['true', '1', 'si', 'sí', 'yes'].includes(String(user.minorValidator || '').trim().toLowerCase());
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function isActiveUser(user: Pick<ManagedUser, 'active' | 'estadoUsuario'>) {
  return Boolean(user.active) && String(user.estadoUsuario || '').trim().toLowerCase() === 'activo';
}

function isSameUser(left: Pick<SoyibaUser, 'id' | 'email'>, right: Pick<SoyibaUser, 'id' | 'email'>) {
  return Boolean(
    (left.id && right.id && left.id === right.id) ||
      (left.email && right.email && left.email.trim().toLowerCase() === right.email.trim().toLowerCase()),
  );
}
