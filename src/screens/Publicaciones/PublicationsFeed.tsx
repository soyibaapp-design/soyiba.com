import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  BookOpen,
  Bookmark,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Compass,
  ExternalLink,
  Eye,
  FileText,
  HeartHandshake,
  House,
  ImageIcon,
  Link as LinkIcon,
  LoaderCircle,
  MapPin,
  MapPinned,
  MessageCircle,
  MoreVertical,
  Music2,
  Navigation,
  PencilLine,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Trash2,
  UploadCloud,
  UserCheck,
  UsersRound,
  Video,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  getGoogleDriveDownloadUrl,
  getGoogleDriveFileUrl,
  getGoogleDriveImageCandidates,
  getGoogleDriveImageUrl,
  getGoogleDrivePreviewUrl,
} from '../../services/googleDrive';
import type { SoyibaSession } from '../Auth/auth.service';
import {
  PUBLICATION_CTA_TYPES,
  createPublication,
  deletePublication,
  buildPublicationMediaItems,
  canManagePublication,
  getCachedPublicationFeed,
  getMediaFormValues,
  getPermittedPublicationTypes,
  getPublicationCtaLabel,
  getPublicationCtaUrl,
  getPublicationFeed,
  parseRelatedLinksInput,
  recordPublicationShare,
  recordPublicationView,
  toggleEcoAttendance,
  serializeRelatedLinksInput,
  toggleEventGoing,
  togglePublicationSave,
  updatePublication,
  uploadPublicationMedia,
  type PublicationCtaType,
  type PublicationMediaItem,
  type PublicationPayload,
  type PublicationType,
  type SoyibaPublication,
} from './publicaciones.service';
import { SoyibaMap, type SoyibaMapMarker } from '../../components/SoyibaMap';

type PublicationsFeedProps = {
  session: SoyibaSession;
  openComposerSignal?: number;
  onComposerOpenChange?: (open: boolean) => void;
  filterType?: PublicationType;
  variant?: 'feed' | 'eventos' | 'eco';
  title?: string;
  subtitle?: string;
  openPublicationId?: string;
  onPublicationOpened?: () => void;
  onOpenEventFromHome?: (publicationId: string) => void;
  onOpenEcoFromHome?: (publicationId: string) => void;
  publicMode?: boolean;
  onAuthRequired?: (mode: 'login' | 'register') => void;
};

type ImagePreview = {
  src: string;
  sources?: string[];
  title: string;
};

type PublicationFormState = {
  type: PublicationType;
  title: string;
  description: string;
  imageUrl: string;
  imageFile: File | null;
  videoUrl: string;
  videoFile: File | null;
  songUrl: string;
  ctaType: PublicationCtaType;
  ctaUrl: string;
  ctaPhone: string;
  relatedLinksInput: string;
  eventDateTime: string;
  eventPlace: string;
  eventValidFrom: string;
  eventValidUntil: string;
  eventCapacityTotal: string;
  ecoDay: string;
  ecoTime: string;
  ecoHost: string;
  ecoModerator: string;
  ecoPhone: string;
  ecoAddress: string;
  ecoNeighborhood: string;
  ecoCity: string;
  ecoLatitude: string;
  ecoLongitude: string;
  ecoValidFrom: string;
  ecoValidUntil: string;
};

type GeoPoint = {
  latitude: number;
  longitude: number;
};

const statsIconClass = 'h-5 w-5 shrink-0';

export function PublicationsFeed({
  session,
  openComposerSignal = 0,
  onComposerOpenChange,
  filterType,
  variant = 'feed',
  title,
  subtitle,
  openPublicationId,
  onPublicationOpened,
  onOpenEventFromHome,
  onOpenEcoFromHome,
  publicMode = false,
  onAuthRequired,
}: PublicationsFeedProps) {
  const cachedPublications = getCachedPublicationFeed(session, filterType ? { type: filterType } : {});
  const [publications, setPublications] = useState<SoyibaPublication[]>(() => cachedPublications || []);
  const [isLoading, setIsLoading] = useState(() => !cachedPublications);
  const [error, setError] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPublication, setEditingPublication] = useState<SoyibaPublication | null>(null);
  const [savingPublication, setSavingPublication] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState('');
  const [imagePreview, setImagePreview] = useState<ImagePreview | null>(null);
  const [activePublicationId, setActivePublicationId] = useState('');
  const [eventStatusFilter, setEventStatusFilter] = useState<'todos' | 'proximos' | 'pasados'>('todos');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [goingBusyId, setGoingBusyId] = useState('');
  const [ecoAttendanceBusyId, setEcoAttendanceBusyId] = useState('');
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'ready' | 'blocked' | 'unsupported'>('idle');
  const [notice, setNotice] = useState('');
  const lastComposerSignal = useRef(0);
  const lastOpenPublicationId = useRef('');
  const permittedTypes = useMemo(() => getPermittedPublicationTypes(session.user), [session.user]);
  const composerTypes = useMemo(
    () => (filterType && permittedTypes.includes(filterType) ? [filterType] : permittedTypes),
    [filterType, permittedTypes],
  );
  const canCreate = !publicMode && composerTypes.length > 0;
  const feedTitle = title || (variant === 'eventos' ? 'Eventos' : variant === 'eco' ? 'Grupos ECO' : 'Publicaciones');
  const feedSubtitle = subtitle || (variant === 'eventos' ? 'Conectate y participa en lo que Dios esta haciendo.' : 'Comunidad SOY IBA');
  const visiblePublications = useMemo(() => {
    let items = publications;

    if (variant === 'eventos') {
      items = filterEventsByStatus(items, eventStatusFilter);

      if (searchTerm.trim()) {
        const term = normalizeSearchText(searchTerm);
        items = items.filter((publication) =>
          normalizeSearchText(`${publication.title} ${publication.description} ${publication.event.place}`).includes(term),
        );
      }
    }

    if (variant === 'eco') {
      items = sortEcoPublicationsByDistance(items, userLocation);
    }

    return items;
  }, [eventStatusFilter, publications, searchTerm, userLocation, variant]);
  const activeDetailPublication = useMemo(
    () => publications.find((publication) => publication.id === activePublicationId) || null,
    [activePublicationId, publications],
  );

  useEffect(() => {
    let isMounted = true;
    const cached = getCachedPublicationFeed(session, filterType ? { type: filterType } : {});

    if (cached) {
      setPublications(cached);
      setIsLoading(false);
      setError('');
      return () => {
        isMounted = false;
      };
    }

    setIsLoading(true);
    setError('');

    getPublicationFeed(session, filterType ? { type: filterType } : {})
      .then((items) => {
        if (isMounted) {
          setPublications(items);
        }
      })
      .catch((loadError) => {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar las publicaciones.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [filterType, session]);

  useEffect(() => {
    if (variant !== 'eco') {
      return;
    }

    if (!navigator.geolocation) {
      setLocationStatus('unsupported');
      return;
    }

    let cancelled = false;
    setLocationStatus('requesting');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) {
          return;
        }

        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationStatus('ready');
      },
      () => {
        if (!cancelled) {
          setLocationStatus('blocked');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5 * 60 * 1000,
        timeout: 9000,
      },
    );

    return () => {
      cancelled = true;
    };
  }, [variant]);

  useEffect(() => {
    if (!canCreate || openComposerSignal === lastComposerSignal.current) {
      return;
    }

    lastComposerSignal.current = openComposerSignal;
    setEditingPublication(null);
    setComposerOpen(true);
  }, [canCreate, openComposerSignal]);

  useEffect(() => {
    if (!openPublicationId) {
      lastOpenPublicationId.current = '';
      return;
    }

    if (!openPublicationId || isLoading || openPublicationId === lastOpenPublicationId.current) {
      return;
    }

    const publication = publications.find((item) => item.id === openPublicationId);

    if (publication) {
      lastOpenPublicationId.current = openPublicationId;
      setActivePublicationId(publication.id);
      onPublicationOpened?.();
    }
  }, [isLoading, onPublicationOpened, openPublicationId, publications]);

  useEffect(() => {
    if (publicMode) {
      return;
    }

    publications.forEach((publication) => {
      const viewKey = `soyiba.viewed.${session.user.id || session.user.email}.${publication.id}`;

      if (window.sessionStorage.getItem(viewKey)) {
        return;
      }

      window.sessionStorage.setItem(viewKey, '1');
      setPublications((current) =>
        current.map((item) => (item.id === publication.id ? { ...item, viewsCount: item.viewsCount + 1 } : item)),
      );
      recordPublicationView(session, publication.id).catch(() => undefined);
    });
  }, [publicMode, publications, session]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeout = window.setTimeout(() => setNotice(''), 3600);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    onComposerOpenChange?.(composerOpen);

    return () => onComposerOpenChange?.(false);
  }, [composerOpen, onComposerOpenChange]);

  function openCreateComposer() {
    setEditingPublication(null);
    setComposerOpen(true);
  }

  function openEditComposer(publication: SoyibaPublication) {
    setActiveMenuId('');
    setEditingPublication(publication);
    setComposerOpen(true);
  }

  async function handleSavePublication(payload: PublicationPayload) {
    setSavingPublication(true);

    try {
      if (editingPublication) {
        const updated = await updatePublication(session, editingPublication.id, payload);
        setPublications((current) => sortPublications(current.map((item) => (item.id === updated.id ? mergeActivityStats(updated, item) : item))));
      } else {
        const created = await createPublication(session, payload);
        setPublications((current) => sortPublications([created, ...current]));
      }

      setComposerOpen(false);
      setEditingPublication(null);
    } finally {
      setSavingPublication(false);
    }
  }

  async function handleDeletePublication(publication: SoyibaPublication) {
    setActiveMenuId('');
    const shouldDelete = window.confirm(`Eliminar "${publication.title}"?`);

    if (!shouldDelete) {
      return;
    }

    setPublications((current) => current.filter((item) => item.id !== publication.id));

    try {
      await deletePublication(session, publication.id);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No fue posible eliminar la publicacion.');
      setPublications((current) => sortPublications([publication, ...current]));
    }
  }

  async function handleToggleSave(publication: SoyibaPublication) {
    if (publicMode) {
      onAuthRequired?.('login');
      return;
    }

    const nextSaved = !publication.savedByCurrentUser;
    updatePublicationState(publication.id, {
      savedByCurrentUser: nextSaved,
      savedCount: Math.max(0, publication.savedCount + (nextSaved ? 1 : -1)),
    });

    try {
      const saved = await togglePublicationSave(session, publication.id, nextSaved);
      updatePublicationState(publication.id, {
        savedByCurrentUser: saved,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No fue posible actualizar el guardado.');
      updatePublicationState(publication.id, {
        savedByCurrentUser: publication.savedByCurrentUser,
        savedCount: publication.savedCount,
      });
    }
  }

  async function handleToggleGoing(publication: SoyibaPublication) {
    if (publicMode) {
      onAuthRequired?.('login');
      return;
    }

    if (publication.type !== 'Evento') {
      return;
    }

    if (publication.event.expired) {
      setNotice('Este evento ya caduco.');
      return;
    }

    const nextGoing = !publication.event.currentUserGoing;

    if (nextGoing && publication.event.capacityAvailable <= 0) {
      setNotice('No quedan cupos disponibles para este evento.');
      return;
    }

    const optimisticEvent = {
      ...publication.event,
      currentUserGoing: nextGoing,
      attendeesCount: Math.max(0, publication.event.attendeesCount + (nextGoing ? 1 : -1)),
      capacityAvailable: Math.max(0, publication.event.capacityAvailable + (nextGoing ? -1 : 1)),
    };
    optimisticEvent.capacityTotal = optimisticEvent.attendeesCount + optimisticEvent.capacityAvailable;
    setGoingBusyId(publication.id);
    updatePublicationState(publication.id, { event: optimisticEvent });

    try {
      const result = await toggleEventGoing(session, publication.id, nextGoing);

      if (result.publication) {
        setPublications((current) =>
          sortPublications(current.map((item) => (item.id === result.publication?.id ? mergeServerPublication(result.publication, item) : item))),
        );
      } else {
        updatePublicationState(publication.id, {
          event: {
            ...optimisticEvent,
            currentUserGoing: result.going,
          },
        });
      }
    } catch (goingError) {
      setError(goingError instanceof Error ? goingError.message : 'No fue posible actualizar Yo voy.');
      updatePublicationState(publication.id, { event: publication.event });
    } finally {
      setGoingBusyId('');
    }
  }

  async function handleToggleEcoAttendance(publication: SoyibaPublication) {
    if (publicMode) {
      onAuthRequired?.('login');
      return;
    }

    if (publication.type !== 'Grupo ECO') {
      return;
    }

    const nextAttending = !publication.eco.currentUserAttending;
    const optimisticEco = {
      ...publication.eco,
      currentUserAttending: nextAttending,
      attendeesCount: Math.max(0, publication.eco.attendeesCount + (nextAttending ? 1 : -1)),
    };

    setEcoAttendanceBusyId(publication.id);
    updatePublicationState(publication.id, { eco: optimisticEco });

    try {
      const result = await toggleEcoAttendance(session, publication.id, nextAttending);

      if (result.publication) {
        setPublications((current) =>
          sortPublications(current.map((item) => (item.id === result.publication?.id ? mergeServerPublication(result.publication, item) : item))),
        );
      } else {
        updatePublicationState(publication.id, {
          eco: {
            ...optimisticEco,
            currentUserAttending: result.attending,
          },
        });
      }
    } catch (attendanceError) {
      setError(attendanceError instanceof Error ? attendanceError.message : 'No fue posible actualizar la asistencia al Grupo ECO.');
      updatePublicationState(publication.id, { eco: publication.eco });
    } finally {
      setEcoAttendanceBusyId('');
    }
  }

  async function handleShare(publication: SoyibaPublication) {
    if (publicMode) {
      return;
    }

    setActiveMenuId('');
    const shareUrl = buildPublicationShareUrl(publication);
    const shareData = {
      title: publication.title,
      text: publication.description || publication.title,
      url: shareUrl,
    };

    let shared = false;

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        shared = true;
      } catch (shareError) {
        if (shareError instanceof DOMException && shareError.name === 'AbortError') {
          return;
        }
      }
    }

    if (!shared) {
      shared = await copyTextToClipboard(shareUrl);
      setNotice(shared ? 'Enlace copiado para compartir.' : 'No se pudo copiar automaticamente. Te muestro el enlace para copiarlo.');
    }

    if (!shared) {
      window.prompt('Copia este enlace para compartir la publicacion:', shareUrl);
      shared = true;
    }

    if (shared) {
      updatePublicationState(publication.id, { sharedCount: publication.sharedCount + 1 });
      recordPublicationShare(session, publication.id).catch(() => undefined);
    }
  }

  function updatePublicationState(publicationId: string, patch: Partial<SoyibaPublication>) {
    setPublications((current) => current.map((item) => (item.id === publicationId ? { ...item, ...patch } : item)));
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        {variant === 'eventos' ? (
          <EventsHeader
            title={feedTitle}
            subtitle={feedSubtitle}
            activeFilter={eventStatusFilter}
            searchOpen={searchOpen}
            searchTerm={searchTerm}
            onFilterChange={setEventStatusFilter}
            onSearchToggle={() => setSearchOpen((current) => !current)}
            onSearchChange={setSearchTerm}
          />
        ) : variant === 'eco' ? (
          <EcoHeader title={feedTitle} subtitle={feedSubtitle} locationStatus={locationStatus} userLocation={userLocation} />
        ) : (
          <div className="min-w-0">
            <h2 className="text-[19px] font-black leading-6 text-[#0B1F5B]">{feedTitle}</h2>
            <p className="text-xs font-semibold text-[#62718A]">{feedSubtitle}</p>
          </div>
        )}

        {canCreate ? (
          <button
            type="button"
            onClick={openCreateComposer}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[14px] bg-[#0B1F5B] px-4 text-xs font-black text-white shadow-[0_14px_28px_rgba(11,31,91,0.22)] transition hover:bg-[#145CFF]"
          >
            <Plus size={17} />
            Crear
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-[14px] border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">{error}</div>
      ) : null}

      {notice ? (
        <div className="rounded-[14px] border border-[#BFD0EA] bg-[#EAF2FF] px-4 py-3 text-xs font-black text-[#0B1F5B]">{notice}</div>
      ) : null}

      {variant === 'eco' && !isLoading && visiblePublications.length ? (
        <EcoMapPanel publications={visiblePublications} userLocation={userLocation} locationStatus={locationStatus} onOpen={setActivePublicationId} />
      ) : null}

      {isLoading ? (
        <div className="flex h-40 items-center justify-center rounded-[18px] border border-[#E2EAF6] bg-white text-[#145CFF] shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
          <RefreshCw size={20} className="animate-spin" />
        </div>
      ) : null}

      {!isLoading && !visiblePublications.length ? (
        <div className="rounded-[18px] border border-dashed border-[#B8C9E7] bg-white p-5 text-center shadow-[0_14px_32px_rgba(15,23,42,0.05)]">
          <FileText className="mx-auto h-9 w-9 text-[#145CFF]" />
          <p className="mt-3 text-sm font-black text-[#0B1F5B]">Aun no hay {feedTitle.toLowerCase()}.</p>
        </div>
      ) : null}

      <div className={cx('space-y-4', variant === 'eventos' && 'space-y-3')}>
        {visiblePublications.map((publication) =>
          variant === 'eventos' ? (
            <EventListCard
              key={publication.id}
              publication={publication}
              goingBusy={goingBusyId === publication.id}
              menuOpen={activeMenuId === publication.id}
              canManage={!publicMode && canManagePublication(session.user, publication)}
              publicMode={publicMode}
              onMenuToggle={() => setActiveMenuId((current) => (current === publication.id ? '' : publication.id))}
              onOpen={() => setActivePublicationId(publication.id)}
              onShare={() => handleShare(publication)}
              onEdit={() => openEditComposer(publication)}
              onDelete={() => handleDeletePublication(publication)}
              onToggleGoing={() => handleToggleGoing(publication)}
              onAuthRequired={onAuthRequired}
            />
          ) : variant === 'eco' ? (
            <EcoGroupCard
              key={publication.id}
              publication={publication}
              distanceKm={getEcoDistanceKm(publication, userLocation)}
              menuOpen={activeMenuId === publication.id}
              canManage={!publicMode && canManagePublication(session.user, publication)}
              publicMode={publicMode}
              onMenuToggle={() => setActiveMenuId((current) => (current === publication.id ? '' : publication.id))}
              onOpen={() => setActivePublicationId(publication.id)}
              onShare={() => handleShare(publication)}
              onEdit={() => openEditComposer(publication)}
              onDelete={() => handleDeletePublication(publication)}
            />
          ) : (
            <PublicationCard
              key={publication.id}
              publication={publication}
              menuOpen={activeMenuId === publication.id}
              canManage={!publicMode && canManagePublication(session.user, publication)}
              publicMode={publicMode}
              onMenuToggle={() => setActiveMenuId((current) => (current === publication.id ? '' : publication.id))}
              onShare={() => handleShare(publication)}
              onEdit={() => openEditComposer(publication)}
              onDelete={() => handleDeletePublication(publication)}
              onToggleSave={() => handleToggleSave(publication)}
              onOpenEvent={publication.type === 'Evento' && onOpenEventFromHome ? () => onOpenEventFromHome(publication.id) : undefined}
              onOpenEco={publication.type === 'Grupo ECO' && onOpenEcoFromHome ? () => onOpenEcoFromHome(publication.id) : undefined}
              onOpenDetails={() => setActivePublicationId(publication.id)}
              onAuthRequired={onAuthRequired}
              onOpenImage={(preview) => setImagePreview(preview)}
            />
          ),
        )}
      </div>

      <AnimatePresence>
        {composerOpen ? (
          <PublicationComposerModal
            session={session}
            publication={editingPublication}
            permittedTypes={composerTypes}
            saving={savingPublication}
            onClose={() => {
              setComposerOpen(false);
              setEditingPublication(null);
            }}
            onSave={handleSavePublication}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {imagePreview ? <ImageLightbox preview={imagePreview} onClose={() => setImagePreview(null)} /> : null}
      </AnimatePresence>

      <AnimatePresence>
        {activeDetailPublication ? (
          activeDetailPublication.type === 'Grupo ECO' ? (
            <EcoGroupModal
              publication={activeDetailPublication}
              attendingBusy={ecoAttendanceBusyId === activeDetailPublication.id}
              publicMode={publicMode}
              userLocation={userLocation}
              onClose={() => setActivePublicationId('')}
              onShare={() => handleShare(activeDetailPublication)}
              onToggleAttendance={() => handleToggleEcoAttendance(activeDetailPublication)}
              onAuthRequired={onAuthRequired}
              onOpenImage={(preview) => setImagePreview(preview)}
            />
          ) : (
            <PublicationDetailsModal
              publication={activeDetailPublication}
              goingBusy={goingBusyId === activeDetailPublication.id}
              publicMode={publicMode}
              onClose={() => setActivePublicationId('')}
              onShare={() => handleShare(activeDetailPublication)}
              onToggleGoing={() => handleToggleGoing(activeDetailPublication)}
              onAuthRequired={onAuthRequired}
              onOpenImage={(preview) => setImagePreview(preview)}
            />
          )
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function EventsHeader({
  title,
  subtitle,
  activeFilter,
  searchOpen,
  searchTerm,
  onFilterChange,
  onSearchToggle,
  onSearchChange,
}: {
  title: string;
  subtitle: string;
  activeFilter: 'proximos' | 'todos' | 'pasados';
  searchOpen: boolean;
  searchTerm: string;
  onFilterChange: (filter: 'proximos' | 'todos' | 'pasados') => void;
  onSearchToggle: () => void;
  onSearchChange: (value: string) => void;
}) {
  const filters: Array<{ id: 'todos' | 'proximos' | 'pasados'; label: string }> = [
    { id: 'todos', label: 'Todos' },
    { id: 'proximos', label: 'Proximos' },
    { id: 'pasados', label: 'Pasados' },
  ];

  return (
    <div className="min-w-0 flex-1 space-y-3">
      <div className="min-w-0">
        <h2 className="text-[26px] font-black leading-7 text-[#0B1F5B]">{title}</h2>
        <p className="mt-2 max-w-sm text-[14px] font-semibold leading-5 text-[#637295]">{subtitle}</p>
      </div>

      <div className="flex items-center gap-2">
        <div
          className="grid min-h-[42px] flex-1 rounded-full border border-[#D7E1F1] bg-white p-1 shadow-[0_12px_32px_rgba(15,23,42,0.06)]"
          style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}
        >
          {filters.map((filter) => {
            const active = activeFilter === filter.id;

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => onFilterChange(filter.id)}
                className={cx(
                  'h-9 rounded-full px-2 text-[12px] font-black transition',
                  active ? 'bg-[#0B1F5B] text-white shadow-[0_10px_22px_rgba(11,31,91,0.22)]' : 'text-[#0B1F5B] hover:bg-[#EAF2FF]',
                )}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          aria-label="Buscar eventos"
          onClick={onSearchToggle}
          className={cx(
            'grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#0B1F5B] shadow-[0_12px_28px_rgba(15,23,42,0.08)] transition',
            searchOpen && 'bg-[#EAF2FF] text-[#145CFF]',
          )}
        >
          <Search size={21} />
        </button>
      </div>

      {searchOpen ? (
        <label className="flex h-11 items-center gap-2 rounded-full border border-[#D7E1F1] bg-white px-4 text-sm font-bold text-[#0B1F5B] shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
          <Search size={17} className="shrink-0 text-[#667085]" />
          <input
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por nombre o lugar"
            className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#98A1BD]"
          />
        </label>
      ) : null}
    </div>
  );
}

function EcoHeader({
  title,
  subtitle,
  locationStatus,
  userLocation,
}: {
  title: string;
  subtitle: string;
  locationStatus: 'idle' | 'requesting' | 'ready' | 'blocked' | 'unsupported';
  userLocation: GeoPoint | null;
}) {
  const statusLabel =
    locationStatus === 'ready' && userLocation
      ? 'Ubicacion actual detectada'
      : locationStatus === 'requesting'
        ? 'Buscando tu ubicacion'
        : locationStatus === 'unsupported'
          ? 'Ubicacion no disponible'
          : locationStatus === 'blocked'
            ? 'Ubicacion pendiente'
            : 'Grupos cerca de ti';

  return (
    <div className="min-w-0 flex-1 space-y-3">
      <div className="min-w-0">
        <h2 className="text-[26px] font-black leading-7 text-[#0B1F5B]">{title}</h2>
        <p className="mt-2 max-w-sm text-[14px] font-semibold leading-5 text-[#637295]">{subtitle}</p>
      </div>

      <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#CFE9DC] bg-[#F2FFF8] px-3 py-2 text-[12px] font-black text-[#087A57] shadow-[0_10px_24px_rgba(8,122,87,0.08)]">
        <Compass size={16} className="shrink-0" />
        <span className="truncate">{statusLabel}</span>
      </div>
    </div>
  );
}

function EcoMapPanel({
  publications,
  userLocation,
  locationStatus,
  onOpen,
}: {
  publications: SoyibaPublication[];
  userLocation: GeoPoint | null;
  locationStatus: 'idle' | 'requesting' | 'ready' | 'blocked' | 'unsupported';
  onOpen: (publicationId: string) => void;
}) {
  const mappedPublications = publications.filter(hasEcoCoordinates);
  const firstPosition = mappedPublications[0] ? getEcoCoordinates(mappedPublications[0]) : null;
  const center: [number, number] = userLocation
    ? [userLocation.latitude, userLocation.longitude]
    : firstPosition
      ? [firstPosition.latitude, firstPosition.longitude]
      : [4.4389, -75.2322];
  const markers: SoyibaMapMarker[] = mappedPublications.map((publication) => {
    const position = getEcoCoordinates(publication) as GeoPoint;
    const distanceKm = getEcoDistanceKm(publication, userLocation);
    const distanceLabel = distanceKm === null ? '' : formatDistance(distanceKm);
    const locationLabel = formatEcoLocation(publication) || 'Ubicacion del Grupo ECO';

    return {
      id: publication.id,
      title: publication.title,
      subtitle: [locationLabel, distanceLabel].filter(Boolean).join(' - '),
      distanceLabel,
      locationLabel,
      position: [position.latitude, position.longitude],
      mapsUrl: buildGoogleMapsUrl(publication),
    };
  });

  if (!mappedPublications.length && !userLocation) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-[18px] border border-[#DCE5F2] bg-white shadow-[0_16px_38px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-black text-[#0B1F5B]">Mapa de Grupos ECO</h3>
          <p className="text-[12px] font-semibold text-[#637295]">
            {locationStatus === 'ready' ? 'Tu ubicacion aparece como punto azul. Los ECO aparecen como casas.' : 'Ubicaciones disponibles.'}
          </p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#EAF2FF] text-[#145CFF]">
          <MapPinned size={20} />
        </span>
      </div>

      <SoyibaMap
        markers={markers}
        userLocation={userLocation ? [userLocation.latitude, userLocation.longitude] : null}
        center={center}
        zoom={13}
        focusUserLocation={Boolean(userLocation)}
        userZoom={13}
        className="h-[300px] rounded-none"
      />

      {!mappedPublications.length ? (
        <div className="border-t border-[#E0E7F0] bg-[#FFF9ED] px-4 py-3 text-[12px] font-bold leading-5 text-[#8A5A00]">
          Tu ubicacion ya esta en el mapa. Para mostrar casas de Grupos ECO, cada publicacion ECO debe tener latitud y longitud.
        </div>
      ) : null}

      <div className="space-y-2 bg-[#F8FBFF] p-3">
        {publications.slice(0, 3).map((publication) => {
          const distanceKm = getEcoDistanceKm(publication, userLocation);

          return (
            <button
              key={publication.id}
              type="button"
              onClick={() => onOpen(publication.id)}
              className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[12px] border border-[#E0E7F0] bg-white px-3 py-2 text-left shadow-[0_8px_18px_rgba(15,23,42,0.04)]"
            >
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-black text-[#0B1F5B]">{publication.title}</span>
                <span className="mt-0.5 block truncate text-[11px] font-bold text-[#637295]">{formatEcoLocation(publication) || 'Ubicacion por confirmar'}</span>
              </span>
              {distanceKm !== null ? <span className="rounded-full bg-[#E6FAF1] px-2.5 py-1 text-[11px] font-black text-[#087A57]">{formatDistance(distanceKm)}</span> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function EcoGroupCard({
  publication,
  distanceKm,
  menuOpen,
  canManage,
  publicMode,
  onMenuToggle,
  onOpen,
  onShare,
  onEdit,
  onDelete,
}: {
  publication: SoyibaPublication;
  distanceKm: number | null;
  menuOpen: boolean;
  canManage: boolean;
  publicMode: boolean;
  onMenuToggle: () => void;
  onOpen: () => void;
  onShare: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const imageItem = publication.mediaItems.find((item) => item.type === 'image');
  const sources = imageItem ? getGoogleDriveImageCandidates(imageItem.url) : [];

  return (
    <article className="overflow-hidden rounded-[18px] border border-[#D7EFE4] bg-white shadow-[0_16px_38px_rgba(15,23,42,0.08)]">
      <div className="grid min-h-[190px] grid-cols-[124px_minmax(0,1fr)] min-[520px]:grid-cols-[220px_minmax(0,1fr)]">
        <div className="relative bg-[#EAF7F0]">
          {imageItem ? (
            <PublicationDriveImage sources={sources} alt={imageItem.title || publication.title} className="h-full min-h-[190px] w-full object-cover" />
          ) : (
            <div className="grid h-full min-h-[190px] place-items-center text-[#52637C]">
              <ImageIcon size={30} />
            </div>
          )}

          <span className="absolute left-3 top-3 rounded-full bg-[#087A57]/92 px-3 py-1 text-[10px] font-black uppercase text-white shadow-[0_12px_26px_rgba(8,122,87,0.22)]">
            ECO
          </span>
        </div>

        <div className="min-w-0 p-3 min-[520px]:p-4">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-[18px] font-black leading-5 text-[#0B1F5B]">{publication.title}</h3>
              <p className="mt-1 truncate text-[12px] font-bold text-[#087A57]">{formatEcoLocation(publication) || 'Sector por confirmar'}</p>
            </div>

            {!publicMode ? (
              <div className="relative -mr-1 -mt-1 shrink-0">
                <button
                  type="button"
                  aria-label="Opciones del Grupo ECO"
                  onClick={onMenuToggle}
                  className="grid h-9 w-9 place-items-center rounded-full text-[#0B1F5B] transition hover:bg-[#EAF2FF]"
                >
                  <MoreVertical size={20} />
                </button>

                <AnimatePresence>
                  {menuOpen ? (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      className="absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-[14px] border border-[#DCE5F2] bg-white py-1 shadow-[0_18px_42px_rgba(15,23,42,0.16)]"
                    >
                      <MenuAction icon={Share2} label="Compartir" onClick={onShare} />
                      {canManage ? <MenuAction icon={PencilLine} label="Editar" onClick={onEdit} /> : null}
                      {canManage ? <MenuAction icon={Trash2} label="Eliminar" danger onClick={onDelete} /> : null}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            ) : null}
          </div>

          <div className="mt-3 grid gap-2 text-[11px] font-bold text-[#273653] min-[520px]:grid-cols-2">
            <EcoCardMeta icon={CalendarDays} label={publication.eco.day || 'Dia por confirmar'} />
            <EcoCardMeta icon={Clock3} label={publication.eco.time || 'Hora por confirmar'} />
            <EcoCardMeta icon={House} label={publication.eco.host || 'Anfitrion por confirmar'} />
            <EcoCardMeta icon={UserCheck} label={publication.eco.moderator || 'Moderador por confirmar'} />
            <EcoCardMeta icon={UsersRound} label={`${formatCount(publication.eco.attendeesCount)} asistentes`} />
            {distanceKm !== null ? <EcoCardMeta icon={Navigation} label={formatDistance(distanceKm)} /> : null}
          </div>

          <button
            type="button"
            onClick={onOpen}
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-[13px] bg-[#0B1F5B] px-3 text-[12px] font-black text-white shadow-[0_12px_24px_rgba(11,31,91,0.18)] transition hover:bg-[#145CFF]"
          >
            Ver Grupo ECO
          </button>
        </div>
      </div>
    </article>
  );
}

function EcoCardMeta({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <Icon size={14} className="shrink-0 text-[#087A57]" />
      <span className="truncate">{label}</span>
    </span>
  );
}

function EventListCard({
  publication,
  goingBusy,
  menuOpen,
  canManage,
  publicMode,
  onMenuToggle,
  onOpen,
  onShare,
  onEdit,
  onDelete,
  onToggleGoing,
  onAuthRequired,
}: {
  publication: SoyibaPublication;
  goingBusy: boolean;
  menuOpen: boolean;
  canManage: boolean;
  publicMode: boolean;
  onMenuToggle: () => void;
  onOpen: () => void;
  onShare: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleGoing: () => void;
  onAuthRequired?: (mode: 'login' | 'register') => void;
}) {
  const capacityTone = publication.event.capacityAvailable <= 5 && publication.event.capacityAvailable > 0 ? 'text-[#E77700]' : 'text-[#07865B]';

  return (
    <article className="grid min-h-[176px] grid-cols-[118px_minmax(0,1fr)] overflow-hidden rounded-[18px] border border-white/80 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.08)] min-[520px]:grid-cols-[238px_minmax(0,1fr)]">
      <EventCardMedia publication={publication} />

      <div className="min-w-0 px-3 py-3 min-[520px]:px-4">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#E9E6FF] px-2.5 py-1 text-[10px] font-black uppercase text-[#3150F7]">Evento</span>
            {publication.event.expired ? (
              <span className="rounded-full bg-[#FFE8E8] px-2.5 py-1 text-[10px] font-black uppercase text-[#D92D2D]">Caducado</span>
            ) : null}
            {publication.cta.type !== 'Ninguno' ? (
              <span className="rounded-full bg-[#EEF4FF] px-2.5 py-1 text-[10px] font-black text-[#0B1F5B]">{getPublicationCtaLabel(publication)}</span>
            ) : null}
          </div>

          {!publicMode ? (
          <div className="relative -mr-1 -mt-1 shrink-0">
            <button
              type="button"
              aria-label="Opciones del evento"
              onClick={onMenuToggle}
              className="grid h-9 w-9 place-items-center rounded-full text-[#0B1F5B] transition hover:bg-[#EAF2FF]"
            >
              <MoreVertical size={20} />
            </button>

            <AnimatePresence>
              {menuOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  className="absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-[14px] border border-[#DCE5F2] bg-white py-1 shadow-[0_18px_42px_rgba(15,23,42,0.16)]"
                >
                  <MenuAction icon={Share2} label="Compartir" onClick={onShare} />
                  {canManage ? <MenuAction icon={PencilLine} label="Editar" onClick={onEdit} /> : null}
                  {canManage ? <MenuAction icon={Trash2} label="Eliminar" danger onClick={onDelete} /> : null}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
          ) : null}
        </div>

        <h3 className="mt-2 line-clamp-2 text-[18px] font-black leading-5 text-[#0B1F5B] min-[520px]:text-[19px]">{publication.title}</h3>
        {publication.description ? <p className="mt-1 line-clamp-2 text-[12px] font-semibold leading-5 text-[#637295]">{publication.description}</p> : null}

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-[#273653]">
          <EventMeta icon={Clock3} label={formatEventTime(publication.event.dateTime)} />
          <EventMeta icon={MapPin} label={publication.event.place || 'Lugar por confirmar'} />
          <EventMeta icon={UsersRound} label={`${formatCount(publication.event.attendeesCount)} personas van`} />
        </div>

        <p className={cx('mt-2 text-[11px] font-black', publication.event.expired ? 'text-[#D92D2D]' : capacityTone)}>
          {publication.event.expired ? 'Evento caducado' : `Cupos disponibles: ${formatCount(publication.event.capacityAvailable)}`}
          {!publication.event.expired && publication.event.capacityAvailable > 0 && publication.event.capacityAvailable <= 5 ? ' - Quedan pocos cupos' : ''}
        </p>

        <div className={cx('mt-3 grid items-center gap-2', publicMode ? 'grid-cols-1' : 'grid-cols-[minmax(0,1fr)_auto]')}>
          <button
            type="button"
            onClick={onOpen}
            className="h-10 min-w-0 rounded-[13px] bg-[#0B1F5B] px-3 text-[12px] font-black text-white shadow-[0_12px_24px_rgba(11,31,91,0.18)] transition hover:bg-[#145CFF]"
          >
            Ver evento
          </button>
          {publicMode ? (
            <PublicAuthGate compact onAuthRequired={onAuthRequired} />
          ) : (
            <EventGoingButton publication={publication} busy={goingBusy} compact onClick={onToggleGoing} />
          )}
        </div>
      </div>
    </article>
  );
}

function EventCardMedia({ publication }: { publication: SoyibaPublication }) {
  const imageItem = publication.mediaItems.find((item) => item.type === 'image');
  const sources = imageItem ? getGoogleDriveImageCandidates(imageItem.url) : [];
  const dateParts = formatEventDateParts(publication.event.dateTime || publication.createdAt);

  return (
    <div className="relative min-h-full bg-[#DCE7F7]">
      {imageItem ? (
        <PublicationDriveImage sources={sources} alt={imageItem.title || publication.title} className="h-full min-h-[176px] w-full object-cover" />
      ) : (
        <div className="grid h-full min-h-[176px] place-items-center text-[#52637C]">
          <ImageIcon size={30} />
        </div>
      )}

      <div className="absolute left-3 top-3 grid min-h-[88px] w-[70px] place-items-center rounded-[12px] bg-[#0B1F5B]/92 px-2 py-2 text-center text-white shadow-[0_16px_32px_rgba(11,31,91,0.24)] backdrop-blur">
        <span className="text-[15px] font-black uppercase leading-none text-white/80">{dateParts.month}</span>
        <span className="text-[34px] font-black leading-9">{dateParts.day}</span>
        <span className="text-[11px] font-black uppercase leading-none text-white/80">{dateParts.weekday}</span>
      </div>
    </div>
  );
}

function PublicationDetailsModal({
  publication,
  goingBusy,
  publicMode,
  onClose,
  onShare,
  onToggleGoing,
  onAuthRequired,
  onOpenImage,
}: {
  publication: SoyibaPublication;
  goingBusy: boolean;
  publicMode: boolean;
  onClose: () => void;
  onShare: () => void;
  onToggleGoing: () => void;
  onAuthRequired?: (mode: 'login' | 'register') => void;
  onOpenImage: (preview: ImagePreview) => void;
}) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const descriptionIsLong = publication.description.length > 145 || publication.description.split(/\r?\n/).length > 2;
  const ctaUrl = getPublicationCtaUrl(publication);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex h-[100dvh] items-end justify-center overflow-hidden bg-[#0B1F5B]/35 px-2 pb-[calc(10px+env(safe-area-inset-bottom))] pt-[calc(10px+env(safe-area-inset-top))] backdrop-blur-sm min-[560px]:items-center"
      onMouseDown={onClose}
    >
      <motion.article
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        className="flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-[18px] border border-white/80 bg-white shadow-[0_26px_70px_rgba(11,31,91,0.24)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-center gap-3 px-4 py-3">
          <AuthorAvatar publication={publication} />

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-black leading-5 text-[#101827]">{publication.author.name}</h3>
            <p className="text-[12px] font-semibold leading-4 text-[#667085]">{formatRelativeTime(publication.createdAt)}</p>
          </div>

          <PublicationTypeBadge publication={publication} />

          <button type="button" aria-label="Cerrar evento" onClick={onClose} className="grid h-10 w-9 place-items-center rounded-full text-[#0B1F5B] transition hover:bg-[#F2F5FA]">
            <X size={21} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <PublicationMediaCarousel publication={publication} allowExternalOpen={!publicMode} onOpenImage={onOpenImage} />

          <div className="px-4 pb-4 pt-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3 text-[#253047]">
                <Stat icon={Bookmark} value={publication.savedCount} label="Guardados" />
                <Stat icon={Eye} value={publication.viewsCount} label="Views" />
                {!publicMode ? (
                  <button type="button" onClick={onShare} className="inline-flex items-center gap-1.5 text-sm font-bold text-[#253047]">
                    <Share2 className={statsIconClass} />
                    <span>{formatCount(publication.sharedCount)}</span>
                  </button>
                ) : (
                  <Stat icon={Share2} value={publication.sharedCount} label="Compartidos" />
                )}
              </div>

              {!publicMode && ctaUrl ? (
                <a
                  href={ctaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[12px] bg-[#5B6577] px-4 text-sm font-black text-white shadow-[0_12px_24px_rgba(31,41,55,0.18)] transition hover:bg-[#3F4857]"
                >
                  {getPublicationCtaLabel(publication)}
                  <ExternalLink size={16} />
                </a>
              ) : null}
            </div>

            <h3 className="mt-4 text-[19px] font-black leading-6 text-[#101827]">{publication.title}</h3>
            {publication.description ? (
              <div className="mt-2">
                <p className={cx('whitespace-pre-line text-[14px] font-medium leading-6 text-[#202B3C]', !descriptionExpanded && 'line-clamp-2')}>
                  {publication.description}
                </p>
                {descriptionIsLong ? (
                  <button type="button" onClick={() => setDescriptionExpanded((current) => !current)} className="mt-1 text-[14px] font-black text-[#145CFF]">
                    {descriptionExpanded ? 'Ver menos' : 'Ver mas'}
                  </button>
                ) : null}
              </div>
            ) : null}

            {publication.type === 'Evento' ? (
              <div className="mt-4 grid overflow-hidden rounded-[14px] border border-[#E0E7F0] bg-[#FAFCFF] min-[440px]:grid-cols-2">
                <EventInfoTile icon={CalendarDays} label="Fecha" value={formatEventLongDate(publication.event.dateTime)} />
                <EventInfoTile icon={Clock3} label="Hora" value={formatEventTime(publication.event.dateTime)} />
                <EventInfoTile icon={MapPin} label="Lugar" value={eventPlaceName(publication.event.place)} subvalue={eventPlaceCity(publication.event.place)} />
                <EventInfoTile
                  icon={UsersRound}
                  label="Cupos"
                  value={formatEventCapacity(publication)}
                  subvalue={publication.event.expired ? 'Evento caducado' : `${formatCount(publication.event.capacityAvailable)} disponibles`}
                />
              </div>
            ) : publication.type === 'Grupo ECO' ? (
              <div className="mt-4 rounded-[14px] border border-[#D6F5E7] bg-[#F4FFF9] px-3 py-3 text-[13px] font-bold leading-5 text-[#0B5F45]">
                Publicacion de Grupo ECO
              </div>
            ) : null}

            {publicMode ? (
              <PublicAuthGate className="mt-4" onAuthRequired={onAuthRequired} />
            ) : null}

            {!publicMode && publication.relatedLinks.length ? (
              <div className="mt-4 space-y-2">
                {publication.relatedLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-[64px] items-center gap-3 rounded-[14px] border border-[#E0E7F0] bg-[#FAFCFF] px-3 py-2 shadow-[0_8px_18px_rgba(15,23,42,0.04)]"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-[#FFF1F1] text-[#E03131]">
                      <FileText size={22} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-black text-[#101827]">{link.title}</span>
                      <span className="mt-0.5 block truncate text-[11px] font-bold text-[#667085]">{hostFromUrl(link.url)}</span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-black text-[#1F2544]">
                      Abrir
                      <ExternalLink size={16} />
                    </span>
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {publication.type === 'Evento' ? (
          <footer className="border-t border-[#E3EAF5] bg-white p-3.5">
            {publicMode ? (
              <PublicAuthGate compact onAuthRequired={onAuthRequired} />
            ) : (
              <div className="flex justify-end">
                <EventGoingButton publication={publication} busy={goingBusy} onClick={onToggleGoing} />
              </div>
            )}
          </footer>
        ) : null}
      </motion.article>
    </motion.div>
  );
}

function EcoGroupModal({
  publication,
  attendingBusy,
  publicMode,
  userLocation,
  onClose,
  onShare,
  onToggleAttendance,
  onAuthRequired,
  onOpenImage,
}: {
  publication: SoyibaPublication;
  attendingBusy: boolean;
  publicMode: boolean;
  userLocation: GeoPoint | null;
  onClose: () => void;
  onShare: () => void;
  onToggleAttendance: () => void;
  onAuthRequired?: (mode: 'login' | 'register') => void;
  onOpenImage: (preview: ImagePreview) => void;
}) {
  const mapsUrl = buildGoogleMapsUrl(publication);
  const streetViewUrl = buildStreetViewUrl(publication);
  const distanceKm = getEcoDistanceKm(publication, userLocation);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex h-[100dvh] items-end justify-center overflow-hidden bg-[#0B1F5B]/35 px-2 pb-[calc(10px+env(safe-area-inset-bottom))] pt-[calc(10px+env(safe-area-inset-top))] backdrop-blur-sm min-[560px]:items-center"
      onMouseDown={onClose}
    >
      <motion.article
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        className="flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-[18px] border border-white/80 bg-white shadow-[0_26px_70px_rgba(11,31,91,0.24)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-center gap-3 px-4 py-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#E6FAF1] text-[#087A57] ring-2 ring-[#EEF2F7]">
            <House size={23} />
          </span>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-black leading-5 text-[#101827]">{publication.title}</h3>
            <p className="text-[12px] font-semibold leading-4 text-[#667085]">{formatEcoLocation(publication) || 'Grupo ECO'}</p>
          </div>

          <PublicationTypeBadge publication={publication} />

          <button type="button" aria-label="Cerrar Grupo ECO" onClick={onClose} className="grid h-10 w-9 place-items-center rounded-full text-[#0B1F5B] transition hover:bg-[#F2F5FA]">
            <X size={21} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <PublicationMediaCarousel publication={publication} allowExternalOpen={!publicMode} onOpenImage={onOpenImage} />

          <div className="space-y-4 px-4 pb-4 pt-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3 text-[#253047]">
                <Stat icon={UsersRound} value={publication.eco.attendeesCount} label="Asistentes" />
                <Stat icon={Eye} value={publication.viewsCount} label="Views" />
                {!publicMode ? (
                  <button type="button" onClick={onShare} className="inline-flex items-center gap-1.5 text-sm font-bold text-[#253047]">
                    <Share2 className={statsIconClass} />
                    <span>{formatCount(publication.sharedCount)}</span>
                  </button>
                ) : (
                  <Stat icon={Share2} value={publication.sharedCount} label="Compartidos" />
                )}
              </div>

              {distanceKm !== null ? <span className="rounded-full bg-[#E6FAF1] px-3 py-1.5 text-[12px] font-black text-[#087A57]">{formatDistance(distanceKm)}</span> : null}
            </div>

            {publication.description ? <p className="whitespace-pre-line text-[14px] font-medium leading-6 text-[#202B3C]">{publication.description}</p> : null}

            <div className="grid overflow-hidden rounded-[14px] border border-[#D6F5E7] bg-[#F8FFFB] min-[440px]:grid-cols-2">
              <EventInfoTile icon={CalendarDays} label="Dia" value={publication.eco.day || 'Por confirmar'} />
              <EventInfoTile icon={Clock3} label="Hora" value={publication.eco.time || 'Por confirmar'} />
              <EventInfoTile icon={MapPin} label="Barrio" value={publication.eco.neighborhood || 'Por confirmar'} subvalue={publication.eco.city} />
              <EventInfoTile icon={House} label="Punto de encuentro" value={publication.eco.address || 'Por confirmar'} />
              <EventInfoTile icon={UserCheck} label="Anfitrion" value={publication.eco.host || 'Por confirmar'} />
              <EventInfoTile icon={HeartHandshake} label="Moderador" value={publication.eco.moderator || 'Por confirmar'} />
              <EventInfoTile icon={Phone} label="Contacto" value={publication.eco.phone || 'Por confirmar'} />
              <EventInfoTile icon={UsersRound} label="Asistentes" value={`${formatCount(publication.eco.attendeesCount)} asistentes`} />
            </div>

            <EcoAboutAccordion />
            <EcoOpenHomeCard />
            <EcoLocationFrame publication={publication} mapsUrl={mapsUrl} streetViewUrl={streetViewUrl} />

            {!publicMode && publication.relatedLinks.length ? (
              <div className="space-y-2">
                {publication.relatedLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-[64px] items-center gap-3 rounded-[14px] border border-[#E0E7F0] bg-[#FAFCFF] px-3 py-2 shadow-[0_8px_18px_rgba(15,23,42,0.04)]"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-[#FFF1F1] text-[#E03131]">
                      <FileText size={22} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-black text-[#101827]">{link.title}</span>
                      <span className="mt-0.5 block truncate text-[11px] font-bold text-[#667085]">{hostFromUrl(link.url)}</span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-black text-[#1F2544]">
                      Abrir
                      <ExternalLink size={16} />
                    </span>
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <footer className="border-t border-[#E3EAF5] bg-white p-3.5">
          {publicMode ? (
            <PublicAuthGate compact onAuthRequired={onAuthRequired} />
          ) : (
            <div className="flex justify-end">
              <EcoAttendButton publication={publication} busy={attendingBusy} onClick={onToggleAttendance} />
            </div>
          )}
        </footer>
      </motion.article>
    </motion.div>
  );
}

function EcoAboutAccordion() {
  const [open, setOpen] = useState(false);

  return (
    <section className="overflow-hidden rounded-[14px] border border-[#DCE6F5] bg-white shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-[54px] w-full items-center justify-between gap-3 px-3 text-left"
      >
        <span className="inline-flex min-w-0 items-center gap-2 text-[14px] font-black text-[#0B1F5B]">
          <BookOpen size={18} className="shrink-0 text-[#087A57]" />
          <span className="truncate">¿Qué son los Grupos ECO?</span>
        </span>
        <ChevronDown size={18} className={cx('shrink-0 text-[#637295] transition', open && 'rotate-180')} />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-[#E3EAF5]"
          >
            <div className="space-y-3 p-3 text-[13px] font-semibold leading-6 text-[#344154]">
              <p>
                ECO significa Evangelio, Comunidad y Oracion. Son espacios de encuentro de la Iglesia Biblica Antioquia donde los miembros se reunen en hogares para crecer juntos en su relacion con Dios y fortalecer la vida en comunidad.
              </p>
              <p>
                A diferencia de una celula enfocada principalmente en el alcance evangelistico, los Grupos ECO estan orientados a profundizar en los temas compartidos durante la predica, promover la comunion entre hermanos, acompanarse mutuamente en oracion y fomentar el discipulado practico.
              </p>

              <div className="grid gap-2 min-[440px]:grid-cols-3">
                <EcoPrincipleCard title="Evangelio" body="Reflexionamos y profundizamos en las ensenanzas biblicas para aplicarlas a la vida diaria." icon={BookOpen} />
                <EcoPrincipleCard title="Comunidad" body="Construimos relaciones sanas y significativas como familia en Cristo." icon={UsersRound} />
                <EcoPrincipleCard title="Oracion" body="Compartimos necesidades, damos gracias y oramos unos por otros." icon={MessageCircle} />
              </div>

              <p>Los Grupos ECO se reunen normalmente los viernes a las 7:00 p.m. en diferentes hogares de la ciudad.</p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function EcoPrincipleCard({ title, body, icon: Icon }: { title: string; body: string; icon: LucideIcon }) {
  return (
    <div className="rounded-[12px] border border-[#D6F5E7] bg-[#F8FFFB] p-3">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-[#E6FAF1] text-[#087A57]">
        <Icon size={17} />
      </span>
      <h4 className="mt-2 text-[12px] font-black text-[#0B1F5B]">{title}</h4>
      <p className="mt-1 text-[11px] font-semibold leading-5 text-[#52637C]">{body}</p>
    </div>
  );
}

function EcoOpenHomeCard() {
  const url = `https://wa.me/573243339375?text=${encodeURIComponent('Bendiciones, quiero abrir un nuevo Grupo ECO en mi hogar.')}`;

  return (
    <section className="rounded-[14px] border border-[#D6F5E7] bg-[#F2FFF8] p-3 shadow-[0_8px_18px_rgba(8,122,87,0.06)]">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#087A57] shadow-[0_8px_18px_rgba(8,122,87,0.12)]">
          <House size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-black text-[#0B1F5B]">Comunidad en casa</h3>
          <p className="mt-1 text-[13px] font-black text-[#087A57]">¿Quieres abrir un nuevo ECO?</p>
          <p className="mt-1 text-[12px] font-semibold leading-5 text-[#52637C]">
            Ayudanos a seguir fortaleciendo nuestra comunidad. Si deseas abrir un Grupo ECO en tu hogar, contactanos.
          </p>
        </div>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[12px] bg-[#087A57] px-4 text-[12px] font-black text-white shadow-[0_12px_24px_rgba(8,122,87,0.18)] transition hover:bg-[#066347]"
      >
        Contactanos
        <ExternalLink size={15} />
      </a>
    </section>
  );
}

function EcoLocationFrame({
  publication,
  mapsUrl,
  streetViewUrl,
}: {
  publication: SoyibaPublication;
  mapsUrl: string;
  streetViewUrl: string;
}) {
  const coordinates = getEcoCoordinates(publication);

  if (!coordinates) {
    return (
      <section className="rounded-[14px] border border-[#DCE6F5] bg-[#F8FBFF] p-3 text-[13px] font-bold text-[#637295]">
        Ubicacion en mapa por confirmar.
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[14px] border border-[#DCE6F5] bg-white shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-3 px-3 py-3">
        <div className="min-w-0">
          <h3 className="text-[14px] font-black text-[#0B1F5B]">Ubicacion</h3>
          <p className="truncate text-[12px] font-semibold text-[#637295]">{publication.eco.address || formatEcoLocation(publication)}</p>
        </div>
        <MapPin size={19} className="shrink-0 text-[#145CFF]" />
      </div>

      <iframe
        title={`Mapa de ${publication.title}`}
        src={buildGoogleMapEmbedUrl(publication)}
        className="h-[240px] w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />

      <div className="grid gap-2 bg-[#F8FBFF] p-3 min-[420px]:grid-cols-2">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] bg-[#0B1F5B] px-3 text-[12px] font-black text-white transition hover:bg-[#145CFF]"
        >
          Google Maps
          <ExternalLink size={15} />
        </a>
        <a
          href={streetViewUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] border border-[#BFD0EA] bg-white px-3 text-[12px] font-black text-[#145CFF] transition hover:bg-[#EAF2FF]"
        >
          Street View
          <ExternalLink size={15} />
        </a>
      </div>
    </section>
  );
}

function EcoAttendButton({ publication, busy, onClick }: { publication: SoyibaPublication; busy: boolean; onClick: () => void }) {
  const active = publication.eco.currentUserAttending;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-pressed={active}
      className={cx(
        'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[13px] px-5 text-sm font-black text-white shadow-[0_12px_24px_rgba(5,150,105,0.2)] transition disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none',
        active ? 'bg-[#07865B] hover:bg-[#04724D]' : 'bg-[#145CFF] hover:bg-[#0B4BE0]',
      )}
    >
      {busy ? <LoaderCircle size={17} className="animate-spin" /> : <UserCheck size={17} />}
      {active ? 'Asistire' : 'Quiero asistir'}
    </button>
  );
}

function PublicationTypeBadge({ publication }: { publication: SoyibaPublication }) {
  if (publication.type === 'Evento' && publication.event.expired) {
    return <span className="shrink-0 rounded-full bg-[#FFE8E8] px-3 py-2 text-[11px] font-black uppercase tracking-normal text-[#D92D2D]">Caducado</span>;
  }

  const tone =
    publication.type === 'Grupo ECO'
      ? 'bg-[#E6FAF1] text-[#087A57]'
      : publication.type === 'Evento'
        ? 'bg-[#EEF1F6] text-[#1F2937]'
        : 'bg-[#EAF2FF] text-[#145CFF]';

  return <span className={cx('shrink-0 rounded-full px-3 py-2 text-[11px] font-black uppercase tracking-normal', tone)}>{publication.type}</span>;
}

function PublicAuthGate({
  compact,
  className,
  onAuthRequired,
}: {
  compact?: boolean;
  className?: string;
  onAuthRequired?: (mode: 'login' | 'register') => void;
}) {
  return (
    <div className={cx('rounded-[14px] border border-[#DCE6F5] bg-[#F8FBFF] p-3 shadow-[0_8px_18px_rgba(15,23,42,0.04)]', className)}>
      {!compact ? (
        <>
          <p className="text-[13px] font-black leading-5 text-[#0B1F5B]">Inicia sesion o crea tu cuenta para participar.</p>
          <p className="mt-1 text-[12px] font-semibold leading-5 text-[#637295]">
            Al entrar podras ver enlaces, abrir botones de accion, marcar Yo voy y guardar publicaciones.
          </p>
        </>
      ) : (
        <p className="text-[12px] font-black leading-4 text-[#0B1F5B]">Ingresa para participar y ver acciones.</p>
      )}

      <div className={cx('grid gap-2', compact ? 'mt-2 grid-cols-2' : 'mt-3 grid-cols-2')}>
        <button
          type="button"
          onClick={() => onAuthRequired?.('login')}
          className="h-10 rounded-[12px] bg-[#0B1F5B] px-3 text-[12px] font-black text-white shadow-[0_10px_22px_rgba(11,31,91,0.18)] transition hover:bg-[#145CFF]"
        >
          Iniciar sesion
        </button>
        <button
          type="button"
          onClick={() => onAuthRequired?.('register')}
          className="h-10 rounded-[12px] border border-[#BFD0EA] bg-white px-3 text-[12px] font-black text-[#145CFF] transition hover:bg-[#EAF2FF]"
        >
          Registrarme
        </button>
      </div>
    </div>
  );
}

function EventMeta({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <Icon size={14} className="shrink-0 text-[#566987]" />
      <span className="truncate">{label}</span>
    </span>
  );
}

function EventInfoTile({
  icon: Icon,
  label,
  value,
  subvalue,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  subvalue?: string;
}) {
  return (
    <div className="flex min-h-[76px] items-center gap-3 border-b border-[#E0E7F0] px-3 py-3 last:border-b-0">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#145CFF] shadow-[0_8px_18px_rgba(20,92,255,0.12)]">
        <Icon size={18} />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-black uppercase text-[#62718A]">{label}</span>
        <span className="mt-0.5 block break-words text-[12px] font-black leading-4 text-[#101827]">{value}</span>
        {subvalue ? <span className="mt-0.5 block truncate text-[11px] font-semibold text-[#667085]">{subvalue}</span> : null}
      </span>
    </div>
  );
}

function EventGoingButton({
  publication,
  busy,
  compact,
  onClick,
}: {
  publication: SoyibaPublication;
  busy: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  const disabled = busy || publication.event.expired || (!publication.event.currentUserGoing && publication.event.capacityAvailable <= 0);
  const active = publication.event.currentUserGoing;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-[13px] text-sm font-black text-white shadow-[0_12px_24px_rgba(5,150,105,0.2)] transition disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none',
        compact ? 'h-10 px-3 text-[12px]' : 'h-11 px-5',
        active ? 'bg-[#07865B] hover:bg-[#04724D]' : 'bg-[#145CFF] hover:bg-[#0B4BE0]',
      )}
    >
      {busy ? <LoaderCircle size={compact ? 15 : 17} className="animate-spin" /> : <UserCheck size={compact ? 15 : 17} />}
      {active ? 'Voy' : 'Yo voy'}
    </button>
  );
}

function PublicationCard({
  publication,
  menuOpen,
  canManage,
  publicMode,
  onMenuToggle,
  onShare,
  onEdit,
  onDelete,
  onToggleSave,
  onOpenEvent,
  onOpenEco,
  onOpenDetails,
  onAuthRequired,
  onOpenImage,
}: {
  publication: SoyibaPublication;
  menuOpen: boolean;
  canManage: boolean;
  publicMode: boolean;
  onMenuToggle: () => void;
  onShare: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleSave: () => void;
  onOpenEvent?: () => void;
  onOpenEco?: () => void;
  onOpenDetails: () => void;
  onAuthRequired?: (mode: 'login' | 'register') => void;
  onOpenImage: (preview: ImagePreview) => void;
}) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const descriptionIsLong = publication.description.length > 145 || publication.description.split(/\r?\n/).length > 2;
  const ctaUrl = getPublicationCtaUrl(publication);

  return (
    <article
      id={`publicacion-${publication.id}`}
      className="overflow-hidden rounded-[18px] border border-[#DCE5F2] bg-white shadow-[0_18px_42px_rgba(15,23,42,0.09)]"
    >
      <header className="flex items-center gap-3 px-4 py-3">
        <AuthorAvatar publication={publication} />

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-black leading-5 text-[#101827]">{publication.author.name}</h3>
          <p className="text-[12px] font-semibold leading-4 text-[#667085]">{formatRelativeTime(publication.createdAt)}</p>
        </div>

        <span className="shrink-0 rounded-full bg-[#EEF1F6] px-3 py-2 text-[11px] font-black uppercase tracking-normal text-[#1F2937]">
          {publication.type}
        </span>

        {!publicMode ? (
        <div className="relative">
          <button
            type="button"
            aria-label="Opciones de publicacion"
            onClick={onMenuToggle}
            className="grid h-10 w-9 place-items-center rounded-full text-[#0B1F5B] transition hover:bg-[#F2F5FA]"
          >
            <MoreVertical size={22} />
          </button>

          <AnimatePresence>
            {menuOpen ? (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                className="absolute right-0 top-11 z-20 w-44 overflow-hidden rounded-[14px] border border-[#DCE5F2] bg-white py-1 shadow-[0_18px_42px_rgba(15,23,42,0.16)]"
              >
                <MenuAction icon={Share2} label="Compartir" onClick={onShare} />
                {canManage ? <MenuAction icon={PencilLine} label="Editar" onClick={onEdit} /> : null}
                {canManage ? <MenuAction icon={Trash2} label="Eliminar" danger onClick={onDelete} /> : null}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        ) : null}
      </header>

      <PublicationMediaCarousel publication={publication} allowExternalOpen={!publicMode} onOpenImage={onOpenImage} />

      <div className="px-4 pb-4 pt-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3 text-[#253047]">
            {publicMode ? (
              <Stat icon={Bookmark} value={publication.savedCount} label="Guardados" />
            ) : (
              <StatButton
                active={publication.savedByCurrentUser}
                icon={Bookmark}
                value={publication.savedCount}
                label="Guardados"
                onClick={onToggleSave}
              />
            )}
            <Stat icon={Eye} value={publication.viewsCount} label="Views" />
            {publicMode ? (
              <Stat icon={Share2} value={publication.sharedCount} label="Compartidos" />
            ) : (
              <button type="button" onClick={onShare} className="inline-flex items-center gap-1.5 text-sm font-bold text-[#253047]">
                <Share2 className={statsIconClass} />
                <span>{formatCount(publication.sharedCount)}</span>
              </button>
            )}
          </div>

          {onOpenEvent ? (
            <button
              type="button"
              onClick={onOpenEvent}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-[12px] bg-[#0B1F5B] px-4 text-sm font-black text-white shadow-[0_12px_24px_rgba(11,31,91,0.18)] transition hover:bg-[#145CFF]"
            >
              Ver evento
            </button>
          ) : onOpenEco ? (
            <button
              type="button"
              onClick={onOpenEco}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-[12px] bg-[#087A57] px-4 text-sm font-black text-white shadow-[0_12px_24px_rgba(8,122,87,0.2)] transition hover:bg-[#066347]"
            >
              Ver Grupo ECO
            </button>
          ) : !publicMode && ctaUrl ? (
            <a
              href={ctaUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[12px] bg-[#5B6577] px-4 text-sm font-black text-white shadow-[0_12px_24px_rgba(31,41,55,0.18)] transition hover:bg-[#3F4857]"
            >
              {getPublicationCtaLabel(publication)}
              <ExternalLink size={17} />
            </a>
          ) : null}
        </div>

        <h3 className="mt-4 text-[16px] font-black leading-6 text-[#101827]">{publication.title}</h3>
        {publication.description ? (
          <div className="mt-2">
            <p className={cx('text-[14px] font-medium leading-6 text-[#202B3C] whitespace-pre-line', !descriptionExpanded && 'line-clamp-2')}>
              {publication.description}
            </p>
            {descriptionIsLong ? (
              <button
                type="button"
                onClick={() => setDescriptionExpanded((current) => !current)}
                className="mt-1 text-[14px] font-black text-[#145CFF]"
              >
                {descriptionExpanded ? 'Ver menos' : 'Ver mas'}
              </button>
            ) : null}
          </div>
        ) : null}

        {!onOpenEvent && !onOpenEco ? (
          <button type="button" onClick={onOpenDetails} className="mt-3 text-[14px] font-black text-[#145CFF]">
            Ver detalles
          </button>
        ) : null}

        {publicMode ? (
          <PublicAuthGate className="mt-4" onAuthRequired={onAuthRequired} />
        ) : null}

        {!publicMode && publication.relatedLinks.length ? (
          <div className="mt-4 space-y-2">
            {publication.relatedLinks.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-[64px] items-center gap-3 rounded-[14px] border border-[#E0E7F0] bg-[#FAFCFF] px-3 py-2 shadow-[0_8px_18px_rgba(15,23,42,0.04)]"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-[#FFF1F1] text-[#E03131]">
                  <FileText size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-black text-[#101827]">{link.title}</span>
                  <span className="mt-0.5 block truncate text-[11px] font-bold text-[#667085]">{hostFromUrl(link.url)}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-black text-[#1F2544]">
                  Abrir
                  <ExternalLink size={16} />
                </span>
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function PublicationMediaCarousel({
  publication,
  allowExternalOpen = true,
  onOpenImage,
}: {
  publication: SoyibaPublication;
  allowExternalOpen?: boolean;
  onOpenImage: (preview: ImagePreview) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [carouselDirection, setCarouselDirection] = useState(1);
  const touchStartX = useRef(0);
  const prefersReducedMotion = useReducedMotion();
  const items = publication.mediaItems;
  const hasMany = items.length > 1;
  const activeItem = items[Math.min(activeIndex, Math.max(0, items.length - 1))];

  useEffect(() => {
    setActiveIndex(0);
  }, [publication.id, items.length]);

  if (!activeItem) {
    return (
      <div className="grid aspect-[16/8.5] place-items-center bg-[#EFF4FB] text-[#52637C]">
        <ImageIcon size={34} />
      </div>
    );
  }

  function goTo(step: number) {
    setCarouselDirection(step >= 0 ? 1 : -1);
    setActiveIndex((current) => {
      const next = current + step;

      if (next < 0) return items.length - 1;
      if (next >= items.length) return 0;
      return next;
    });
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartX.current = event.touches[0]?.clientX || 0;
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const endX = event.changedTouches[0]?.clientX || 0;
    const delta = touchStartX.current - endX;

    if (Math.abs(delta) > 42) {
      goTo(delta > 0 ? 1 : -1);
    }
  }

  return (
    <div className="relative bg-[#071426]" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div
        className={cx(
          'w-full overflow-hidden bg-black',
          activeItem.type === 'driveVideo' ? 'aspect-[4/5] min-[560px]:aspect-video' : 'aspect-[16/8.5]',
        )}
      >
        <div className="relative h-full w-full">
          <AnimatePresence initial={false} custom={carouselDirection}>
            <motion.div
              key={`${activeItem.id}-${activeIndex}`}
              custom={carouselDirection}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: carouselDirection > 0 ? 36 : -36, scale: 0.985 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: carouselDirection > 0 ? -36 : 36, scale: 0.985 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              <PublicationMedia item={activeItem} publicationTitle={publication.title} allowExternalOpen={allowExternalOpen} onOpenImage={onOpenImage} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {hasMany ? (
        <>
          <span className="absolute right-3 top-3 rounded-full bg-black/82 px-3 py-1 text-[12px] font-black text-white">
            {activeIndex + 1}/{items.length}
          </span>
          <CarouselButton label="Anterior" icon={ChevronLeft} className="left-3" onClick={() => goTo(-1)} />
          <CarouselButton label="Siguiente" icon={ChevronRight} className="right-3" onClick={() => goTo(1)} />
        </>
      ) : null}
    </div>
  );
}

function PublicationMedia({
  item,
  publicationTitle,
  allowExternalOpen,
  onOpenImage,
}: {
  item: PublicationMediaItem;
  publicationTitle: string;
  allowExternalOpen: boolean;
  onOpenImage: (preview: ImagePreview) => void;
}) {
  if (item.type === 'youtube') {
    return (
      <iframe
        className="h-full w-full"
        src={getYouTubeEmbedUrl(item.url)}
        title={item.title || publicationTitle}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }

  if (item.type === 'spotify') {
    return (
      <div className="flex h-full items-center bg-[#0F172A] p-3">
        <iframe
          className="h-[152px] w-full rounded-[12px]"
          src={getSpotifyEmbedUrl(item.url)}
          title={item.title || publicationTitle}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      </div>
    );
  }

  if (item.type === 'driveVideo') {
    if (!item.url.includes('drive.google.com')) {
      return (
        <video className="h-full w-full bg-black object-contain" src={item.url} title={item.title || publicationTitle} controls playsInline />
      );
    }

    return <DriveVideoPlayer url={item.url} title={item.title || publicationTitle} allowExternalOpen={allowExternalOpen} />;
  }

  const sources = getGoogleDriveImageCandidates(item.url);
  const src = sources[0] || getGoogleDriveImageUrl(item.url);
  const title = item.title || publicationTitle;

  return (
    <button
      type="button"
      onClick={() => onOpenImage({ src, sources, title })}
      className="block h-full w-full cursor-zoom-in"
    >
      <PublicationDriveImage sources={sources} alt={title} className="h-full w-full object-cover" loading="lazy" />
    </button>
  );
}

function PublicationDriveImage({
  sources,
  alt,
  className,
  loading = 'lazy',
}: {
  sources: string[];
  alt: string;
  className: string;
  loading?: 'eager' | 'lazy';
}) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const [hasFailed, setHasFailed] = useState(false);
  const sourceKey = sources.join('|');
  const src = sources[sourceIndex] || '';

  useEffect(() => {
    setSourceIndex(0);
    setHasFailed(false);
  }, [sourceKey]);

  function handleImageError() {
    if (sourceIndex < sources.length - 1) {
      setSourceIndex(sourceIndex + 1);
      return;
    }

    setHasFailed(true);
  }

  if (!src || hasFailed) {
    return (
      <div className={cx('grid place-items-center bg-[#EFF4FB] text-[#52637C]', className)}>
        <ImageIcon size={34} />
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} loading={loading} onError={handleImageError} />;
}

function DriveVideoPlayer({ url, title, allowExternalOpen }: { url: string; title: string; allowExternalOpen: boolean }) {
  const directUrl = getGoogleDriveDownloadUrl(url);
  const previewUrl = getGoogleDrivePreviewUrl(url);
  const fileUrl = getGoogleDriveFileUrl(url);
  const [mode, setMode] = useState<'direct' | 'preview'>(directUrl ? 'direct' : 'preview');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setMode(directUrl ? 'direct' : 'preview');
    setReloadKey(0);
  }, [directUrl, previewUrl]);

  if (mode === 'direct' && directUrl) {
    return (
      <div className="relative h-full w-full bg-black">
        <video
          key={`${directUrl}-${reloadKey}`}
          className="h-full w-full object-contain"
          src={directUrl}
          title={title}
          controls
          playsInline
          preload="metadata"
          onError={() => setMode('preview')}
        />
        {allowExternalOpen ? (
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Abrir video en Drive"
            title="Abrir video en Drive"
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/70 text-white backdrop-blur"
          >
            <ExternalLink size={16} />
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-black">
      <iframe key={`${previewUrl}-${reloadKey}`} className="h-full w-full" src={previewUrl} title={title} allow="autoplay" allowFullScreen />
      <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-[12px] bg-black/78 px-3 py-2 text-white shadow-[0_14px_32px_rgba(0,0,0,0.22)] backdrop-blur">
        <p className="min-w-0 flex-1 text-[11px] font-bold leading-4">Drive esta procesando el video. Puede tardar unos minutos.</p>
        <button
          type="button"
          aria-label="Reintentar video"
          title="Reintentar video"
          onClick={() => setReloadKey((current) => current + 1)}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/14 text-white transition hover:bg-white/24"
        >
          <RefreshCw size={15} />
        </button>
        {allowExternalOpen ? (
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Abrir video en Drive"
            title="Abrir video en Drive"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/14 text-white transition hover:bg-white/24"
          >
            <ExternalLink size={15} />
          </a>
        ) : null}
      </div>
    </div>
  );
}

function PublicationComposerModal({
  session,
  publication,
  permittedTypes,
  saving,
  onClose,
  onSave,
}: {
  session: SoyibaSession;
  publication: SoyibaPublication | null;
  permittedTypes: PublicationType[];
  saving: boolean;
  onClose: () => void;
  onSave: (payload: PublicationPayload) => Promise<void>;
}) {
  const [form, setForm] = useState<PublicationFormState>(() => buildFormState(publication, permittedTypes));
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const typeOptions = permittedTypes.includes(form.type) ? permittedTypes : [form.type, ...permittedTypes];
  const busy = saving || isSubmitting;

  function updateField<K extends keyof PublicationFormState>(field: K, value: PublicationFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit() {
    setError('');

    if (!form.title.trim()) {
      setError('El titulo es requerido.');
      return;
    }

    if (form.type === 'Evento') {
      if (!form.eventDateTime.trim() || !form.eventPlace.trim() || !form.eventValidFrom.trim() || !form.eventValidUntil.trim()) {
        setError('Completa fecha, lugar y vigencia del evento.');
        return;
      }

      if (numberFromInput(form.eventCapacityTotal) <= 0) {
        setError('Ingresa los cupos totales del evento.');
        return;
      }
    }

    if (form.type === 'Grupo ECO') {
      if (!form.ecoDay.trim() || !form.ecoTime.trim() || !form.ecoNeighborhood.trim() || !form.ecoHost.trim() || !form.ecoModerator.trim()) {
        setError('Completa dia, hora, barrio, anfitrion y moderador del Grupo ECO.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let imageUrl = form.imageUrl.trim();
      let videoUrl = form.videoUrl.trim();

      if (form.imageFile) {
        const uploadedImage = await uploadPublicationMedia(session, form.imageFile, 'image');
        imageUrl = uploadedImage.url;
      }

      if (form.videoFile) {
        const uploadedVideo = await uploadPublicationMedia(session, form.videoFile, 'driveVideo');
        videoUrl = uploadedVideo.url;
      }

      const payload: PublicationPayload = {
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim(),
        mediaItems: buildPublicationMediaItems({
          imageUrl,
          videoUrl,
          songUrl: form.songUrl,
        }),
        cta: buildCtaPayload(form),
        relatedLinks: parseRelatedLinksInput(form.relatedLinksInput),
        event:
          form.type === 'Evento'
            ? {
                dateTime: dateTimeInputToIso(form.eventDateTime),
                place: form.eventPlace.trim(),
                validFrom: dateTimeInputToIso(form.eventValidFrom),
                validUntil: dateTimeInputToIso(form.eventValidUntil),
                capacityTotal: numberFromInput(form.eventCapacityTotal),
              }
            : undefined,
        eco:
          form.type === 'Grupo ECO'
            ? {
                day: form.ecoDay.trim(),
                time: form.ecoTime.trim(),
                host: form.ecoHost.trim(),
                moderator: form.ecoModerator.trim(),
                phone: form.ecoPhone.trim(),
                address: form.ecoAddress.trim(),
                neighborhood: form.ecoNeighborhood.trim(),
                city: form.ecoCity.trim(),
                latitude: geoNumberFromInput(form.ecoLatitude),
                longitude: geoNumberFromInput(form.ecoLongitude),
                validFrom: dateTimeInputToIso(form.ecoValidFrom),
                validUntil: dateTimeInputToIso(form.ecoValidUntil),
              }
            : undefined,
      };

      await onSave(payload);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No fue posible guardar la publicacion.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex h-[100dvh] items-end justify-center overflow-hidden bg-[#0B1F5B]/32 px-3 pb-[calc(12px+env(safe-area-inset-bottom))] pt-[calc(12px+env(safe-area-inset-top))] backdrop-blur-sm min-[560px]:items-center"
      onMouseDown={onClose}
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        className="flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-[20px] border border-white/80 bg-white shadow-[0_26px_70px_rgba(11,31,91,0.24)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex h-14 items-center justify-between border-b border-[#E3EAF5] px-4">
          <h2 className="text-sm font-black text-[#0B1F5B]">{publication ? 'Editar publicacion' : 'Crear publicacion'}</h2>
          <button type="button" aria-label="Cerrar" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-[#0B1F5B] hover:bg-[#EAF2FF]">
            <X size={20} />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#F8FBFF] p-3.5">
          <div className="grid gap-3 min-[520px]:grid-cols-2">
            <SelectField label="Tipo" value={form.type} onChange={(value) => updateField('type', value as PublicationType)} options={typeOptions} />
            <TextField label="Titulo" value={form.title} onChange={(value) => updateField('title', value)} icon={FileText} />
          </div>

          <TextAreaField label="Descripcion" value={form.description} onChange={(value) => updateField('description', value)} rows={4} />

          {form.type === 'Evento' ? (
            <div className="grid gap-3 rounded-[14px] border border-[#DCE6F5] bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)] min-[520px]:grid-cols-2">
              <TextField
                label="Fecha y hora del evento"
                value={form.eventDateTime}
                onChange={(value) => updateField('eventDateTime', value)}
                icon={CalendarDays}
                type="datetime-local"
              />
              <TextField
                label="Lugar del evento"
                value={form.eventPlace}
                onChange={(value) => updateField('eventPlace', value)}
                icon={MapPin}
                placeholder="Auditorio IBA"
              />
              <TextField
                label="Inicio de vigencia"
                value={form.eventValidFrom}
                onChange={(value) => updateField('eventValidFrom', value)}
                icon={Clock3}
                type="datetime-local"
              />
              <TextField
                label="Fecha de caducidad"
                value={form.eventValidUntil}
                onChange={(value) => updateField('eventValidUntil', value)}
                icon={Clock3}
                type="datetime-local"
              />
              <TextField
                label="Cupos totales"
                value={form.eventCapacityTotal}
                onChange={(value) => updateField('eventCapacityTotal', value)}
                icon={UsersRound}
                type="number"
                placeholder="40"
              />
            </div>
          ) : null}

          {form.type === 'Grupo ECO' ? (
            <div className="grid gap-3 rounded-[14px] border border-[#D6F5E7] bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)] min-[520px]:grid-cols-2">
              <TextField label="Dia de reunion" value={form.ecoDay} onChange={(value) => updateField('ecoDay', value)} icon={CalendarDays} placeholder="Viernes" />
              <TextField label="Hora de reunion" value={form.ecoTime} onChange={(value) => updateField('ecoTime', value)} icon={Clock3} placeholder="7:00 p.m." />
              <TextField label="Anfitrion" value={form.ecoHost} onChange={(value) => updateField('ecoHost', value)} icon={House} placeholder="Nombre del anfitrion" />
              <TextField label="Moderador" value={form.ecoModerator} onChange={(value) => updateField('ecoModerator', value)} icon={UserCheck} placeholder="Nombre del moderador" />
              <TextField label="Telefono de contacto" value={form.ecoPhone} onChange={(value) => updateField('ecoPhone', value)} icon={Phone} type="tel" placeholder="+57..." />
              <TextField label="Barrio o sector" value={form.ecoNeighborhood} onChange={(value) => updateField('ecoNeighborhood', value)} icon={MapPin} placeholder="Barrio" />
              <TextField label="Ciudad" value={form.ecoCity} onChange={(value) => updateField('ecoCity', value)} icon={MapPinned} placeholder="Ibague" />
              <TextField label="Direccion o punto de encuentro" value={form.ecoAddress} onChange={(value) => updateField('ecoAddress', value)} icon={Navigation} placeholder="Direccion o referencia" />
              <TextField label="Latitud" value={form.ecoLatitude} onChange={(value) => updateField('ecoLatitude', value)} icon={Compass} type="number" placeholder="4.4389" />
              <TextField label="Longitud" value={form.ecoLongitude} onChange={(value) => updateField('ecoLongitude', value)} icon={Compass} type="number" placeholder="-75.2322" />
              <TextField label="Inicio de vigencia" value={form.ecoValidFrom} onChange={(value) => updateField('ecoValidFrom', value)} icon={Clock3} type="datetime-local" />
              <TextField label="Fin de vigencia" value={form.ecoValidUntil} onChange={(value) => updateField('ecoValidUntil', value)} icon={Clock3} type="datetime-local" />
            </div>
          ) : null}

          <MediaUrlField
            label="Imagen"
            value={form.imageUrl}
            selectedFile={form.imageFile}
            icon={ImageIcon}
            accept="image/*"
            placeholder="URL de imagen o archivo desde tu dispositivo"
            onChange={(value) => updateField('imageUrl', value)}
            onFileChange={(file) => updateField('imageFile', file)}
          />

          <MediaUrlField
            label="Video"
            value={form.videoUrl}
            selectedFile={form.videoFile}
            icon={Video}
            accept="video/*"
            placeholder="URL de YouTube, Drive o archivo desde tu dispositivo"
            onChange={(value) => updateField('videoUrl', value)}
            onFileChange={(file) => updateField('videoFile', file)}
          />

          <TextField
            label="Cancion"
            value={form.songUrl}
            onChange={(value) => updateField('songUrl', value)}
            icon={Music2}
            type="url"
            placeholder="URL de Spotify"
          />

          <div className="grid gap-3 min-[520px]:grid-cols-2">
            <SelectField
              label="Boton"
              value={form.ctaType}
              onChange={(value) => updateField('ctaType', value as PublicationCtaType)}
              options={[...PUBLICATION_CTA_TYPES]}
            />

            {form.ctaType === 'Whatsapp' ? (
              <TextField
                label="Numero Whatsapp"
                value={form.ctaPhone}
                onChange={(value) => updateField('ctaPhone', value)}
                icon={MessageCircle}
                type="tel"
                placeholder="Opcional"
              />
            ) : form.ctaType === 'Ninguno' ? (
              <div className="hidden min-[520px]:block" />
            ) : (
              <TextField
                label="Enlace"
                value={form.ctaUrl}
                onChange={(value) => updateField('ctaUrl', value)}
                icon={LinkIcon}
                type="url"
                placeholder="Opcional"
              />
            )}
          </div>

          <TextAreaField
            label="Enlaces relacionados"
            value={form.relatedLinksInput}
            onChange={(value) => updateField('relatedLinksInput', value)}
            rows={3}
            placeholder="Guia de estudio|https://..."
          />

          {error ? <p className="rounded-[10px] bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700">{error}</p> : null}
        </div>

        <footer className="grid grid-cols-2 gap-3 border-t border-[#E3EAF5] bg-white p-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-11 rounded-[12px] border border-[#CBD8EA] bg-white text-xs font-black text-[#51617A] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[#0B1F5B] px-4 text-xs font-black text-white shadow-[0_12px_26px_rgba(11,31,91,0.24)] disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />}
            Guardar
          </button>
        </footer>
      </motion.section>
    </motion.div>
  );
}

function TextField({
  label,
  value,
  onChange,
  icon: Icon,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon?: LucideIcon;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[10px] font-black text-[#52637C]">{label}</span>
      <span className="flex h-11 items-center gap-2 rounded-[10px] border border-[#DCE6F5] bg-white px-3 text-xs font-bold text-[#0B1F5B] shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition focus-within:border-[#145CFF] focus-within:ring-4 focus-within:ring-blue-100">
        {Icon ? <Icon size={16} className="shrink-0 text-[#8A99AE]" /> : null}
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#98A1BD]"
        />
      </span>
    </label>
  );
}

function MediaUrlField({
  label,
  value,
  selectedFile,
  icon: Icon,
  accept,
  placeholder,
  onChange,
  onFileChange,
}: {
  label: string;
  value: string;
  selectedFile: File | null;
  icon: LucideIcon;
  accept: string;
  placeholder: string;
  onChange: (value: string) => void;
  onFileChange: (file: File | null) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="block">
      <span className="mb-1.5 block text-[10px] font-black text-[#52637C]">{label}</span>
      <div className="grid gap-2 min-[520px]:grid-cols-[minmax(0,1fr)_auto]">
        <span className="flex h-11 min-w-0 items-center gap-2 rounded-[10px] border border-[#DCE6F5] bg-white px-3 text-xs font-bold text-[#0B1F5B] shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition focus-within:border-[#145CFF] focus-within:ring-4 focus-within:ring-blue-100">
          <Icon size={16} className="shrink-0 text-[#8A99AE]" />
          <input
            type="url"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#98A1BD]"
          />
        </span>

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => onFileChange(event.target.files?.[0] || null)}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[#BFD0EA] bg-white px-3 text-xs font-black text-[#145CFF] shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:bg-[#EAF2FF]"
        >
          <UploadCloud size={16} />
          Cargar
        </button>
      </div>

      {selectedFile ? (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-[10px] bg-[#EAF2FF] px-3 py-2 text-[11px] font-bold text-[#0B1F5B]">
          <span className="min-w-0 truncate">{selectedFile.name}</span>
          <button type="button" onClick={() => onFileChange(null)} className="shrink-0 text-[#D92D2D]">
            Quitar
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[10px] font-black text-[#52637C]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-11 w-full rounded-[10px] border border-[#DCE6F5] bg-white px-3 text-xs font-black text-[#0B1F5B] shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition focus:border-[#145CFF] focus:ring-4 focus:ring-blue-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {formatSelectOption(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatSelectOption(option: string) {
  return option === 'Ninguno' ? 'Sin boton' : option;
}

function TextAreaField({
  label,
  value,
  onChange,
  rows,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-black text-[#52637C]">{label}</span>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-none rounded-[10px] border border-[#DCE6F5] bg-white px-3 py-3 text-xs font-semibold leading-5 text-[#0B1F5B] shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-[#98A1BD] focus:border-[#145CFF] focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}

function ImageLightbox({ preview, onClose }: { preview: ImagePreview; onClose: () => void }) {
  const sources = preview.sources?.length ? preview.sources : [preview.src];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex flex-col bg-black/88 p-4"
      onClick={onClose}
    >
      <div className="mx-auto flex h-12 w-full max-w-3xl items-center justify-between gap-3 text-white">
        <h2 className="min-w-0 truncate text-sm font-black">{preview.title}</h2>
        <button type="button" aria-label="Cerrar imagen" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/12">
          <X size={22} />
        </button>
      </div>
      <div className="grid min-h-0 flex-1 place-items-center">
        <div className="grid max-h-full max-w-full place-items-center" onClick={(event) => event.stopPropagation()}>
          <PublicationDriveImage sources={sources} alt={preview.title} className="max-h-full max-w-full rounded-[12px] object-contain" loading="eager" />
        </div>
      </div>
    </motion.div>
  );
}

function AuthorAvatar({ publication }: { publication: SoyibaPublication }) {
  if (publication.author.photoUrl) {
    return <img src={publication.author.photoUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-[#EEF2F7]" />;
  }

  return (
    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#EAF2FF] text-sm font-black text-[#145CFF] ring-2 ring-[#EEF2F7]">
      {publication.author.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() || 'SI'}
    </div>
  );
}

function MenuAction({ icon: Icon, label, danger, onClick }: { icon: LucideIcon; label: string; danger?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx('flex h-10 w-full items-center gap-2 px-3 text-left text-xs font-black transition hover:bg-[#F5F8FC]', danger ? 'text-[#D92D2D]' : 'text-[#0B1F5B]')}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}

function CarouselButton({ icon: Icon, label, className, onClick }: { icon: LucideIcon; label: string; className: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cx('absolute top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/92 text-[#101827] shadow-[0_10px_24px_rgba(0,0,0,0.18)]', className)}
    >
      <Icon size={22} />
    </button>
  );
}

function Stat({ icon: Icon, value, label }: { icon: LucideIcon; value: number; label: string }) {
  return (
    <span aria-label={label} className="inline-flex items-center gap-1.5 text-sm font-bold text-[#253047]">
      <Icon className={statsIconClass} />
      <span>{formatCount(value)}</span>
    </span>
  );
}

function StatButton({ icon: Icon, value, label, active, onClick }: { icon: LucideIcon; value: number; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cx('inline-flex items-center gap-1.5 text-sm font-bold transition', active ? 'text-[#145CFF]' : 'text-[#253047]')}
    >
      <Icon className={cx(statsIconClass, active && 'fill-current')} />
      <span>{formatCount(value)}</span>
    </button>
  );
}

function buildFormState(publication: SoyibaPublication | null, permittedTypes: PublicationType[]): PublicationFormState {
  const fallbackType = permittedTypes[0] || 'Publicacion';

  if (!publication) {
    return {
      type: fallbackType,
      title: '',
      description: '',
      imageUrl: '',
      imageFile: null,
      videoUrl: '',
      videoFile: null,
      songUrl: '',
      ctaType: 'Ninguno',
      ctaUrl: '',
      ctaPhone: '',
      relatedLinksInput: '',
      eventDateTime: '',
      eventPlace: '',
      eventValidFrom: '',
      eventValidUntil: '',
      eventCapacityTotal: '',
      ecoDay: '',
      ecoTime: '',
      ecoHost: '',
      ecoModerator: '',
      ecoPhone: '',
      ecoAddress: '',
      ecoNeighborhood: '',
      ecoCity: '',
      ecoLatitude: '',
      ecoLongitude: '',
      ecoValidFrom: '',
      ecoValidUntil: '',
    };
  }

  const mediaValues = getMediaFormValues(publication.mediaItems);

  return {
    type: publication.type,
    title: publication.title,
    description: publication.description,
    imageUrl: mediaValues.imageUrl,
    imageFile: null,
    videoUrl: mediaValues.videoUrl,
    videoFile: null,
    songUrl: mediaValues.songUrl,
    ctaType: publication.cta.type,
    ctaUrl: publication.cta.url || '',
    ctaPhone: publication.cta.phone || '',
    relatedLinksInput: serializeRelatedLinksInput(publication.relatedLinks),
    eventDateTime: toDateTimeInputValue(publication.event.dateTime),
    eventPlace: publication.event.place,
    eventValidFrom: toDateTimeInputValue(publication.event.validFrom),
    eventValidUntil: toDateTimeInputValue(publication.event.validUntil),
    eventCapacityTotal: publication.event.capacityTotal ? String(publication.event.capacityTotal) : '',
    ecoDay: publication.eco.day,
    ecoTime: publication.eco.time,
    ecoHost: publication.eco.host,
    ecoModerator: publication.eco.moderator,
    ecoPhone: publication.eco.phone,
    ecoAddress: publication.eco.address,
    ecoNeighborhood: publication.eco.neighborhood,
    ecoCity: publication.eco.city,
    ecoLatitude: publication.eco.latitude === null ? '' : String(publication.eco.latitude),
    ecoLongitude: publication.eco.longitude === null ? '' : String(publication.eco.longitude),
    ecoValidFrom: toDateTimeInputValue(publication.eco.validFrom),
    ecoValidUntil: toDateTimeInputValue(publication.eco.validUntil),
  };
}

function buildCtaPayload(form: PublicationFormState): PublicationPayload['cta'] {
  if (form.ctaType === 'Whatsapp') {
    const phone = form.ctaPhone.trim();
    return phone ? { type: 'Whatsapp', phone } : { type: 'Ninguno' };
  }

  if (form.ctaType === 'Enlace' || form.ctaType === 'Inscripcion') {
    const url = form.ctaUrl.trim();
    return url ? { type: form.ctaType, url } : { type: 'Ninguno' };
  }

  return { type: 'Ninguno' };
}

function mergeActivityStats(updated: SoyibaPublication, current: SoyibaPublication) {
  return {
    ...updated,
    savedCount: current.savedCount,
    viewsCount: current.viewsCount,
    sharedCount: current.sharedCount,
    savedByCurrentUser: current.savedByCurrentUser,
    event: {
      ...updated.event,
      currentUserGoing: current.event.currentUserGoing,
    },
    eco: {
      ...updated.eco,
      currentUserAttending: current.eco.currentUserAttending,
    },
  };
}

function mergeServerPublication(updated: SoyibaPublication, current: SoyibaPublication) {
  return {
    ...updated,
    savedCount: current.savedCount,
    viewsCount: current.viewsCount,
    sharedCount: current.sharedCount,
    savedByCurrentUser: current.savedByCurrentUser,
  };
}

function sortPublications(items: SoyibaPublication[]) {
  return [...items].sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt));
}

function buildPublicationShareUrl(publication: SoyibaPublication) {
  const screen = publication.type === 'Evento' ? 'eventos' : publication.type === 'Grupo ECO' ? 'eco' : 'inicio';
  return `${window.location.origin}${window.location.pathname}#${screen}/publicacion-${encodeURIComponent(publication.id)}`;
}

function filterEventsByStatus(publications: SoyibaPublication[], status: 'proximos' | 'todos' | 'pasados') {
  if (status === 'todos') {
    return publications;
  }

  return publications.filter((publication) => {
    const past = isEventPast(publication);
    return status === 'pasados' ? past : !past;
  });
}

function isEventPast(publication: SoyibaPublication) {
  if (publication.event.expired) {
    return true;
  }

  const timestamp = Date.parse(publication.event.dateTime);
  return Number.isFinite(timestamp) && timestamp < Date.now();
}

function sortEcoPublicationsByDistance(publications: SoyibaPublication[], userLocation: GeoPoint | null) {
  if (!userLocation) {
    return publications;
  }

  return [...publications].sort((first, second) => {
    const firstDistance = getEcoDistanceKm(first, userLocation);
    const secondDistance = getEcoDistanceKm(second, userLocation);

    if (firstDistance === null && secondDistance === null) {
      return Date.parse(second.createdAt) - Date.parse(first.createdAt);
    }

    if (firstDistance === null) return 1;
    if (secondDistance === null) return -1;
    return firstDistance - secondDistance;
  });
}

function getEcoDistanceKm(publication: SoyibaPublication, userLocation: GeoPoint | null) {
  const coordinates = getEcoCoordinates(publication);

  if (!coordinates || !userLocation) {
    return null;
  }

  return haversineDistanceKm(userLocation, coordinates);
}

function hasEcoCoordinates(publication: SoyibaPublication) {
  return getEcoCoordinates(publication) !== null;
}

function getEcoCoordinates(publication: SoyibaPublication): GeoPoint | null {
  if (publication.eco.latitude === null || publication.eco.longitude === null) {
    return null;
  }

  return {
    latitude: publication.eco.latitude,
    longitude: publication.eco.longitude,
  };
}

function formatEcoLocation(publication: SoyibaPublication) {
  return [publication.eco.neighborhood, publication.eco.city].filter(Boolean).join(', ');
}

function formatDistance(value: number) {
  if (value < 1) {
    return `${Math.max(1, Math.round(value * 1000))} m`;
  }

  return `${value.toFixed(value < 10 ? 1 : 0)} km`;
}

function buildGoogleMapsUrl(publication: SoyibaPublication) {
  const coordinates = getEcoCoordinates(publication);

  if (coordinates) {
    return `https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`;
  }

  const query = [publication.eco.address, publication.eco.neighborhood, publication.eco.city].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || publication.title)}`;
}

function buildStreetViewUrl(publication: SoyibaPublication) {
  const coordinates = getEcoCoordinates(publication);

  if (!coordinates) {
    return buildGoogleMapsUrl(publication);
  }

  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${coordinates.latitude},${coordinates.longitude}`;
}

function buildGoogleMapEmbedUrl(publication: SoyibaPublication) {
  const coordinates = getEcoCoordinates(publication);
  const query = coordinates
    ? `${coordinates.latitude},${coordinates.longitude}`
    : [publication.eco.address, publication.eco.neighborhood, publication.eco.city].filter(Boolean).join(', ') || publication.title;

  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;
}

function haversineDistanceKm(from: GeoPoint, to: GeoPoint) {
  const earthRadiusKm = 6371;
  const deltaLatitude = degreesToRadians(to.latitude - from.latitude);
  const deltaLongitude = degreesToRadians(to.longitude - from.longitude);
  const fromLatitude = degreesToRadians(from.latitude);
  const toLatitude = degreesToRadians(to.latitude);
  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(deltaLongitude / 2) * Math.sin(deltaLongitude / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function toDateTimeInputValue(value: string) {
  if (!value) {
    return '';
  }

  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return value.slice(0, 16);
  }

  const date = new Date(timestamp);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function dateTimeInputToIso(value: string) {
  if (!value) {
    return '';
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : value;
}

function numberFromInput(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function geoNumberFromInput(value: string) {
  const normalized = value.trim().replace(',', '.');

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatEventDateParts(value: string) {
  const date = safeDate(value);

  return {
    month: new Intl.DateTimeFormat('es-CO', { month: 'short' }).format(date).replace('.', '').toUpperCase(),
    day: new Intl.DateTimeFormat('es-CO', { day: '2-digit' }).format(date),
    weekday: new Intl.DateTimeFormat('es-CO', { weekday: 'short' }).format(date).replace('.', '').toUpperCase(),
  };
}

function formatEventLongDate(value: string) {
  if (!value || !Number.isFinite(Date.parse(value))) {
    return 'Fecha por confirmar';
  }

  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

function formatEventTime(value: string) {
  if (!value || !Number.isFinite(Date.parse(value))) {
    return 'Hora por confirmar';
  }

  return new Intl.DateTimeFormat('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .format(new Date(value))
    .replace(/\s*a\.\s*m\./i, ' a.m.')
    .replace(/\s*p\.\s*m\./i, ' p.m.');
}

function formatEventCapacity(publication: SoyibaPublication) {
  const total = publication.event.capacityTotal || publication.event.attendeesCount + publication.event.capacityAvailable;
  return `${formatCount(publication.event.attendeesCount)}/${formatCount(total)}`;
}

function eventPlaceName(value: string) {
  return value.split(',')[0]?.trim() || 'Por confirmar';
}

function eventPlaceCity(value: string) {
  return value
    .split(',')
    .slice(1)
    .join(',')
    .trim();
}

function safeDate(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp) : new Date();
}

function getYouTubeEmbedUrl(url: string) {
  const id = extractYouTubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : url;
}

function extractYouTubeId(url: string) {
  const trimmed = url.trim();
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  return shortMatch?.[1] || embedMatch?.[1] || watchMatch?.[1] || '';
}

function getSpotifyEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes('open.spotify.com') && !parsed.pathname.startsWith('/embed/')) {
      parsed.pathname = `/embed${parsed.pathname}`;
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

function hostFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Continue with the classic fallback for local HTTP and browser quirks.
    }
  }

  try {
    const textArea = document.createElement('textarea');
    const selection = document.getSelection();
    const selectedRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    textArea.style.opacity = '0';

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, text.length);

    const copied = document.execCommand('copy');
    document.body.removeChild(textArea);

    if (selectedRange && selection) {
      selection.removeAllRanges();
      selection.addRange(selectedRange);
    }

    return copied;
  } catch {
    return false;
  }
}

function formatRelativeTime(value: string) {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return '';
  }

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours} horas`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `Hace ${diffDays} dias`;

  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(timestamp));
}

function formatCount(value: number) {
  return new Intl.NumberFormat('es-CO', { notation: value >= 10000 ? 'compact' : 'standard' }).format(value);
}

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ');
}
