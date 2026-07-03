import { FormEvent, useEffect, useMemo, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Smartphone,
  UserPlus,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import loginHero from '../../../PrimaryAssets/Login.jpg';
import iglesiaFooterLogo from '../../../PrimaryAssets/logo-iglesia-letras.png';
import {
  registerWithEmailPassword,
  signInWithEmailPassword,
  type RegisterPayload,
  type SoyibaSession,
} from './auth.service';

type AuthScreenProps = {
  onSignedIn: (session: SoyibaSession) => void;
  initialMode?: AuthMode;
};

type AuthMode = 'login' | 'register';
type LegalModalId = 'privacy' | 'terms' | null;

type LoginFormState = {
  email: string;
  password: string;
};

type RegisterFormState = RegisterPayload & {
  confirmPassword: string;
};

const emptyLoginForm: LoginFormState = {
  email: '',
  password: '',
};

const emptyRegisterForm: RegisterFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

export function AuthScreen({ onSignedIn, initialMode }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>(() => initialMode || getInitialMode());
  const [loginForm, setLoginForm] = useState<LoginFormState>(emptyLoginForm);
  const [registerForm, setRegisterForm] = useState<RegisterFormState>(emptyRegisterForm);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeLegalModal, setActiveLegalModal] = useState<LegalModalId>(null);

  const passwordRules = useMemo(() => getPasswordRules(registerForm.password), [registerForm.password]);
  const isRegister = mode === 'register';

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
      setError('');
      return;
    }

    function syncModeFromHash() {
      setMode(getInitialMode());
      setError('');
    }

    window.addEventListener('hashchange', syncModeFromHash);
    return () => window.removeEventListener('hashchange', syncModeFromHash);
  }, [initialMode]);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError('');
    window.history.replaceState(null, '', nextMode === 'register' ? '#registro' : '#login');
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await signInWithEmailPassword(loginForm.email, loginForm.password);

      if (result.ok) {
        onSignedIn(result.session);
      } else {
        setError(result.error);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No fue posible iniciar sesión.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (passwordRules.some((rule) => !rule.isMet)) {
      setError('La contraseña debe cumplir todos los requisitos.');
      return;
    }

    if (!acceptedTerms) {
      setError('Debes aceptar la política de datos y los términos de uso.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await registerWithEmailPassword(registerForm);

      if (result.ok) {
        onSignedIn(result.session);
      } else {
        setError(result.error);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No fue posible crear la cuenta.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="soyiba-app-backdrop h-[100dvh] overflow-x-hidden overflow-y-auto overscroll-contain text-[#06245c]">
      <div className="mx-auto min-h-full w-full max-w-3xl bg-[#061c4a]/88 pb-5 shadow-2xl shadow-slate-950/30 backdrop-blur-[1px]">
        <AuthHero mode={mode} />

        <motion.section
          key={mode}
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className={`relative z-10 mx-auto -mt-5 w-[92%] bg-gradient-to-b from-white to-[#f8fbff] px-4 pb-[max(env(safe-area-inset-bottom),1rem)] shadow-[0_18px_50px_rgba(4,20,52,0.16)] ring-1 ring-white/80 sm:w-[84%] sm:px-6 md:px-7 ${
            isRegister
              ? 'max-w-[620px] rounded-[24px] pt-4'
              : 'max-w-[520px] rounded-[24px] pt-4'
          }`}
        >
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="mx-auto w-full max-w-md">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#1459d4]/10 text-[#1459d4] ring-1 ring-[#1459d4]/10" aria-hidden="true">
                  <LockKeyhole size={18} strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <h1 className="text-[19px] font-bold leading-tight tracking-normal text-[#06245c]">Iniciar sesión</h1>
                  <p className="mt-1 text-[12px] leading-4 text-[#5b6a8f]">Bienvenido de nuevo a SOY IBA.</p>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                <AuthField
                  id="login-email"
                  label="Correo electrónico"
                  icon={Mail}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="Ingresa tu correo electrónico"
                  value={loginForm.email}
                  onChange={(value) => setLoginForm((current) => ({ ...current, email: value }))}
                />

                <AuthField
                  id="login-password"
                  label="Contraseña"
                  icon={LockKeyhole}
                  type={showLoginPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña"
                  value={loginForm.password}
                  onChange={(value) => setLoginForm((current) => ({ ...current, password: value }))}
                  rightSlot={
                    <IconButton
                      label={showLoginPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onClick={() => setShowLoginPassword((current) => !current)}
                      icon={showLoginPassword ? EyeOff : Eye}
                    />
                  }
                />
              </div>

              <div className="mt-2 flex justify-end">
                <button type="button" className="max-w-full whitespace-normal pr-1 text-right text-[11px] font-medium text-[#115bd8] transition hover:text-[#06245c]">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <AuthError message={error} />

              <PrimaryAuthButton label="Ingresar" isLoading={isSubmitting} />

              <button
                type="button"
                onClick={() => switchMode('register')}
                className="mt-3 flex h-10 w-full items-center justify-between rounded-xl border border-[#1459d4] bg-white px-4 text-[13px] font-semibold text-[#1459d4] transition hover:bg-blue-50"
              >
                <UserPlus size={18} aria-hidden="true" />
                <span>Crear cuenta</span>
                <span className="w-5" aria-hidden="true" />
              </button>
              <AuthFooter />
            </form>
          ) : (
            <form onSubmit={handleRegister} className="mx-auto w-full max-w-xl">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  aria-label="Volver al inicio de sesión"
                  className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#1459d4]/10 text-[#1459d4] transition hover:bg-blue-50"
                >
                  <ArrowLeft size={18} aria-hidden="true" />
                </button>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#1459d4]/10 text-[#1459d4] ring-1 ring-[#1459d4]/10" aria-hidden="true">
                  <UserPlus size={18} strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <h1 className="text-[19px] font-bold leading-tight tracking-normal text-[#06245c]">Crear cuenta</h1>
                  <p className="mt-1 text-[12px] leading-4 text-[#5b6a8f]">
                    Completa la información para crear tu cuenta.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                <AuthField
                  id="register-first-name"
                  label="Nombres"
                  icon={UserRound}
                  autoComplete="given-name"
                  placeholder="Ingresa tus nombres"
                  value={registerForm.firstName}
                  onChange={(value) => setRegisterForm((current) => ({ ...current, firstName: value }))}
                />
                <AuthField
                  id="register-last-name"
                  label="Apellidos"
                  icon={UserRound}
                  autoComplete="family-name"
                  placeholder="Ingresa tus apellidos"
                  value={registerForm.lastName}
                  onChange={(value) => setRegisterForm((current) => ({ ...current, lastName: value }))}
                />
              </div>

              <div className="mt-2.5 space-y-2.5">
                <AuthField
                  id="register-email"
                  label="Correo electrónico"
                  icon={Mail}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="Ingresa tu correo electrónico"
                  value={registerForm.email}
                  onChange={(value) => setRegisterForm((current) => ({ ...current, email: value }))}
                />
                <AuthField
                  id="register-phone"
                  label="Número de celular"
                  icon={Smartphone}
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="Ingresa tu número de celular"
                  value={registerForm.phone}
                  onChange={(value) => setRegisterForm((current) => ({ ...current, phone: value }))}
                />
              </div>

              <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                <AuthField
                  id="register-password"
                  label="Contraseña"
                  icon={LockKeyhole}
                  type={showRegisterPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Crea una contraseña"
                  value={registerForm.password}
                  onChange={(value) => setRegisterForm((current) => ({ ...current, password: value }))}
                  rightSlot={
                    <IconButton
                      label={showRegisterPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onClick={() => setShowRegisterPassword((current) => !current)}
                      icon={showRegisterPassword ? EyeOff : Eye}
                    />
                  }
                />
                <AuthField
                  id="register-confirm-password"
                  label="Confirmar contraseña"
                  icon={LockKeyhole}
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Confirma tu contraseña"
                  value={registerForm.confirmPassword}
                  onChange={(value) => setRegisterForm((current) => ({ ...current, confirmPassword: value }))}
                  rightSlot={
                    <IconButton
                      label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onClick={() => setShowConfirmPassword((current) => !current)}
                      icon={showConfirmPassword ? EyeOff : Eye}
                    />
                  }
                />
              </div>

              <div className="mt-3 text-[11px] leading-4 text-[#4d5b7d]">
                <p className="font-medium">Tu contraseña debe contener:</p>
                <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {passwordRules.map((rule) => (
                    <PasswordRule key={rule.label} label={rule.label} isMet={rule.isMet} />
                  ))}
                </div>
              </div>

              <label className="mt-3 flex items-start gap-2.5 text-[11px] leading-4 text-[#06245c]">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-slate-300 text-[#1459d4] accent-[#1459d4]"
                />
                <span>
                  Acepto la <InlineLink onClick={() => setActiveLegalModal('privacy')}>Política de Tratamiento de Datos</InlineLink> y los{' '}
                  <InlineLink onClick={() => setActiveLegalModal('terms')}>Términos de Uso.</InlineLink>
                </span>
              </label>

              <AuthError message={error} />

              <PrimaryAuthButton label="Crear cuenta" isLoading={isSubmitting} />

              <AuthFooter />
            </form>
          )}
        </motion.section>
        <LegalModal activeModal={activeLegalModal} onClose={() => setActiveLegalModal(null)} />
      </div>
    </main>
  );
}

function getInitialMode(): AuthMode {
  if (typeof window !== 'undefined' && window.location.hash.toLowerCase().includes('registro')) {
    return 'register';
  }

  return 'login';
}

function AuthHero({ mode }: { mode: AuthMode }) {
  const alt = mode === 'register' ? 'Únete a nuestra comunidad de fe soyIBA' : 'Bienvenido a tu comunidad de fe soyIBA';

  return (
    <section className="relative overflow-hidden bg-[#061c4a]">
      <img src={loginHero} alt={alt} className="block h-auto w-full select-none" draggable={false} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#061c4a]/45 via-[#061c4a]/10 to-transparent" aria-hidden="true" />
    </section>
  );
}

type AuthFieldProps = {
  id: string;
  label: string;
  icon: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  autoComplete?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode'];
  rightSlot?: ReactNode;
};

function AuthField({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoComplete,
  inputMode,
  rightSlot,
}: AuthFieldProps) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1 block text-[11px] font-semibold text-[#06245c]">{label}</span>
      <span className="flex h-10 items-center gap-2 rounded-xl border border-[#d7ddec] bg-white px-3 text-[#97a0bd] shadow-[0_10px_30px_rgba(9,31,75,0.04)] transition focus-within:border-[#1459d4] focus-within:ring-4 focus-within:ring-blue-100">
        <Icon size={16} strokeWidth={1.8} aria-hidden="true" className="shrink-0" />
        <input
          id={id}
          type={type}
          value={value}
          autoComplete={autoComplete}
          inputMode={inputMode}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent text-[12px] font-medium text-[#06245c] outline-none placeholder:text-[#98a1bd]"
          required
        />
        {rightSlot}
      </span>
    </label>
  );
}

function IconButton({ label, onClick, icon: Icon }: { label: string; onClick: () => void; icon: LucideIcon }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[#97a0bd] transition hover:bg-slate-100 hover:text-[#1459d4]"
    >
      <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
    </button>
  );
}

function PrimaryAuthButton({ label, isLoading }: { label: string; isLoading: boolean }) {
  return (
    <button
      type="submit"
      disabled={isLoading}
      className="mt-3 flex h-10 w-full items-center justify-center rounded-xl bg-[#062b70] px-4 text-[13px] font-bold text-white shadow-[0_18px_45px_rgba(6,43,112,0.25)] transition hover:bg-[#041f55] disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {isLoading ? <LoaderCircle className="mr-2 animate-spin" size={18} aria-hidden="true" /> : null}
      <span className="flex-1 text-center">{label}</span>
      <ArrowRight size={20} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}

function PasswordRule({ label, isMet }: { label: string; isMet: boolean }) {
  const Icon = isMet ? CheckCircle2 : Circle;

  return (
    <div className="flex items-center gap-2 text-[#06245c]">
      <Icon size={11} aria-hidden="true" className={isMet ? 'text-[#1459d4]' : 'text-slate-300'} />
      <span>{label}</span>
    </div>
  );
}

function AuthError({ message }: { message: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-2.5 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{message}</p>;
}

function InlineLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      className="font-medium text-[#115bd8] underline-offset-4 transition hover:text-[#06245c] hover:underline"
    >
      {children}
    </button>
  );
}

function LegalModal({ activeModal, onClose }: { activeModal: LegalModalId; onClose: () => void }) {
  if (!activeModal) {
    return null;
  }

  const content = activeModal === 'privacy' ? legalContent.privacy : legalContent.terms;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#061c4a]/70 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="legal-modal-title">
      <section className="max-h-[82svh] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-950/30">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2 id="legal-modal-title" className="text-lg font-extrabold leading-tight text-[#06245c]">{content.title}</h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-[#06245c]"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="max-h-[58svh] overflow-y-auto px-5 py-4 text-sm leading-6 text-slate-600">
          <p>{content.body}</p>
        </div>
        <footer className="border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-full rounded-xl bg-[#062b70] text-sm font-bold text-white transition hover:bg-[#041f55]"
          >
            Entendido
          </button>
        </footer>
      </section>
    </div>
  );
}

const legalContent = {
  privacy: {
    title: 'Política de Tratamiento de Datos',
    body:
      'La Iglesia Bíblica Antioquía recolecta y trata tus datos personales con la finalidad de gestionar tu cuenta dentro de la app SOY IBA, facilitar la comunicación interna, compartir información relevante de la iglesia, gestionar eventos, grupos, notificaciones y servicios relacionados con la comunidad. Tus datos serán tratados conforme a la normativa colombiana de protección de datos personales. Podrás solicitar actualización, corrección o eliminación de tus datos a través de los canales oficiales de la iglesia.',
  },
  terms: {
    title: 'Términos de Uso',
    body:
      'Al usar la app SOY IBA aceptas utilizar esta plataforma de manera respetuosa, responsable y conforme a los principios de la Iglesia Bíblica Antioquía. La app está diseñada para facilitar la comunicación, participación y acceso a contenidos de la iglesia. El uso indebido, la publicación de información falsa, ofensiva o contraria al propósito de la comunidad podrá generar restricciones de acceso.',
  },
} as const;
function AuthFooter() {
  return (
    <footer className="mt-2.5 flex items-center justify-center gap-3">
      <span className="h-px flex-1 bg-slate-300" aria-hidden="true" />
      <img
        src={iglesiaFooterLogo}
        alt="Iglesia Bíblica Antioquía"
        className="h-auto w-20 shrink-0 select-none"
        draggable={false}
      />
      <span className="h-px flex-1 bg-slate-300" aria-hidden="true" />
    </footer>
  );
}

function getPasswordRules(password: string) {
  return [
    { label: 'Mínimo 8 caracteres', isMet: password.length >= 8 },
    { label: 'Al menos una letra mayúscula', isMet: /[A-ZÁÉÍÓÚÑ]/.test(password) },
    { label: 'Al menos un número', isMet: /\d/.test(password) },
    { label: 'Al menos un carácter especial', isMet: /[^A-Za-z0-9ÁÉÍÓÚáéíóúÑñ]/.test(password) },
  ];
}
