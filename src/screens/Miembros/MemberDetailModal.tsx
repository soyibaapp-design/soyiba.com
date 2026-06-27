import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, CalendarClock, Church, Home, MapPin, MessageCircle, ShieldCheck, X, type LucideIcon } from 'lucide-react';
import type { SoyibaUser } from '../Auth/auth.service';
import { MemberAvatar } from './MemberCard';
import { canUseWhatsapp, getMemberFullName, getWhatsappUrl, type IbaMember } from './membersService';

type MemberDetailModalProps = {
  member: IbaMember;
  currentUser: SoyibaUser;
  onClose: () => void;
};

export function MemberDetailModal({ member, currentUser, onClose }: MemberDetailModalProps) {
  const whatsappUrl = getWhatsappUrl(member, currentUser);
  const roleLabel = member.rolSistema || member.rol || member.tipoUsuario || 'Miembro';
  const titleLabel = member.tituloUsuario || member.tipoUsuario || 'Miembro';

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-[#0B1F5B]/32 px-3 pb-3 pt-12 backdrop-blur-sm min-[560px]:items-center" role="dialog" aria-modal="true">
      <motion.section
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.98 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="max-h-[calc(100vh-40px)] w-full max-w-md overflow-hidden rounded-[22px] border border-white/80 bg-white shadow-[0_26px_70px_rgba(11,31,91,0.24)]"
      >
        <header className="flex min-h-14 items-center justify-between border-b border-[#E3EAF5] px-4">
          <h2 className="text-sm font-black text-[#0B1F5B]">Perfil de miembro</h2>
          <button type="button" aria-label="Cerrar perfil" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full text-[#0B1F5B]">
            <X size={20} />
          </button>
        </header>

        <div className="max-h-[calc(100vh-170px)] overflow-y-auto bg-[#F8FBFF] px-4 pb-4 pt-5">
          <div className="flex flex-col items-center text-center">
            <MemberAvatar member={member} size="lg" />
            <h3 className="mt-3 flex max-w-full items-center justify-center gap-1.5 break-words text-xl font-black leading-6 text-[#0B1F5B]">
              <span className="min-w-0 break-words">{getMemberFullName(member)}</span>
              {member.verificado ? <BadgeCheck size={20} aria-label="Usuario verificado" className="shrink-0 fill-[#EAF2FF] text-[#145CFF]" /> : null}
            </h3>
            <div className="mt-2 flex max-w-full flex-wrap justify-center gap-1.5">
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#EAF2FF] px-3 py-1.5 text-[11px] font-black text-[#145CFF] ring-1 ring-[#B9D3FF]">
                <ShieldCheck size={14} className="shrink-0" />
                <span className="truncate">{roleLabel}</span>
              </span>
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-[#145CFF] ring-1 ring-[#B9D3FF]">
                <span className="truncate">{titleLabel}</span>
              </span>
              {member.verificado ? (
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#EAF2FF] px-3 py-1.5 text-[11px] font-black text-[#145CFF] ring-1 ring-[#B9D3FF]">
                  <BadgeCheck size={14} className="shrink-0 fill-[#EAF2FF]" />
                  <span className="truncate">Usuario verificado</span>
                </span>
              ) : null}
            </div>
          </div>

          <section className="mt-5 space-y-2">
            {member.ministerio ? <DetailRow icon={Church} label="Ministerio" value={member.ministerio} /> : null}
            {member.grupoEco ? <DetailRow icon={Home} label="Grupo ECO" value={member.grupoEco} /> : null}
            {member.tiempoEnIBA ? <DetailRow icon={CalendarClock} label="Tiempo en la IBA" value={member.tiempoEnIBA} /> : null}
            {member.sector ? <DetailRow icon={MapPin} label="Sector" value={member.sector} /> : null}
          </section>
        </div>

        <footer className={`grid gap-3 border-t border-[#E3EAF5] bg-white p-3.5 ${canUseWhatsapp(member) ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {canUseWhatsapp(member) ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-[13px] bg-[#20B857] px-4 text-xs font-black text-white shadow-[0_12px_26px_rgba(32,184,87,0.22)]"
            >
              <MessageCircle size={16} className="shrink-0" />
              <span className="truncate">WhatsApp</span>
            </a>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-[13px] border border-[#CBD8EA] bg-white px-4 text-xs font-black text-[#51617A]"
          >
            Cerrar
          </button>
        </footer>
      </motion.section>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <article className="flex min-h-[58px] min-w-0 items-center gap-3 rounded-[14px] border border-[#DCE6F5] bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[#EAF2FF] text-[#145CFF]">
        <Icon size={20} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[10px] font-black uppercase text-[#728098]">{label}</span>
        <span className="mt-0.5 block break-words text-sm font-black leading-5 text-[#0B1F5B]">{value}</span>
      </span>
    </article>
  );
}
