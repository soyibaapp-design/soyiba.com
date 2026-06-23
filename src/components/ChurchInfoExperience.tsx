import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpenText,
  CalendarDays,
  Camera,
  ChevronRight,
  Church,
  Copy,
  Heart,
  Home,
  Mail,
  MapPin,
  MapPinned,
  Megaphone,
  MessageCircle,
  Music2,
  Navigation,
  Play,
  Plus,
  Route,
  Share2,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import { primaryAssets } from '../lib/assets';
import { SoyibaMap, type SoyibaMapMarker } from './SoyibaMap';

export type SideMenuScreenId = 'inicio' | 'eventos' | 'eco' | 'donaciones' | 'perfil' | 'usuarios';

type SideMenuProps = {
  open: boolean;
  activeScreen: SideMenuScreenId;
  onClose: () => void;
  onOpenChurchInfo: () => void;
  onNavigate?: (screen: SideMenuScreenId) => void;
};

type StackCard = {
  id: string;
  title: string;
  image: string;
  imageAlt: string;
};

type GeoPoint = {
  latitude: number;
  longitude: number;
};

type LocationStatus = 'idle' | 'requesting' | 'ready' | 'blocked' | 'unsupported';

const menuItems: Array<{ id: SideMenuScreenId; label: string; icon: LucideIcon }> = [
  { id: 'inicio', label: 'Inicio', icon: Home },
  { id: 'eventos', label: 'Eventos', icon: CalendarDays },
  { id: 'eco', label: 'Grupos ECO', icon: UsersRound },
  { id: 'donaciones', label: 'Donaciones', icon: Heart },
  { id: 'perfil', label: 'Perfil', icon: UserRound },
];

const stackCards: StackCard[] = [
  {
    id: 'iglesia-biblica-antioquia',
    title: 'Iglesia Bíblica Antioquía',
    image: primaryAssets.ibaIntro,
    imageAlt: 'Iglesia Bíblica Antioquía',
  },
  {
    id: 'vision',
    title: 'Visión',
    image: primaryAssets.vision,
    imageAlt: 'Visión de Iglesia Bíblica Antioquía',
  },
  {
    id: 'mision',
    title: 'Misión',
    image: primaryAssets.mision,
    imageAlt: 'Misión de Iglesia Bíblica Antioquía',
  },
  {
    id: 'pastor-contacto',
    title: 'Pastor y comunidad',
    image: primaryAssets.pastor,
    imageAlt: 'Pastor de Iglesia Bíblica Antioquía',
  },
];

const socialLinks = [
  {
    label: 'WhatsApp',
    href: 'https://api.whatsapp.com/send?phone=573243339375&text=%F0%9F%91%8B%20Hola%20Iglesia%20B%C3%ADblica%20Antioqu%C3%ADa.%20Me%20gustar%C3%ADa%20conocer%20un%20poco%20m%C3%A1s%20sobre%20ustedes%2C%20mi%20nombre%20es...',
    brand: 'whatsapp',
  },
  { label: 'Facebook', href: 'https://www.facebook.com/ibaenvigado', brand: 'facebook' },
  { label: 'YouTube', href: 'https://www.youtube.com/@IBAENVIGADO', brand: 'youtube' },
  { label: 'Instagram', href: 'https://www.instagram.com/ibaenvigado/', brand: 'instagram' },
] as const;

const gospelHighlights = [
  {
    title: 'Predicamos',
    line: 'el Evangelio',
    verse: 'Romanos 1:16-17',
    text: 'Porque no me avergüenzo del evangelio, pues es el poder de Dios para la salvación de todo el que cree; del judío primeramente y también del griego. Porque en el evangelio la justicia de Dios se revela por fe y para fe; como está escrito: Mas el justo por la fe vivirá.',
    icon: BookOpenText,
  },
  {
    title: 'Cantamos',
    line: 'el Evangelio',
    verse: 'Efesios 5:19',
    text: 'Hablen entre ustedes con salmos, himnos y cantos espirituales, cantando y alabando con su corazón al Señor.',
    icon: Music2,
  },
  {
    title: 'Vivimos',
    line: 'el Evangelio',
    verse: 'Juan 13:34',
    text: 'Un mandamiento nuevo les doy: “que se amen los unos a los otros”; que como Yo los he amado, así también se amen los unos a los otros.',
    icon: UsersRound,
  },
  {
    title: 'Proclamamos',
    line: 'el Evangelio',
    verse: 'Hechos 5:42',
    text: 'Y todos los días, en el templo y de casa en casa, no cesaban de enseñar y proclamar el evangelio de Jesús como el Cristo.',
    icon: Megaphone,
  },
] as const;

const ibaLocation: GeoPoint = {
  latitude: 6.16753596441066,
  longitude: -75.58542820864933,
};
const ibaPosition: [number, number] = [ibaLocation.latitude, ibaLocation.longitude];
const ibaAddress = 'Calle 38sur #38-34, Barrio mesa, Envigado';
const ibaGoogleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${ibaLocation.latitude},${ibaLocation.longitude}`;
const ibaWazeUrl = `https://waze.com/ul?ll=${ibaLocation.latitude},${ibaLocation.longitude}&navigate=yes`;
const ibaShareText = `Iglesia Bíblica Antioquía\n${ibaAddress}\n${ibaGoogleMapsUrl}`;

export function SoyibaSideMenu({ open, activeScreen, onClose, onOpenChurchInfo, onNavigate }: SideMenuProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.aside className="fixed inset-0 z-[110]" aria-modal="true" role="dialog" aria-label="Menú principal">
          <motion.button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 h-full w-full bg-slate-950/42 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={onClose}
          />

          <motion.div
            className="safe-area relative flex h-full w-[86vw] max-w-[340px] flex-col overflow-hidden border-r border-white/60 bg-white shadow-[24px_0_70px_rgba(15,23,42,0.28)]"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-3 border-b border-slate-200/80 px-5 py-4">
              <img src={primaryAssets.logoSoyiba} alt="SOY IBA" className="h-11 w-auto object-contain" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-[#1E3A8A]">SOY IBA</p>
                <p className="truncate text-xs font-bold text-slate-500">Menú principal</p>
              </div>
              <button
                type="button"
                aria-label="Cerrar menú"
                onClick={onClose}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25"
              >
                <X size={19} strokeWidth={2.3} aria-hidden="true" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
              <button
                type="button"
                onClick={onOpenChurchInfo}
                className="group mb-5 flex w-full items-center gap-3 rounded-lg border border-[#2563EB]/18 bg-[#EFF6FF] px-3 py-3 text-left shadow-[0_14px_28px_rgba(37,99,235,0.11)] transition hover:border-[#2563EB]/38 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#2563EB] text-white shadow-[0_12px_26px_rgba(37,99,235,0.26)]">
                  <Church size={21} strokeWidth={2.25} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black text-[#1E3A8A]">Bíblica Antioquía</span>
                  <span className="block text-xs font-semibold leading-4 text-slate-500">Conoce nuestra iglesia</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#2563EB] transition group-hover:translate-x-0.5" strokeWidth={2.4} aria-hidden="true" />
              </button>

              {onNavigate ? (
                <nav className="space-y-1.5" aria-label="Navegación de secciones">
                  {menuItems.map(({ id, label, icon: Icon }) => {
                    const active = activeScreen === id;

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          onNavigate(id);
                          onClose();
                        }}
                        aria-current={active ? 'page' : undefined}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 ${
                          active ? 'bg-[#2563EB] text-white shadow-[0_12px_24px_rgba(37,99,235,0.24)]' : 'text-slate-600 hover:bg-slate-100 hover:text-[#1E3A8A]'
                        }`}
                      >
                        <Icon size={19} strokeWidth={2.3} aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate">{label}</span>
                      </button>
                    );
                  })}
                </nav>
              ) : null}
            </div>
          </motion.div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}

export function IbaSlidesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const compactTitleRef = useRef<HTMLDivElement | null>(null);
  const gospelHeadingRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<HTMLElement[]>([]);
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const [mapNotice, setMapNotice] = useState('');
  const [activeGospelIndex, setActiveGospelIndex] = useState(0);

  useEffect(() => {
    if (!open) return;

    const scrollContainer = scrollRef.current;
    const section = sectionRef.current;
    const cards = cardRefs.current;

    if (!scrollContainer || !section || !cards.length) return;

    const scrollEl = scrollContainer;
    const stackSection = section;
    const stackCards = cards;

    function updateCards() {
      const rect = stackSection.getBoundingClientRect();
      const scrollProgress = Math.min(Math.max(-rect.top / (stackSection.offsetHeight - scrollEl.clientHeight), 0), 1);
      const totalCards = stackCards.length;
      const step = 1 / totalCards;

      stackCards.forEach((card, index) => {
        const start = index * step;
        const localProgress = (scrollProgress - start) / step;
        const clamped = Math.min(Math.max(localProgress, 0), 1);

        if (index < totalCards - 1) {
          const y = -clamped * 720;
          const opacity = 1 - clamped * 0.15;

          card.style.transform = `
            translateY(${y}px)
            scale(${1 - clamped * 0.03})
          `;
          card.style.opacity = String(opacity);
        } else {
          card.style.transform = 'translateY(0px) scale(1)';
          card.style.opacity = '1';
        }

        if (scrollProgress < start) {
          const offset = index * 18;
          const scale = 1 - index * 0.015;

          card.style.transform = `
            translateY(${offset}px)
            scale(${scale})
          `;
          card.style.opacity = '1';
        }
      });
    }

    function updateCompactTitle() {
      const compactTitle = compactTitleRef.current;
      const hero = heroRef.current;
      const gospelHeading = gospelHeadingRef.current;

      if (!compactTitle || !hero || !gospelHeading) {
        return;
      }

      const heroRect = hero.getBoundingClientRect();
      const gospelRect = gospelHeading.getBoundingClientRect();
      const viewportHeight = scrollEl.clientHeight;
      const fadeIn = clampNumber((120 - heroRect.bottom) / 90, 0, 1);
      const fadeOut = clampNumber((gospelRect.top - viewportHeight * 0.62) / (viewportHeight * 0.24), 0, 1);
      const opacity = fadeIn * fadeOut;

      compactTitle.style.opacity = String(opacity);
      compactTitle.style.transform = `translateY(${(1 - opacity) * 8}px) scale(${0.985 + opacity * 0.015})`;
    }

    function updateScrollEffects() {
      updateCards();
      updateCompactTitle();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    scrollEl.scrollTo({ top: 0 });
    updateScrollEffects();
    scrollEl.addEventListener('scroll', updateScrollEffects);
    window.addEventListener('resize', updateScrollEffects);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      scrollEl.removeEventListener('scroll', updateScrollEffects);
      window.removeEventListener('resize', updateScrollEffects);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setDirectionsOpen(false);
      setMapNotice('');
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
        if (cancelled) return;

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
  }, [open]);

  const distanceKm = userLocation ? haversineDistanceKm(userLocation, ibaLocation) : null;
  const churchMarker = useMemo<SoyibaMapMarker>(
    () => ({
      id: 'iglesia-iba',
      title: 'Iglesia Bíblica Antioquía',
      subtitle: 'Envigado',
      locationLabel: ibaAddress,
      distanceLabel: distanceKm === null ? '' : formatDistance(distanceKm),
      position: ibaPosition,
      mapsUrl: ibaGoogleMapsUrl,
      markerType: 'church',
      badgeLabel: 'Iglesia IBA',
    }),
    [distanceKm],
  );
  const churchMarkers = useMemo(() => [churchMarker], [churchMarker]);

  async function handleShareLocation() {
    const shareData = {
      title: 'Iglesia Bíblica Antioquía',
      text: ibaShareText,
      url: ibaGoogleMapsUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (shareError) {
        if (shareError instanceof DOMException && shareError.name === 'AbortError') {
          return;
        }
      }
    }

    const copied = await copyTextToClipboard(ibaShareText);
    setMapNotice(copied ? 'Ubicación copiada para compartir.' : 'No se pudo copiar automáticamente.');
  }

  async function handleCopyAddress() {
    const copied = await copyTextToClipboard(`${ibaAddress}\n${ibaGoogleMapsUrl}`);
    setMapNotice(copied ? 'Dirección copiada.' : 'No se pudo copiar la dirección.');
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.section
          className="fixed inset-0 z-[120] bg-[#061C4A] text-white"
          aria-modal="true"
          role="dialog"
          aria-label="Información de Iglesia Bíblica Antioquía"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <div ref={scrollRef} className="iba-slides-scroll">
            <nav className="iba-slides-nav" aria-label="Cerrar presentación">
              <button type="button" aria-label="Cerrar presentación" onClick={onClose}>
                <X size={22} strokeWidth={2.4} aria-hidden="true" />
              </button>
            </nav>

            <section ref={heroRef} className="iba-hero" aria-label="Conoce nuestra iglesia">
              <div className="iba-brand-row">
                <div className="iba-brand-antioquia" aria-label="Iglesia Bíblica Antioquía">
                  <span>Iglesia Bíblica</span>
                  <strong>ANTIOQUÍA</strong>
                </div>
                <span className="iba-brand-divider" aria-hidden="true" />
                <img src={primaryAssets.logoSoyiba} alt="Soy IBA" className="iba-brand-soyiba" />
              </div>
              <h1>Conoce nuestra iglesia</h1>
              <p>Descubre nuestra visión, misión y comunidad</p>
              <span className="iba-gold-spark" aria-hidden="true" />
            </section>

            <section ref={sectionRef} className="iba-stack-section" id="ibaStackSection">
              <div ref={compactTitleRef} className="iba-stack-compact-title" aria-hidden="true">
                <span>Conoce nuestra iglesia</span>
                <small>Identidad, misión y comunidad</small>
              </div>
              <div className="iba-stack" id="ibaStack">
                {stackCards.map((card, index) => (
                  <article
                    key={card.id}
                    ref={(node) => {
                      if (node) {
                        cardRefs.current[index] = node;
                      }
                    }}
                    className="iba-stack-card"
                  >
                    <img src={card.image} alt={card.imageAlt} />
                    <div className="iba-card-overlay">
                      <div className="iba-card-content">
                        <div className="iba-card-title">{card.title}</div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="iba-gospel-section" aria-label="Centralidad del Evangelio">
              <div ref={gospelHeadingRef} className="iba-section-compact-title iba-gospel-heading">
                <span>Ese rombo muestra la centralidad del evangelio en la IBA</span>
                <small>Evangelio</small>
              </div>
              <div className="iba-gospel-wheel" aria-label="Nuestra vida en el Evangelio">
                {gospelHighlights.map(({ title, line, verse, icon: Icon }, index) => (
                  <button
                    key={`${title}-${line}`}
                    type="button"
                    className={`iba-gospel-tile ${activeGospelIndex === index ? 'is-active' : ''}`}
                    aria-pressed={activeGospelIndex === index}
                    onClick={() => setActiveGospelIndex(index)}
                  >
                    <Icon size={24} strokeWidth={1.8} aria-hidden="true" />
                    <p>
                      {title}
                      <span>{line}</span>
                    </p>
                    <small>{verse}</small>
                  </button>
                ))}
                <span className="iba-gospel-plus" aria-hidden="true">
                  <Plus size={28} strokeWidth={2.2} />
                </span>
              </div>
              <AnimatePresence mode="wait">
                <motion.article
                  key={gospelHighlights[activeGospelIndex].verse}
                  className="iba-gospel-verse-card"
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                  <span>{gospelHighlights[activeGospelIndex].verse}</span>
                  <h3>
                    {gospelHighlights[activeGospelIndex].title} {gospelHighlights[activeGospelIndex].line}
                  </h3>
                  <p>{gospelHighlights[activeGospelIndex].text}</p>
                  <small>Nueva Biblia de las Américas (NBLA)</small>
                </motion.article>
              </AnimatePresence>
            </section>

            <section className="iba-location-section" aria-label="Ubicación de Iglesia Bíblica Antioquía">
              <div className="iba-section-compact-title iba-location-heading">
                <span>Ven y camina con nosotros</span>
                <small>Ubicación</small>
              </div>
              <p className="iba-location-summary">Encuentra la Iglesia Bíblica Antioquía en Envigado y calcula la distancia desde tu ubicación actual.</p>

              <div className="iba-map-card">
                <SoyibaMap
                  center={ibaPosition}
                  zoom={16}
                  className="iba-location-map"
                  markers={churchMarkers}
                  userLocation={userLocation ? [userLocation.latitude, userLocation.longitude] : null}
                />
                <div className="iba-map-info">
                  <span className="iba-map-pin">
                    <MapPinned size={22} strokeWidth={2.2} aria-hidden="true" />
                  </span>
                  <div>
                    <strong>Iglesia Bíblica Antioquía</strong>
                    <span>{ibaAddress}</span>
                    <small>{getLocationStatusLabel(locationStatus, distanceKm)}</small>
                  </div>
                </div>
              </div>

              <div className="iba-map-actions">
                <button type="button" onClick={handleShareLocation}>
                  <Share2 size={18} strokeWidth={2.3} aria-hidden="true" />
                  Compartir ubicación
                </button>
                <button type="button" onClick={() => setDirectionsOpen((current) => !current)} aria-expanded={directionsOpen}>
                  <Navigation size={18} strokeWidth={2.3} aria-hidden="true" />
                  Cómo llegar
                </button>
                <button type="button" onClick={handleCopyAddress}>
                  <Copy size={18} strokeWidth={2.3} aria-hidden="true" />
                  Copiar dirección
                </button>
              </div>

              <AnimatePresence>
                {directionsOpen ? (
                  <motion.div
                    className="iba-directions-menu"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                  >
                    <a href={ibaGoogleMapsUrl} target="_blank" rel="noreferrer">
                      <MapPin size={18} strokeWidth={2.3} aria-hidden="true" />
                      Google Maps
                    </a>
                    <a href={ibaWazeUrl} target="_blank" rel="noreferrer">
                      <Route size={18} strokeWidth={2.3} aria-hidden="true" />
                      Waze
                    </a>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {mapNotice ? <p className="iba-map-notice">{mapNotice}</p> : null}

              <div className="iba-contact-footer" aria-label="Contacto Iglesia Bíblica Antioquía">
                <div>
                  <p className="iba-contact-title">
                    <span className="iba-contact-title-icon" aria-hidden="true">
                      <Mail size={24} strokeWidth={2.2} />
                    </span>
                    Contacto
                  </p>
                  <p className="iba-contact-address">
                    <MapPin size={15} strokeWidth={2.4} aria-hidden="true" />
                    <span>{ibaAddress}</span>
                  </p>
                  <a className="iba-contact-email" href="mailto:info@iglesiaiba.org">
                    <Mail size={16} strokeWidth={2.4} aria-hidden="true" />
                    <span>info@iglesiaiba.org</span>
                  </a>
                </div>
                <div className="iba-social-links">
                  {socialLinks.map((link) => (
                    <a key={link.label} className="iba-social-link" href={link.href} target="_blank" rel="noreferrer" aria-label={link.label}>
                      <SocialLogo brand={link.brand} />
                      <span>{link.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            </section>

            <div className="iba-spacer" />
          </div>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}

function SocialLogo({ brand }: { brand: (typeof socialLinks)[number]['brand'] }) {
  if (brand === 'whatsapp') {
    return <MessageCircle size={20} strokeWidth={2.5} aria-hidden="true" />;
  }

  if (brand === 'facebook') {
    return (
      <span className="iba-social-letter" aria-hidden="true">
        f
      </span>
    );
  }

  if (brand === 'youtube') {
    return <Play size={18} strokeWidth={3} fill="currentColor" aria-hidden="true" />;
  }

  return <Camera size={19} strokeWidth={2.4} aria-hidden="true" />;
}

function getLocationStatusLabel(status: LocationStatus, distanceKm: number | null) {
  if (distanceKm !== null) {
    return `Estás a ${formatDistance(distanceKm)} de la iglesia.`;
  }

  if (status === 'requesting') {
    return 'Calculando distancia desde tu ubicación...';
  }

  if (status === 'blocked') {
    return 'Activa tu ubicación para calcular la distancia.';
  }

  if (status === 'unsupported') {
    return 'Tu navegador no permite calcular la distancia aquí.';
  }

  return 'Marcador ubicado con OpenStreetMap.';
}

function formatDistance(value: number) {
  if (value < 1) {
    return `${Math.max(1, Math.round(value * 1000))} m`;
  }

  return `${value.toFixed(value < 10 ? 1 : 0)} km`;
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

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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
    return copied;
  } catch {
    return false;
  }
}
