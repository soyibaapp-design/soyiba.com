import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, MapPinned, PlaySquare, RefreshCw } from 'lucide-react';
import type { SoyibaSession } from '../Auth/auth.service';
import { PublicationsFeed } from '../Publicaciones/PublicationsFeed';
import { getInicioSummary, type InicioMetric, type InicioNotice } from './inicio.service';

type InicioScreenProps = {
  session: SoyibaSession;
  openPublicationComposerSignal?: number;
  onPublicationComposerOpenChange?: (open: boolean) => void;
};

export function InicioScreen({ session, openPublicationComposerSignal = 0, onPublicationComposerOpenChange }: InicioScreenProps) {
  const [metrics, setMetrics] = useState<InicioMetric[]>([]);
  const [notices, setNotices] = useState<InicioNotice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getInicioSummary()
      .then((summary) => {
        if (!isMounted) {
          return;
        }

        setMetrics(summary.metrics);
        setNotices(summary.notices);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <motion.section
      key="inicio"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.22 }}
      className="space-y-5"
    >
      <section className="rounded-[22px] bg-[#0B1F5B] p-5 text-white shadow-[0_18px_42px_rgba(11,31,91,0.24)]">
        <p className="text-sm font-medium text-emerald-100">Hola, {session.user.name}</p>
        <h2 className="mt-2 text-2xl font-bold">Panel soyIBA</h2>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {metrics.map((metric) => (
            <div key={metric.id} className="rounded-[14px] bg-white/12 p-3 backdrop-blur">
              <p className="truncate text-xl font-bold">{metric.value}</p>
              <p className="mt-1 truncate text-xs font-medium text-emerald-100">{metric.label}</p>
            </div>
          ))}
          {isLoading ? (
            <div className="col-span-3 flex h-20 items-center justify-center rounded-[14px] bg-white/12 text-emerald-50">
              <RefreshCw className="animate-spin" size={18} aria-hidden="true" />
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <QuickAction icon={MapPinned} label="Mapa" tone="bg-cyan-100 text-cyan-900" />
        <QuickAction icon={PlaySquare} label="Video" tone="bg-amber-100 text-amber-900" />
        <QuickAction icon={Bell} label="Alertas" tone="bg-rose-100 text-rose-900" />
      </section>

      <section className="space-y-3">
        {notices.map((notice) => (
          <article key={notice.id} className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">{notice.title}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">{notice.body}</p>
          </article>
        ))}
      </section>

      <PublicationsFeed
        session={session}
        openComposerSignal={openPublicationComposerSignal}
        onComposerOpenChange={onPublicationComposerOpenChange}
      />
    </motion.section>
  );
}

type QuickActionProps = {
  icon: typeof MapPinned;
  label: string;
  tone: string;
};

function QuickAction({ icon: Icon, label, tone }: QuickActionProps) {
  return (
    <button className={`flex h-24 flex-col items-center justify-center gap-2 rounded-[16px] text-sm font-semibold shadow-sm ${tone}`} type="button">
      <Icon size={22} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
