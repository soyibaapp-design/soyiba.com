import { BadgeCheck, CalendarClock, MessageCircle, UserRound } from 'lucide-react';
import type { SoyibaUser } from '../Auth/auth.service';
import {
  canUseWhatsapp,
  getMemberFullName,
  getMemberInitials,
  getWhatsappUrl,
  type IbaMember,
} from './membersService';

type MemberCardProps = {
  member: IbaMember;
  currentUser: SoyibaUser;
  onOpenProfile: (member: IbaMember) => void;
};

export function MemberCard({ member, currentUser, onOpenProfile }: MemberCardProps) {
  const whatsappUrl = getWhatsappUrl(member, currentUser);
  const titleLabel = member.tituloUsuario || member.tipoUsuario || 'Miembro';
  const hasWhatsapp = canUseWhatsapp(member);

  return (
    <article className="rounded-[18px] border border-[#DCE6F5] bg-white/95 p-3.5 shadow-[0_16px_36px_rgba(15,23,42,0.07)]">
      <div className="grid min-w-0 grid-cols-[58px_minmax(0,1fr)_124px] items-start gap-3">
        <MemberAvatar member={member} size="md" />
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <h3 className="min-w-0 truncate text-[15px] font-black leading-5 text-[#0B1F5B]">{getMemberFullName(member)}</h3>
            <VerifiedBadge active={member.verificado} />
          </div>
          <p className="mt-1 truncate text-[12px] font-black leading-4 text-[#145CFF]">{titleLabel}</p>
          {member.tiempoEnIBA ? (
            <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] font-bold leading-4 text-[#64748B]">
              <CalendarClock size={13} className="shrink-0 text-[#8A99AE]" />
              <span className="truncate">Tiempo en la IBA: {member.tiempoEnIBA}</span>
            </p>
          ) : null}
        </div>
        <div className="flex w-[124px] shrink-0 items-start justify-end gap-1.5">
          <button
            type="button"
            onClick={() => onOpenProfile(member)}
            className="inline-flex h-8 min-w-0 flex-1 items-center justify-center gap-1 rounded-full border border-[#145CFF]/40 bg-white px-2 text-[10px] font-black text-[#145CFF] shadow-[0_8px_18px_rgba(20,92,255,0.08)] transition hover:border-[#145CFF] hover:bg-[#F3F7FF]"
          >
            <UserRound size={13} className="shrink-0" />
            <span className="truncate">Ver perfil</span>
          </button>
          {hasWhatsapp ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`Saludar por WhatsApp a ${getMemberFullName(member)}`}
              title="WhatsApp"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#20B857] text-white shadow-[0_8px_18px_rgba(32,184,87,0.18)] transition hover:bg-[#159947]"
            >
              <MessageCircle size={13} className="shrink-0" />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function MemberAvatar({ member, size = 'md' }: { member: IbaMember; size?: 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-24 w-24 text-2xl' : 'h-[58px] w-[58px] text-base';

  return (
    <div
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full border-[3px] border-white bg-[#EAF2FF] font-black text-[#145CFF] shadow-[0_12px_30px_rgba(20,92,255,0.16)] ${sizeClass}`}
    >
      {member.fotoUrl ? (
        <img src={member.fotoUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        getMemberInitials(member)
      )}
    </div>
  );
}

function VerifiedBadge({ active }: { active: boolean }) {
  if (!active) {
    return null;
  }

  return <BadgeCheck size={17} aria-label="Usuario verificado" className="shrink-0 fill-[#EAF2FF] text-[#145CFF]" />;
}
