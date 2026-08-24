import { FormEvent, useEffect, useMemo, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
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
  approveMinorRegistrationByGuardian,
  completePasswordReset,
  getPasswordResetEmailFromFirebaseCode,
  registerWithEmailPassword,
  requestPasswordReset,
  signInWithEmailPassword,
  type RegisterPayload,
  type SoyibaSession,
} from './auth.service';

type AuthScreenProps = {
  onSignedIn: (session: SoyibaSession) => void;
  initialMode?: LoginRegisterMode;
};

type LoginRegisterMode = 'login' | 'register';
type AuthMode = LoginRegisterMode | 'forgot' | 'reset' | 'approve-minor';
type BirthDateAgeGroup = 'adult' | 'minor' | 'too-young';
type LegalModalId = 'privacy' | 'terms' | null;
type PendingAccountModalState = {
  title: string;
  message: string;
} | null;

type LoginFormState = {
  email: string;
  password: string;
};

type RegisterFormState = Omit<RegisterPayload, 'ageGroup'> & {
  ageGroup: BirthDateAgeGroup;
  confirmPassword: string;
};

type PasswordResetRequestState = {
  email: string;
};

type PasswordResetConfirmState = {
  email: string;
  token: string;
  password: string;
  confirmPassword: string;
};

type MinorApprovalState = {
  requestId: string;
  token: string;
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
  fechaNacimiento: '',
  ageGroup: 'adult',
  guardianConsent: false,
  guardianName: '',
  guardianEmail: '',
  guardianPhone: '',
};

const emptyPasswordResetRequestForm: PasswordResetRequestState = {
  email: '',
};

const emptyPasswordResetConfirmForm: PasswordResetConfirmState = {
  email: '',
  token: '',
  password: '',
  confirmPassword: '',
};

const MIN_REGISTRATION_AGE = 12;

export function AuthScreen({ onSignedIn, initialMode }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>(() => initialMode || getInitialMode());
  const [loginForm, setLoginForm] = useState<LoginFormState>(emptyLoginForm);
  const [registerForm, setRegisterForm] = useState<RegisterFormState>(emptyRegisterForm);
  const [passwordResetRequestForm, setPasswordResetRequestForm] = useState<PasswordResetRequestState>(emptyPasswordResetRequestForm);
  const [passwordResetConfirmForm, setPasswordResetConfirmForm] = useState<PasswordResetConfirmState>(() => getPasswordResetStateFromHash() || emptyPasswordResetConfirmForm);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [minorApprovalAcceptedDataPolicy, setMinorApprovalAcceptedDataPolicy] = useState(false);
  const [minorApprovalAcceptedPrivacyPolicy, setMinorApprovalAcceptedPrivacyPolicy] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [pendingAccountModal, setPendingAccountModal] = useState<PendingAccountModalState>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [activeLegalModal, setActiveLegalModal] = useState<LegalModalId>(null);

  const passwordRules = useMemo(() => getPasswordRules(registerForm.password), [registerForm.password]);
  const resetPasswordRules = useMemo(() => getPasswordRules(passwordResetConfirmForm.password), [passwordResetConfirmForm.password]);
  const registerAgeGroup = useMemo(() => getAgeGroupFromBirthDate(registerForm.fechaNacimiento), [registerForm.fechaNacimiento]);
  const minorApprovalState = useMemo(() => (mode === 'approve-minor' ? getMinorApprovalStateFromHash() : null), [mode]);
  const maxBirthDate = useMemo(() => getMaxRegistrationBirthDateValue(), []);
  const isRegister = mode === 'register';
  const canSubmitMinorApproval = minorApprovalAcceptedDataPolicy && minorApprovalAcceptedPrivacyPolicy;

  useEffect(() => {
    if (mode !== 'reset' || !passwordResetConfirmForm.token || passwordResetConfirmForm.email) {
      return;
    }

    let cancelled = false;

    getPasswordResetEmailFromFirebaseCode(passwordResetConfirmForm.token).then((email) => {
      if (!cancelled && email) {
        setPasswordResetConfirmForm((current) => ({ ...current, email }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [mode, passwordResetConfirmForm.email, passwordResetConfirmForm.token]);

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
      setError('');
      setStatusMessage('');
      return;
    }

    function syncModeFromHash() {
      const nextMode = getInitialMode();
      setMode(nextMode);
      setError('');
      setStatusMessage('');
      setPendingAccountModal(null);
      setMinorApprovalAcceptedDataPolicy(false);
      setMinorApprovalAcceptedPrivacyPolicy(false);

      if (nextMode === 'reset') {
        const resetState = getPasswordResetStateFromHash();
        if (resetState) {
          setPasswordResetConfirmForm((current) => ({ ...current, ...resetState, password: '', confirmPassword: '' }));
        }
      }
    }

    window.addEventListener('hashchange', syncModeFromHash);
    return () => window.removeEventListener('hashchange', syncModeFromHash);
  }, [initialMode]);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError('');
    setStatusMessage('');
    setPendingAccountModal(null);
    setMinorApprovalAcceptedDataPolicy(false);
    setMinorApprovalAcceptedPrivacyPolicy(false);
    window.history.replaceState(null, '', getUrlForMode(nextMode));
  }

  function openForgotPassword() {
    setPasswordResetRequestForm({ email: loginForm.email });
    switchMode('forgot');
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setStatusMessage('');
    setPendingAccountModal(null);
    setIsSubmitting(true);
    try {
      const result = await signInWithEmailPassword(loginForm.email, loginForm.password);

      if (result.ok) {
        setStatusMessage('');
        onSignedIn(result.session);
      } else if (result.pending) {
        setPendingAccountModal({
          title: 'Cuenta pendiente de aprobación',
          message: result.message || result.error,
        });
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
    setStatusMessage('');
    setPendingAccountModal(null);

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

    if (!registerAgeGroup) {
      setError('Ingresa una fecha de nacimiento válida.');
      return;
    }

    if (registerAgeGroup === 'minor') {
      if (!registerForm.guardianName.trim() || !registerForm.guardianEmail.trim() || !registerForm.guardianPhone.trim()) {
        setError('Ingresa nombre, correo y celular del padre o madre.');
        return;
      }

      if (registerForm.guardianEmail.trim().toLowerCase() === registerForm.email.trim().toLowerCase()) {
        setError('El correo del padre o madre debe ser diferente al correo de la cuenta del menor.');
        return;
      }

      if (!registerForm.guardianConsent) {
        setError('Para menores de edad se requiere autorización del padre o madre.');
        return;
      }
    }

    if (registerAgeGroup === 'too-young') {
      setError(`La edad mínima para registrarse en SOY IBA es de ${MIN_REGISTRATION_AGE} años.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await registerWithEmailPassword({
        ...registerForm,
        ageGroup: registerAgeGroup,
        guardianConsent: registerAgeGroup === 'minor' ? registerForm.guardianConsent : false,
      });

      if (result.ok) {
        onSignedIn(result.session);
      } else if (result.pending) {
        setPendingAccountModal({
          title: 'Registro recibido',
          message: result.message || result.error,
        });
        setStatusMessage('');
        setRegisterForm(emptyRegisterForm);
        setAcceptedTerms(false);
      } else {
        setError(result.error);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No fue posible crear la cuenta.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordResetRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setStatusMessage('');
    setIsSubmitting(true);

    try {
      const result = await requestPasswordReset(passwordResetRequestForm.email, getPasswordResetAppUrl());

      if (result.ok) {
        setStatusMessage(result.message);
      } else {
        setError(result.error);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No fue posible enviar el correo de recuperación.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordResetComplete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setStatusMessage('');

    if (passwordResetConfirmForm.password !== passwordResetConfirmForm.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (resetPasswordRules.some((rule) => !rule.isMet)) {
      setError('La contraseña debe cumplir todos los requisitos.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await completePasswordReset(
        passwordResetConfirmForm.email,
        passwordResetConfirmForm.token,
        passwordResetConfirmForm.password,
      );

      if (result.ok) {
        setLoginForm((current) => ({ ...current, email: passwordResetConfirmForm.email, password: '' }));
        setPasswordResetConfirmForm(emptyPasswordResetConfirmForm);
        setMode('login');
        window.history.replaceState(null, '', getUrlForMode('login'));
        setStatusMessage(result.message);
      } else {
        setError(result.error);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No fue posible restablecer la contraseña.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMinorApproval(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setStatusMessage('');
    setPendingAccountModal(null);

    if (!minorApprovalState) {
      setError('El enlace de aprobación no está completo.');
      return;
    }

    if (!canSubmitMinorApproval) {
      setError('Debes leer y aceptar la Política de Tratamiento de Datos y la Política de Privacidad.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await approveMinorRegistrationByGuardian(minorApprovalState.requestId, minorApprovalState.token);

      if (result.ok) {
        setPendingAccountModal({
          title: 'Validación satisfactoria',
          message:
            result.message ||
            'Tu validación fue registrada satisfactoriamente. Ahora debes esperar a que la Iglesia Bíblica Antioquía revise y apruebe la activación de la cuenta.',
        });
        window.history.replaceState(null, '', getUrlForMode('login'));
        setMode('login');
        setMinorApprovalAcceptedDataPolicy(false);
        setMinorApprovalAcceptedPrivacyPolicy(false);
      } else {
        setError(result.error);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No fue posible registrar la autorización.');
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
                <button type="button" onClick={openForgotPassword} className="max-w-full whitespace-normal pr-1 text-right text-[11px] font-medium text-[#115bd8] transition hover:text-[#06245c]">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <AuthStatus message={statusMessage} />
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
          ) : mode === 'forgot' ? (
            <form onSubmit={handlePasswordResetRequest} className="mx-auto w-full max-w-md">
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
                  <Mail size={18} strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <h1 className="text-[19px] font-bold leading-tight tracking-normal text-[#06245c]">Recuperar contraseña</h1>
                  <p className="mt-1 text-[12px] leading-4 text-[#5b6a8f]">Te enviaremos un enlace para crear una nueva contraseña.</p>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                <AuthField
                  id="reset-request-email"
                  label="Correo electrónico"
                  icon={Mail}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="Ingresa tu correo electrónico"
                  value={passwordResetRequestForm.email}
                  onChange={(value) => setPasswordResetRequestForm({ email: value })}
                />
              </div>

              <AuthStatus message={statusMessage} />
              <AuthError message={error} />

              <PrimaryAuthButton label="Enviar enlace" isLoading={isSubmitting} />
              <AuthFooter />
            </form>
          ) : mode === 'reset' ? (
            <form onSubmit={handlePasswordResetComplete} className="mx-auto w-full max-w-md">
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
                  <LockKeyhole size={18} strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <h1 className="text-[19px] font-bold leading-tight tracking-normal text-[#06245c]">Nueva contraseña</h1>
                  <p className="mt-1 text-[12px] leading-4 text-[#5b6a8f]">Define una contraseña segura para volver a ingresar.</p>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                <AuthField
                  id="reset-email"
                  label="Correo electrónico"
                  icon={Mail}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="Ingresa tu correo electrónico"
                  value={passwordResetConfirmForm.email}
                  onChange={(value) => setPasswordResetConfirmForm((current) => ({ ...current, email: value }))}
                />
                <AuthField
                  id="reset-password"
                  label="Nueva contraseña"
                  icon={LockKeyhole}
                  type={showResetPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Crea una contraseña"
                  value={passwordResetConfirmForm.password}
                  onChange={(value) => setPasswordResetConfirmForm((current) => ({ ...current, password: value }))}
                  rightSlot={
                    <IconButton
                      label={showResetPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onClick={() => setShowResetPassword((current) => !current)}
                      icon={showResetPassword ? EyeOff : Eye}
                    />
                  }
                />
                <AuthField
                  id="reset-confirm-password"
                  label="Confirmar contraseña"
                  icon={LockKeyhole}
                  type={showResetConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Confirma tu contraseña"
                  value={passwordResetConfirmForm.confirmPassword}
                  onChange={(value) => setPasswordResetConfirmForm((current) => ({ ...current, confirmPassword: value }))}
                  rightSlot={
                    <IconButton
                      label={showResetConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onClick={() => setShowResetConfirmPassword((current) => !current)}
                      icon={showResetConfirmPassword ? EyeOff : Eye}
                    />
                  }
                />
              </div>

              <div className="mt-3 text-[11px] leading-4 text-[#4d5b7d]">
                <p className="font-medium">Tu contraseña debe contener:</p>
                <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {resetPasswordRules.map((rule) => (
                    <PasswordRule key={rule.label} label={rule.label} isMet={rule.isMet} />
                  ))}
                </div>
              </div>

              <AuthStatus message={statusMessage} />
              <AuthError message={error} />

              <PrimaryAuthButton label="Actualizar contraseña" isLoading={isSubmitting} />
              <AuthFooter />
            </form>
          ) : mode === 'approve-minor' ? (
            <form onSubmit={handleMinorApproval} className="mx-auto w-full max-w-md">
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
                  <CheckCircle2 size={18} strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <h1 className="text-[19px] font-bold leading-tight tracking-normal text-[#06245c]">Aprobar registro</h1>
                  <p className="mt-1 text-[12px] leading-4 text-[#5b6a8f]">Autoriza que IBA revise el registro del menor.</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-[#DCE6F5] bg-[#F8FBFF] px-4 py-3 text-sm font-semibold leading-6 text-[#52637C]">
                Al continuar, confirmas que autorizas que IBA revise esta solicitud y active la cuenta si corresponde.
              </div>

              <div className="mt-3 rounded-xl border border-[#DCE6F5] bg-white px-4 py-3">
                <p className="text-[12px] font-semibold leading-5 text-[#52637C]">
                  Antes de autorizar, remítete a la{' '}
                  <a href="politica-tratamiento-datos.html" target="_blank" rel="noreferrer" className="font-bold text-[#115bd8] underline-offset-4 hover:underline">
                    Política de Tratamiento de Datos
                  </a>{' '}
                  y a la{' '}
                  <a href="politica-privacidad.html" target="_blank" rel="noreferrer" className="font-bold text-[#115bd8] underline-offset-4 hover:underline">
                    Política de Privacidad
                  </a>
                  .
                </p>

                <div className="mt-3 space-y-2">
                  <label className="flex items-start gap-2.5 text-[11px] font-semibold leading-4 text-[#52637C]">
                    <input
                      type="checkbox"
                      checked={minorApprovalAcceptedDataPolicy}
                      onChange={(event) => setMinorApprovalAcceptedDataPolicy(event.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-slate-300 text-[#1459d4] accent-[#1459d4]"
                    />
                    <span>Declaro que leí y acepto la Política de Tratamiento de Datos.</span>
                  </label>
                  <label className="flex items-start gap-2.5 text-[11px] font-semibold leading-4 text-[#52637C]">
                    <input
                      type="checkbox"
                      checked={minorApprovalAcceptedPrivacyPolicy}
                      onChange={(event) => setMinorApprovalAcceptedPrivacyPolicy(event.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-slate-300 text-[#1459d4] accent-[#1459d4]"
                    />
                    <span>Declaro que leí y acepto la Política de Privacidad.</span>
                  </label>
                </div>
              </div>

              <AuthError message={error} />

              <PrimaryAuthButton label="Autorizar revisión por IBA" isLoading={isSubmitting} disabled={!canSubmitMinorApproval} />
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

              <div className="mt-2.5">
                <AuthField
                  id="register-birth-date"
                  label="Fecha de nacimiento"
                  icon={CalendarDays}
                  type="date"
                  autoComplete="bday"
                  placeholder="Fecha de nacimiento"
                  value={registerForm.fechaNacimiento}
                  max={maxBirthDate}
                  onChange={(value) => {
                    const nextAgeGroup = getAgeGroupFromBirthDate(value);
                    setRegisterForm((current) => ({
                      ...current,
                      fechaNacimiento: value,
                      ageGroup: nextAgeGroup || current.ageGroup,
                      guardianConsent: nextAgeGroup === 'adult' ? false : current.guardianConsent,
                    }));
                  }}
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

              <fieldset className="mt-3 rounded-xl border border-[#DCE6F5] bg-white p-3">
                <legend className="px-1 text-[11px] font-black text-[#06245c]">Edad y autorización</legend>
                <div className="grid gap-2">
                  {registerAgeGroup ? (
                    <AgeStatus ageGroup={registerAgeGroup} />
                  ) : (
                    <p className="text-[11px] font-semibold leading-4 text-[#52637C]">
                      Ingresa tu fecha de nacimiento para validar si puedes registrarte y si requiere proceso de menores.
                    </p>
                  )}
                </div>
                {registerAgeGroup === 'minor' ? (
                  <div className="mt-3 space-y-2.5">
                    <AuthField
                      id="register-guardian-name"
                      label="Nombre del padre o madre"
                      icon={UserRound}
                      autoComplete="name"
                      placeholder="Nombre del padre o madre"
                      value={registerForm.guardianName}
                      onChange={(value) => setRegisterForm((current) => ({ ...current, guardianName: value }))}
                    />
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <AuthField
                        id="register-guardian-email"
                        label="Correo del padre o madre"
                        icon={Mail}
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        placeholder="Correo del padre o madre"
                        value={registerForm.guardianEmail}
                        onChange={(value) => setRegisterForm((current) => ({ ...current, guardianEmail: value }))}
                      />
                      <AuthField
                        id="register-guardian-phone"
                        label="Celular del padre o madre"
                        icon={Smartphone}
                        type="tel"
                        autoComplete="tel"
                        inputMode="tel"
                        placeholder="Celular del padre o madre"
                        value={registerForm.guardianPhone}
                        onChange={(value) => setRegisterForm((current) => ({ ...current, guardianPhone: value }))}
                      />
                    </div>
                    <label className="flex items-start gap-2.5 text-[11px] font-semibold leading-4 text-[#52637C]">
                      <input
                        type="checkbox"
                        checked={registerForm.guardianConsent}
                        onChange={(event) => setRegisterForm((current) => ({ ...current, guardianConsent: event.target.checked }))}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-slate-300 text-[#1459d4] accent-[#1459d4]"
                      />
                      <span>Confirmo que cuento con autorización de mi padre o madre para iniciar el registro y solicitar su aprobación por correo.</span>
                    </label>
                  </div>
                ) : null}
              </fieldset>

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

              <AuthStatus message={statusMessage} />
              <AuthError message={error} />

              <PrimaryAuthButton label="Crear cuenta" isLoading={isSubmitting} />

              <AuthFooter />
            </form>
          )}
        </motion.section>
        <PendingAccountModal modal={pendingAccountModal} onClose={() => setPendingAccountModal(null)} />
        <LegalModal activeModal={activeLegalModal} onClose={() => setActiveLegalModal(null)} />
      </div>
    </main>
  );
}

function getInitialMode(): AuthMode {
  if (typeof window === 'undefined') {
    return 'login';
  }

  const hash = window.location.hash.toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);

  if (hash.includes('restablecer') || searchParams.get('mode') === 'resetPassword' || searchParams.has('oobCode')) {
    return 'reset';
  }

  if (hash.includes('aprobar-menor')) {
    return 'approve-minor';
  }

  if (hash.includes('recuperar')) {
    return 'forgot';
  }

  if (hash.includes('registro')) {
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
  max?: string;
  min?: string;
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
  max,
  min,
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
          max={max}
          min={min}
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

function PrimaryAuthButton({ label, isLoading, disabled = false }: { label: string; isLoading: boolean; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={isLoading || disabled}
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

function AgeStatus({ ageGroup }: { ageGroup: BirthDateAgeGroup }) {
  const isMinor = ageGroup === 'minor';
  const isTooYoung = ageGroup === 'too-young';
  const Icon = isMinor || isTooYoung ? Circle : CheckCircle2;
  const label = isTooYoung ? 'Edad no permitida para registro' : isMinor ? 'Menor de edad' : 'Mayor de edad';
  const description = isTooYoung
    ? `La edad mínima para registrarse en SOY IBA es de ${MIN_REGISTRATION_AGE} años.`
    : isMinor
      ? 'Se deben completar los datos del padre o madre para realizar el proceso de gestión de menores y activar la cuenta posterior a la validación.'
      : 'Puedes continuar el registro sin proceso de menores.';

  return (
    <div
      className={`flex min-h-10 items-start gap-2 rounded-lg border px-3 py-2 text-left text-[11px] ${
        isMinor
          ? 'border-[#F3C36B] bg-[#FFF7E8] text-[#7A4B00]'
          : isTooYoung
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-[#1459d4] bg-[#EAF2FF] text-[#06245c]'
      }`}
    >
      <Icon size={14} className="mt-0.5 shrink-0 text-[#1459d4]" />
      <span className="min-w-0">
        <span className="block font-black">{label}</span>
        <span className="mt-1 block font-semibold leading-4">{description}</span>
      </span>
    </div>
  );
}

function AuthError({ message }: { message: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-2.5 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{message}</p>;
}

function AuthStatus({ message }: { message: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-2.5 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-[#115bd8]">{message}</p>;
}

function PendingAccountModal({ modal, onClose }: { modal: PendingAccountModalState; onClose: () => void }) {
  if (!modal) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#061c4a]/70 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="pending-account-title">
      <section className="w-full max-w-sm overflow-hidden rounded-2xl bg-white text-center shadow-2xl shadow-slate-950/30">
        <div className="px-6 pb-5 pt-6">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#EAF2FF] text-[#1459d4] ring-8 ring-[#F5F8FF]">
            <Mail size={24} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <h2 id="pending-account-title" className="mt-4 text-lg font-extrabold leading-tight text-[#06245c]">
            {modal.title}
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{modal.message}</p>
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

function getHashForMode(mode: AuthMode) {
  if (mode === 'register') {
    return '#registro';
  }

  if (mode === 'forgot') {
    return '#recuperar';
  }

  if (mode === 'reset') {
    return '#restablecer';
  }

  if (mode === 'approve-minor') {
    return '#aprobar-menor';
  }

  return '#login';
}

function getUrlForMode(mode: AuthMode) {
  if (typeof window === 'undefined') {
    return getHashForMode(mode);
  }

  return `${window.location.pathname}${getHashForMode(mode)}`;
}

function getPasswordResetAppUrl() {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.location.href.split('#')[0];
}

function getPasswordResetStateFromHash(): PasswordResetConfirmState | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const firebaseToken = searchParams.get('oobCode') || '';
  const firebaseMode = searchParams.get('mode') || '';

  if (firebaseToken && (!firebaseMode || firebaseMode === 'resetPassword')) {
    return {
      email: searchParams.get('email') || '',
      token: firebaseToken,
      password: '',
      confirmPassword: '',
    };
  }

  const hash = window.location.hash || '';
  const queryStart = hash.indexOf('?');

  if (queryStart < 0) {
    return null;
  }

  const params = new URLSearchParams(hash.slice(queryStart + 1));
  const email = params.get('email') || '';
  const token = params.get('token') || params.get('oobCode') || '';

  if (!token) {
    return null;
  }

  return {
    email,
    token,
    password: '',
    confirmPassword: '',
  };
}

function getMinorApprovalStateFromHash(): MinorApprovalState | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const hash = window.location.hash || '';
  const queryStart = hash.indexOf('?');

  if (queryStart < 0) {
    return null;
  }

  const params = new URLSearchParams(hash.slice(queryStart + 1));
  const requestId = params.get('requestId') || params.get('request_id') || '';
  const token = params.get('token') || '';

  if (!requestId || !token) {
    return null;
  }

  return { requestId, token };
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
        <div className="max-h-[58svh] space-y-3 overflow-y-auto px-5 py-4 text-sm leading-6 text-slate-600">
          {content.sections.map((section) => (
            <section key={section.title}>
              <h3 className="text-sm font-black text-[#06245c]">{section.title}</h3>
              <p className="mt-1">{section.body}</p>
            </section>
          ))}
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
    sections: [
      {
        title: 'Responsable y finalidad',
        body:
          'La Iglesia Bíblica Antioquía trata tus datos para crear y administrar tu cuenta, validar membresía, facilitar comunicación interna, eventos, grupos ECO, publicaciones, notificaciones y servicios de la comunidad.',
      },
      {
        title: 'Datos tratados',
        body:
          'La app puede tratar nombre, apellidos, correo, celular, foto, tiempo en la IBA, estado de membresía, roles, permisos, actividad dentro de la app y datos técnicos mínimos de seguridad como sesión, dispositivo, IP reportada y registros de uso.',
      },
      {
        title: 'Visibilidad',
        body:
          'El directorio de miembros solo está disponible para usuarios autenticados y validados. Desde tu perfil puedes decidir si apareces en el directorio y si muestras foto, teléfono o WhatsApp.',
      },
      {
        title: 'Menores de edad',
        body:
          'El registro de menores requiere autorización del padre o madre y se manejará bajo el interés superior del menor, evitando publicar información no necesaria.',
      },
      {
        title: 'Derechos',
        body:
          'Puedes solicitar acceso, actualización, corrección, revocatoria o eliminación de tus datos por los canales oficiales de la iglesia. La autorización se registra de forma consultable para cumplir la normativa colombiana de protección de datos personales.',
      },
    ],
  },
  terms: {
    title: 'Términos de Uso',
    sections: [
      {
        title: 'Uso autorizado',
        body:
          'SOY IBA es una plataforma privada de apoyo a la vida de la Iglesia Bíblica Antioquía. Debes usarla de manera respetuosa, responsable y conforme al propósito de la comunidad.',
      },
      {
        title: 'Acceso',
        body:
          'Tener el enlace o código QR no garantiza acceso a información interna. La iglesia puede activar, validar, limitar o bloquear cuentas según roles, membresía, seguridad y uso adecuado.',
      },
      {
        title: 'Contenido y seguridad',
        body:
          'No debes publicar información falsa, ofensiva, confidencial o de terceros sin autorización. El uso indebido puede generar restricciones de acceso y revisión administrativa.',
      },
    ],
  },
} as const;
function AuthFooter() {
  return (
    <footer className="mt-2.5">
      <div className="flex items-center justify-center gap-3">
        <span className="h-px flex-1 bg-slate-300" aria-hidden="true" />
        <img
          src={iglesiaFooterLogo}
          alt="Iglesia Bíblica Antioquía"
          className="h-auto w-20 shrink-0 select-none"
          draggable={false}
        />
        <span className="h-px flex-1 bg-slate-300" aria-hidden="true" />
      </div>
      <div className="mt-2 text-center">
        <a
          href="politica-tratamiento-datos.html"
          target="_blank"
          rel="noreferrer"
          className="text-[10px] font-bold text-[#115bd8] underline-offset-4 hover:underline"
        >
          Política de Tratamiento de Datos y Privacidad
        </a>
      </div>
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

function getAgeGroupFromBirthDate(value: string): BirthDateAgeGroup | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const birthDate = new Date(year, month - 1, day);

  if (birthDate.getFullYear() !== year || birthDate.getMonth() !== month - 1 || birthDate.getDate() !== day) {
    return null;
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (birthDate > todayStart) {
    return null;
  }

  let age = todayStart.getFullYear() - year;
  const birthdayThisYear = new Date(todayStart.getFullYear(), month - 1, day);

  if (birthdayThisYear > todayStart) {
    age -= 1;
  }

  if (age < 0 || age > 120) {
    return null;
  }

  if (age < MIN_REGISTRATION_AGE) {
    return 'too-young';
  }

  return age < 18 ? 'minor' : 'adult';
}

function getMaxRegistrationBirthDateValue() {
  const today = new Date();
  const maxBirthDate = new Date(today.getFullYear() - MIN_REGISTRATION_AGE, today.getMonth(), today.getDate());
  const year = maxBirthDate.getFullYear();
  const month = String(maxBirthDate.getMonth() + 1).padStart(2, '0');
  const day = String(maxBirthDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
