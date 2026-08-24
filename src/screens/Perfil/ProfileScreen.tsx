import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type InputHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import {
  BadgeCheck,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileText,
  Heart,
  Home,
  IdCard,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  Megaphone,
  MessageCircle,
  Music2,
  PencilLine,
  Phone,
  Radio,
  Save,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  updateUserPassword,
  updateUserPhoto,
  updateUserProfile,
  verifyMembershipByCc,
  type SoyibaSession,
  type SoyibaUser,
  type UpdateProfilePayload,
} from '../Auth/auth.service';
import {
  getCachedPublicationFeed,
  getPublicationFeed,
  invalidatePublicationFeedCache,
  type SoyibaPublication,
} from '../Publicaciones/publicaciones.service';

type ScreenTarget = 'inicio' | 'eventos' | 'eco' | 'donaciones' | 'perfil' | 'usuarios' | 'health';

type ProfileScreenProps = {
  session: SoyibaSession;
  onLogout: () => void;
  onNavigate?: (target: ScreenTarget) => void;
  onSessionUpdated: (session: SoyibaSession) => void;
  liveBadgeTestEnabled?: boolean;
  onLiveBadgeTestChange?: (enabled: boolean) => void;
  onCreatePublication?: () => void;
  onOpenPublication?: (publication: SoyibaPublication) => void;
  onModalOpenChange?: (open: boolean) => void;
};

type AdminAction = {
  id: string;
  title: string;
  description: string;
  buttonLabel: string;
  icon: LucideIcon;
  tone: 'blue' | 'violet' | 'orange' | 'green';
  visible: boolean;
  target?: ScreenTarget;
  action?: 'createPublication';
};

type ActivityType = 'saved' | 'events' | 'eco' | 'posts';

const WHATSAPP_MEMBERS_PHONE = '573243339375';

const adminTone = {
  blue: {
    icon: 'bg-[#EAF2FF] text-[#145CFF]',
    button: 'border-[#145CFF]/50 text-[#145CFF] hover:bg-[#145CFF] hover:text-white',
  },
  violet: {
    icon: 'bg-[#F0E8FF] text-[#6D35FF]',
    button: 'border-[#7C3BFF]/50 text-[#6D35FF] hover:bg-[#6D35FF] hover:text-white',
  },
  orange: {
    icon: 'bg-[#FFF1DC] text-[#F28A16]',
    button: 'border-[#F28A16]/50 text-[#D46D00] hover:bg-[#F28A16] hover:text-white',
  },
  green: {
    icon: 'bg-[#E2F8EC] text-[#059669]',
    button: 'border-[#059669]/50 text-[#047857] hover:bg-[#059669] hover:text-white',
  },
};

function isTrue(value: unknown) {
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'si', 'sí', 'yes'].includes(String(value || '').trim().toLowerCase());
}

function isManager(user: SoyibaUser) {
  return ['admin', 'moderador'].includes(String(user.rolSistema || user.role || '').trim().toLowerCase());
}

function isAdmin(user: SoyibaUser) {
  return String(user.rolSistema || user.role || '').trim().toLowerCase() === 'admin';
}

function isMemberUser(user: SoyibaUser) {
  const userType = normalizePlainText((user as SoyibaUser & { tipo?: string }).tipo || user.tipoUsuario);
  return userType === 'miembro';
}

function normalizePlainText(value: unknown) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getDisplayName(user: SoyibaUser) {
  return user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Usuario SOY IBA';
}

function getInitials(user: SoyibaUser) {
  return getDisplayName(user)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function isPublicationAuthor(publication: SoyibaPublication, user: SoyibaUser) {
  return Boolean(
    (publication.author.id && user.id && publication.author.id === user.id) ||
      (publication.author.email && user.email && normalizeEmail(publication.author.email) === normalizeEmail(user.email)),
  );
}

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function buildWhatsappUrl(phone: string, message: string) {
  const digits = String(phone || '').replace(/\D/g, '');

  if (!digits) {
    return '#';
  }

  const number = digits.startsWith('57') ? digits : `57${digits}`;
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${number}${text}`;
}

function buildMemberResourcesMessage(displayName: string) {
  return `Hola, Dios les bendiga. Soy ${displayName} miembro de la Iglesia Bíblica Antioquía y deseo solicitar la siguiente información:`;
}

function formatEcoSummary(publication: SoyibaPublication) {
  return [
    [publication.eco.neighborhood, publication.eco.city].filter(Boolean).join(', '),
    [publication.eco.day, publication.eco.time].filter(Boolean).join(' - '),
  ]
    .filter(Boolean)
    .join(' | ') || 'Grupo ECO';
}

function getPublicationActivityMeta(publication: SoyibaPublication) {
  if (publication.type === 'Evento') {
    return [formatDateLabel(publication.event.dateTime), publication.event.place].filter(Boolean).join(' | ') || 'Evento';
  }

  if (publication.type === 'Grupo ECO') {
    return formatEcoSummary(publication);
  }

  return formatDateLabel(publication.createdAt) || 'Publicación';
}

function formatDateLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export function ProfileScreen({
  session,
  onLogout,
  onNavigate,
  onSessionUpdated,
  liveBadgeTestEnabled = false,
  onLiveBadgeTestChange,
  onCreatePublication,
  onOpenPublication,
  onModalOpenChange,
}: ProfileScreenProps) {
  const user = session.user;
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [openActivity, setOpenActivity] = useState<ActivityType>('saved');
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const cachedPublications = getCachedPublicationFeed(session, {});
  const [publications, setPublications] = useState<SoyibaPublication[]>(() => cachedPublications || []);
  const [activityLoading, setActivityLoading] = useState(() => !cachedPublications);
  const [activityError, setActivityError] = useState('');
  const displayName = getDisplayName(user);

  useLayoutEffect(() => {
    onModalOpenChange?.(editOpen || logoutOpen);

    return () => onModalOpenChange?.(false);
  }, [editOpen, logoutOpen, onModalOpenChange]);

  useEffect(() => {
    let isMounted = true;
    const cached = getCachedPublicationFeed(session, {});

    if (cached) {
      setPublications(cached);
      setActivityLoading(false);
      setActivityError('');
    } else {
      setActivityLoading(true);
    }

    getPublicationFeed(session)
      .then((items) => {
        if (!isMounted) {
          return;
        }

        setPublications(items);
        setActivityError('');
      })
      .catch((error) => {
        if (isMounted) {
          setActivityError(error instanceof Error ? error.message : 'No fue posible cargar tu actividad.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setActivityLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [session]);

  const activityGroups = useMemo(
    () => {
      const saved = publications.filter((publication) => publication.savedByCurrentUser);
      const events = publications.filter((publication) => publication.type === 'Evento' && publication.event.currentUserGoing);
      const eco = publications.filter((publication) => publication.type === 'Grupo ECO' && publication.eco.currentUserAttending).slice(0, 1);
      const posts = publications.filter((publication) => isPublicationAuthor(publication, user));

      return { saved, events, eco, posts };
    },
    [publications, user],
  );
  const activityCards = useMemo<Array<{ id: ActivityType; label: string; count: number; icon: LucideIcon; tone: string }>>(
    () => [
      { id: 'saved', label: 'Publicaciones guardadas', count: activityGroups.saved.length, icon: Heart, tone: 'bg-[#EAF2FF] text-[#145CFF]' },
      { id: 'events', label: 'Eventos a los que asistiré', count: activityGroups.events.length, icon: CalendarDays, tone: 'bg-[#ECEBFF] text-[#3D4BFF]' },
      { id: 'eco', label: 'Grupo ECO al que asistiré', count: activityGroups.eco.length, icon: Home, tone: 'bg-[#EAF2FF] text-[#145CFF]' },
      { id: 'posts', label: 'Mis publicaciones', count: activityGroups.posts.length, icon: FileText, tone: 'bg-[#F8FBFF] text-[#0B1F5B]' },
    ],
    [activityGroups],
  );
  const activeActivity = activityCards.find((item) => item.id === openActivity) || activityCards[0];
  const activeItems = activityGroups[openActivity];
  const currentEco = activityGroups.eco[0] || null;
  const memberResourcesWhatsappUrl = buildWhatsappUrl(WHATSAPP_MEMBERS_PHONE, buildMemberResourcesMessage(displayName));

  async function handlePhotoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setPhotoError('Selecciona una imagen valida.');
      return;
    }

    setPhotoError('');
    setPhotoSaving(true);

    try {
      const photoUrl = await resizeImageFile(file);
      const result = await updateUserPhoto(session, photoUrl);

      if (!result.ok) {
        setPhotoError(result.error);
        return;
      }

      invalidatePublicationFeedCache(result.session);
      setPublications((items) =>
        items.map((publication) =>
          isPublicationAuthor(publication, result.session.user)
            ? {
                ...publication,
                author: {
                  ...publication.author,
                  photoUrl: result.session.user.photoUrl,
                  verified: result.session.user.verificado,
                },
              }
            : publication,
        ),
      );
      onSessionUpdated(result.session);
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'No fue posible actualizar la foto.');
    } finally {
      setPhotoSaving(false);
    }
  }

  const adminActions = useMemo<AdminAction[]>(
    () => {
      const actions: AdminAction[] = [
        {
          id: 'publications',
          title: 'Centro de publicaciones',
          description: 'Crear contenido para la comunidad SOYIBA.',
          buttonLabel: 'Crear',
          icon: Megaphone,
          tone: 'blue',
          visible: isTrue(user.publicador) || isTrue(user.publicadorEco) || isTrue(user.publicadorEvento),
          action: 'createPublication',
        },
        {
          id: 'users',
          title: isManager(user) ? 'Gestión de usuarios' : 'Validación de menores',
          description: isManager(user) ? 'Roles, estados, tipos y permisos.' : 'Revisar autorizaciones de representantes legales.',
          buttonLabel: 'Abrir',
          icon: UsersRound,
          tone: 'violet',
          visible: isManager(user) || isTrue(user.minorValidator),
          target: 'usuarios',
        },
        {
          id: 'health',
          title: 'Health de la app',
          description: 'Sesiones, llamadas activas e IPs reportadas.',
          buttonLabel: 'Abrir',
          icon: Radio,
          tone: 'green',
          visible: isAdmin(user),
          target: 'health',
        },
        {
          id: 'eco',
          title: 'Gestión de ECO',
          description: 'Crear, editar y administrar grupos.',
          buttonLabel: 'Abrir',
          icon: Home,
          tone: 'orange',
          visible: isTrue(user.publicadorEco),
          target: 'eco',
        },
        {
          id: 'events',
          title: 'Gestión de eventos',
          description: 'Crear, editar y administrar eventos.',
          buttonLabel: 'Abrir',
          icon: CalendarDays,
          tone: 'green',
          visible: isTrue(user.publicadorEvento),
          target: 'eventos',
        },
      ];

      return actions.filter((item) => item.visible);
    },
    [user],
  );

  return (
    <section className="space-y-4 pb-4">
      <div className="relative -mx-4 -mt-5 overflow-hidden px-5 pb-7 pt-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(3,123,240,0.18),transparent_32%),linear-gradient(135deg,#FFFFFF_0%,#F3F8FF_58%,#EAF3FF_100%)]" />
        <div className="absolute -right-24 top-4 h-52 w-80 rotate-[-26deg] rounded-full border border-[#037BF0]/10" />
        <div className="absolute -right-8 top-20 h-44 w-64 rotate-[-26deg] rounded-full border border-white/80" />

        <div className="relative flex items-center gap-4">
          <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelected} />
          <div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full border-[5px] border-white bg-[#EAF2FF] text-3xl font-black text-[#0B1F5B] shadow-[0_18px_44px_rgba(3,123,240,0.24)]">
            {user.photoUrl ? (
              <img src={user.photoUrl} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              getInitials(user)
            )}
            <button
              type="button"
              aria-label="Actualizar foto"
              onClick={() => photoInputRef.current?.click()}
              disabled={photoSaving}
              className="absolute bottom-1 right-0 grid h-10 w-10 place-items-center rounded-full bg-[#145CFF] text-white shadow-[0_12px_26px_rgba(20,92,255,0.42)] ring-4 ring-white"
            >
              {photoSaving ? <LoaderCircle size={19} className="animate-spin" /> : <Camera size={19} />}
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="flex min-w-0 items-center gap-1.5 text-2xl font-black leading-tight text-[#0B1F5B]">
              <span className="min-w-0 truncate">{displayName}</span>
              <VerifiedBadge active={Boolean(user.verificado)} />
            </h1>
            <p className="mt-1 truncate text-sm font-semibold text-[#51617A]">{user.email}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge icon={UserRound} label={user.tipoUsuario || 'Asistente'} className="bg-[#EAF2FF] text-[#145CFF] ring-[#B9D3FF]" />
              <Badge icon={ShieldCheck} label={user.rolSistema || user.role || 'Usuario'} className="bg-[#FFE9E8] text-[#E63737] ring-[#FFB6B2]/50" />
              <Badge icon={Music2} label={user.tituloUsuario || 'Asistente'} className="bg-[#FFF1DC] text-[#D46D00] ring-[#FFD39A]" />
              <Badge icon={CheckCircle2} label={user.estadoUsuario || 'Activo'} className="bg-[#DDF8EA] text-[#037A46] ring-[#7BD6AA]/50" />
            </div>
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="mt-4 inline-flex h-11 items-center gap-2 rounded-[14px] border border-[#145CFF]/50 bg-white/75 px-5 text-xs font-black text-[#145CFF] shadow-[0_12px_26px_rgba(3,123,240,0.10)]"
            >
              <PencilLine size={16} />
              Editar perfil
            </button>
            {photoError ? <p className="mt-2 text-xs font-bold text-red-600">{photoError}</p> : null}
          </div>
        </div>
      </div>

      {adminActions.length ? (
        <section className="rounded-[20px] border border-white/80 bg-white/90 p-3.5 shadow-[0_18px_42px_rgba(15,23,42,0.07)]">
          <h2 className="text-base font-black text-[#0B1F5B]">Accesos administrativos</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 min-[520px]:grid-cols-4">
            {adminActions.map((action) => (
              <AdminCard key={action.id} action={action} onNavigate={onNavigate} onCreatePublication={onCreatePublication} />
            ))}
          </div>
        </section>
      ) : null}

      {isManager(user) ? (
        <LiveBadgeTestPanel enabled={liveBadgeTestEnabled} onChange={onLiveBadgeTestChange || (() => undefined)} />
      ) : null}

      {isMemberUser(user) ? (
        <section className="rounded-[20px] border border-[#DCE6F5] bg-white/90 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-[#E2F8EC] text-[#059669]">
              <MessageCircle size={24} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-black leading-5 text-[#0B1F5B]">Recursos para miembros</h2>
              <p className="mt-1 text-[12px] font-semibold leading-5 text-[#637295]">
                Accede a orientación, materiales o información reservada para miembros de la iglesia.
              </p>
            </div>
          </div>
          <a
            href={memberResourcesWhatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex min-h-[46px] items-center justify-center gap-2 rounded-[14px] bg-emerald-600 px-4 text-xs font-black text-white shadow-[0_12px_26px_rgba(5,150,105,0.22)] transition hover:bg-emerald-700"
          >
            <MessageCircle size={17} />
            Solicitar recursos
          </a>
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-base font-black text-[#0B1F5B]">Mi ECO</h2>
        {currentEco ? (
          <article className="rounded-[20px] border border-[#DCE6F5] bg-white/90 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
            <div className="flex min-w-0 items-start gap-3">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#EAF2FF] text-[#145CFF]">
                <Home size={28} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black uppercase tracking-normal text-[#145CFF]">Asistiré a</p>
                <h3 className="mt-1 line-clamp-2 break-words text-[16px] font-black leading-5 text-[#0B1F5B]">{currentEco.title}</h3>
                <p className="mt-1 line-clamp-2 break-words text-[12px] font-semibold leading-4 text-[#637295]">
                  {formatEcoSummary(currentEco)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenPublication?.(currentEco)}
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[12px] bg-[#145CFF] px-5 text-xs font-black text-white shadow-[0_12px_26px_rgba(20,92,255,0.28)]"
            >
              Abrir Grupo ECO
              <ChevronRight size={16} />
            </button>
          </article>
        ) : (
          <article className="rounded-[20px] border border-dashed border-[#B8C9E7] bg-white/90 p-5 text-center shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#EAF2FF] text-[#145CFF]">
              <Home size={28} />
            </div>
            <p className="mt-3 text-sm font-black text-[#0B1F5B]">No perteneces actualmente a ningun Grupo ECO.</p>
            <button
              type="button"
              onClick={() => onNavigate?.('eco')}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-[12px] bg-[#145CFF] px-5 text-xs font-black text-white shadow-[0_12px_26px_rgba(20,92,255,0.28)]"
            >
              Buscar un ECO
              <ChevronRight size={16} />
            </button>
          </article>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-black text-[#0B1F5B]">Mi actividad</h2>
        <div className="grid grid-cols-2 gap-2 min-[560px]:grid-cols-4">
          {activityCards.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setOpenActivity(item.id)}
                className={`flex min-h-[124px] min-w-0 flex-col items-start gap-2 rounded-[16px] border bg-white p-3 text-left shadow-[0_14px_32px_rgba(15,23,42,0.06)] ${
                  openActivity === item.id ? 'border-[#145CFF]/30 ring-1 ring-[#145CFF]/20' : 'border-[#E7EDF8]'
                }`}
              >
                <span className="flex w-full min-w-0 items-center justify-between gap-2">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${item.tone}`}>
                    <Icon size={22} />
                  </span>
                  <ChevronRight size={16} className={`shrink-0 text-[#637295] transition ${openActivity === item.id ? 'rotate-90 text-[#145CFF]' : ''}`} />
                </span>
                <span className="block min-w-0">
                  <span className="block text-2xl font-black leading-7 text-[#0B1F5B]">{item.count}</span>
                  <span className="mt-1 block break-words text-[11px] font-bold leading-4 text-[#51617A]">{item.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="overflow-hidden rounded-[16px] border border-[#D8E5F7] bg-[#F8FBFF] shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-2 border-b border-[#E2EAF6] px-3 py-2.5">
            <ChevronDown size={16} className="text-[#145CFF]" />
            <h3 className="min-w-0 break-words text-xs font-black text-[#0B1F5B]">{activeActivity?.label}</h3>
          </div>
          <div className="space-y-2 px-3 pb-3 pt-3">
            {activityLoading ? (
              <div className="flex h-24 items-center justify-center text-[#145CFF]">
                <LoaderCircle size={20} className="animate-spin" />
              </div>
            ) : null}

            {!activityLoading && activityError ? (
              <p className="rounded-[12px] border border-rose-100 bg-rose-50 px-3 py-2 text-[11px] font-bold leading-4 text-rose-700">{activityError}</p>
            ) : null}

            {!activityLoading && !activityError && !activeItems.length ? (
              <p className="rounded-[12px] border border-dashed border-[#B8C9E7] bg-white px-3 py-4 text-center text-[12px] font-bold leading-5 text-[#637295]">
                Aún no hay elementos en esta actividad.
              </p>
            ) : null}

            {!activityLoading && !activityError
              ? activeItems.map((publication) => (
                  <ActivityPublicationItem key={publication.id} publication={publication} onOpen={() => onOpenPublication?.(publication)} />
                ))
              : null}
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={() => setLogoutOpen(true)}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-[16px] border border-[#FFD1CF] bg-[#FFF0EF] text-sm font-black text-[#D92D2D] shadow-[0_14px_32px_rgba(230,55,55,0.10)]"
      >
        <LogOut size={20} />
        Cerrar sesión
      </button>

      {editOpen ? (
        <EditProfileModal
          session={session}
          onClose={() => setEditOpen(false)}
          onSessionUpdated={onSessionUpdated}
          onSaved={(nextSession) => {
            onSessionUpdated(nextSession);
            setEditOpen(false);
          }}
        />
      ) : null}
      {logoutOpen ? (
        <ConfirmLogout
          onCancel={() => setLogoutOpen(false)}
          onConfirm={() => {
            setLogoutOpen(false);
            onLogout();
          }}
        />
      ) : null}
    </section>
  );
}

function LiveBadgeTestPanel({ enabled, onChange }: { enabled: boolean; onChange: (enabled: boolean) => void }) {
  return (
    <section className="rounded-[20px] border border-[#FFD1CF] bg-[#FFF7F6] p-3.5 shadow-[0_18px_42px_rgba(230,55,55,0.08)]">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-[#FFE8E8] text-[#E63737]">
          <Radio size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-black leading-5 text-[#0B1F5B]">Prueba del badge LIVE</h2>
          <p className="mt-0.5 text-[11px] font-bold leading-4 text-[#637295]">Activa el indicador rojo del menú inferior para revisar la transmisión en vivo.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => onChange(!enabled)}
          className={`relative h-8 w-14 shrink-0 rounded-full p-1 transition ${enabled ? 'bg-[#E63737]' : 'bg-[#CBD8EA]'}`}
        >
          <span className={`block h-6 w-6 rounded-full bg-white shadow-[0_6px_14px_rgba(15,23,42,0.18)] transition ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
        </button>
      </div>
    </section>
  );
}

function ActivityPublicationItem({ publication, onOpen }: { publication: SoyibaPublication; onOpen: () => void }) {
  const image = publication.mediaItems.find((item) => item.type === 'image')?.url || '';

  return (
    <article className="grid min-w-0 grid-cols-[58px_minmax(0,1fr)_40px] items-center gap-3 rounded-[13px] border border-[#DFE8F7] bg-white p-2.5 shadow-[0_10px_22px_rgba(15,23,42,0.05)]">
      <div className="grid h-[58px] w-[58px] overflow-hidden rounded-[11px] bg-[#EAF2FF] text-[#145CFF]">
        {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <FileText className="m-auto" size={22} />}
      </div>
      <div className="min-w-0">
        <span className="inline-flex max-w-full rounded-full bg-[#EAF2FF] px-2 py-0.5 text-[9px] font-black uppercase text-[#145CFF]">
          <span className="truncate">{publication.type}</span>
        </span>
        <h4 className="mt-1 line-clamp-2 break-words text-[12px] font-black leading-4 text-[#0B1F5B]">{publication.title}</h4>
        <p className="mt-0.5 line-clamp-1 break-words text-[10px] font-bold leading-4 text-[#64748B]">{getPublicationActivityMeta(publication)}</p>
      </div>
      <button
        type="button"
        aria-label={`Abrir ${publication.title}`}
        onClick={onOpen}
        className="grid h-10 w-10 place-items-center rounded-[11px] border border-[#145CFF]/40 bg-white text-[#145CFF]"
      >
        <ChevronRight size={17} />
      </button>
    </article>
  );
}

function Badge({ icon: Icon, label, className }: { icon: LucideIcon; label: string; className: string }) {
  return (
    <span className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-black ring-1 ${className}`}>
      <Icon size={14} />
      {label}
    </span>
  );
}

function VerifiedBadge({ active }: { active: boolean }) {
  if (!active) {
    return null;
  }

  return <BadgeCheck size={18} aria-label="Usuario verificado" className="shrink-0 fill-[#EAF2FF] text-[#145CFF]" />;
}

function AdminCard({
  action,
  onNavigate,
  onCreatePublication,
}: {
  action: AdminAction;
  onNavigate?: (target: ScreenTarget) => void;
  onCreatePublication?: () => void;
}) {
  const Icon = action.icon;
  const tone = adminTone[action.tone];

  return (
    <article className="flex min-h-[186px] flex-col rounded-[18px] border border-[#E7EDF8] bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className={`grid h-12 w-12 place-items-center rounded-[14px] ${tone.icon}`}>
        <Icon size={24} />
      </div>
      <h3 className="mt-3 text-sm font-black leading-[18px] text-[#0B1F5B]">{action.title}</h3>
      <p className="mt-1 min-h-[44px] text-[11px] font-semibold leading-[15px] text-[#5D6B82]">{action.description}</p>
      <button
        type="button"
        onClick={() => {
          if (action.action === 'createPublication') {
            onCreatePublication?.();
            return;
          }

          if (action.target) {
            onNavigate?.(action.target);
          }
        }}
        className={`mt-auto h-10 rounded-[11px] border bg-white px-3 text-xs font-black transition ${tone.button}`}
      >
        {action.buttonLabel}
      </button>
    </article>
  );
}

type EditProfileModalProps = {
  session: SoyibaSession;
  onClose: () => void;
  onSessionUpdated: (session: SoyibaSession) => void;
  onSaved: (session: SoyibaSession) => void;
};

type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type EditPanel = 'personal' | 'privacy' | 'security';

function EditProfileModal({ session, onClose, onSessionUpdated, onSaved }: EditProfileModalProps) {
  const user = session.user;
  const [openPanel, setOpenPanel] = useState<EditPanel>('personal');
  const [profileForm, setProfileForm] = useState<UpdateProfilePayload>(() => getInitialProfileForm(user));
  const [membershipCc, setMembershipCc] = useState(() => getFieldValue(user.cc));
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [membershipSaving, setMembershipSaving] = useState(false);
  const [securitySaving, setSecuritySaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [membershipError, setMembershipError] = useState('');
  const [membershipMessage, setMembershipMessage] = useState('');
  const [securityError, setSecurityError] = useState('');
  const rules = getPasswordRules(passwordForm.newPassword);

  function updateProfileField<K extends keyof UpdateProfilePayload>(field: K, value: UpdateProfilePayload[K]) {
    setProfileForm((current) => ({ ...current, [field]: value }));
  }

  function updatePasswordField(field: keyof PasswordFormState, value: string) {
    setPasswordForm((current) => ({ ...current, [field]: value }));
  }

  async function handleVerifyMembership() {
    setMembershipError('');
    setMembershipMessage('');
    setMembershipSaving(true);

    try {
      const result = await verifyMembershipByCc(session, membershipCc);

      if (result.ok) {
        setMembershipCc(getFieldValue(result.session.user.cc || membershipCc));
        setMembershipMessage(result.message);
        onSessionUpdated(result.session);
      } else {
        setMembershipError(result.error);
      }
    } catch (error) {
      setMembershipError(error instanceof Error ? error.message : 'No fue posible validar tu CC.');
    } finally {
      setMembershipSaving(false);
    }
  }

  async function handleSaveProfile() {
    setProfileError('');
    setProfileSaving(true);

    try {
      const result = await updateUserProfile(session, profileForm);

      if (result.ok) {
        onSaved(result.session);
      } else {
        setProfileError(result.error);
      }
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'No fue posible guardar los cambios.');
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleChangePassword() {
    setSecurityError('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setSecurityError('La confirmación de contraseña no coincide.');
      return;
    }

    if (rules.some((rule) => !rule.ok)) {
      setSecurityError('La nueva contraseña debe cumplir todos los requisitos.');
      return;
    }

    setSecuritySaving(true);

    try {
      const result = await updateUserPassword(session, passwordForm.currentPassword, passwordForm.newPassword);

      if (result.ok) {
        onSaved(result.session);
      } else {
        setSecurityError(result.error);
      }
    } catch (error) {
      setSecurityError(error instanceof Error ? error.message : 'No fue posible actualizar la contraseña.');
    } finally {
      setSecuritySaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-[#0B1F5B]/30 px-3 pb-3 pt-12 backdrop-blur-sm min-[560px]:items-center">
      <motion.section
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="max-h-[calc(100vh-40px)] w-full max-w-xl overflow-hidden rounded-[20px] border border-white/80 bg-white shadow-[0_26px_70px_rgba(11,31,91,0.22)]"
      >
        <header className="flex h-14 items-center justify-between border-b border-[#E3EAF5] px-4">
          <h2 className="text-sm font-black text-[#0B1F5B]">Editar perfil</h2>
          <button type="button" aria-label="Cerrar" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-[#0B1F5B]">
            <X size={20} />
          </button>
        </header>
        <div className="max-h-[calc(100vh-164px)] space-y-3 overflow-y-auto bg-[#F8FBFF] p-3.5">
          <section className="overflow-hidden rounded-[13px] border border-[#DCE6F5] bg-white">
            <button
              type="button"
              onClick={() => setOpenPanel('personal')}
              className="flex h-12 w-full items-center justify-between bg-[#F8FBFF] px-3 text-xs font-black text-[#145CFF]"
            >
              <span className="flex items-center gap-2">
                <UserRound size={16} />
                Información personal
              </span>
              <ChevronDown size={16} className={openPanel === 'personal' ? 'rotate-180' : ''} />
            </button>
            {openPanel === 'personal' ? (
              <>
                <div className="grid gap-3 p-3.5 min-[500px]:grid-cols-2">
                  <EditableField
                    label="Nombre"
                    value={profileForm.firstName}
                    onChange={(value) => updateProfileField('firstName', value)}
                    icon={UserRound}
                    autoComplete="given-name"
                  />
                  <EditableField
                    label="Apellido"
                    value={profileForm.lastName}
                    onChange={(value) => updateProfileField('lastName', value)}
                    icon={UserRound}
                    autoComplete="family-name"
                  />
                  <EditableField
                    label="Número de teléfono"
                    value={profileForm.phone}
                    onChange={(value) => updateProfileField('phone', value)}
                    icon={Phone}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                  <EditableField
                    label="Tiempo en la IBA"
                    value={profileForm.tiempoIba}
                    onChange={(value) => updateProfileField('tiempoIba', value)}
                    icon={Clock3}
                    placeholder="Ej: 3 anos"
                  />
                  <div className="grid gap-2 min-[500px]:col-span-2 min-[500px]:grid-cols-[minmax(0,1fr)_150px] min-[500px]:items-end">
                    <EditableField
                      label="CC"
                      value={membershipCc}
                      onChange={(value) => {
                        setMembershipCc(value.replace(/\D/g, ''));
                        setMembershipError('');
                        setMembershipMessage('');
                      }}
                      icon={IdCard}
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="Cédula sin puntos ni comas"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyMembership}
                      disabled={membershipSaving || profileSaving || securitySaving}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[#145CFF] px-4 text-xs font-black text-white shadow-[0_12px_26px_rgba(20,92,255,0.24)] disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {membershipSaving ? <LoaderCircle size={16} className="animate-spin" /> : <BadgeCheck size={16} />}
                      Soy miembro
                    </button>
                  </div>
                  {membershipMessage ? (
                    <p className="min-[500px]:col-span-2 rounded-[10px] bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700">{membershipMessage}</p>
                  ) : null}
                  {membershipError ? (
                    <p className="min-[500px]:col-span-2 rounded-[10px] bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700">{membershipError}</p>
                  ) : null}
                  <EditableField
                    label="Correo electronico"
                    value={profileForm.email}
                    onChange={() => undefined}
                    icon={Mail}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    readOnly
                    className="min-[500px]:col-span-2"
                  />
                </div>
                {profileError ? <p className="mx-3.5 mb-3 rounded-[10px] bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700">{profileError}</p> : null}
              </>
            ) : null}
          </section>
          <section className="overflow-hidden rounded-[13px] border border-[#DCE6F5] bg-white">
            <button
              type="button"
              onClick={() => setOpenPanel('privacy')}
              className="flex h-12 w-full items-center justify-between bg-[#F8FBFF] px-3 text-xs font-black text-[#145CFF]"
            >
              <span className="flex items-center gap-2">
                <ShieldCheck size={16} />
                Privacidad
              </span>
              <ChevronDown size={16} className={openPanel === 'privacy' ? 'rotate-180' : ''} />
            </button>
            {openPanel === 'privacy' ? (
              <div className="grid gap-3 p-3.5">
                <div className="rounded-[12px] border border-[#E1E8F3] bg-[#F8FBFF] p-3">
                  <p className="text-[11px] font-bold leading-5 text-[#52637C]">
                    El directorio solo es visible para miembros validados y gestores. Estos controles definen qué datos tuyos pueden consultar otros miembros.
                  </p>
                </div>
                {!isMemberUser(user) ? (
                  <p className="rounded-[10px] bg-amber-50 px-3 py-2 text-[11px] font-bold leading-4 text-amber-700">
                    Estas preferencias se aplicarán cuando tu perfil sea validado como miembro.
                  </p>
                ) : null}
                <PrivacyToggle
                  label="Aparecer en el directorio de miembros"
                  description="Si está desactivado, tu perfil no se mostrará en Miembros IBA."
                  checked={profileForm.visibleDirectorio}
                  onChange={(checked) => updateProfileField('visibleDirectorio', checked)}
                />
                <PrivacyToggle
                  label="Mostrar mi foto"
                  description="Controla si otros miembros ven tu foto de perfil en el directorio."
                  checked={profileForm.mostrarFoto}
                  onChange={(checked) => updateProfileField('mostrarFoto', checked)}
                  disabled={!profileForm.visibleDirectorio}
                />
                <PrivacyToggle
                  label="Mostrar mi teléfono"
                  description="Permite que tu número sea usado para contacto dentro del directorio."
                  checked={profileForm.mostrarTelefono}
                  onChange={(checked) => updateProfileField('mostrarTelefono', checked)}
                  disabled={!profileForm.visibleDirectorio}
                />
                <PrivacyToggle
                  label="Permitir contacto por WhatsApp"
                  description="Muestra el botón de WhatsApp solo si también permites mostrar tu teléfono."
                  checked={profileForm.permitirWhatsapp}
                  onChange={(checked) => updateProfileField('permitirWhatsapp', checked)}
                  disabled={!profileForm.visibleDirectorio || !profileForm.mostrarTelefono}
                />
              </div>
            ) : null}
          </section>
          <section className="overflow-hidden rounded-[13px] border border-[#DCE6F5] bg-white">
            <button
              type="button"
              onClick={() => setOpenPanel('security')}
              className="flex h-12 w-full items-center justify-between bg-[#F8FBFF] px-3 text-xs font-black text-[#145CFF]"
            >
              <span className="flex items-center gap-2">
                <LockKeyhole size={16} />
                Seguridad
              </span>
              <ChevronDown size={16} className={openPanel === 'security' ? 'rotate-180' : ''} />
            </button>
            {openPanel === 'security' ? (
              <div className="grid gap-3 p-3.5">
                <EditableField
                  label="Contraseña actual"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(value) => updatePasswordField('currentPassword', value)}
                  icon={LockKeyhole}
                  autoComplete="current-password"
                />
                <EditableField
                  label="Nueva contraseña"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(value) => updatePasswordField('newPassword', value)}
                  icon={LockKeyhole}
                  autoComplete="new-password"
                />
                <EditableField
                  label="Confirmación de contraseña"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(value) => updatePasswordField('confirmPassword', value)}
                  icon={LockKeyhole}
                  autoComplete="new-password"
                />
                <div className="rounded-[12px] border border-[#E1E8F3] bg-[#F8FBFF] p-3">
                  {rules.map((rule) => (
                    <p key={rule.label} className={`flex items-center gap-2 text-[11px] font-bold ${rule.ok ? 'text-[#047857]' : 'text-[#728098]'}`}>
                      <CheckCircle2 size={14} />
                      {rule.label}
                    </p>
                  ))}
                </div>
                {securityError ? <p className="rounded-[10px] bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700">{securityError}</p> : null}
                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={securitySaving}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[#145CFF] px-4 text-xs font-black text-white shadow-[0_12px_26px_rgba(20,92,255,0.24)] disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {securitySaving ? <LoaderCircle size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  Actualizar contraseña
                </button>
              </div>
            ) : null}
          </section>
        </div>
        <footer className="grid grid-cols-2 gap-3 border-t border-[#E3EAF5] bg-white p-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={profileSaving || membershipSaving || securitySaving}
            className="h-11 rounded-[12px] border border-[#CBD8EA] bg-white text-xs font-black text-[#51617A] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={profileSaving || membershipSaving || securitySaving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[#062B70] px-4 text-xs font-black text-white shadow-[0_12px_26px_rgba(6,43,112,0.24)] disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {profileSaving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
            Guardar
          </button>
        </footer>
      </motion.section>
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
  icon: Icon,
  type = 'text',
  placeholder,
  inputMode,
  autoComplete,
  readOnly = false,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon?: LucideIcon;
  type?: string;
  placeholder?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode'];
  autoComplete?: string;
  readOnly?: boolean;
  className?: string;
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1.5 block text-[10px] font-black text-[#52637C]">{label}</span>
      <span
        className={`flex h-11 items-center gap-2 rounded-[10px] border border-[#DCE6F5] px-3 text-xs font-bold shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition ${
          readOnly ? 'bg-[#F2F6FC] text-[#64748B]' : 'bg-white text-[#0B1F5B] focus-within:border-[#145CFF] focus-within:ring-4 focus-within:ring-blue-100'
        }`}
      >
        {Icon ? <Icon size={16} className="shrink-0 text-[#8A99AE]" /> : null}
        <input
          type={type}
          value={value}
          onChange={(event) => {
            if (!readOnly) {
              onChange(event.target.value);
            }
          }}
          placeholder={placeholder || label}
          inputMode={inputMode}
          autoComplete={autoComplete}
          readOnly={readOnly}
          aria-readonly={readOnly}
          className={`h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#98A1BD] ${readOnly ? 'cursor-default text-[#64748B]' : ''}`}
        />
      </span>
    </label>
  );
}

function PrivacyToggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`flex min-h-[70px] items-center gap-3 rounded-[12px] border border-[#DCE6F5] bg-white p-3 ${disabled ? 'opacity-55' : ''}`}>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-black leading-4 text-[#0B1F5B]">{label}</span>
        <span className="mt-1 block text-[11px] font-semibold leading-4 text-[#637295]">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 shrink-0 rounded border-2 border-slate-300 text-[#145CFF] accent-[#145CFF] disabled:cursor-not-allowed"
      />
    </label>
  );
}

function getInitialProfileForm(user: SoyibaUser): UpdateProfilePayload {
  const nameParts = getDisplayName(user).split(/\s+/).filter(Boolean);

  return {
    firstName: getFieldValue(user.firstName || nameParts[0]),
    lastName: getFieldValue(user.lastName || nameParts.slice(1).join(' ')),
    email: getFieldValue(user.email),
    phone: getFieldValue(user.phone),
    tiempoIba: getFieldValue(user.tiempoIba),
    visibleDirectorio: getBooleanField(user.visibleDirectorio, false),
    mostrarTelefono: getBooleanField(user.mostrarTelefono, false),
    permitirWhatsapp: getBooleanField(user.permitirWhatsapp, false),
    mostrarFoto: getBooleanField(user.mostrarFoto, true),
  };
}

function getFieldValue(value: unknown) {
  return String(value ?? '');
}

function getBooleanField(value: unknown, fallback: boolean) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return ['true', '1', 'si', 'sí', 'yes', 'activo', 'active'].includes(normalizePlainText(value));
}

function getPasswordRules(password: string) {
  return [
    { label: 'Mínimo 8 caracteres', ok: password.length >= 8 },
    { label: 'Al menos una letra mayuscula', ok: /[A-Z]/.test(password) },
    { label: 'Al menos un número', ok: /\d/.test(password) },
    { label: 'Al menos un caracter especial', ok: /[^A-Za-z0-9]/.test(password) },
  ];
}

function resizeImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('No fue posible leer la imagen.'));
    reader.onload = () => {
      const image = new Image();

      image.onerror = () => reject(new Error('No fue posible procesar la imagen.'));
      image.onload = () => {
        try {
          const attempts = [
            { size: 320, quality: 0.76 },
            { size: 260, quality: 0.68 },
            { size: 220, quality: 0.58 },
          ];

          for (const attempt of attempts) {
            const dataUrl = renderImageToJpeg(image, attempt.size, attempt.quality);

            if (dataUrl.length <= 45000) {
              resolve(dataUrl);
              return;
            }
          }

          resolve(renderImageToJpeg(image, 180, 0.52));
        } catch (error) {
          reject(error);
        }
      };

      image.src = String(reader.result || '');
    };

    reader.readAsDataURL(file);
  });
}

function renderImageToJpeg(image: HTMLImageElement, maxSize: number, quality: number) {
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('No fue posible preparar la imagen.');
  }

  canvas.width = width;
  canvas.height = height;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', quality);
}

function ConfirmLogout({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-[#0B1F5B]/30 p-4 backdrop-blur-sm">
      <section className="w-full max-w-sm rounded-[20px] bg-white p-5 text-center shadow-[0_26px_70px_rgba(11,31,91,0.22)]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#FFE9E8] text-[#E63737]">
          <LogOut size={28} />
        </div>
        <h2 className="mt-4 text-lg font-black text-[#0B1F5B]">¿Deseas cerrar sesión?</h2>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} className="h-11 rounded-[12px] border border-[#CBD8EA] bg-white text-xs font-black text-[#51617A]">
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} className="h-11 rounded-[12px] bg-[#E63737] text-xs font-black text-white">
            Cerrar sesión
          </button>
        </div>
      </section>
    </div>
  );
}
