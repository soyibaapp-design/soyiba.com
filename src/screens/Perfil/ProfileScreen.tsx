import { useMemo, useRef, useState, type ChangeEvent, type InputHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileText,
  Heart,
  Home,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  Megaphone,
  Music2,
  PencilLine,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  updateUserPassword,
  updateUserProfile,
  type SoyibaSession,
  type SoyibaUser,
  type UpdateProfilePayload,
} from '../Auth/auth.service';
import { primaryAssets } from '../../lib/assets';

type ScreenTarget = 'inicio' | 'eventos' | 'eco' | 'donaciones' | 'perfil';

type ProfileScreenProps = {
  session: SoyibaSession;
  onLogout: () => void;
  onNavigate?: (target: ScreenTarget) => void;
  onSessionUpdated: (session: SoyibaSession) => void;
  onCreatePublication?: () => void;
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

type ActivityType = 'saved' | 'events' | 'posts';

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

const activityCards: Array<{ id: ActivityType; label: string; count: number; icon: LucideIcon; tone: string }> = [
  { id: 'saved', label: 'Publicaciones guardadas', count: 12, icon: Heart, tone: 'bg-[#EAF2FF] text-[#145CFF]' },
  { id: 'events', label: 'Eventos a los que asistire', count: 4, icon: CalendarDays, tone: 'bg-[#ECEBFF] text-[#3D4BFF]' },
  { id: 'posts', label: 'Mis publicaciones', count: 8, icon: FileText, tone: 'bg-[#E2F8EC] text-[#059669]' },
];

const sampleItems = [
  {
    title: 'Devocional semanal',
    date: '15 junio 2026',
    image: primaryAssets.loginHero,
  },
  {
    title: 'Alabanza y adoracion',
    date: '10 junio 2026',
    image: primaryAssets.backHero,
  },
  {
    title: 'Estudio biblico',
    date: '5 junio 2026',
    image: primaryAssets.logoAntioquia,
  },
];

function isTrue(value: unknown) {
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'si', 'sí', 'yes'].includes(String(value || '').trim().toLowerCase());
}

function isManager(user: SoyibaUser) {
  return ['admin', 'moderador'].includes(String(user.rolSistema || user.role || '').trim().toLowerCase());
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

export function ProfileScreen({ session, onLogout, onNavigate, onSessionUpdated, onCreatePublication }: ProfileScreenProps) {
  const user = session.user;
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [openActivity, setOpenActivity] = useState<ActivityType>('saved');
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const displayName = getDisplayName(user);

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
      onSessionUpdated({
        ...session,
        user: {
          ...session.user,
          photoUrl,
        },
      });
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
          title: 'Gestion de usuarios',
          description: 'Roles, estados, tipos y permisos.',
          buttonLabel: 'Abrir',
          icon: UsersRound,
          tone: 'violet',
          visible: isManager(user),
        },
        {
          id: 'eco',
          title: 'Gestion de ECO',
          description: 'Crear, editar y administrar grupos.',
          buttonLabel: 'Abrir',
          icon: Home,
          tone: 'orange',
          visible: isTrue(user.publicadorEco),
          target: 'eco',
        },
        {
          id: 'events',
          title: 'Gestion de eventos',
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
            <h1 className="truncate text-2xl font-black leading-tight text-[#0B1F5B]">{displayName}</h1>
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

      <section className="space-y-2">
        <h2 className="text-base font-black text-[#0B1F5B]">Mi ECO</h2>
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
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-black text-[#0B1F5B]">Mi actividad</h2>
        <div className="grid gap-2 min-[430px]:grid-cols-3">
          {activityCards.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setOpenActivity(item.id)}
                className={`flex min-h-[98px] items-center gap-2 rounded-[16px] border bg-white p-3 text-left shadow-[0_14px_32px_rgba(15,23,42,0.06)] ${
                  openActivity === item.id ? 'border-[#145CFF]/30 ring-1 ring-[#145CFF]/20' : 'border-[#E7EDF8]'
                }`}
              >
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${item.tone}`}>
                  <Icon size={23} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-2xl font-black leading-7 text-[#0B1F5B]">{item.count}</span>
                  <span className="mt-1 block text-[10px] font-bold leading-[13px] text-[#51617A]">{item.label}</span>
                </span>
                <ChevronRight size={16} className={openActivity === item.id ? 'rotate-90' : ''} />
              </button>
            );
          })}
        </div>

        <div className="overflow-hidden rounded-[16px] border border-[#D8E5F7] bg-[#F8FBFF] shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-2 border-b border-[#E2EAF6] px-3 py-2.5">
            <ChevronDown size={16} className="text-[#145CFF]" />
            <h3 className="text-xs font-black text-[#0B1F5B]">{activityCards.find((item) => item.id === openActivity)?.label}</h3>
          </div>
          <div className="flex gap-3 overflow-x-auto px-3 pb-3 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {sampleItems.map((item) => (
              <article key={item.title} className="w-[150px] shrink-0 overflow-hidden rounded-[13px] border border-[#DFE8F7] bg-white shadow-[0_10px_22px_rgba(15,23,42,0.06)]">
                <img src={item.image} alt="" className="h-[76px] w-full object-cover" />
                <div className="p-2.5">
                  <h4 className="min-h-[30px] text-[11px] font-black leading-[14px] text-[#0B1F5B]">{item.title}</h4>
                  <p className="mt-1 text-[9px] font-bold leading-3 text-[#64748B]">{item.date}</p>
                  <button type="button" className="mt-2 h-8 w-full rounded-[8px] border border-[#145CFF]/50 bg-white text-[10px] font-black text-[#145CFF]">
                    Visualizar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={() => setLogoutOpen(true)}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-[16px] border border-[#FFD1CF] bg-[#FFF0EF] text-sm font-black text-[#D92D2D] shadow-[0_14px_32px_rgba(230,55,55,0.10)]"
      >
        <LogOut size={20} />
        Cerrar sesion
      </button>

      {editOpen ? (
        <EditProfileModal
          session={session}
          onClose={() => setEditOpen(false)}
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

function Badge({ icon: Icon, label, className }: { icon: LucideIcon; label: string; className: string }) {
  return (
    <span className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-black ring-1 ${className}`}>
      <Icon size={14} />
      {label}
    </span>
  );
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
  onSaved: (session: SoyibaSession) => void;
};

type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type EditPanel = 'personal' | 'security';

function EditProfileModal({ session, onClose, onSaved }: EditProfileModalProps) {
  const user = session.user;
  const [openPanel, setOpenPanel] = useState<EditPanel>('personal');
  const [profileForm, setProfileForm] = useState<UpdateProfilePayload>(() => getInitialProfileForm(user));
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [securitySaving, setSecuritySaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [securityError, setSecurityError] = useState('');
  const rules = getPasswordRules(passwordForm.newPassword);

  function updateProfileField(field: keyof UpdateProfilePayload, value: string) {
    setProfileForm((current) => ({ ...current, [field]: value }));
  }

  function updatePasswordField(field: keyof PasswordFormState, value: string) {
    setPasswordForm((current) => ({ ...current, [field]: value }));
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
      setSecurityError('La confirmacion de contrasena no coincide.');
      return;
    }

    if (rules.some((rule) => !rule.ok)) {
      setSecurityError('La nueva contrasena debe cumplir todos los requisitos.');
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
      setSecurityError(error instanceof Error ? error.message : 'No fue posible actualizar la contrasena.');
    } finally {
      setSecuritySaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0B1F5B]/30 px-3 pb-3 pt-12 backdrop-blur-sm min-[560px]:items-center">
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
                Informacion personal
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
                    label="Numero de telefono"
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
                  <EditableField
                    label="Correo electronico"
                    value={profileForm.email}
                    onChange={(value) => updateProfileField('email', value)}
                    icon={Mail}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
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
                  label="Contrasena actual"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(value) => updatePasswordField('currentPassword', value)}
                  icon={LockKeyhole}
                  autoComplete="current-password"
                />
                <EditableField
                  label="Nueva contrasena"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(value) => updatePasswordField('newPassword', value)}
                  icon={LockKeyhole}
                  autoComplete="new-password"
                />
                <EditableField
                  label="Confirmacion de contrasena"
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
                  Actualizar contrasena
                </button>
              </div>
            ) : null}
          </section>
        </div>
        <footer className="grid grid-cols-2 gap-3 border-t border-[#E3EAF5] bg-white p-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={profileSaving || securitySaving}
            className="h-11 rounded-[12px] border border-[#CBD8EA] bg-white text-xs font-black text-[#51617A] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={profileSaving || securitySaving}
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
  className?: string;
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1.5 block text-[10px] font-black text-[#52637C]">{label}</span>
      <span className="flex h-11 items-center gap-2 rounded-[10px] border border-[#DCE6F5] bg-white px-3 text-xs font-bold text-[#0B1F5B] shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition focus-within:border-[#145CFF] focus-within:ring-4 focus-within:ring-blue-100">
        {Icon ? <Icon size={16} className="shrink-0 text-[#8A99AE]" /> : null}
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder || label}
          inputMode={inputMode}
          autoComplete={autoComplete}
          className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#98A1BD]"
        />
      </span>
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
  };
}

function getFieldValue(value: unknown) {
  return String(value ?? '');
}

function getPasswordRules(password: string) {
  return [
    { label: 'Minimo 8 caracteres', ok: password.length >= 8 },
    { label: 'Al menos una letra mayuscula', ok: /[A-Z]/.test(password) },
    { label: 'Al menos un numero', ok: /\d/.test(password) },
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#0B1F5B]/30 p-4 backdrop-blur-sm">
      <section className="w-full max-w-sm rounded-[20px] bg-white p-5 text-center shadow-[0_26px_70px_rgba(11,31,91,0.22)]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#FFE9E8] text-[#E63737]">
          <LogOut size={28} />
        </div>
        <h2 className="mt-4 text-lg font-black text-[#0B1F5B]">Deseas cerrar sesion?</h2>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} className="h-11 rounded-[12px] border border-[#CBD8EA] bg-white text-xs font-black text-[#51617A]">
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} className="h-11 rounded-[12px] bg-[#E63737] text-xs font-black text-white">
            Cerrar sesion
          </button>
        </div>
      </section>
    </div>
  );
}
