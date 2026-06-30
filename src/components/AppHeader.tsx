import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Church, Menu } from 'lucide-react';
import { primaryAssets } from '../lib/assets';

type AppHeaderProps = {
  activeTab: string;
  notificationCount?: number;
  hasNotifications?: boolean;
  onMenuClick?: () => void;
  onChurchInfoClick?: () => void;
  onNotificationsClick?: () => void;
};

const tabTitles: Record<string, string> = {
  inicio: 'Inicio',
  eventos: 'Eventos',
  eco: 'Grupos ECO',
  donaciones: 'Donaciones',
  miembros: 'Miembros IBA',
  perfil: 'Perfil',
  usuarios: 'Usuarios',
};

export function AppHeader({
  activeTab,
  notificationCount = 0,
  hasNotifications = false,
  onMenuClick,
  onChurchInfoClick,
  onNotificationsClick,
}: AppHeaderProps) {
  const count = Number(notificationCount) || 0;
  const showBadge = hasNotifications || count > 0;
  const badgeText = count > 9 ? '9+' : count > 0 ? String(count) : '';
  const subtitle = tabTitles[activeTab] ?? 'Inicio';

  return (
    <header className="sticky top-0 z-40 h-[68px] border-b border-white/40 bg-white/80 px-4 shadow-[0_10px_32px_rgba(15,23,42,0.06)] backdrop-blur-xl">
      <div className="relative mx-auto h-full w-full max-w-3xl">
        <motion.button
          type="button"
          aria-label="Abrir menu"
          onClick={onMenuClick}
          whileTap={{ scale: 0.92 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="absolute left-0 top-3 grid h-11 w-11 place-items-center rounded-full border border-white/60 bg-white/65 text-[#1E3A8A] shadow-[0_12px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl transition hover:bg-white hover:text-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25"
        >
          <Menu size={20} strokeWidth={2.3} aria-hidden="true" />
        </motion.button>

        <div className="pointer-events-none absolute inset-x-[68px] top-1/2 flex -translate-y-1/2 items-center justify-center">
          <motion.div
            className="flex min-w-0 items-center justify-center gap-2.5"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <img
              src={primaryAssets.logoSoyiba}
              alt="SOY IBA"
              className="h-10 w-auto max-w-[116px] shrink-0 object-contain min-[390px]:max-w-[136px] min-[412px]:max-w-[148px]"
            />

            <div className="hidden min-w-0 border-l border-[#1E3A8A]/10 pl-2.5 min-[390px]:block">
              <span className="block truncate text-[13px] font-black leading-4 text-[#1E3A8A]">SOY IBA</span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={subtitle}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="block max-w-[132px] truncate text-[10px] font-bold leading-3 text-[#64748B] min-[412px]:max-w-[166px]"
                >
                  {subtitle}
                </motion.span>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        <div className="absolute right-0 top-3 flex items-center gap-2">
          {onChurchInfoClick ? (
            <motion.button
              type="button"
              aria-label="Conoce nuestra iglesia"
              onClick={onChurchInfoClick}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="relative grid h-11 w-11 place-items-center rounded-full border border-[#2563EB]/20 bg-[#EFF6FF] text-[#2563EB] shadow-[0_12px_28px_rgba(37,99,235,0.12)] backdrop-blur-xl transition hover:border-[#2563EB]/35 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25"
            >
              <motion.span
                aria-hidden="true"
                className="absolute inset-0 rounded-full border border-[#2563EB]/35"
                animate={{ opacity: [0.42, 0, 0.42], scale: [1, 1.34, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <Church className="relative z-10" size={20} strokeWidth={2.35} aria-hidden="true" />
            </motion.button>
          ) : null}

          <motion.button
            type="button"
            aria-label="Notificaciones"
            onClick={onNotificationsClick}
            whileTap={{ scale: 0.92 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/60 bg-white/65 text-[#1E3A8A] shadow-[0_12px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl transition hover:bg-white hover:text-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25"
          >
            <Bell size={20} strokeWidth={2.2} aria-hidden="true" />
            <AnimatePresence>
              {showBadge ? (
                <motion.span
                  initial={{ opacity: 0, scale: 0.75 }}
                  animate={{ opacity: 1, scale: [1, 1.1, 1] }}
                  exit={{ opacity: 0, scale: 0.75 }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  className={`absolute -right-0.5 -top-0.5 grid rounded-full bg-red-500 text-[10px] font-black leading-none text-white shadow-[0_8px_18px_rgba(239,68,68,0.34)] ring-2 ring-white ${
                    badgeText ? 'h-5 min-w-5 place-items-center px-1' : 'h-3.5 w-3.5'
                  }`}
                >
                  {badgeText}
                </motion.span>
              ) : null}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </header>
  );
}
