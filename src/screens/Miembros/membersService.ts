import { callAppsScript } from '../../services/appsScriptClient';
import { getFirebaseApp } from '../../services/firebase';
import { isFirebaseAuthEnabled } from '../../services/firebaseAuth';
import type { SoyibaSession, SoyibaUser } from '../Auth/auth.service';

export type IbaMember = {
  id: string;
  nombre: string;
  apellido: string;
  fotoUrl: string;
  telefono: string;
  email: string;
  rol: string;
  rolSistema: string;
  tituloUsuario: string;
  tipoUsuario: string;
  ministerio: string;
  grupoEco: string;
  sector: string;
  tiempoEnIBA: string;
  visibleDirectorio: boolean;
  mostrarTelefono: boolean;
  permitirWhatsapp: boolean;
  mostrarFoto: boolean;
  mostrarMinisterio: boolean;
  mostrarGrupoEco: boolean;
  verificado: boolean;
  estado: string;
  fechaRegistro: string;
  fechaActualizacion: string;
};

type MembersResponse = {
  ok: boolean;
  members?: unknown[];
  miembros?: unknown[];
  users?: unknown[];
  error?: string;
};

const localMembersSeed: Array<Partial<IbaMember>> = [
  {
    id: 'local-pastor',
    nombre: 'Felipe',
    apellido: 'Trujillo',
    fotoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    telefono: '3243339375',
    rol: 'Moderador',
    rolSistema: 'Moderador',
    tituloUsuario: 'Pastor',
    tipoUsuario: 'Miembro',
    ministerio: 'Pastoral',
    grupoEco: 'ECO Centro',
    sector: 'Envigado',
    tiempoEnIBA: '10 anos',
    visibleDirectorio: true,
    mostrarTelefono: true,
    permitirWhatsapp: true,
    mostrarFoto: true,
    mostrarMinisterio: true,
    mostrarGrupoEco: true,
    verificado: true,
    estado: 'Activo',
  },
  {
    id: 'local-alabanza',
    nombre: 'Laura',
    apellido: 'Rojas',
    fotoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
    telefono: '3002223344',
    rol: 'Miembro',
    rolSistema: 'Miembro',
    tituloUsuario: 'Servidor',
    tipoUsuario: 'Miembro',
    ministerio: 'Alabanza',
    grupoEco: 'ECO Sur',
    sector: 'Sabaneta',
    tiempoEnIBA: '4 anos',
    visibleDirectorio: true,
    mostrarTelefono: true,
    permitirWhatsapp: true,
    mostrarFoto: true,
    mostrarMinisterio: true,
    mostrarGrupoEco: false,
    verificado: true,
    estado: 'Activo',
  },
  {
    id: 'local-eco',
    nombre: 'Daniel',
    apellido: 'Gomez',
    rol: 'Miembro',
    rolSistema: 'Miembro',
    tituloUsuario: 'Lider ECO',
    tipoUsuario: 'Miembro',
    ministerio: 'Grupos ECO',
    grupoEco: 'ECO Laureles',
    sector: 'Laureles',
    tiempoEnIBA: '2 anos',
    visibleDirectorio: true,
    mostrarTelefono: false,
    permitirWhatsapp: true,
    mostrarFoto: false,
    mostrarMinisterio: true,
    mostrarGrupoEco: true,
    verificado: false,
    estado: 'Activo',
  },
  {
    id: 'local-infantil',
    nombre: 'Marcela',
    apellido: 'Vargas',
    telefono: '3104455667',
    rol: 'Miembro',
    rolSistema: 'Miembro',
    tituloUsuario: 'Servidor',
    tipoUsuario: 'Miembro',
    ministerio: 'Infantil',
    sector: 'Belen',
    tiempoEnIBA: '8 meses',
    visibleDirectorio: true,
    mostrarTelefono: true,
    permitirWhatsapp: true,
    mostrarFoto: false,
    mostrarMinisterio: true,
    mostrarGrupoEco: false,
    verificado: false,
    estado: 'Activo',
  },
  {
    id: 'local-hidden',
    nombre: 'Privado',
    apellido: 'No Visible',
    rol: 'Miembro',
    rolSistema: 'Miembro',
    tituloUsuario: 'Miembro',
    tipoUsuario: 'Miembro',
    visibleDirectorio: false,
    mostrarTelefono: false,
    permitirWhatsapp: false,
    mostrarFoto: false,
    mostrarMinisterio: false,
    mostrarGrupoEco: false,
    verificado: false,
    estado: 'Activo',
  },
];

export async function getMembersDirectory(session: SoyibaSession): Promise<IbaMember[]> {
  if (isFirebaseAuthEnabled()) {
    return getFirebaseMembersDirectory(session);
  }

  const response = await callAppsScript<MembersResponse>(
    'Miembros',
    'listMembers',
    {
      token: session.token,
      userId: session.user.id,
      email: session.user.email,
    },
    () => ({
      ok: true,
      members: localMembersSeed,
    }),
  );

  if (response.ok) {
    const members = normalizeMembers(response.members || response.miembros || response.users || []);

    if (members.length || !canManageMembersDirectory(session.user)) {
      return members;
    }

    return getMembersDirectoryFromManagedUsers(session);
  }

  if (canManageMembersDirectory(session.user)) {
    return getMembersDirectoryFromManagedUsers(session);
  }

  if (!response.ok) {
    throw new Error(response.error || 'No fue posible cargar el directorio.');
  }

  throw new Error('No fue posible cargar el directorio.');
}

async function getFirebaseMembersDirectory(session: SoyibaSession): Promise<IbaMember[]> {
  const app = getFirebaseApp();

  if (!app) {
    throw new Error('Firebase no esta configurado.');
  }

  try {
    const { collection, getDocs, getFirestore, query, where } = await import('firebase/firestore');
    const db = getFirestore(app, getFirebaseMembersDatabaseId());
    const source = query(collection(db, 'membersDirectory'), where('visibleDirectorio', '==', true));
    const snapshot = await getDocs(source);
    return normalizeMembers(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  } catch {
    throw new Error('No fue posible cargar Miembros IBA desde Firebase. Revisa las reglas de Firestore.');
  }
}

function getFirebaseMembersDatabaseId() {
  return String(import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || 'soyibadb').trim() || 'soyibadb';
}

export function canViewMembersDirectory(user: SoyibaUser) {
  const active = user.active === undefined ? isActiveState(user.estadoUsuario || 'Activo') : toBoolean(user.active);
  return canManageMembersDirectory(user) || (active && isActiveState(user.estadoUsuario || 'Activo') && isMemberType(user.tipoUsuario));
}

export function getMemberFullName(member: Pick<IbaMember, 'nombre' | 'apellido' | 'email'>) {
  return [member.nombre, member.apellido].filter(Boolean).join(' ').trim() || member.email || 'Miembro IBA';
}

export function getMemberInitials(member: Pick<IbaMember, 'nombre' | 'apellido' | 'email'>) {
  return getMemberFullName(member)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function getWhatsappUrl(member: IbaMember, currentUser: SoyibaUser) {
  if (!canUseWhatsapp(member)) {
    return '';
  }

  const name = getMemberFullName(member).split(/\s+/)[0] || getMemberFullName(member);
  const currentUserName = getUserDisplayName(currentUser);
  const message = `Hola ${name}, Dios te bendiga. Soy ${currentUserName} de la Iglesia Bíblica Antioquía. Quería saludarte desde la app Soy IBA.`;
  return `https://wa.me/57${member.telefono}?text=${encodeURIComponent(message)}`;
}

export function canUseWhatsapp(member: IbaMember) {
  return Boolean(member.permitirWhatsapp && member.mostrarTelefono && member.telefono);
}

export function normalizeSearchText(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function normalizeMembers(value: unknown[]) {
  return value.map(normalizeMember).filter(isVisibleDirectoryMember).sort(compareMembers);
}

function normalizeMember(value: unknown): IbaMember {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const rawPhone = normalizeLocalPhone(valueFrom(record.telefono, record.phone, record.celular));
  const mostrarTelefonoValue = valueFrom(record.mostrarTelefono, record.mostrar_telefono);
  const permitirWhatsappValue = valueFrom(record.permitirWhatsapp, record.permitir_whatsapp);
  const mostrarTelefono = mostrarTelefonoValue === undefined ? Boolean(rawPhone) : toBoolean(mostrarTelefonoValue);
  const permitirWhatsapp = permitirWhatsappValue === undefined ? Boolean(rawPhone) : toBoolean(permitirWhatsappValue);
  const fotoUrl = stringFrom(valueFrom(record.fotoUrl, record.foto_url, record.photoUrl, record.photo_url));
  const mostrarFotoValue = valueFrom(record.mostrarFoto, record.mostrar_foto);
  const mostrarFoto = mostrarFotoValue === undefined ? Boolean(fotoUrl) : toBoolean(mostrarFotoValue);
  const mostrarMinisterio = toBoolean(valueFrom(record.mostrarMinisterio, record.mostrar_ministerio));
  const mostrarGrupoEco = toBoolean(valueFrom(record.mostrarGrupoEco, record.mostrar_grupo_eco));
  const telefono = mostrarTelefono && permitirWhatsapp ? rawPhone : '';

  const tipoUsuario = stringFrom(valueFrom(record.tipoUsuario, record.tipo_usuario)) || 'Miembro';
  const estado = stringFrom(valueFrom(record.estado, record.estadoUsuario, record.estado_usuario, record.status)) || 'Activo';
  const visibleValue = valueFrom(record.visibleDirectorio, record.visible_directorio);
  const rolSistema = stringFrom(valueFrom(record.rolSistema, record.rol_sistema, record.role, record.rol)) || tipoUsuario;
  const tituloUsuario = stringFrom(valueFrom(record.tituloUsuario, record.titulo_usuario, record.titulo, record.rol)) || tipoUsuario;

  return {
    id: stringFrom(valueFrom(record.id, record.memberId, record.user_id, record.email)),
    nombre: stringFrom(valueFrom(record.nombre, record.firstName, record.first_name)),
    apellido: stringFrom(valueFrom(record.apellido, record.lastName, record.last_name)),
    fotoUrl,
    telefono,
    email: stringFrom(record.email).toLowerCase(),
    rol: rolSistema,
    rolSistema,
    tituloUsuario,
    tipoUsuario,
    ministerio: mostrarMinisterio ? stringFrom(record.ministerio) : '',
    grupoEco: mostrarGrupoEco ? stringFrom(valueFrom(record.grupoEco, record.grupo_eco)) : '',
    sector: stringFrom(record.sector),
    tiempoEnIBA: stringFrom(valueFrom(record.tiempoEnIBA, record.tiempo_en_iba, record.tiempoIba, record.tiempo_iba)),
    visibleDirectorio: visibleValue === undefined ? isMemberType(tipoUsuario) && isActiveState(estado) : toBoolean(visibleValue),
    mostrarTelefono,
    permitirWhatsapp,
    mostrarFoto,
    mostrarMinisterio,
    mostrarGrupoEco,
    verificado: toBoolean(valueFrom(record.verificado, record.usuarioVerificado, record.usuario_verificado, record.verified)),
    estado,
    fechaRegistro: stringFrom(valueFrom(record.fechaRegistro, record.fecha_registro, record.createdAt, record.created_at)),
    fechaActualizacion: stringFrom(valueFrom(record.fechaActualizacion, record.fecha_actualizacion, record.updatedAt, record.updated_at)),
  };
}

function isVisibleDirectoryMember(member: IbaMember) {
  return member.visibleDirectorio && isActiveState(member.estado) && isMemberType(member.tipoUsuario);
}

function compareMembers(first: IbaMember, second: IbaMember) {
  return getMemberFullName(first).localeCompare(getMemberFullName(second), 'es', { sensitivity: 'base' });
}

function getUserDisplayName(user: SoyibaUser) {
  return user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Usuario SOY IBA';
}

async function getMembersDirectoryFromManagedUsers(session: SoyibaSession) {
  const response = await callAppsScript<MembersResponse>(
    'Auth',
    'listUsers',
    {
      token: session.token,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
    },
    () => ({
      ok: true,
      users: localMembersSeed,
    }),
  );

  if (!response.ok) {
    throw new Error(response.error || 'No fue posible cargar usuarios desde Auth.');
  }

  return normalizeMembers(response.users || []);
}

function canManageMembersDirectory(user: SoyibaUser) {
  return ['admin', 'moderador'].includes(normalizeSearchText(user.rolSistema || user.role));
}

function isActiveState(value: unknown) {
  const normalized = normalizeSearchText(value);
  return normalized === 'activo' || normalized === 'active';
}

function isMemberType(value: unknown) {
  return normalizeSearchText(value) === 'miembro';
}

function normalizeLocalPhone(value: unknown) {
  const digits = String(value || '').replace(/\D/g, '');

  if (digits.startsWith('57') && digits.length > 10) {
    return digits.slice(2);
  }

  return digits;
}

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }

  return ['true', '1', 'si', 'sí', 'yes', 'activo', 'active'].includes(normalizeSearchText(value));
}

function stringFrom(value: unknown) {
  return String(value || '').trim();
}

function valueFrom(...values: unknown[]) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');
}
