import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  platforms?: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
};

type PwaInstallPromptProps = {
  hasBottomNav?: boolean;
};

let pendingInstallPrompt: BeforeInstallPromptEvent | null = null;
let appWasInstalled = false;
const installPromptSubscribers = new Set<(prompt: BeforeInstallPromptEvent | null) => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event: Event) => {
    event.preventDefault();
    pendingInstallPrompt = event as BeforeInstallPromptEvent;
    notifyInstallPromptSubscribers();
  });

  window.addEventListener('appinstalled', () => {
    appWasInstalled = true;
    pendingInstallPrompt = null;
    notifyInstallPromptSubscribers();
  });
}

export function PwaInstallPrompt({ hasBottomNav = false }: PwaInstallPromptProps) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(() => pendingInstallPrompt);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!shouldOfferAndroidInstall()) {
      return;
    }

    installPromptSubscribers.add(setInstallPrompt);
    setInstallPrompt(pendingInstallPrompt);

    return () => {
      installPromptSubscribers.delete(setInstallPrompt);
    };
  }, []);

  async function handleInstallClick() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    await installPrompt.userChoice.catch(() => undefined);
    pendingInstallPrompt = null;
    setInstallPrompt(null);
    setDismissed(true);
  }

  if (!shouldOfferAndroidInstall() || !installPrompt || dismissed || appWasInstalled) {
    return null;
  }

  return (
    <aside
      className={`fixed inset-x-3 z-40 mx-auto max-w-xl ${hasBottomNav ? 'bottom-[calc(96px+env(safe-area-inset-bottom))]' : 'bottom-[calc(16px+env(safe-area-inset-bottom))]'}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 rounded-[22px] border border-white/70 bg-[#061c4a]/94 p-3 text-white shadow-[0_22px_60px_rgba(4,20,52,0.34)] backdrop-blur-xl">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/12 text-[#ffd28a] ring-1 ring-white/10" aria-hidden="true">
          <Download size={21} strokeWidth={2.35} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black leading-5">Instala soyIBA</p>
          <p className="mt-0.5 text-[11px] font-semibold leading-4 text-white/76">Accede mas rapido desde tu pantalla de inicio.</p>
        </div>
        <button
          type="button"
          onClick={handleInstallClick}
          className="h-10 shrink-0 rounded-2xl bg-[#f0b35a] px-4 text-xs font-black text-[#061c4a] shadow-[0_12px_26px_rgba(240,179,90,0.22)] transition hover:bg-[#ffd28a] focus:outline-none focus:ring-2 focus:ring-white/50"
        >
          Descargar
        </button>
        <button
          type="button"
          aria-label="Ocultar aviso de descarga"
          onClick={() => setDismissed(true)}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/72 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/35"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}

function shouldOfferAndroidInstall() {
  if (typeof window === 'undefined') {
    return false;
  }

  return isAndroidDevice() && !isPwaStandalone();
}

function isAndroidDevice() {
  const navigatorWithUaData = navigator as Navigator & {
    userAgentData?: {
      platform?: string;
      mobile?: boolean;
    };
  };
  const platform = navigatorWithUaData.userAgentData?.platform || navigator.platform || '';

  return /android/i.test(platform) || /android/i.test(navigator.userAgent);
}

function isPwaStandalone() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };

  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true;
}

function notifyInstallPromptSubscribers() {
  installPromptSubscribers.forEach((subscriber) => subscriber(pendingInstallPrompt));
}
