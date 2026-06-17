import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, Heart, Home, UserRound, UsersRound, type LucideIcon } from 'lucide-react';
import { AppHeader } from './components/AppHeader';
import { BottomNav, type BottomNavItem } from './components/BottomNav';
import { AuthScreen } from './screens/Auth/AuthScreen';
import type { SoyibaSession } from './screens/Auth/auth.service';
import { InicioScreen } from './screens/Inicio/InicioScreen';
import { ProfileScreen } from './screens/Perfil/ProfileScreen';
import { PublicationsFeed } from './screens/Publicaciones/PublicationsFeed';
import type { SoyibaPublication } from './screens/Publicaciones/publicaciones.service';

type ScreenId = 'inicio' | 'eventos' | 'eco' | 'donaciones' | 'perfil';
type AuthMode = 'login' | 'register';

const SESSION_STORAGE_KEY = 'soyiba.session';
const LIVE_BADGE_TEST_STORAGE_KEY = 'soyiba.liveBadgeTest';

const navigation: BottomNavItem<ScreenId>[] = [
  { id: 'inicio', label: 'Inicio', icon: Home },
  { id: 'eventos', label: 'Eventos', icon: CalendarDays },
  { id: 'eco', label: 'ECO', icon: UsersRound },
  { id: 'donaciones', label: 'Donaciones', icon: Heart },
  { id: 'perfil', label: 'Perfil', icon: UserRound },
];

const publicSession: SoyibaSession = {
  token: 'public-viewer',
  user: {
    id: 'public-viewer',
    email: '',
    name: 'Visitante',
    role: 'public',
    rolSistema: 'Visitante',
    publicador: false,
    publicadorEco: false,
    publicadorEvento: false,
    active: false,
  },
};

export default function App() {
  const initialSharedTarget = readSharedPublicationTarget();
  const [session, setSession] = useState<SoyibaSession | null>(() => loadStoredSession());
  const [activeScreen, setActiveScreen] = useState<ScreenId>(initialSharedTarget?.screen || 'inicio');
  const [publicationComposerSignal, setPublicationComposerSignal] = useState(0);
  const [publicationComposerOpen, setPublicationComposerOpen] = useState(false);
  const [publicationToOpenId, setPublicationToOpenId] = useState(initialSharedTarget?.publicationId || '');
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [liveNow, setLiveNow] = useState(() => isSundayLiveWindow(new Date()));
  const [liveBadgeTestEnabled, setLiveBadgeTestEnabled] = useState(() => loadLiveBadgeTestFlag());
  const showLiveBadge = liveNow || (liveBadgeTestEnabled && isLiveBadgeTestUser(session));

  useEffect(() => {
  function handleHashChange() {
      const target = readSharedPublicationTarget();

      if (!target) {
        return;
      }

      setActiveScreen(target.screen);
      setPublicationToOpenId(target.publicationId);
      setAuthMode(null);
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    function updateLiveState() {
      setLiveNow(isSundayLiveWindow(new Date()));
    }

    updateLiveState();
    const interval = window.setInterval(updateLiveState, 30000);
    return () => window.clearInterval(interval);
  }, []);

  function handleSignedIn(nextSession: SoyibaSession) {
    handleSessionUpdated(nextSession);
    const target = readSharedPublicationTarget();
    setActiveScreen(target?.screen || (publicationToOpenId ? activeScreen : 'inicio'));
    setPublicationToOpenId(target?.publicationId || publicationToOpenId || '');
    setAuthMode(null);
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

  function handleLiveBadgeTestChange(enabled: boolean) {
    setLiveBadgeTestEnabled(enabled);
    storeLiveBadgeTestFlag(enabled);
  }

  function handleOpenEventFromHome(publicationId: string) {
    setPublicationToOpenId(publicationId);
    setActiveScreen('eventos');
  }

  function handleOpenEventsFromHome() {
    setPublicationToOpenId('');
    setActiveScreen('eventos');
  }

  function handleOpenEcoFromHome(publicationId: string) {
    setPublicationToOpenId(publicationId);
    setActiveScreen('eco');
  }

  function handleOpenPublicationFromProfile(publication: SoyibaPublication) {
    setPublicationToOpenId(publication.id);
    setActiveScreen(getPublicationScreen(publication));
  }

  if (!session) {
    if (authMode || !publicationToOpenId) {
      return <AuthScreen onSignedIn={handleSignedIn} initialMode={authMode || undefined} />;
    }

    return (
      <SoyibaShell
        activeScreen={activeScreen}
        session={publicSession}
        publicationToOpenId={publicationToOpenId}
        publicationComposerSignal={0}
        publicationComposerOpen={false}
        publicMode
        onNotificationsClick={() => setAuthMode('login')}
        onComposerOpenChange={setPublicationComposerOpen}
        onOpenEventFromHome={handleOpenEventFromHome}
        onOpenEventsFromHome={handleOpenEventsFromHome}
        onOpenEcoFromHome={handleOpenEcoFromHome}
        onPublicationOpened={() => undefined}
        onAuthRequired={setAuthMode}
        showLiveBadge={liveNow}
      />
    );
  }

  return (
    <SoyibaShell
      activeScreen={activeScreen}
      session={session}
      publicationToOpenId={publicationToOpenId}
      publicationComposerSignal={publicationComposerSignal}
      publicationComposerOpen={publicationComposerOpen}
      onNotificationsClick={() => setActiveScreen('perfil')}
      onComposerOpenChange={setPublicationComposerOpen}
      onOpenEventFromHome={handleOpenEventFromHome}
      onOpenEventsFromHome={handleOpenEventsFromHome}
      onOpenEcoFromHome={handleOpenEcoFromHome}
      onPublicationOpened={() => setPublicationToOpenId('')}
      onAuthRequired={setAuthMode}
      onNavigate={setActiveScreen}
      onLogout={handleLogout}
      onSessionUpdated={handleSessionUpdated}
      showLiveBadge={showLiveBadge}
      liveBadgeTestEnabled={liveBadgeTestEnabled}
      onLiveBadgeTestChange={handleLiveBadgeTestChange}
      onCreatePublication={() => {
        setActiveScreen('inicio');
        setPublicationComposerSignal(Date.now());
      }}
      onOpenPublicationFromProfile={handleOpenPublicationFromProfile}
    />
  );
}

function SoyibaShell({
  activeScreen,
  session,
  publicationToOpenId,
  publicationComposerSignal,
  publicationComposerOpen,
  publicMode = false,
  onNotificationsClick,
  onComposerOpenChange,
  onOpenEventFromHome,
  onOpenEventsFromHome,
  onOpenEcoFromHome,
  onPublicationOpened,
  onAuthRequired,
  showLiveBadge = false,
  onNavigate,
  onLogout,
  onSessionUpdated,
  liveBadgeTestEnabled = false,
  onLiveBadgeTestChange,
  onCreatePublication,
  onOpenPublicationFromProfile,
}: {
  activeScreen: ScreenId;
  session: SoyibaSession;
  publicationToOpenId: string;
  publicationComposerSignal: number;
  publicationComposerOpen: boolean;
  publicMode?: boolean;
  onNotificationsClick: () => void;
  onComposerOpenChange: (open: boolean) => void;
  onOpenEventFromHome: (publicationId: string) => void;
  onOpenEventsFromHome: () => void;
  onOpenEcoFromHome: (publicationId: string) => void;
  onPublicationOpened: () => void;
  onAuthRequired?: (mode: AuthMode) => void;
  showLiveBadge?: boolean;
  onNavigate?: (screen: ScreenId) => void;
  onLogout?: () => void;
  onSessionUpdated?: (session: SoyibaSession) => void;
  liveBadgeTestEnabled?: boolean;
  onLiveBadgeTestChange?: (enabled: boolean) => void;
  onCreatePublication?: () => void;
  onOpenPublicationFromProfile?: (publication: SoyibaPublication) => void;
}) {
  return (
    <div className="soyiba-app-backdrop h-[100dvh] overflow-hidden text-slate-950">
      <div className="safe-area mx-auto flex h-full max-w-3xl flex-col overflow-hidden bg-white/78 shadow-2xl shadow-slate-950/10 backdrop-blur-[1px]">
        <AppHeader activeTab={activeScreen} onNotificationsClick={onNotificationsClick} />

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 pb-[calc(112px+env(safe-area-inset-bottom))]">
          <AnimatePresence mode="wait">
            {activeScreen === 'inicio' ? (
              <InicioScreen
                session={session}
                openPublicationComposerSignal={publicationComposerSignal}
                onPublicationComposerOpenChange={onComposerOpenChange}
                onOpenEvent={onOpenEventFromHome}
                onOpenEventsScreen={onOpenEventsFromHome}
                onOpenEco={onOpenEcoFromHome}
                openPublicationId={publicationToOpenId}
                onPublicationOpened={onPublicationOpened}
                publicMode={publicMode}
                onAuthRequired={onAuthRequired}
                showLiveBadge={showLiveBadge}
              />
            ) : null}
            {activeScreen === 'eventos' ? (
              <PublicationsFeed
                key="eventos"
                session={session}
                filterType="Evento"
                variant="eventos"
                title="Eventos"
                subtitle="Conectate y participa en todo lo que Dios esta haciendo en nuestra iglesia."
                openPublicationId={publicationToOpenId}
                onPublicationOpened={onPublicationOpened}
                onComposerOpenChange={onComposerOpenChange}
                publicMode={publicMode}
                onAuthRequired={onAuthRequired}
              />
            ) : null}
            {activeScreen === 'eco' ? (
              <PublicationsFeed
                key="eco"
                session={session}
                filterType="Grupo ECO"
                variant="eco"
                title="Grupos ECO"
                subtitle="Encuentra publicaciones y encuentros de los grupos ECO."
                openPublicationId={publicationToOpenId}
                onPublicationOpened={onPublicationOpened}
                onComposerOpenChange={onComposerOpenChange}
                publicMode={publicMode}
                onAuthRequired={onAuthRequired}
              />
            ) : null}
            {activeScreen === 'donaciones' ? <PlaceholderScreen key="donaciones" icon={Heart} title="Donaciones" /> : null}
            {activeScreen === 'perfil' ? (
              <ProfileScreen
                key="perfil"
                session={session}
                onLogout={onLogout || (() => undefined)}
                onNavigate={onNavigate || (() => undefined)}
                onSessionUpdated={onSessionUpdated || (() => undefined)}
                liveBadgeTestEnabled={liveBadgeTestEnabled}
                onLiveBadgeTestChange={onLiveBadgeTestChange}
                onCreatePublication={onCreatePublication || (() => undefined)}
                onOpenPublication={onOpenPublicationFromProfile || (() => undefined)}
              />
            ) : null}
          </AnimatePresence>
        </main>

        {publicMode || publicationComposerOpen ? null : (
          <BottomNav activeTab={activeScreen} items={navigation} showLiveBadge={showLiveBadge} onChange={onNavigate || (() => undefined)} />
        )}
      </div>
    </div>
  );
}

function getPublicationScreen(publication: SoyibaPublication): ScreenId {
  if (publication.type === 'Evento') return 'eventos';
  if (publication.type === 'Grupo ECO') return 'eco';
  return 'inicio';
}

function isLiveBadgeTestUser(session: SoyibaSession | null) {
  const role = String(session?.user.rolSistema || session?.user.role || '').trim().toLowerCase();
  return role === 'admin' || role === 'moderador';
}

function readSharedPublicationTarget(): { screen: ScreenId; publicationId: string } | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const hash = window.location.hash.replace(/^#/, '');
  const modernMatch = hash.match(/^(inicio|eventos|eco)\/publicacion-(.+)$/);

  if (modernMatch) {
    return {
      screen: modernMatch[1] as ScreenId,
      publicationId: decodeURIComponent(modernMatch[2] || ''),
    };
  }

  const legacyMatch = hash.match(/^publicacion-(.+)$/);

  if (legacyMatch) {
    return {
      screen: 'inicio',
      publicationId: decodeURIComponent(legacyMatch[1] || ''),
    };
  }

  return null;
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

function isSundayLiveWindow(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const weekday = parts.find((part) => part.type === 'weekday')?.value || '';
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);
  const minutes = hour * 60 + minute;
  return weekday === 'Sun' && minutes >= 9 * 60 + 50 && minutes <= 12 * 60 + 10;
}

function loadLiveBadgeTestFlag() {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem(LIVE_BADGE_TEST_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function storeLiveBadgeTestFlag(enabled: boolean) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (enabled) {
      window.localStorage.setItem(LIVE_BADGE_TEST_STORAGE_KEY, '1');
    } else {
      window.localStorage.removeItem(LIVE_BADGE_TEST_STORAGE_KEY);
    }
  } catch {
    // Local storage can be disabled in private contexts.
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
