import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  FileText,
  ImageIcon,
  Link as LinkIcon,
  LoaderCircle,
  MessageCircle,
  MoreVertical,
  Music2,
  PencilLine,
  Plus,
  RefreshCw,
  Share2,
  Trash2,
  UploadCloud,
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
  getMediaFormValues,
  getPermittedPublicationTypes,
  getPublicationCtaLabel,
  getPublicationCtaUrl,
  getPublicationFeed,
  parseRelatedLinksInput,
  recordPublicationShare,
  recordPublicationView,
  serializeRelatedLinksInput,
  togglePublicationSave,
  updatePublication,
  uploadPublicationMedia,
  type PublicationCtaType,
  type PublicationMediaItem,
  type PublicationPayload,
  type PublicationType,
  type SoyibaPublication,
} from './publicaciones.service';

type PublicationsFeedProps = {
  session: SoyibaSession;
  openComposerSignal?: number;
  onComposerOpenChange?: (open: boolean) => void;
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
};

const statsIconClass = 'h-5 w-5 shrink-0';

export function PublicationsFeed({ session, openComposerSignal = 0, onComposerOpenChange }: PublicationsFeedProps) {
  const [publications, setPublications] = useState<SoyibaPublication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPublication, setEditingPublication] = useState<SoyibaPublication | null>(null);
  const [savingPublication, setSavingPublication] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState('');
  const [imagePreview, setImagePreview] = useState<ImagePreview | null>(null);
  const [notice, setNotice] = useState('');
  const lastComposerSignal = useRef(0);
  const permittedTypes = useMemo(() => getPermittedPublicationTypes(session.user), [session.user]);
  const canCreate = permittedTypes.length > 0;

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError('');

    getPublicationFeed(session)
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
  }, [session]);

  useEffect(() => {
    if (!canCreate || openComposerSignal === lastComposerSignal.current) {
      return;
    }

    lastComposerSignal.current = openComposerSignal;
    setEditingPublication(null);
    setComposerOpen(true);
  }, [canCreate, openComposerSignal]);

  useEffect(() => {
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
  }, [publications, session]);

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
        setPublications((current) => sortPublications(current.map((item) => (item.id === updated.id ? mergeStats(updated, item) : item))));
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

  async function handleShare(publication: SoyibaPublication) {
    setActiveMenuId('');
    const shareUrl = `${window.location.origin}${window.location.pathname}#publicacion-${publication.id}`;
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
        <div className="min-w-0">
          <h2 className="text-[19px] font-black leading-6 text-[#0B1F5B]">Publicaciones</h2>
          <p className="text-xs font-semibold text-[#62718A]">Comunidad SOY IBA</p>
        </div>

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

      {isLoading ? (
        <div className="flex h-40 items-center justify-center rounded-[18px] border border-[#E2EAF6] bg-white text-[#145CFF] shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
          <RefreshCw size={20} className="animate-spin" />
        </div>
      ) : null}

      {!isLoading && !publications.length ? (
        <div className="rounded-[18px] border border-dashed border-[#B8C9E7] bg-white p-5 text-center shadow-[0_14px_32px_rgba(15,23,42,0.05)]">
          <FileText className="mx-auto h-9 w-9 text-[#145CFF]" />
          <p className="mt-3 text-sm font-black text-[#0B1F5B]">Aun no hay publicaciones.</p>
        </div>
      ) : null}

      <div className="space-y-4">
        {publications.map((publication) => (
          <PublicationCard
            key={publication.id}
            publication={publication}
            menuOpen={activeMenuId === publication.id}
            canManage={canManagePublication(session.user, publication)}
            onMenuToggle={() => setActiveMenuId((current) => (current === publication.id ? '' : publication.id))}
            onShare={() => handleShare(publication)}
            onEdit={() => openEditComposer(publication)}
            onDelete={() => handleDeletePublication(publication)}
            onToggleSave={() => handleToggleSave(publication)}
            onOpenImage={(preview) => setImagePreview(preview)}
          />
        ))}
      </div>

      <AnimatePresence>
        {composerOpen ? (
          <PublicationComposerModal
            session={session}
            publication={editingPublication}
            permittedTypes={permittedTypes}
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
    </section>
  );
}

function PublicationCard({
  publication,
  menuOpen,
  canManage,
  onMenuToggle,
  onShare,
  onEdit,
  onDelete,
  onToggleSave,
  onOpenImage,
}: {
  publication: SoyibaPublication;
  menuOpen: boolean;
  canManage: boolean;
  onMenuToggle: () => void;
  onShare: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleSave: () => void;
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
      </header>

      <PublicationMediaCarousel publication={publication} onOpenImage={onOpenImage} />

      <div className="px-4 pb-4 pt-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3 text-[#253047]">
            <StatButton
              active={publication.savedByCurrentUser}
              icon={Bookmark}
              value={publication.savedCount}
              label="Guardados"
              onClick={onToggleSave}
            />
            <Stat icon={Eye} value={publication.viewsCount} label="Views" />
            <button type="button" onClick={onShare} className="inline-flex items-center gap-1.5 text-sm font-bold text-[#253047]">
              <Share2 className={statsIconClass} />
              <span>{formatCount(publication.sharedCount)}</span>
            </button>
          </div>

          {ctaUrl ? (
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

        {publication.relatedLinks.length ? (
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
  onOpenImage,
}: {
  publication: SoyibaPublication;
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
              <PublicationMedia item={activeItem} publicationTitle={publication.title} onOpenImage={onOpenImage} />
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
  onOpenImage,
}: {
  item: PublicationMediaItem;
  publicationTitle: string;
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

    return <DriveVideoPlayer url={item.url} title={item.title || publicationTitle} />;
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

function DriveVideoPlayer({ url, title }: { url: string; title: string }) {
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

function mergeStats(updated: SoyibaPublication, current: SoyibaPublication) {
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
