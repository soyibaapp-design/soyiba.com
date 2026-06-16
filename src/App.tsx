import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, Heart, Home, UserRound, UsersRound, type LucideIcon } from 'lucide-react';
import { AppHeader } from './components/AppHeader';
import { BottomNav, type BottomNavItem } from './components/BottomNav';
import { AuthScreen } from './screens/Auth/AuthScreen';
import type { SoyibaSession } from './screens/Auth/auth.service';
import { InicioScreen } from './screens/Inicio/InicioScreen';
import { ProfileScreen } from './screens/Perfil/ProfileScreen';

type ScreenId = 'inicio' | 'eventos' | 'eco' | 'donaciones' | 'perfil';

const SESSION_STORAGE_KEY = 'soyiba.session';

const navigation: BottomNavItem<ScreenId>[] = [
  { id: 'inicio', label: 'Inicio', icon: Home },
  { id: 'eventos', label: 'Eventos', icon: CalendarDays },
  { id: 'eco', label: 'ECO', icon: UsersRound },
  { id: 'donaciones', label: 'Donaciones', icon: Heart },
  { id: 'perfil', label: 'Perfil', icon: UserRound },
];

export default function App() {
  const [session, setSession] = useState<SoyibaSession | null>(() => loadStoredSession());
  const [activeScreen, setActiveScreen] = useState<ScreenId>('inicio');
  const [publicationComposerSignal, setPublicationComposerSignal] = useState(0);

  function handleSignedIn(nextSession: SoyibaSession) {
    handleSessionUpdated(nextSession);
    setActiveScreen('inicio');
  }

  function handleSessionUpdated(nextSession: SoyibaSession) {
    setSession(nextSession);
    storeSession(nextSession);
  }

  function handleLogout() {
    setSession(null);
    clearStoredSession();
    setActiveScreen('inicio');
  }

  if (!session) {
    return <AuthScreen onSignedIn={handleSignedIn} />;
  }

  return (
    <div className="soyiba-app-backdrop h-[100dvh] overflow-hidden text-slate-950">
      <div className="safe-area mx-auto flex h-full max-w-3xl flex-col overflow-hidden bg-white/78 shadow-2xl shadow-slate-950/10 backdrop-blur-[1px]">
        <AppHeader activeTab={activeScreen} onNotificationsClick={() => setActiveScreen('perfil')} />

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 pb-[calc(112px+env(safe-area-inset-bottom))]">
          <AnimatePresence mode="wait">
            {activeScreen === 'inicio' ? <InicioScreen session={session} openPublicationComposerSignal={publicationComposerSignal} /> : null}
            {activeScreen === 'eventos' ? <PlaceholderScreen key="eventos" icon={CalendarDays} title="Eventos" /> : null}
            {activeScreen === 'eco' ? <PlaceholderScreen key="eco" icon={UsersRound} title="Grupos ECO" /> : null}
            {activeScreen === 'donaciones' ? <PlaceholderScreen key="donaciones" icon={Heart} title="Donaciones" /> : null}
            {activeScreen === 'perfil' ? (
              <ProfileScreen
                key="perfil"
                session={session}
                onLogout={handleLogout}
                onNavigate={setActiveScreen}
                onSessionUpdated={handleSessionUpdated}
                onCreatePublication={() => {
                  setActiveScreen('inicio');
                  setPublicationComposerSignal(Date.now());
                }}
              />
            ) : null}
          </AnimatePresence>
        </main>

        <BottomNav activeTab={activeScreen} items={navigation} onChange={setActiveScreen} />
      </div>
    </div>
  );
}

function loadStoredSession(): SoyibaSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storedSession = window.localStorage.getItem(SESSION_STORAGE_KEY);

    if (!storedSession) {
      return null;
    }

    const parsedSession = JSON.parse(storedSession) as Partial<SoyibaSession>;

    if (!parsedSession.token || !parsedSession.user?.email) {
      clearStoredSession();
      return null;
    }

    return parsedSession as SoyibaSession;
  } catch {
    clearStoredSession();
    return null;
  }
}

function storeSession(session: SoyibaSession) {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function clearStoredSession() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

type PlaceholderScreenProps = {
  icon: LucideIcon;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

function PlaceholderScreen({ icon: Icon, title, actionLabel, onAction }: PlaceholderScreenProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.22 }}
      className="rounded-[24px] border border-slate-200/80 bg-white p-6 text-center shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
    >
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#2563EB]/10 text-[#2563EB]">
        <Icon size={26} aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-xl font-bold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Pantalla lista para su modulo Apps Script y su TSV.</p>
      <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
        <UserRound size={16} aria-hidden="true" />
        {title}/Code.gs
      </div>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 h-11 rounded-2xl bg-[#1E3A8A] px-5 text-sm font-black text-white shadow-[0_14px_28px_rgba(30,58,138,0.24)] transition hover:bg-[#2563EB]"
        >
          {actionLabel}
        </button>
      ) : null}
    </motion.section>
  );
}
