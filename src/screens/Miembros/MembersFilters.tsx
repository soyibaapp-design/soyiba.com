export type MembersFilterId =
  | 'todos'
  | 'servidor'
  | 'lider'
  | 'pastor'
  | 'administrativo'
  | 'musico'
  | 'audiovisuales'
  | 'creadorContenido';

export const membersFilterOptions: Array<{ id: MembersFilterId; label: string }> = [
  { id: 'todos', label: 'Todos los miembros' },
  { id: 'servidor', label: 'Servidor' },
  { id: 'lider', label: 'Líder' },
  { id: 'pastor', label: 'Pastor' },
  { id: 'administrativo', label: 'Administrativo' },
  { id: 'musico', label: 'Músico' },
  { id: 'audiovisuales', label: 'Audiovisuales' },
  { id: 'creadorContenido', label: 'Creador de contenido' },
];

type MembersFiltersProps = {
  activeFilter: MembersFilterId;
  onChange: (filter: MembersFilterId) => void;
};

export function MembersFilters({ activeFilter, onChange }: MembersFiltersProps) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max gap-2">
        {membersFilterOptions.map((filter) => {
          const active = activeFilter === filter.id;

          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => onChange(filter.id)}
              aria-pressed={active}
              className={`h-9 shrink-0 rounded-full px-3.5 text-[11px] font-black shadow-[0_10px_22px_rgba(15,23,42,0.05)] transition ${
                active
                  ? 'bg-[#145CFF] text-white ring-1 ring-[#145CFF]'
                  : 'border border-[#DCE6F5] bg-white text-[#52637C] hover:border-[#145CFF]/35 hover:text-[#145CFF]'
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
