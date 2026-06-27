import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LoaderCircle, LockKeyhole, RefreshCcw, Search, ShieldCheck, UsersRound, type LucideIcon } from 'lucide-react';
import type { SoyibaSession } from '../Auth/auth.service';
import { MemberCard } from './MemberCard';
import { MemberDetailModal } from './MemberDetailModal';
import { MembersFilters, type MembersFilterId } from './MembersFilters';
import {
  getMemberFullName,
  getMembersDirectory,
  normalizeSearchText,
  type IbaMember,
} from './membersService';

type MembersPageProps = {
  session: SoyibaSession;
  onRequestValidation: () => void;
  onModalOpenChange?: (open: boolean) => void;
};

export function MembersPage({ session, onRequestValidation, onModalOpenChange }: MembersPageProps) {
  const [members, setMembers] = useState<IbaMember[]>([]);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<MembersFilterId>('todos');
  const [selectedMember, setSelectedMember] = useState<IbaMember | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    onModalOpenChange?.(Boolean(selectedMember));
    return () => onModalOpenChange?.(false);
  }, [selectedMember, onModalOpenChange]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError('');
    setAccessDenied(false);

    getMembersDirectory(session)
      .then((items) => {
        if (!isMounted) return;
        setMembers(items);
      })
      .catch((loadError) => {
        if (!isMounted) return;
        const message = loadError instanceof Error ? loadError.message : 'No fue posible cargar el directorio.';

        if (message.toLowerCase().includes('directorio disponible solo para miembros')) {
          setMembers([]);
          setAccessDenied(true);
          setError('');
          return;
        }

        setError(message);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [session]);

  const filteredMembers = useMemo(() => {
    const needle = normalizeSearchText(query);

    return members.filter((member) => {
      if (!matchesFilter(member, activeFilter)) {
        return false;
      }

      if (!needle) {
        return true;
      }

      return normalizeSearchText([
        getMemberFullName(member),
        member.ministerio,
        member.grupoEco,
        member.sector,
        member.rol,
        member.rolSistema,
        member.tituloUsuario,
        member.tipoUsuario,
      ].join(' ')).includes(needle);
    });
  }, [activeFilter, members, query]);

  if (accessDenied) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.22 }}
        className="space-y-4 pb-4"
      >
        <section className="rounded-[22px] border border-[#DCE6F5] bg-white/95 p-5 text-center shadow-[0_18px_42px_rgba(15,23,42,0.07)]">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#EAF2FF] text-[#145CFF]">
            <LockKeyhole size={30} />
          </div>
          <h1 className="mt-4 text-xl font-black leading-6 text-[#0B1F5B]">Directorio disponible solo para miembros.</h1>
          <button
            type="button"
            onClick={onRequestValidation}
            className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-[15px] bg-[#145CFF] px-5 text-xs font-black text-white shadow-[0_14px_30px_rgba(20,92,255,0.28)]"
          >
            <ShieldCheck size={17} />
            Solicitar validación como miembro
          </button>
        </section>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.22 }}
      className="space-y-4 pb-4"
    >
      <header className="relative -mx-4 -mt-5 overflow-hidden px-4 pb-5 pt-5">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#FFFFFF_0%,#F4F8FF_54%,#EAF3FF_100%)]" />
        <div className="relative flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] bg-[#145CFF] text-white shadow-[0_16px_34px_rgba(20,92,255,0.28)]">
            <UsersRound size={25} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-2xl font-black leading-7 text-[#0B1F5B]">Miembros IBA</h1>
            <p className="mt-1 text-sm font-semibold leading-5 text-[#637295]">Conoce y conecta con otros miembros de nuestra iglesia.</p>
          </div>
        </div>
      </header>

      <label className="block">
        <span className="mb-1.5 block text-[10px] font-black text-[#52637C]">Buscar</span>
        <span className="flex h-12 items-center gap-2 rounded-[14px] border border-[#DCE6F5] bg-white px-3 text-sm font-bold text-[#0B1F5B] shadow-[0_12px_26px_rgba(15,23,42,0.06)] focus-within:border-[#145CFF] focus-within:ring-4 focus-within:ring-blue-100">
          <Search size={18} className="shrink-0 text-[#8A99AE]" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar miembro, ministerio, ECO o sector…"
            className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#98A1BD]"
          />
        </span>
      </label>

      <MembersFilters activeFilter={activeFilter} onChange={setActiveFilter} />

      {error ? (
        <section className="rounded-[18px] border border-rose-100 bg-rose-50 p-4 text-center shadow-[0_14px_32px_rgba(225,29,72,0.08)]">
          <p className="text-sm font-bold leading-5 text-rose-700">{error}</p>
          <button
            type="button"
            onClick={() => {
              setMembers([]);
              setError('');
              setLoading(true);
              getMembersDirectory(session)
                .then(setMembers)
                .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar el directorio.'))
                .finally(() => setLoading(false));
            }}
            className="mt-3 inline-flex h-10 items-center gap-2 rounded-[12px] bg-white px-4 text-xs font-black text-[#145CFF] ring-1 ring-[#145CFF]/25"
          >
            <RefreshCcw size={15} />
            Reintentar
          </button>
        </section>
      ) : null}

      {loading ? (
        <div className="flex h-40 items-center justify-center rounded-[18px] border border-[#DCE6F5] bg-white text-[#145CFF] shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
          <LoaderCircle size={25} className="animate-spin" />
        </div>
      ) : null}

      {!loading && !error && !members.length ? (
        <EmptyState icon={UsersRound} message="Aún no hay miembros visibles." />
      ) : null}

      {!loading && !error && members.length > 0 && !filteredMembers.length ? (
        <EmptyState icon={Search} message="No encontramos miembros con esa búsqueda." />
      ) : null}

      {!loading && !error && filteredMembers.length ? (
        <section className="space-y-3">
          {filteredMembers.map((member) => (
            <MemberCard key={member.id || getMemberFullName(member)} member={member} currentUser={session.user} onOpenProfile={setSelectedMember} />
          ))}
        </section>
      ) : null}

      <AnimatePresence>
        {selectedMember ? <MemberDetailModal member={selectedMember} currentUser={session.user} onClose={() => setSelectedMember(null)} /> : null}
      </AnimatePresence>
    </motion.section>
  );
}

function EmptyState({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <article className="rounded-[18px] border border-dashed border-[#B8C9E7] bg-white/95 p-5 text-center shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#EAF2FF] text-[#145CFF]">
        <Icon size={23} />
      </div>
      <p className="mt-3 text-sm font-black leading-5 text-[#0B1F5B]">{message}</p>
    </article>
  );
}

function matchesFilter(member: IbaMember, filter: MembersFilterId) {
  if (filter === 'todos') {
    return true;
  }

  const haystack = normalizeSearchText([
    member.rol,
    member.rolSistema,
    member.tituloUsuario,
    member.tipoUsuario,
    member.ministerio,
    member.grupoEco,
    member.sector,
    member.tiempoEnIBA,
  ].join(' '));

  if (filter === 'servidor') return haystack.includes('servidor');
  if (filter === 'lider') return haystack.includes('lider');
  if (filter === 'pastor') return haystack.includes('pastor');
  if (filter === 'administrativo') return haystack.includes('administrativo') || haystack.includes('admin');
  if (filter === 'musico') return haystack.includes('musico');
  if (filter === 'audiovisuales') return haystack.includes('audiovisual');
  if (filter === 'creadorContenido') return haystack.includes('creador de contenido') || haystack.includes('contenido');

  return true;
}
