import { callAppsScript } from '../../services/appsScriptClient';
import type { SoyibaSession, SoyibaUser } from '../Auth/auth.service';

export const PUBLICATION_TYPES = ['Publicacion', 'Devocional', 'Evento', 'Grupo ECO', 'Transmision'] as const;
export const PUBLICATION_CTA_TYPES = ['Ninguno', 'Enlace', 'Inscripcion', 'Whatsapp'] as const;

export type PublicationType = (typeof PUBLICATION_TYPES)[number];
export type PublicationCtaType = (typeof PUBLICATION_CTA_TYPES)[number];
export type PublicationMediaType = 'image' | 'youtube' | 'driveVideo' | 'spotify';

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
  };
  mediaItems: PublicationMediaItem[];
  cta: {
    type: PublicationCtaType;
    url?: string;
    phone?: string;
  };
  relatedLinks: PublicationRelatedLink[];
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

type PublicationsResponse = {
  ok: boolean;
  publications?: unknown[];
  publication?: unknown;
  media?: unknown;
  saved?: boolean;
  going?: boolean;
  attending?: boolean;
  error?: string;
};

const publicationFeedCache = new Map<string, SoyibaPublication[]>();

const localPublications: SoyibaPublication[] = [
  {
    id: 'local-sabiduria',
    type: 'Publicacion',
    title: '5 Claves para una vida de sabiduria',
    description:
      'Descubre principios practicos que te ayudaran a tomar mejores decisiones y a vivir conforme a la voluntad de Dios.\nUn espacio para crecer juntos durante esta semana.',
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
        title: 'Mas informacion del evento',
        url: 'https://drive.google.com',
      },
    ],
    savedCount: 1,
    viewsCount: 11,
    sharedCount: 16,
    savedByCurrentUser: false,
    event: {
      dateTime: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
      place: 'Auditorio IBA, Ibague',
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
    id: 'local-eco-centro',
    type: 'Grupo ECO',
    title: 'Grupo ECO Centro',
    description: 'Encuentro semanal para orar, compartir la palabra y acompanar nuevos procesos de fe.',
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
      city: 'Ibague',
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
  return cached ? clonePublications(cached) : null;
}

export async function getPublicationFeed(session: SoyibaSession, options: PublicationFeedOptions = {}) {
  const cached = getCachedPublicationFeedInternal(session, options);

  if (cached) {
    return clonePublications(cached);
  }

  const response = await callAppsScript<PublicationsResponse>(
    'Publicaciones',
    'list',
    {
      userId: session.user.id,
      email: session.user.email,
      type: options.type,
    },
    () => ({
      ok: true,
      publications: filterPublicationsByType(localPublications, options.type),
    }),
  );

  if (!response.ok) {
    throw new Error(response.error || 'No fue posible cargar las publicaciones.');
  }

  const publications = normalizePublications(response.publications || [], options.type);
  setPublicationFeedCache(session, options, publications);
  return publications;
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
        },
        savedCount: 0,
        viewsCount: 0,
        sharedCount: 0,
        savedByCurrentUser: false,
      },
    }),
  );

  if (!response.ok || !response.publication) {
    throw new Error(response.error || 'No fue posible crear la publicacion.');
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
        },
        savedCount: 0,
        viewsCount: 0,
        sharedCount: 0,
        savedByCurrentUser: false,
      },
    }),
  );

  if (!response.ok || !response.publication) {
    throw new Error(response.error || 'No fue posible actualizar la publicacion.');
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
    throw new Error(response.error || 'No fue posible eliminar la publicacion.');
  }

  invalidatePublicationFeedCache(session);
}

export async function uploadPublicationMedia(session: SoyibaSession, file: File, mediaType: 'image' | 'driveVideo') {
  const dataUrl = await readFileAsDataUrl(file);
  const response = await callAppsScript<PublicationsResponse>(
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

export async function recordPublicationView(session: SoyibaSession, publicationId: string) {
  await callAppsScript<PublicationsResponse>(
    'Publicaciones',
    'recordView',
    {
      publicationId,
      user: getUserRequest(session.user),
      token: session.token,
    },
    () => ({ ok: true }),
  );

  updateCachedPublication(session, publicationId, (publication) => ({
    ...publication,
    viewsCount: publication.viewsCount + 1,
  }));
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
  return isAdminLike(user) || publication.author.id === user.id || normalizeEmail(publication.author.email) === normalizeEmail(user.email);
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
    items.push({
      id: `media-video-${Date.now()}`,
      type: inferVideoMediaType(trimmedVideoUrl),
      url: trimmedVideoUrl,
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
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parts = line.split('|').map((part) => part.trim()).filter(Boolean);
      const firstPartIsUrl = /^https?:\/\//i.test(parts[0] || '');
      const title = firstPartIsUrl ? parts[1] || `Enlace ${index + 1}` : parts[0] || `Enlace ${index + 1}`;
      const url = firstPartIsUrl ? parts[0] : parts[1] || '';

      return {
        id: `link-${Date.now()}-${index}`,
        title,
        url,
      };
    })
    .filter((item) => item.url);
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
    const message = `Bendiciones, quiero mas informacion sobre ${publication.title}`;
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
  };
}

function filterPublicationsByType(publications: SoyibaPublication[], type?: PublicationType) {
  return type ? publications.filter((publication) => publication.type === type) : publications;
}

function normalizePublications(value: unknown[], type?: PublicationType) {
  const publications = value.map(normalizePublication);
  return filterPublicationsByType(publications, type).sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt));
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
    },
    mediaItems: normalizeMediaItems(record.mediaItems || record.media_items_json),
    cta: {
      type: normalizeCtaType(cta.type || record.cta_type),
      url: stringFrom(cta.url || record.cta_url),
      phone: stringFrom(cta.phone || record.cta_phone),
    },
    relatedLinks: normalizeRelatedLinks(record.relatedLinks || record.related_links_json),
    savedCount: numberFrom(record.savedCount || record.guardados),
    viewsCount: numberFrom(record.viewsCount || record.views),
    sharedCount: numberFrom(record.sharedCount || record.compartidos),
    savedByCurrentUser: isTrue(record.savedByCurrentUser || record.saved_by_current_user),
    event: normalizeEventDetails(record),
    eco: normalizeEcoDetails(record),
  };
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
  const items = parseJsonArray(value);

  return items
    .map((item, index) => {
      const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
      const url = stringFrom(record.url);

      return {
        id: stringFrom(record.id) || `link-${index}`,
        title: stringFrom(record.title) || `Enlace ${index + 1}`,
        url,
      };
    })
    .filter((item) => item.url);
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

  if (normalized.includes('youtube.com') || normalized.includes('youtu.be')) return 'youtube';
  if (normalized.includes('open.spotify.com')) return 'spotify';
  if (normalized.includes('drive.google.com')) return 'driveVideo';
  return 'image';
}

function inferVideoMediaType(url: string): 'youtube' | 'driveVideo' {
  const normalized = url.toLowerCase();
  return normalized.includes('youtube.com') || normalized.includes('youtu.be') ? 'youtube' : 'driveVideo';
}

function normalizeMediaItem(value: unknown, index = 0): PublicationMediaItem {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const url = stringFrom(record.url);

  return {
    id: stringFrom(record.id) || `media-${index}`,
    type: normalizeMediaType(record.type) || inferMediaType(url),
    url,
    title: stringFrom(record.title),
  };
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

  return error || 'No fue posible cargar el archivo a Drive.';
}

function getUserDisplayName(user: SoyibaUser) {
  return user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Usuario SOY IBA';
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

function stringFrom(value: unknown) {
  return String(value || '').trim();
}

function numberFrom(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

function getPublicationFeedCacheKey(session: SoyibaSession, options: PublicationFeedOptions) {
  return `${session.user.id || session.user.email || 'anon'}::${options.type || 'all'}`;
}

function getCachedPublicationFeedInternal(session: SoyibaSession, options: PublicationFeedOptions) {
  const cached = publicationFeedCache.get(getPublicationFeedCacheKey(session, options));

  if (cached) {
    return cached;
  }

  if (options.type) {
    const allCached = publicationFeedCache.get(getPublicationFeedCacheKey(session, {}));
    return allCached ? filterPublicationsByType(allCached, options.type) : null;
  }

  return null;
}

function setPublicationFeedCache(session: SoyibaSession, options: PublicationFeedOptions, publications: SoyibaPublication[]) {
  publicationFeedCache.set(getPublicationFeedCacheKey(session, options), clonePublications(publications));
}

function updateCachedPublication(
  session: SoyibaSession,
  publicationId: string,
  updater: (publication: SoyibaPublication) => SoyibaPublication,
) {
  const userKey = `${session.user.id || session.user.email || 'anon'}::`;

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
  const userKey = `${session.user.id || session.user.email || 'anon'}::`;

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

function invalidatePublicationFeedCache(session: SoyibaSession) {
  const userKey = `${session.user.id || session.user.email || 'anon'}::`;

  for (const key of publicationFeedCache.keys()) {
    if (key.startsWith(userKey)) {
      publicationFeedCache.delete(key);
    }
  }
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
