import { callAppsScript } from '../../services/appsScriptClient';
import { getFirebaseApp } from '../../services/firebase';
import { isFirebaseAuthEnabled } from '../../services/firebaseAuth';
import { canUploadToFirebaseStorage, deleteSoyibaMediaFromStorage, getFirebaseStoragePath, uploadSoyibaMediaToStorage } from '../../services/firebaseStorage';
import type { SoyibaSession, SoyibaUser } from '../Auth/auth.service';

export const PUBLICATION_TYPES = ['Publicacion', 'Devocional', 'Evento', 'Grupo ECO', 'Transmision'] as const;
export const PUBLICATION_CTA_TYPES = ['Ninguno', 'Enlace', 'Inscripcion', 'Whatsapp'] as const;

export type PublicationType = (typeof PUBLICATION_TYPES)[number];
export type PublicationCtaType = (typeof PUBLICATION_CTA_TYPES)[number];
export type PublicationMediaType = 'image' | 'youtube' | 'driveVideo' | 'spotify';
export const MAX_PUBLICATION_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_PUBLICATION_VIDEO_UPLOAD_BYTES = 80 * 1024 * 1024;
export const MAX_RELATED_LINKS = 3;

export type PublicationMediaItem = {
  id: string;
  type: PublicationMediaType;
  url: string;
  title?: string;
};

export type PublicationRelatedLink = {
  id: string;
  title: string;
  url: string;
};

export type PublicationEventDetails = {
  dateTime: string;
  place: string;
  validFrom: string;
  validUntil: string;
  capacityAvailable: number;
  attendeesCount: number;
  capacityTotal: number;
  currentUserGoing: boolean;
  expired: boolean;
};

export type PublicationEcoDetails = {
  day: string;
  time: string;
  host: string;
  moderator: string;
  phone: string;
  address: string;
  neighborhood: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  attendeesCount: number;
  currentUserAttending: boolean;
  validFrom: string;
  validUntil: string;
};

export type SoyibaPublication = {
  id: string;
  type: PublicationType;
  title: string;
  description: string;
  createdAt: string;
  updatedAt?: string;
  author: {
    id: string;
    name: string;
    email?: string;
    photoUrl?: string;
    verified?: boolean;
  };
  mediaItems: PublicationMediaItem[];
  cta: {
    type: PublicationCtaType;
    url?: string;
    phone?: string;
  };
  relatedLinks: PublicationRelatedLink[];
  membersOnly: boolean;
  visibleToMinors: boolean;
  savedCount: number;
  viewsCount: number;
  sharedCount: number;
  savedByCurrentUser: boolean;
  event: PublicationEventDetails;
  eco: PublicationEcoDetails;
};

export type PublicationPayload = {
  type: PublicationType;
  title: string;
  description: string;
  mediaItems: PublicationMediaItem[];
  cta: SoyibaPublication['cta'];
  relatedLinks: PublicationRelatedLink[];
  membersOnly: boolean;
  visibleToMinors: boolean;
  event?: {
    dateTime: string;
    place: string;
    validFrom: string;
    validUntil: string;
    capacityTotal: number;
  };
  eco?: {
    day: string;
    time: string;
    host: string;
    moderator: string;
    phone: string;
    address: string;
    neighborhood: string;
    city: string;
    latitude: number | null;
    longitude: number | null;
    validFrom: string;
    validUntil: string;
  };
};

export type PublicationFeedOptions = {
  type?: PublicationType;
};

export type ToggleEventGoingResult = {
  going: boolean;
  publication?: SoyibaPublication;
};

export type ToggleEcoAttendanceResult = {
  attending: boolean;
  publication?: SoyibaPublication;
};

export type RecordPublicationViewResult = {
  recorded: boolean;
  viewsCount?: number;
};

type PublicationsResponse = {
  ok: boolean;
  publications?: unknown[];
  publication?: unknown;
  media?: unknown;
  saved?: boolean;
  going?: boolean;
  attending?: boolean;
  viewRecorded?: boolean;
  viewRecordedIds?: unknown;
  viewsCount?: unknown;
  viewsCountById?: unknown;
  error?: string;
};

const publicationFeedCache = new Map<string, SoyibaPublication[]>();
const PUBLICATION_FEED_STORAGE_PREFIX = 'soyiba.publications.feed.v4.';
const PUBLICATION_FEED_STORAGE_TTL_MS = 30 * 60 * 1000;
const PUBLICATION_FEED_STORAGE_STALE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PUBLICATION_FEED_RETRY_DELAYS_MS = [1200, 2600, 5200];

const localPublications: SoyibaPublication[] = [
  {
    id: 'local-sabiduria',
    type: 'Publicacion',
    title: '5 Claves para una vida de sabiduria',
    description:
      'Descubre principios prácticos que te ayudarán a tomar mejores decisiones y a vivir conforme a la voluntad de Dios.\nUn espacio para crecer juntos durante esta semana.',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    author: {
      id: 'local-publisher',
      name: 'Felipe Trujillo',
      photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    },
    mediaItems: [
      {
        id: 'media-local-1',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1200&q=85',
        title: '5 Claves para una vida de sabiduria',
      },
    ],
    cta: {
      type: 'Enlace',
      url: 'https://soyiba.org',
    },
    relatedLinks: [
      {
        id: 'link-local-1',
        title: 'Guia de estudio - Sabiduria',
        url: 'https://soyiba.org',
      },
    ],
    membersOnly: false,
    visibleToMinors: false,
    savedCount: 24,
    viewsCount: 356,
    sharedCount: 12,
    savedByCurrentUser: false,
    event: emptyEventDetails(),
    eco: emptyEcoDetails(),
  },
  {
    id: 'local-conferencia-iba',
    type: 'Evento',
    title: 'Conferencia IBA 2026',
    description:
      'Una noche para adorar, aprender y fortalecer nuestra fe como iglesia.\nTendremos invitados especiales, alabanza y un mensaje central para toda la familia.',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    author: {
      id: 'local-publisher',
      name: 'Jonathan Rudas',
    },
    mediaItems: [
      {
        id: 'media-local-evento-1',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=85',
        title: 'Conferencia IBA 2026',
      },
    ],
    cta: {
      type: 'Whatsapp',
      phone: '573001112233',
    },
    relatedLinks: [
      {
        id: 'link-local-evento-1',
        title: 'Más información del evento',
        url: 'https://drive.google.com',
      },
    ],
    membersOnly: false,
    visibleToMinors: false,
    savedCount: 1,
    viewsCount: 11,
    sharedCount: 16,
    savedByCurrentUser: false,
    event: {
      dateTime: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
      place: 'Auditorio IBA, Ibagué',
      validFrom: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      validUntil: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString(),
      capacityAvailable: 15,
      attendeesCount: 25,
      capacityTotal: 40,
      currentUserGoing: false,
      expired: false,
    },
    eco: emptyEcoDetails(),
  },
  {
    id: 'local-transmision-domingo',
    type: 'Transmision',
    title: 'Dios sigue obrando',
    description:
      'Prédica dominical para estudiar en casa y compartir con la familia.\nUna enseñanza sobre la fidelidad de Dios en cada temporada.',
    createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
    author: {
      id: 'local-publisher',
      name: 'Pastor Alejandro X.',
    },
    mediaItems: [
      {
        id: 'media-local-transmision-image',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=1200&q=85',
        title: 'Culto dominical SOY IBA',
      },
      {
        id: 'media-local-transmision-video',
        type: 'youtube',
        url: 'https://www.youtube.com/watch?v=ysz5S6PUM-U',
        title: 'Dios sigue obrando',
      },
      {
        id: 'media-local-transmision-spotify',
        type: 'spotify',
        url: 'https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO',
        title: 'IBA en Casa',
      },
    ],
    cta: {
      type: 'Enlace',
      url: 'https://www.youtube.com/watch?v=ysz5S6PUM-U',
    },
    relatedLinks: [
      {
        id: 'link-local-transmision-guia',
        title: 'Guia de estudio',
        url: 'https://soyiba.org',
      },
    ],
    membersOnly: false,
    visibleToMinors: false,
    savedCount: 18,
    viewsCount: 240,
    sharedCount: 9,
    savedByCurrentUser: false,
    event: emptyEventDetails(),
    eco: emptyEcoDetails(),
  },
  {
    id: 'local-noche-eco',
    type: 'Evento',
    title: 'Noche de Amistad ECO',
    description:
      'Un encuentro para invitar amigos, compartir la palabra y fortalecer los grupos de casa.\nTendremos cena sencilla, oración y dinámicas por sectores.',
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    author: {
      id: 'local-publisher',
      name: 'Equipo ECO',
    },
    mediaItems: [
      {
        id: 'media-local-evento-eco',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=85',
        title: 'Noche de Amistad ECO',
      },
    ],
    cta: {
      type: 'Inscripcion',
      url: 'https://soyiba.org',
    },
    relatedLinks: [],
    membersOnly: false,
    visibleToMinors: false,
    savedCount: 4,
    viewsCount: 62,
    sharedCount: 5,
    savedByCurrentUser: false,
    event: {
      dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      place: 'En casas ECO',
      validFrom: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      validUntil: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
      capacityAvailable: 18,
      attendeesCount: 22,
      capacityTotal: 40,
      currentUserGoing: false,
      expired: false,
    },
    eco: emptyEcoDetails(),
  },
  {
    id: 'local-jornada-servicio',
    type: 'Evento',
    title: 'Jornada de Servicio',
    description:
      'Serviremos juntos a familias de la ciudad con oración, alimentos y acompañamiento.\nPuedes participar con tu familia o con tu Grupo ECO.',
    createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    author: {
      id: 'local-publisher',
      name: 'Servicio IBA',
    },
    mediaItems: [
      {
        id: 'media-local-evento-servicio',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=85',
        title: 'Jornada de Servicio',
      },
    ],
    cta: {
      type: 'Whatsapp',
      phone: '573001112233',
    },
    relatedLinks: [],
    membersOnly: false,
    visibleToMinors: false,
    savedCount: 6,
    viewsCount: 95,
    sharedCount: 8,
    savedByCurrentUser: false,
    event: {
      dateTime: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
      place: 'IBA Sede Principal',
      validFrom: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      validUntil: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000).toISOString(),
      capacityAvailable: 9,
      attendeesCount: 31,
      capacityTotal: 40,
      currentUserGoing: false,
      expired: false,
    },
    eco: emptyEcoDetails(),
  },
  {
    id: 'local-taller-matrimonios',
    type: 'Evento',
    title: 'Taller para Matrimonios',
    description:
      'Un espacio práctico para conversar, orar y fortalecer acuerdos de pareja desde la palabra.\nIncluye material de trabajo y café.',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    author: {
      id: 'local-publisher',
      name: 'Familias IBA',
    },
    mediaItems: [
      {
        id: 'media-local-evento-matrimonios',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?auto=format&fit=crop&w=1200&q=85',
        title: 'Taller para Matrimonios',
      },
    ],
    cta: {
      type: 'Inscripcion',
      url: 'https://soyiba.org',
    },
    relatedLinks: [],
    membersOnly: false,
    visibleToMinors: false,
    savedCount: 2,
    viewsCount: 44,
    sharedCount: 3,
    savedByCurrentUser: false,
    event: {
      dateTime: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
      place: 'Auditorio IBA',
      validFrom: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      validUntil: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000).toISOString(),
      capacityAvailable: 12,
      attendeesCount: 28,
      capacityTotal: 40,
      currentUserGoing: false,
      expired: false,
    },
    eco: emptyEcoDetails(),
  },
  {
    id: 'local-eco-centro',
    type: 'Grupo ECO',
    title: 'Grupo ECO Centro',
    description: 'Encuentro semanal para orar, compartir la palabra y acompañar nuevos procesos de fe.',
    createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    author: {
      id: 'local-eco-publisher',
      name: 'Equipo ECO',
    },
    mediaItems: [
      {
        id: 'media-local-eco-1',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=85',
        title: 'Grupo ECO Centro',
      },
    ],
    cta: {
      type: 'Enlace',
      url: 'https://soyiba.org',
    },
    relatedLinks: [],
    membersOnly: false,
    visibleToMinors: false,
    savedCount: 7,
    viewsCount: 88,
    sharedCount: 4,
    savedByCurrentUser: false,
    event: emptyEventDetails(),
    eco: {
      day: 'Viernes',
      time: '7:00 p.m.',
      host: 'Familia Gomez',
      moderator: 'Laura Rojas',
      phone: '573243339375',
      address: 'Punto de encuentro confirmado por WhatsApp',
      neighborhood: 'Centro',
      city: 'Ibagué',
      latitude: 4.4389,
      longitude: -75.2322,
      attendeesCount: 12,
      currentUserAttending: false,
      validFrom: '',
      validUntil: '',
    },
  },
];

export function getCachedPublicationFeed(session: SoyibaSession, options: PublicationFeedOptions = {}) {
  const cached = getCachedPublicationFeedInternal(session, options);
  return cached ? filterPublicationsForCurrentUser(hydrateCurrentUserAuthor(clonePublications(cached), session.user), session.user) : null;
}

export async function getPublicationFeed(session: SoyibaSession, options: PublicationFeedOptions = {}, forceRefresh = false) {
  const cached = getCachedPublicationFeedInternal(session, options);

  if (cached && !forceRefresh) {
    return filterPublicationsForCurrentUser(hydrateCurrentUserAuthor(clonePublications(cached), session.user), session.user);
  }

  let response: PublicationsResponse;

  try {
    response = await callPublicationList(session, options);
  } catch (error) {
    if (cached) {
      return filterPublicationsForCurrentUser(hydrateCurrentUserAuthor(clonePublications(cached), session.user), session.user);
    }

    throw error;
  }

  if (!response.ok) {
    if (cached) {
      return filterPublicationsForCurrentUser(hydrateCurrentUserAuthor(clonePublications(cached), session.user), session.user);
    }

    throw new Error(response.error || 'No fue posible cargar las publicaciones.');
  }

  const publications = filterPublicationsForCurrentUser(
    await hydratePublicationAuthors(normalizePublications(response.publications || [], options.type), session.user),
    session.user,
  );

  if (cached && publications.length === 0 && cached.length > 0) {
    return filterPublicationsForCurrentUser(hydrateCurrentUserAuthor(clonePublications(cached), session.user), session.user);
  }

  if (publications.length > 0 || options.type) {
    setPublicationFeedCache(session, options, publications);
  }

  return publications;
}

async function callPublicationList(session: SoyibaSession, options: PublicationFeedOptions) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= PUBLICATION_FEED_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await callAppsScript<PublicationsResponse>(
        'Publicaciones',
        'list',
        {
          userId: session.user.id,
          email: session.user.email,
          type: options.type,
          isMinor: isMinorOrUnknownAudience(session.user),
        },
        () => ({
          ok: true,
          publications: filterPublicationsByType(localPublications, options.type),
        }),
        { timeoutMs: 16000 },
      );

      if (isUnexpectedEmptyPublicationList(response, options)) {
        throw new Error('Publicaciones respondio vacio temporalmente.');
      }

      return response;
    } catch (error) {
      lastError = error;

      const retryDelay = PUBLICATION_FEED_RETRY_DELAYS_MS[attempt];

      if (retryDelay === undefined) {
        break;
      }

      await wait(retryDelay);
    }
  }

  throw lastError;
}

function wait(delayMs: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

function isUnexpectedEmptyPublicationList(response: PublicationsResponse, options: PublicationFeedOptions) {
  if (!response.ok || options.type) {
    return false;
  }

  return Array.isArray(response.publications) && response.publications.length === 0;
}

export async function createPublication(session: SoyibaSession, payload: PublicationPayload) {
  const response = await callAppsScript<PublicationsResponse>(
    'Publicaciones',
    'create',
    buildRequest(session, payload),
    () => ({
      ok: true,
      publication: {
        ...payload,
        id: `local-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: {
          id: session.user.id,
          name: getUserDisplayName(session.user),
          email: session.user.email,
          photoUrl: session.user.photoUrl,
          verified: Boolean(session.user.verificado),
        },
        savedCount: 0,
        viewsCount: 0,
        sharedCount: 0,
        savedByCurrentUser: false,
        visibleToMinors: payload.visibleToMinors,
      },
    }),
  );

  if (!response.ok || !response.publication) {
    throw new Error(response.error || 'No fue posible crear la publicación.');
  }

  invalidatePublicationFeedCache(session);
  return normalizePublication(response.publication);
}

export async function updatePublication(session: SoyibaSession, publicationId: string, payload: PublicationPayload) {
  const response = await callAppsScript<PublicationsResponse>(
    'Publicaciones',
    'update',
    {
      ...buildRequest(session, payload),
      publicationId,
    },
    () => ({
      ok: true,
      publication: {
        ...payload,
        id: publicationId,
        updatedAt: new Date().toISOString(),
        author: {
          id: session.user.id,
          name: getUserDisplayName(session.user),
          email: session.user.email,
          photoUrl: session.user.photoUrl,
          verified: Boolean(session.user.verificado),
        },
        savedCount: 0,
        viewsCount: 0,
        sharedCount: 0,
        savedByCurrentUser: false,
        visibleToMinors: payload.visibleToMinors,
      },
    }),
  );

  if (!response.ok || !response.publication) {
    throw new Error(response.error || 'No fue posible actualizar la publicación.');
  }

  invalidatePublicationFeedCache(session);
  return normalizePublication(response.publication);
}

export async function deletePublication(session: SoyibaSession, publicationId: string) {
  const response = await callAppsScript<PublicationsResponse>(
    'Publicaciones',
    'delete',
    {
      publicationId,
      user: getUserRequest(session.user),
      token: session.token,
    },
    () => ({ ok: true }),
  );

  if (!response.ok) {
    throw new Error(response.error || 'No fue posible eliminar la publicación.');
  }

  invalidatePublicationFeedCache(session);
}

export async function deletePublicationStorageMedia(items: PublicationMediaItem[]) {
  const firebaseItems = items.filter((item) => item.type === 'image' || item.type === 'driveVideo').filter((item) => getFirebaseStoragePath(item.url || item.id));

  await Promise.allSettled(firebaseItems.map((item) => deleteSoyibaMediaFromStorage(item.url || item.id)));
}

export async function deleteRemovedPublicationStorageMedia(previousItems: PublicationMediaItem[], nextItems: PublicationMediaItem[]) {
  const nextStoragePaths = new Set(nextItems.map((item) => getFirebaseStoragePath(item.url || item.id)).filter(Boolean));
  const removedItems = previousItems.filter((item) => {
    const path = getFirebaseStoragePath(item.url || item.id);
    return path && !nextStoragePaths.has(path);
  });

  await deletePublicationStorageMedia(removedItems);
}

export async function uploadPublicationMedia(session: SoyibaSession, file: File, mediaType: 'image' | 'driveVideo') {
  const maxBytes = mediaType === 'image' ? MAX_PUBLICATION_IMAGE_UPLOAD_BYTES : MAX_PUBLICATION_VIDEO_UPLOAD_BYTES;

  if (file.size > maxBytes) {
    throw new Error(
      mediaType === 'image'
        ? `La imagen pesa ${formatFileSize(file.size)}. Sube una imagen de maximo ${formatFileSize(maxBytes)}.`
        : `El video pesa ${formatFileSize(file.size)}. Sube un video de maximo ${formatFileSize(maxBytes)} o pega un enlace de YouTube/Drive.`,
    );
  }

  if (canUploadToFirebaseStorage()) {
    try {
      const uploaded = await uploadSoyibaMediaToStorage({
        file,
        mediaType,
        userId: session.user.id,
        userEmail: session.user.email,
      });

      return normalizeMediaItem(uploaded);
    } catch (error) {
      throw new Error(formatFirebaseStorageUploadError(error instanceof Error ? error.message : String(error || '')));
    }
  }

  if (mediaType === 'driveVideo' && file.size > 24 * 1024 * 1024) {
    throw new Error('Para subir videos mayores a 24 MB debes configurar Firebase Storage en las variables VITE_FIREBASE_*.');
  }

  const dataUrl = await readFileAsDataUrl(file);
  let response: PublicationsResponse;

  try {
    response = await callAppsScript<PublicationsResponse>(
      'Publicaciones',
      'uploadMedia',
      {
        mediaType,
        fileName: file.name,
        mimeType: file.type,
        dataUrl,
        token: session.token,
        user: getUserRequest(session.user),
      },
      () => ({
        ok: true,
        media: {
          id: `local-file-${Date.now()}`,
          type: mediaType,
          url: dataUrl,
          title: file.name,
        },
      }),
    );
  } catch (error) {
    throw new Error(formatPublicationUploadError(error instanceof Error ? error.message : String(error || '')));
  }

  if (!response.ok || !response.media) {
    throw new Error(formatPublicationUploadError(response.error));
  }

  return normalizeMediaItem(response.media);
}

export async function togglePublicationSave(session: SoyibaSession, publicationId: string, saved: boolean) {
  const response = await callAppsScript<PublicationsResponse>(
    'Publicaciones',
    'toggleSave',
    {
      publicationId,
      saved,
      user: getUserRequest(session.user),
      token: session.token,
    },
    () => ({
      ok: true,
      saved,
    }),
  );

  if (!response.ok) {
    throw new Error(response.error || 'No fue posible actualizar el guardado.');
  }

  updateCachedPublication(session, publicationId, (publication) => {
    const nextSaved = Boolean(response.saved);
    const delta = nextSaved && !publication.savedByCurrentUser ? 1 : !nextSaved && publication.savedByCurrentUser ? -1 : 0;

    return {
      ...publication,
      savedByCurrentUser: nextSaved,
      savedCount: Math.max(0, publication.savedCount + delta),
    };
  });

  return Boolean(response.saved);
}

export async function toggleEventGoing(session: SoyibaSession, publicationId: string, going: boolean): Promise<ToggleEventGoingResult> {
  const response = await callAppsScript<PublicationsResponse>(
    'Publicaciones',
    'toggleYoVoy',
    {
      publicationId,
      going,
      user: getUserRequest(session.user),
      token: session.token,
    },
    () => ({
      ok: true,
      going,
    }),
  );

  if (!response.ok) {
    throw new Error(response.error || 'No fue posible actualizar Yo voy.');
  }

  const normalizedPublication = response.publication ? normalizePublication(response.publication) : undefined;

  if (normalizedPublication) {
    updateCachedPublication(session, publicationId, () => normalizedPublication);
  } else {
    updateCachedPublication(session, publicationId, (publication) => {
      const nextGoing = Boolean(response.going);
      const delta = nextGoing && !publication.event.currentUserGoing ? 1 : !nextGoing && publication.event.currentUserGoing ? -1 : 0;
      const nextEvent = {
        ...publication.event,
        currentUserGoing: nextGoing,
        attendeesCount: Math.max(0, publication.event.attendeesCount + delta),
        capacityAvailable: Math.max(0, publication.event.capacityAvailable - delta),
      };

      nextEvent.capacityTotal = nextEvent.attendeesCount + nextEvent.capacityAvailable;

      return {
        ...publication,
        event: nextEvent,
      };
    });
  }

  return {
    going: Boolean(response.going),
    publication: normalizedPublication,
  };
}

export async function toggleEcoAttendance(
  session: SoyibaSession,
  publicationId: string,
  attending: boolean,
): Promise<ToggleEcoAttendanceResult> {
  const response = await callAppsScript<PublicationsResponse>(
    'Publicaciones',
    'toggleEcoAttendance',
    {
      publicationId,
      attending,
      user: getUserRequest(session.user),
      token: session.token,
    },
    () => ({
      ok: true,
      attending,
    }),
  );

  if (!response.ok) {
    throw new Error(response.error || 'No fue posible actualizar la asistencia al Grupo ECO.');
  }

  const normalizedPublication = response.publication ? normalizePublication(response.publication) : undefined;

  if (normalizedPublication) {
    if (normalizedPublication.eco.currentUserAttending) {
      clearOtherCachedEcoAttendance(session, publicationId);
    }

    updateCachedPublication(session, publicationId, () => normalizedPublication);
  } else {
    if (Boolean(response.attending)) {
      clearOtherCachedEcoAttendance(session, publicationId);
    }

    updateCachedPublication(session, publicationId, (publication) => {
      const nextAttending = Boolean(response.attending);
      const delta =
        nextAttending && !publication.eco.currentUserAttending
          ? 1
          : !nextAttending && publication.eco.currentUserAttending
            ? -1
            : 0;

      return {
        ...publication,
        eco: {
          ...publication.eco,
          currentUserAttending: nextAttending,
          attendeesCount: Math.max(0, publication.eco.attendeesCount + delta),
        },
      };
    });
  }

  return {
    attending: normalizedPublication?.eco.currentUserAttending ?? Boolean(response.attending),
    publication: normalizedPublication,
  };
}

export async function recordPublicationView(session: SoyibaSession, publicationId: string): Promise<RecordPublicationViewResult> {
  const response = await callAppsScript<PublicationsResponse>(
    'Publicaciones',
    'recordView',
    {
      publicationId,
      user: getUserRequest(session.user),
      token: session.token,
    },
    () => ({ ok: true }),
  );

  if (!response.ok) {
    throw new Error(response.error || 'No fue posible registrar la vista.');
  }

  const recorded = response.viewRecorded !== false;
  const normalizedPublication = response.publication ? normalizePublication(response.publication) : undefined;
  const responseViewsCount = response.viewsCount == null ? undefined : numberFrom(response.viewsCount);
  const viewsCount = normalizedPublication?.viewsCount ?? responseViewsCount;

  if (normalizedPublication) {
    updateCachedPublication(session, publicationId, () => normalizedPublication);
  } else if (viewsCount !== undefined) {
    updateCachedPublication(session, publicationId, (publication) => ({
      ...publication,
      viewsCount,
    }));
  } else if (recorded) {
    updateCachedPublication(session, publicationId, (publication) => ({
      ...publication,
      viewsCount: publication.viewsCount + 1,
    }));
  }

  return {
    recorded,
    viewsCount,
  };
}

export async function recordPublicationViews(session: SoyibaSession, publicationIds: string[]) {
  const uniqueIds = [...new Set(publicationIds.map((id) => id.trim()).filter(Boolean))];

  if (uniqueIds.length === 0) {
    return;
  }

  const response = await callAppsScript<PublicationsResponse>(
    'Publicaciones',
    'recordViews',
    {
      publicationIds: uniqueIds,
      user: getUserRequest(session.user),
      token: session.token,
    },
    () => ({ ok: true }),
  );

  if (!response.ok) {
    throw new Error(response.error || 'No fue posible registrar las vistas.');
  }

  const viewsCountById = normalizeViewsCountById(response.viewsCountById);

  if (Object.keys(viewsCountById).length) {
    updateCachedPublications(session, (publication) => {
      const viewsCount = viewsCountById[publication.id];
      return viewsCount === undefined ? publication : { ...publication, viewsCount };
    });
  }
}

export async function recordPublicationShare(session: SoyibaSession, publicationId: string) {
  await callAppsScript<PublicationsResponse>(
    'Publicaciones',
    'recordShare',
    {
      publicationId,
      user: getUserRequest(session.user),
      token: session.token,
    },
    () => ({ ok: true }),
  );

  updateCachedPublication(session, publicationId, (publication) => ({
    ...publication,
    sharedCount: publication.sharedCount + 1,
  }));
}

export function getPermittedPublicationTypes(user: SoyibaUser): PublicationType[] {
  const isPublisher = isTrue(user.publicador);
  const isEcoPublisher = isTrue(user.publicadorEco);
  const isEventPublisher = isTrue(user.publicadorEvento);
  const isManager = isAdminLike(user);

  return PUBLICATION_TYPES.filter((type) => {
    if (isManager) return true;
    if (type === 'Evento') return isEventPublisher;
    if (type === 'Grupo ECO') return isEcoPublisher;
    return isPublisher;
  });
}

export function canManagePublication(user: SoyibaUser, publication: SoyibaPublication) {
  return isAdminLike(user) || isSameAuthor(publication.author, user);
}

function isSameAuthor(author: SoyibaPublication['author'], user: SoyibaUser) {
  return Boolean(
    (author.id && user.id && author.id === user.id) ||
      (author.email && user.email && normalizeEmail(author.email) === normalizeEmail(user.email)),
  );
}

export function parsePublicationMediaInput(value: string): PublicationMediaItem[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parts = line.split('|').map((part) => part.trim()).filter(Boolean);
      const typeFromInput = normalizeMediaType(parts[0]);
      const url = typeFromInput ? parts[1] || '' : parts[0] || '';
      const title = typeFromInput ? parts.slice(2).join(' | ') : parts.slice(1).join(' | ');
      const type = typeFromInput || inferMediaType(url);

      return {
        id: `media-${Date.now()}-${index}`,
        type,
        url,
        title,
      };
    })
    .filter((item) => item.url);
}

export function extractYouTubeVideoId(url: unknown) {
  const value = stringFrom(url);

  if (!value) {
    return '';
  }

  const parsed = parseUrlWithProtocol(value);

  if (parsed) {
    const host = normalizeHost(parsed.hostname);

    if (!isYouTubeHost(host)) {
      return '';
    }

    if (host === 'youtu.be') {
      return cleanYouTubeVideoId(parsed.pathname.split('/').filter(Boolean)[0]);
    }

    const watchId = cleanYouTubeVideoId(parsed.searchParams.get('v'));

    if (watchId) {
      return watchId;
    }

    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const markerIndex = pathParts.findIndex((part) => ['embed', 'live', 'shorts', 'v'].includes(part.toLowerCase()));

    if (markerIndex >= 0) {
      return cleanYouTubeVideoId(pathParts[markerIndex + 1]);
    }

    return '';
  }

  const regexMatches = [
    value.match(/(?:youtube\.com\/watch\?[^#\s]*[?&]?v=)([a-zA-Z0-9_-]{6,128})/i),
    value.match(/(?:youtube\.com\/(?:embed|live|shorts|v)\/)([a-zA-Z0-9_-]{6,128})/i),
    value.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]{6,128})/i),
  ];

  return regexMatches.map((match) => cleanYouTubeVideoId(match?.[1])).find(Boolean) || '';
}

export function isYouTubeUrl(url: unknown) {
  const value = stringFrom(url);

  if (!value) {
    return false;
  }

  const parsed = parseUrlWithProtocol(value);

  if (parsed) {
    return isYouTubeHost(normalizeHost(parsed.hostname));
  }

  return /(?:youtube\.com|youtu\.be)/i.test(value);
}

export function getYouTubeEmbedUrl(url: unknown) {
  const videoId = extractYouTubeVideoId(url);
  return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
}

export function getYouTubeThumbnailCandidates(url: unknown) {
  const videoId = extractYouTubeVideoId(url);

  if (!videoId) {
    return [];
  }

  return [
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  ];
}

function getYouTubeWatchUrl(url: unknown) {
  const videoId = extractYouTubeVideoId(url);
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : '';
}

export function buildPublicationMediaItems({
  imageUrl,
  videoUrl,
  songUrl,
}: {
  imageUrl: string;
  videoUrl: string;
  songUrl: string;
}): PublicationMediaItem[] {
  const items: PublicationMediaItem[] = [];
  const trimmedImageUrl = imageUrl.trim();
  const trimmedVideoUrl = videoUrl.trim();
  const trimmedSongUrl = songUrl.trim();

  if (trimmedImageUrl) {
    items.push({
      id: `media-image-${Date.now()}`,
      type: 'image',
      url: trimmedImageUrl,
    });
  }

  if (trimmedVideoUrl) {
    const normalizedYouTubeUrl = getYouTubeWatchUrl(trimmedVideoUrl);

    items.push({
      id: `media-video-${Date.now()}`,
      type: inferVideoMediaType(trimmedVideoUrl),
      url: normalizedYouTubeUrl || trimmedVideoUrl,
    });
  }

  if (trimmedSongUrl) {
    items.push({
      id: `media-song-${Date.now()}`,
      type: 'spotify',
      url: trimmedSongUrl,
    });
  }

  return items;
}

export function getMediaFormValues(items: PublicationMediaItem[]) {
  return {
    imageUrl: items.find((item) => item.type === 'image')?.url || '',
    videoUrl: items.find((item) => item.type === 'youtube' || item.type === 'driveVideo')?.url || '',
    songUrl: items.find((item) => item.type === 'spotify')?.url || '',
  };
}

export function parseRelatedLinksInput(value: string): PublicationRelatedLink[] {
  return parseRelatedLinksValue(value);
}

export function normalizeRelatedLinkUrl(value: unknown) {
  const trimmed = stringFrom(value);

  if (!trimmed) {
    return '';
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function isValidRelatedLinkUrl(value: unknown) {
  const normalizedUrl = normalizeRelatedLinkUrl(value);

  if (!/^https?:\/\//i.test(normalizedUrl)) {
    return false;
  }

  try {
    const parsed = new URL(normalizedUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function cleanRelatedLinks(items: Array<Partial<PublicationRelatedLink>>) {
  return items
    .slice(0, MAX_RELATED_LINKS)
    .map((item, index) => ({
      id: stringFrom(item.id) || `link-${Date.now()}-${index}`,
      title: stringFrom(item.title),
      url: normalizeRelatedLinkUrl(item.url),
    }))
    .filter((item) => item.title || item.url);
}

export function serializeMediaInput(items: PublicationMediaItem[]) {
  return items.map((item) => `${item.type}|${item.url}${item.title ? `|${item.title}` : ''}`).join('\n');
}

export function serializeRelatedLinksInput(items: PublicationRelatedLink[]) {
  return items.map((item) => `${item.title}|${item.url}`).join('\n');
}

export function getPublicationCtaUrl(publication: SoyibaPublication) {
  if (publication.cta.type === 'Ninguno') {
    return '';
  }

  if (publication.cta.type === 'Whatsapp') {
    const phone = String(publication.cta.phone || '').replace(/\D/g, '');
    const message = `Bendiciones, quiero más información sobre ${publication.title}`;
    return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : '';
  }

  return publication.cta.url || '';
}

export function getPublicationCtaLabel(publication: Pick<SoyibaPublication, 'cta'>) {
  if (publication.cta.type === 'Ninguno') return '';
  if (publication.cta.type === 'Inscripcion') return 'Inscribirme';
  if (publication.cta.type === 'Whatsapp') return 'Whatsapp';
  return 'Abrir enlace';
}

function buildRequest(session: SoyibaSession, payload: PublicationPayload) {
  return {
    ...payload,
    token: session.token,
    user: getUserRequest(session.user),
  };
}

function getUserRequest(user: SoyibaUser) {
  return {
    id: user.id,
    email: user.email,
    name: getUserDisplayName(user),
    photoUrl: user.photoUrl,
    role: user.role,
    rolSistema: user.rolSistema,
    publicador: user.publicador,
    publicadorEco: user.publicadorEco,
    publicadorEvento: user.publicadorEvento,
    tipoUsuario: user.tipoUsuario,
    tipo_usuario: user.tipoUsuario,
    fechaNacimiento: user.fechaNacimiento,
    fecha_nacimiento: user.fechaNacimiento,
    registroMenorEdad: Boolean(user.registroMenorEdad),
    registro_menor_edad: Boolean(user.registroMenorEdad),
    minorValidator: Boolean(user.minorValidator),
    verificado: Boolean(user.verificado),
  };
}

function filterPublicationsByType(publications: SoyibaPublication[], type?: PublicationType) {
  return type ? publications.filter((publication) => publication.type === type) : publications;
}

function normalizePublications(value: unknown[], type?: PublicationType) {
  const publications = value.map(normalizePublication);
  return filterPublicationsByType(publications, type).sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt));
}

function hydrateCurrentUserAuthor(publications: SoyibaPublication[], user: SoyibaUser) {
  const photoUrl = stringFrom(user.photoUrl);

  if (!photoUrl && user.verificado === undefined) {
    return publications;
  }

  return publications.map((publication) => {
    if (!isSameAuthor(publication.author, user)) {
      return publication;
    }

    return {
      ...publication,
      author: {
        ...publication.author,
        photoUrl: photoUrl || publication.author.photoUrl,
        verified: user.verificado === undefined ? publication.author.verified : Boolean(user.verificado),
      },
    };
  });
}

async function hydratePublicationAuthors(publications: SoyibaPublication[], user: SoyibaUser) {
  const currentUserHydrated = hydrateCurrentUserAuthor(publications, user);
  const directoryProfiles = await getFirebaseDirectoryAuthorProfiles().catch(() => []);

  if (!directoryProfiles.length) {
    return currentUserHydrated;
  }

  const profilesById = new Map(directoryProfiles.filter((profile) => profile.id).map((profile) => [profile.id, profile]));
  const profilesByName = new Map<string, DirectoryAuthorProfile | null>();

  for (const profile of directoryProfiles) {
    const nameKey = normalizeAuthorName(profile.name);

    if (!nameKey) {
      continue;
    }

    profilesByName.set(nameKey, profilesByName.has(nameKey) ? null : profile);
  }

  return currentUserHydrated.map((publication) => {
    const match =
      profilesById.get(publication.author.id) ||
      profilesByName.get(normalizeAuthorName(publication.author.name)) ||
      null;

    if (!match || (!match.photoUrl && match.verified === undefined)) {
      return publication;
    }

    return {
      ...publication,
      author: {
        ...publication.author,
        photoUrl: match.photoUrl || publication.author.photoUrl,
        verified: match.verified === undefined ? publication.author.verified : match.verified,
      },
    };
  });
}

type DirectoryAuthorProfile = {
  id: string;
  name: string;
  photoUrl: string;
  verified?: boolean;
};

async function getFirebaseDirectoryAuthorProfiles(): Promise<DirectoryAuthorProfile[]> {
  if (!isFirebaseAuthEnabled()) {
    return [];
  }

  const app = getFirebaseApp();

  if (!app) {
    return [];
  }

  const { collection, getDocs, getFirestore, query, where } = await import('firebase/firestore');
  const db = getFirestore(app, getFirebasePublicationsDatabaseId());
  const snapshot = await getDocs(query(collection(db, 'membersDirectory'), where('visibleDirectorio', '==', true)));

  return snapshot.docs.map((item) => {
    const record = item.data() as Record<string, unknown>;
    const name = [stringFrom(record.nombre), stringFrom(record.apellido)].filter(Boolean).join(' ').trim();

    return {
      id: stringFrom(record.id || item.id),
      name,
      photoUrl: stringFrom(valueFrom(record.fotoUrl, record.photoUrl, record.foto_url, record.photo_url)),
      verified: record.verificado === undefined ? undefined : isTrue(record.verificado),
    };
  });
}

function normalizePublication(value: unknown): SoyibaPublication {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const author = (record.author && typeof record.author === 'object' ? record.author : {}) as Record<string, unknown>;
  const cta = (record.cta && typeof record.cta === 'object' ? record.cta : {}) as Record<string, unknown>;

  return {
    id: stringFrom(record.id || record.publication_id || record.publicationId),
    type: normalizePublicationType(record.type || record.tipo_publicacion),
    title: stringFrom(record.title || record.titulo),
    description: stringFrom(record.description || record.descripcion),
    createdAt: stringFrom(record.createdAt || record.created_at || new Date().toISOString()),
    updatedAt: stringFrom(record.updatedAt || record.updated_at),
    author: {
      id: stringFrom(author.id || record.publisher_user_id),
      name: stringFrom(author.name || record.publisher_name || 'SOY IBA'),
      email: stringFrom(author.email || record.publisher_email),
      photoUrl: stringFrom(author.photoUrl || record.publisher_photo_url),
      verified: isTrue(valueFrom(author.verified, author.verificado, record.publisher_verified, record.publisher_verificado, record.usuario_verificado)),
    },
    mediaItems: normalizeMediaItems(record.mediaItems || record.media_items_json),
    cta: {
      type: normalizeCtaType(cta.type || record.cta_type),
      url: stringFrom(cta.url || record.cta_url),
      phone: stringFrom(cta.phone || record.cta_phone),
    },
    relatedLinks: normalizeRelatedLinks(record.relatedLinks || record.related_links_json),
    membersOnly: isTrue(valueFrom(record.membersOnly, record.members_only, record.soloMiembros, record.solo_miembros)),
    visibleToMinors: isTrue(valueFrom(record.visibleToMinors, record.visible_to_minors, record.mostrarAMenores, record.mostrar_a_menores)),
    savedCount: numberFrom(record.savedCount || record.guardados),
    viewsCount: numberFrom(record.viewsCount || record.views),
    sharedCount: numberFrom(record.sharedCount || record.compartidos),
    savedByCurrentUser: isTrue(record.savedByCurrentUser || record.saved_by_current_user),
    event: normalizeEventDetails(record),
    eco: normalizeEcoDetails(record),
  };
}

function filterPublicationsForCurrentUser(publications: SoyibaPublication[], user: SoyibaUser) {
  if (!isMinorOrUnknownAudience(user)) {
    return publications;
  }

  return publications.filter((publication) => publication.visibleToMinors === true);
}

function isMinorOrUnknownAudience(user: SoyibaUser) {
  return isMinorFromBirthDate(user.fechaNacimiento) || isTrue(user.registroMenorEdad) || normalizeText(user.role || user.rolSistema) === 'public' || user.id === 'public-viewer';
}

function isMinorFromBirthDate(value: unknown) {
  const text = stringFrom(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const birthDate = new Date(year, month - 1, day);

  if (birthDate.getFullYear() !== year || birthDate.getMonth() !== month - 1 || birthDate.getDate() !== day) {
    return false;
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (birthDate > todayStart) {
    return false;
  }

  let age = todayStart.getFullYear() - year;
  const birthdayThisYear = new Date(todayStart.getFullYear(), month - 1, day);

  if (birthdayThisYear > todayStart) {
    age -= 1;
  }

  return age >= 0 && age < 18;
}

function normalizeEventDetails(record: Record<string, unknown>): PublicationEventDetails {
  const event = (record.event && typeof record.event === 'object' ? record.event : {}) as Record<string, unknown>;
  const dateTime = stringFrom(valueFrom(event.dateTime, event.fechaHora, record.eventDateTime, record.fecha_hora_evento, record.fecha_evento));
  const place = stringFrom(valueFrom(event.place, record.eventPlace, record.lugar_evento));
  const validFrom = stringFrom(valueFrom(event.validFrom, record.eventValidFrom, record.fecha_inicio_vigencia));
  const validUntil = stringFrom(valueFrom(event.validUntil, record.eventValidUntil, record.fecha_caducidad));
  const attendeesCount = numberFrom(valueFrom(event.attendeesCount, event.yoVoy, record.attendeesCount, record.yovoy));
  const rawCapacityTotal = numberFrom(valueFrom(event.capacityTotal, record.capacityTotal, record.cupos_total, record.cupos_totales));
  const rawCapacityAvailable = valueFrom(event.capacityAvailable, event.spotsAvailable, record.capacityAvailable, record.cupos);
  const capacityAvailable = rawCapacityAvailable === undefined ? Math.max(0, rawCapacityTotal - attendeesCount) : numberFrom(rawCapacityAvailable);
  const capacityTotal = rawCapacityTotal || capacityAvailable + attendeesCount;

  return {
    dateTime,
    place,
    validFrom,
    validUntil,
    capacityAvailable,
    attendeesCount,
    capacityTotal,
    currentUserGoing: isTrue(valueFrom(event.currentUserGoing, record.currentUserGoing, record.yovoy_by_current_user)),
    expired: isEventExpired(validUntil),
  };
}

function emptyEventDetails(): PublicationEventDetails {
  return {
    dateTime: '',
    place: '',
    validFrom: '',
    validUntil: '',
    capacityAvailable: 0,
    attendeesCount: 0,
    capacityTotal: 0,
    currentUserGoing: false,
    expired: false,
  };
}

function normalizeEcoDetails(record: Record<string, unknown>): PublicationEcoDetails {
  const eco = (record.eco && typeof record.eco === 'object' ? record.eco : {}) as Record<string, unknown>;

  return {
    day: stringFrom(valueFrom(eco.day, eco.diaEco, record.diaEco, record.dia_eco)),
    time: stringFrom(valueFrom(eco.time, eco.horaEco, record.horaEco, record.hora_eco)),
    host: stringFrom(valueFrom(eco.host, eco.anfitrion, record.anfitrion)),
    moderator: stringFrom(valueFrom(eco.moderator, eco.moderador, record.moderador)),
    phone: stringFrom(valueFrom(eco.phone, eco.telefonoContacto, record.telefonoContacto, record.telefono_contacto)),
    address: stringFrom(valueFrom(eco.address, eco.direccion, record.direccion)),
    neighborhood: stringFrom(valueFrom(eco.neighborhood, eco.barrio, record.barrio, record.sector)),
    city: stringFrom(valueFrom(eco.city, eco.ciudad, record.ciudad)),
    latitude: geoNumberFrom(valueFrom(eco.latitude, eco.latitud, record.latitud)),
    longitude: longitudeFrom(valueFrom(eco.longitude, eco.longitud, record.longitud)),
    attendeesCount: numberFrom(valueFrom(eco.attendeesCount, eco.asistentes, record.attendeesCount, record.asistentes)),
    currentUserAttending: isTrue(
      valueFrom(eco.currentUserAttending, record.currentUserAttending, record.asistenciaEcoByCurrentUser, record.asistencia_eco_by_current_user),
    ),
    validFrom: stringFrom(valueFrom(eco.validFrom, eco.fechaInicioVigencia, record.fechaInicioVigencia)),
    validUntil: stringFrom(valueFrom(eco.validUntil, eco.fechaFinVigencia, record.fechaFinVigencia)),
  };
}

function emptyEcoDetails(): PublicationEcoDetails {
  return {
    day: '',
    time: '',
    host: '',
    moderator: '',
    phone: '',
    address: '',
    neighborhood: '',
    city: '',
    latitude: null,
    longitude: null,
    attendeesCount: 0,
    currentUserAttending: false,
    validFrom: '',
    validUntil: '',
  };
}

function normalizeMediaItems(value: unknown): PublicationMediaItem[] {
  const items = parseJsonArray(value);

  return items.map((item, index) => normalizeMediaItem(item, index)).filter((item) => item.url);
}

function normalizeRelatedLinks(value: unknown): PublicationRelatedLink[] {
  return parseRelatedLinksValue(value);
}

function parseRelatedLinksValue(value: unknown): PublicationRelatedLink[] {
  const items = parseRelatedLinksArray(value);

  return cleanRelatedLinks(
    items
    .map((item, index) => {
      const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
      const textItem = typeof item === 'string' ? item : '';
      const legacyParts = textItem.split('|').map((part) => part.trim());
      const firstPartIsUrl = /^https?:\/\//i.test(legacyParts[0] || '');
      const title = stringFrom(record.title) || (firstPartIsUrl ? legacyParts[1] : legacyParts[0]) || `Enlace ${index + 1}`;
      const url = stringFrom(record.url) || (firstPartIsUrl ? legacyParts[0] : legacyParts[1]);

      return {
        id: stringFrom(record.id) || `link-${index}`,
        title,
        url,
      };
    }),
  ).filter((item) => item.title && isValidRelatedLinkUrl(item.url));
}

function parseRelatedLinksArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Legacy values can be stored as "Titulo|https://...".
  }

  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function normalizePublicationType(value: unknown): PublicationType {
  const normalized = normalizeText(value);
  return PUBLICATION_TYPES.find((type) => normalizeText(type) === normalized) || 'Publicacion';
}

function normalizeCtaType(value: unknown): PublicationCtaType {
  const normalized = normalizeText(value);
  return PUBLICATION_CTA_TYPES.find((type) => normalizeText(type) === normalized) || 'Ninguno';
}

function normalizeMediaType(value: unknown): PublicationMediaType | '' {
  const normalized = normalizeText(value).replace(/[_\s-]+/g, '');

  if (['imagen', 'image', 'foto'].includes(normalized)) return 'image';
  if (['youtube', 'yt'].includes(normalized)) return 'youtube';
  if (['drive', 'drivevideo', 'googledrive', 'video'].includes(normalized)) return 'driveVideo';
  if (normalized === 'spotify') return 'spotify';

  return '';
}

function inferMediaType(url: string): PublicationMediaType {
  const normalized = url.toLowerCase();

  if (isYouTubeUrl(url)) return 'youtube';
  if (normalized.includes('open.spotify.com')) return 'spotify';
  if (normalized.includes('drive.google.com')) return 'driveVideo';
  return 'image';
}

function inferVideoMediaType(url: string): 'youtube' | 'driveVideo' {
  return isYouTubeUrl(url) ? 'youtube' : 'driveVideo';
}

function normalizeMediaItem(value: unknown, index = 0): PublicationMediaItem {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const url = stringFrom(record.url);
  const type = normalizeMediaType(record.type) || inferMediaType(url);
  const normalizedYouTubeUrl = type === 'youtube' ? getYouTubeWatchUrl(url) : '';

  return {
    id: stringFrom(record.id) || `media-${index}`,
    type,
    url: normalizedYouTubeUrl || url,
    title: stringFrom(record.title),
  };
}

function parseUrlWithProtocol(value: string) {
  try {
    return new URL(value);
  } catch {
    try {
      return new URL(`https://${value}`);
    } catch {
      return null;
    }
  }
}

function normalizeHost(value: unknown) {
  return String(value || '').trim().toLowerCase().replace(/^www\./, '');
}

function isYouTubeHost(host: string) {
  return host === 'youtu.be' || host.endsWith('.youtu.be') || host === 'youtube.com' || host.endsWith('.youtube.com');
}

function cleanYouTubeVideoId(value: unknown) {
  try {
    const decoded = decodeURIComponent(String(value || '').trim());
    return decoded.match(/^([a-zA-Z0-9_-]{6,128})/)?.[1] || '';
  } catch {
    return String(value || '').trim().match(/^([a-zA-Z0-9_-]{6,128})/)?.[1] || '';
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('No fue posible leer el archivo.'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });
}

function formatPublicationUploadError(error?: string) {
  if (error && /DriveApp|Authorization|permission|denied|acceso denegado|autoriz/i.test(error)) {
    return 'Drive no pudo guardar el archivo. Verifica que el Web App ejecute como soyiba.app@gmail.com y que SOYIBA_PUBLICACIONES_MEDIA_FOLDER_ID apunte a una carpeta de Drive creada por esa cuenta y compartida como "Anyone with the link".';
  }

  if (error && /Load failed|Failed to fetch|NetworkError|timeout|timed out|aborted/i.test(error)) {
    return 'La carga se corto antes de terminar. En celular intenta con un archivo mas liviano, buena conexion, o pega un enlace de YouTube/Drive para videos largos.';
  }

  return error || 'No fue posible cargar el archivo a Drive.';
}

function formatFirebaseStorageUploadError(error?: string) {
  if (error && /auth\/operation-not-allowed|auth\/admin-restricted-operation/i.test(error)) {
    return 'Firebase no permitio iniciar sesion anonima. Activa Authentication > Sign-in method > Anonymous para subir archivos desde la app.';
  }

  if (error && /storage\/unauthorized|permission|unauthorized|denied/i.test(error)) {
    return 'Firebase Storage rechazo la subida. Revisa las reglas del bucket para permitir cargas autenticadas desde la app.';
  }

  if (error && /storage\/quota-exceeded|quota/i.test(error)) {
    return 'Firebase Storage alcanzo la cuota disponible. Revisa el plan o el uso del bucket.';
  }

  if (error && /storage\/canceled|cancel/i.test(error)) {
    return 'La subida a Firebase fue cancelada antes de terminar.';
  }

  if (error && /storage\/retry-limit-exceeded|timeout|network|failed to fetch/i.test(error)) {
    return 'La subida a Firebase se corto por conexion. Intenta de nuevo con mejor senal o un archivo mas liviano.';
  }

  return error || 'No fue posible subir el archivo a Firebase Storage.';
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function getUserDisplayName(user: SoyibaUser) {
  return user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Usuario SOY IBA';
}

function getFirebasePublicationsDatabaseId() {
  return String(import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || 'soyibadb').trim() || 'soyibadb';
}

function isAdminLike(user: SoyibaUser) {
  return ['admin', 'moderador'].includes(normalizeText(user.rolSistema || user.role));
}

function isTrue(value: unknown) {
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'si', 'yes'].includes(String(value || '').trim().toLowerCase());
}

function normalizeText(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function normalizeEmail(value: unknown) {
  return normalizeText(value);
}

function normalizeAuthorName(value: unknown) {
  return stringFrom(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function stringFrom(value: unknown) {
  return String(value || '').trim();
}

function numberFrom(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeViewsCountById(value: unknown) {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return Object.entries(record).reduce<Record<string, number>>((map, [publicationId, viewsCount]) => {
    map[publicationId] = numberFrom(viewsCount);
    return map;
  }, {});
}

function geoNumberFrom(value: unknown) {
  const normalized = String(value ?? '').trim().replace(',', '.');

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function longitudeFrom(value: unknown) {
  const parsed = geoNumberFrom(value);

  if (parsed === null) {
    return null;
  }

  // Colombia is west of Greenwich; operators often paste longitudes without the minus sign.
  if (parsed > 0 && parsed >= 60 && parsed <= 85) {
    return -parsed;
  }

  return parsed;
}

function getPublicationFeedUserCacheKey(session: SoyibaSession) {
  const identity = session.user.id || session.user.email || 'anon';
  const userType = normalizeText(session.user.tipoUsuario || '');
  const role = normalizeText(session.user.rolSistema || session.user.role || '');
  const minorState = isMinorOrUnknownAudience(session.user) ? 'restringido' : 'adulto';
  return `${identity}::${userType || 'sin-tipo'}::${role || 'sin-rol'}::${minorState}`;
}

function getPublicationFeedCacheKey(session: SoyibaSession, options: PublicationFeedOptions) {
  return `${getPublicationFeedUserCacheKey(session)}::${options.type || 'all'}`;
}

function getPublicationFeedStorageKey(cacheKey: string) {
  return `${PUBLICATION_FEED_STORAGE_PREFIX}${cacheKey}`;
}

function readStoredPublicationFeed(cacheKey: string, allowStale = false): SoyibaPublication[] | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(getPublicationFeedStorageKey(cacheKey));

    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as { timestamp?: number; publications?: unknown[] };
    const age = parsed.timestamp ? Date.now() - parsed.timestamp : Number.POSITIVE_INFINITY;
    const expired = !parsed.timestamp || age > PUBLICATION_FEED_STORAGE_TTL_MS;
    const tooStale = !parsed.timestamp || age > PUBLICATION_FEED_STORAGE_STALE_TTL_MS;

    if (tooStale) {
      window.localStorage.removeItem(getPublicationFeedStorageKey(cacheKey));
      return null;
    }

    if (expired && !allowStale) {
      return null;
    }

    return normalizePublications(parsed.publications || []);
  } catch {
    return null;
  }
}

function storePublicationFeed(cacheKey: string, publications: SoyibaPublication[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      getPublicationFeedStorageKey(cacheKey),
      JSON.stringify({
        timestamp: Date.now(),
        publications: clonePublications(publications),
      }),
    );
  } catch {
    // Storage can be full or unavailable in private browsing.
  }
}

function removeStoredPublicationFeeds(userKey: string) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const storagePrefix = `${PUBLICATION_FEED_STORAGE_PREFIX}${userKey}`;

    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);

      if (key?.startsWith(storagePrefix)) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore storage cleanup failures.
  }
}

function getCachedPublicationFeedInternal(session: SoyibaSession, options: PublicationFeedOptions) {
  const cacheKey = getPublicationFeedCacheKey(session, options);
  const cached = publicationFeedCache.get(cacheKey) || readStoredPublicationFeed(cacheKey, true);

  if (cached) {
    publicationFeedCache.set(cacheKey, clonePublications(cached));
    return cached;
  }

  if (options.type) {
    const allCacheKey = getPublicationFeedCacheKey(session, {});
    const allCached = publicationFeedCache.get(allCacheKey) || readStoredPublicationFeed(allCacheKey, true);

    if (allCached) {
      publicationFeedCache.set(allCacheKey, clonePublications(allCached));
    }

    return allCached ? filterPublicationsByType(allCached, options.type) : null;
  }

  return null;
}

function setPublicationFeedCache(session: SoyibaSession, options: PublicationFeedOptions, publications: SoyibaPublication[]) {
  const cacheKey = getPublicationFeedCacheKey(session, options);
  publicationFeedCache.set(cacheKey, clonePublications(publications));
  storePublicationFeed(cacheKey, publications);
}

function updateCachedPublication(
  session: SoyibaSession,
  publicationId: string,
  updater: (publication: SoyibaPublication) => SoyibaPublication,
) {
  const userKey = `${getPublicationFeedUserCacheKey(session)}::`;

  for (const [key, cachedPublications] of publicationFeedCache.entries()) {
    if (!key.startsWith(userKey)) {
      continue;
    }

    let changed = false;
    const nextPublications = cachedPublications.map((publication) => {
      if (publication.id !== publicationId) {
        return publication;
      }

      changed = true;
      return updater(clonePublication(publication));
    });

    if (changed) {
      publicationFeedCache.set(key, clonePublications(nextPublications));
    }
  }
}

function updateCachedPublications(session: SoyibaSession, updater: (publication: SoyibaPublication) => SoyibaPublication) {
  const userKey = `${getPublicationFeedUserCacheKey(session)}::`;

  for (const [key, cachedPublications] of publicationFeedCache.entries()) {
    if (!key.startsWith(userKey)) {
      continue;
    }

    publicationFeedCache.set(key, clonePublications(cachedPublications.map((publication) => updater(clonePublication(publication)))));
  }
}

function clearOtherCachedEcoAttendance(session: SoyibaSession, activePublicationId: string) {
  updateCachedPublications(session, (publication) => {
    if (publication.id === activePublicationId || publication.type !== 'Grupo ECO' || !publication.eco.currentUserAttending) {
      return publication;
    }

    return {
      ...publication,
      eco: {
        ...publication.eco,
        currentUserAttending: false,
        attendeesCount: Math.max(0, publication.eco.attendeesCount - 1),
      },
    };
  });
}

export function invalidatePublicationFeedCache(session: SoyibaSession) {
  const userKey = `${getPublicationFeedUserCacheKey(session)}::`;

  for (const key of publicationFeedCache.keys()) {
    if (key.startsWith(userKey)) {
      publicationFeedCache.delete(key);
    }
  }

  removeStoredPublicationFeeds(userKey);
}

function clonePublications(publications: SoyibaPublication[]) {
  return publications.map(clonePublication);
}

function clonePublication(publication: SoyibaPublication) {
  return {
    ...publication,
    author: { ...publication.author },
    mediaItems: publication.mediaItems.map((item) => ({ ...item })),
    cta: { ...publication.cta },
    relatedLinks: publication.relatedLinks.map((item) => ({ ...item })),
    event: { ...publication.event },
    eco: { ...publication.eco },
  };
}

function valueFrom(...values: unknown[]) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');
}

function isEventExpired(validUntil: string) {
  if (!validUntil) {
    return false;
  }

  const timestamp = Date.parse(validUntil);
  return Number.isFinite(timestamp) && timestamp < Date.now();
}
