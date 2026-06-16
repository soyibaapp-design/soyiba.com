import { motion } from 'framer-motion';
import { CalendarDays, Heart, Home, UserRound, UsersRound, type LucideIcon } from 'lucide-react';

export type BottomNavItem<T extends string = string> = {
  id: T;
  label: string;
  icon: LucideIcon;
};

export const soyibaBottomNavItems: BottomNavItem[] = [
  { id: 'inicio', label: 'Inicio', icon: Home },
  { id: 'eventos', label: 'Eventos', icon: CalendarDays },
  { id: 'eco', label: 'ECO', icon: UsersRound },
  { id: 'donaciones', label: 'Donaciones', icon: Heart },
  { id: 'perfil', label: 'Perfil', icon: UserRound },
];

type BottomNavProps<T extends string> = {
  activeTab: T;
  items?: BottomNavItem<T>[];
  onChange: (tab: T) => void;
};

export function BottomNav<T extends string>({ activeTab, items, onChange }: BottomNavProps<T>) {
  const navItems = (items ?? soyibaBottomNavItems) as BottomNavItem<T>[];

  return (
    <nav className="fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-[80] mx-auto max-w-xl">
      <div
        className="grid min-h-[72px] rounded-[28px] border border-white/50 bg-white/90 p-2 shadow-[0_22px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl"
        style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
      >
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;

          return (
            <motion.button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              whileTap={{ scale: 0.94 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className={`relative flex h-14 min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-[22px] px-1 text-[10px] font-black transition-colors duration-200 min-[390px]:text-[11px] ${
                active ? 'text-white' : 'text-[#64748B] hover:bg-[#2563EB]/6 hover:text-[#1E3A8A]'
              }`}
            >
              {active ? (
                <motion.span
                  layoutId="soyiba-bottom-nav-active"
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 rounded-[22px] bg-[#2563EB] shadow-[0_14px_28px_rgba(37,99,235,0.28)]"
                />
              ) : null}

              <Icon className="relative z-10 h-5 w-5 shrink-0" strokeWidth={active ? 2.45 : 2.15} aria-hidden="true" />
              <span className="relative z-10 block w-full truncate text-center leading-3">{label}</span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
