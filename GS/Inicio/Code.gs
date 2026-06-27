var SOYIBA_INICIO_SPREADSHEET_ID = '1D99Q2bZuM8fYg1W_yvbsAT2VqKZZYWk6COGMm3AZar0';
var SOYIBA_INICIO_SHEET = 'Inicio';
var SOYIBA_INICIO_HEADERS = ['metric_id', 'label', 'value', 'sort_order', 'visible', 'updated_at'];
var SOYIBA_AUTH_SPREADSHEET_ID = '1Sk6f6mScrMTcXfa-psxoY4boa_1gqJmFt7anP-lpErM';
var SOYIBA_AUTH_SHEET = 'Auth';
var SOYIBA_INICIO_CODE_VERSION = 'publicaciones-solo-miembros-2026-06-27';
var SOYIBA_AUTH_HEADERS = [
  'user_id',
  'email',
  'password_hash',
  'salt',
  'display_name',
  'role',
  'status',
  'created_at',
  'updated_at',
  'last_login_at',
  'fcm_token',
  'first_name',
  'last_name',
  'phone',
  'tipo_usuario',
  'titulo_usuario',
  'rol_sistema',
  'estado_usuario',
  'publicador',
  'publicador_eco',
  'publicador_evento',
  'acepto_politica_datos',
  'fecha_aceptacion_politica',
  'active',
  'tiempo_iba',
  'usuario_verificado',
  'photo_url'
];
var SOYIBA_PUBLICACIONES_SPREADSHEET_ID = SOYIBA_INICIO_SPREADSHEET_ID;
var SOYIBA_PUBLICACIONES_SHEET = 'Publicaciones';
var SOYIBA_GUARDADOS_SHEET = 'Guardados';
var SOYIBA_YOVOY_SHEET = 'YoVoy';
var SOYIBA_ASISTENCIAS_ECO_SHEET = 'AsistenciasECO';
var SOYIBA_PUBLICACIONES_MEDIA_FOLDER_ID = '1QqE9UI2Y0O2Md0sb3tyYPYFiUAUw_vXn';
var SOYIBA_PUBLICACIONES_MEDIA_FOLDER_NAME = 'SOYIBA Publicaciones';
var SOYIBA_PUBLICACIONES_SHARE_UPLOADED_FILES = false;
var SOYIBA_PUBLICACIONES_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
var SOYIBA_PUBLICACIONES_HEADERS = [
  'publication_id',
  'created_at',
  'updated_at',
  'status',
  'publisher_user_id',
  'publisher_name',
  'publisher_email',
  'publisher_photo_url',
  'tipo_publicacion',
  'title',
  'description',
  'media_items_json',
  'cta_type',
  'cta_url',
  'cta_phone',
  'related_links_json',
  'guardados',
  'views',
  'compartidos',
  'sort_timestamp',
  'fecha_hora_evento',
  'lugar_evento',
  'fecha_inicio_vigencia',
  'fecha_caducidad',
  'cupos',
  'yovoy',
  'diaEco',
  'horaEco',
  'anfitrion',
  'moderador',
  'telefonoContacto',
  'direccion',
  'barrio',
  'ciudad',
  'latitud',
  'longitud',
  'asistentes',
  'fechaInicioVigencia',
  'fechaFinVigencia',
  'solo_miembros'
];
var SOYIBA_GUARDADOS_HEADERS = [
  'saved_id',
  'publication_id',
  'user_id',
  'user_email',
  'user_name',
  'created_at'
];
var SOYIBA_YOVOY_HEADERS = [
  'yovoy_id',
  'publication_id',
  'user_id',
  'user_email',
  'user_name',
  'created_at'
];
var SOYIBA_ASISTENCIAS_ECO_HEADERS = [
  'idRegistro',
  'idPublicacion',
  'idUsuario',
  'fechaRegistro'
];
var SOYIBA_DONACIONES_SPREADSHEET_ID = SOYIBA_INICIO_SPREADSHEET_ID;
var SOYIBA_DONACIONES_CONFIG_SHEET = 'DonacionesConfig';
var SOYIBA_DONACIONES_CONFIG_HEADERS = [
  'id',
  'banco',
  'tipoCuenta',
  'numeroCuenta',
  'titular',
  'nit',
  'qrUrl',
  'correoContacto',
  'activo',
  'updatedAt'
];

function doGet(e) {
  var moduleName = e && e.parameter ? String(e.parameter.module || '') : '';
  var actionName = e && e.parameter ? String(e.parameter.action || '') : '';
  if (moduleName === 'Auth') {
    return soyibaInicioJson_({ ok: true, module: 'Auth', screen: 'Auth', version: SOYIBA_INICIO_CODE_VERSION });
  }

  if (moduleName === 'Publicaciones') {
    if (actionName === 'driveHealth' || actionName === 'authorizeDrive') {
      return soyibaInicioJson_(soyibaPublicacionesDriveHealth_());
    }

    if (actionName === 'driveWriteHealth') {
      return soyibaInicioJson_(soyibaPublicacionesDriveWriteHealth_());
    }

    return soyibaInicioJson_({ ok: true, module: 'Publicaciones', screen: 'Publicaciones', version: SOYIBA_INICIO_CODE_VERSION });
  }

  if (moduleName === 'Donaciones') {
    return soyibaInicioJson_({ ok: true, module: 'Donaciones', screen: 'Donaciones', version: SOYIBA_INICIO_CODE_VERSION });
  }

  return soyibaInicioJson_({ ok: true, module: 'Inicio', screen: 'Inicio', version: SOYIBA_INICIO_CODE_VERSION });
}

function doPost(e) {
  try {
    var payload = soyibaInicioParsePayload_(e);
    var action = payload.action || 'summary';
    var moduleName = String(payload.module || '');
    var data = payload.data || {};

    if (
      moduleName === 'Auth' ||
      moduleName === 'Miembros' ||
      action === 'register' ||
      action === 'login' ||
      action === 'updateFcmToken' ||
      action === 'updateProfile' ||
      action === 'updateProfilePhoto' ||
      action === 'changePassword' ||
      action === 'listUsers' ||
      action === 'listMembers' ||
      action === 'listDirectoryMembers' ||
      action === 'updateUserAccess'
    ) {
      return soyibaInicioJson_(soyibaAuthHandle_(action, data));
    }

    if (moduleName === 'Publicaciones') {
      return soyibaInicioJson_(soyibaPublicacionesHandle_(action, data));
    }

    if (moduleName === 'Donaciones') {
      return soyibaInicioJson_(soyibaDonacionesHandle_(action, data));
    }

    if (action === 'health') {
      return soyibaInicioJson_({ ok: true, module: 'Inicio' });
    }

    if (action === 'summary') {
      return soyibaInicioJson_(soyibaInicioSummary_());
    }

    if (action === 'upsertMetric') {
      return soyibaInicioJson_(soyibaInicioUpsertMetric_(data));
    }

    return soyibaInicioJson_({ ok: false, error: 'Accion no soportada: ' + action });
  } catch (error) {
    return soyibaInicioJson_({ ok: false, error: error.message || String(error) });
  }
}

function soyibaAuthHandle_(action, data) {
  if (action === 'health') {
    return { ok: true, module: 'Auth', version: SOYIBA_INICIO_CODE_VERSION };
  }

  if (action === 'version') {
    return { ok: true, module: 'Auth', version: SOYIBA_INICIO_CODE_VERSION };
  }

  if (action === 'register') {
    return soyibaAuthRegister_(data);
  }

  if (action === 'login') {
    return soyibaAuthLogin_(data);
  }

  if (action === 'updateFcmToken') {
    return soyibaAuthUpdateFcmToken_(data);
  }

  if (action === 'updateProfile') {
    return soyibaAuthUpdateProfile_(data);
  }

  if (action === 'updateProfilePhoto') {
    return soyibaAuthUpdateProfilePhoto_(data);
  }

  if (action === 'changePassword') {
    return soyibaAuthChangePassword_(data);
  }

  if (action === 'listUsers') {
    return soyibaAuthListUsers_(data);
  }

  if (action === 'listMembers' || action === 'listDirectoryMembers') {
    return soyibaMembersList_(data);
  }

  if (action === 'updateUserAccess') {
    return soyibaAuthUpdateUserAccess_(data);
  }

  return { ok: false, error: 'Accion no soportada: ' + action };
}

function soyibaInicioSummary_() {
  var sheet = soyibaInicioGetSheet_();
  var values = sheet.getDataRange().getValues();
  var headers = values[0] || SOYIBA_INICIO_HEADERS;
  var metrics = [];

  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    var record = soyibaInicioRowToObject_(headers, values[rowIndex]);

    if (String(record.visible).toUpperCase() === 'FALSE') {
      continue;
    }

    metrics.push({
      id: String(record.metric_id),
      label: String(record.label),
      value: String(record.value)
    });
  }

  if (metrics.length === 0) {
    metrics = [
      { id: 'usuarios_activos', label: 'Usuarios', value: '0' },
      { id: 'solicitudes_hoy', label: 'Solicitudes', value: '0' },
      { id: 'alertas', label: 'Alertas', value: '0' }
    ];
  }

  return {
    ok: true,
    version: SOYIBA_INICIO_CODE_VERSION,
    updatedAt: new Date().toISOString(),
    metrics: metrics,
    notices: [
      {
        id: 'inicio',
        title: 'Inicio conectado',
        body: 'Resumen cargado desde Google Sheets.'
      }
    ]
  };
}

function soyibaInicioUpsertMetric_(data) {
  var sheet = soyibaInicioGetSheet_();
  var headers = soyibaInicioGetHeaders_(sheet);
  var metricId = String(data.metric_id || data.id || '').trim();

  if (!metricId) {
    return { ok: false, error: 'metric_id es requerido.' };
  }

  var row = soyibaInicioFindMetricRow_(sheet, metricId);
  var values = [
    metricId,
    String(data.label || metricId),
    String(data.value || '0'),
    Number(data.sort_order || 999),
    data.visible === false ? 'FALSE' : 'TRUE',
    new Date().toISOString()
  ];

  if (row > 0) {
    sheet.getRange(row, 1, 1, headers.length).setValues([values]);
  } else {
    sheet.appendRow(values);
  }

  return { ok: true, metric_id: metricId };
}

function soyibaAuthRegister_(data) {
  var email = soyibaAuthNormalizeEmail_(data.email);
  var password = String(data.password || '');
  var firstName = String(data.firstName || data.first_name || '').trim();
  var lastName = String(data.lastName || data.last_name || '').trim();
  var phone = String(data.phone || data.celular || '').trim();
  var displayName = String(data.displayName || data.display_name || [firstName, lastName].join(' ').trim() || email.split('@')[0] || 'Usuario');
  var role = String(data.role || data.rolSistema || 'Usuario');
  var tipoUsuario = String(data.tipoUsuario || data.tipo_usuario || 'Asistente');
  var tituloUsuario = String(data.tituloUsuario || data.titulo_usuario || 'Asistente');
  var rolSistema = String(data.rolSistema || data.rol_sistema || role || 'Usuario');
  var estadoUsuario = String(data.estadoUsuario || data.estado_usuario || 'Activo');

  if (!email || !password || !firstName || !lastName || !phone) {
    return { ok: false, error: 'Correo, contrasena, nombres, apellidos y celular son requeridos.' };
  }

  if (password.length < 8) {
    return { ok: false, error: 'La contrasena debe tener minimo 8 caracteres.' };
  }

  var sheet = soyibaAuthGetSheet_();
  var existing = soyibaAuthFindUserByEmail_(sheet, email);

  if (existing.row > 0) {
    return { ok: false, error: 'El usuario ya existe.' };
  }

  var now = new Date().toISOString();
  var salt = Utilities.getUuid();
  var hash = soyibaAuthHashPassword_(password, salt);
  var userId = Utilities.getUuid();
  var row = [
    userId,
    email,
    hash,
    salt,
    displayName,
    role,
    'active',
    now,
    now,
    '',
    '',
    firstName,
    lastName,
    phone,
    tipoUsuario,
    tituloUsuario,
    rolSistema,
    estadoUsuario,
    false,
    false,
    false,
    true,
    now,
    true,
    '',
    false,
    ''
  ];

  sheet.appendRow(row);

  return {
    ok: true,
    token: Utilities.getUuid(),
    user: soyibaAuthBuildUser_(soyibaAuthRowToObject_(SOYIBA_AUTH_HEADERS, row))
  };
}

function soyibaAuthLogin_(data) {
  var email = soyibaAuthNormalizeEmail_(data.email);
  var password = String(data.password || '');

  if (!email || !password) {
    return { ok: false, error: 'Correo y contrasena son requeridos.' };
  }

  var sheet = soyibaAuthGetSheet_();
  var found = soyibaAuthFindUserByEmail_(sheet, email);

  if (found.row < 1) {
    return { ok: false, error: 'Credenciales invalidas.' };
  }

  var user = found.user;
  var expectedHash = soyibaAuthHashPassword_(password, user.salt);

  if (expectedHash !== user.password_hash || user.status !== 'active') {
    return { ok: false, error: 'Credenciales invalidas.' };
  }

  var headers = soyibaAuthGetHeaders_(sheet);
  var now = new Date().toISOString();
  sheet.getRange(found.row, headers.indexOf('last_login_at') + 1).setValue(now);
  sheet.getRange(found.row, headers.indexOf('updated_at') + 1).setValue(now);

  return {
    ok: true,
    token: Utilities.getUuid(),
    user: soyibaAuthBuildUser_(user)
  };
}

function soyibaAuthUpdateFcmToken_(data) {
  var email = soyibaAuthNormalizeEmail_(data.email);
  var token = String(data.fcmToken || '');
  var sheet = soyibaAuthGetSheet_();
  var found = soyibaAuthFindUserByEmail_(sheet, email);

  if (found.row < 1) {
    return { ok: false, error: 'Usuario no encontrado.' };
  }

  var headers = soyibaAuthGetHeaders_(sheet);
  var now = new Date().toISOString();
  sheet.getRange(found.row, headers.indexOf('fcm_token') + 1).setValue(token);
  sheet.getRange(found.row, headers.indexOf('updated_at') + 1).setValue(now);

  return { ok: true };
}

function soyibaAuthUpdateProfile_(data) {
  var sheet = soyibaAuthGetSheet_();
  var found = soyibaAuthFindUserByIdOrEmail_(sheet, data.userId, data.currentEmail || data.email);

  if (found.row < 1) {
    return { ok: false, error: 'Usuario no encontrado.' };
  }

  var headers = soyibaAuthGetHeaders_(sheet);
  var currentEmail = soyibaAuthNormalizeEmail_(found.user.email);
  var email = soyibaAuthNormalizeEmail_(data.email || currentEmail);
  var firstName = String(data.firstName || data.first_name || '').trim();
  var lastName = String(data.lastName || data.last_name || '').trim();
  var phone = String(data.phone || data.celular || '').trim();
  var tiempoIba = String(data.tiempoIba || data.tiempo_iba || '').trim();
  var displayName = String(data.displayName || data.display_name || [firstName, lastName].join(' ').trim() || email.split('@')[0] || 'Usuario');

  if (!email || !firstName || !lastName || !phone) {
    return { ok: false, error: 'Nombre, apellido, correo y celular son requeridos.' };
  }

  if (email !== currentEmail) {
    var duplicate = soyibaAuthFindUserByEmail_(sheet, email);
    if (duplicate.row > 0 && duplicate.row !== found.row) {
      return { ok: false, error: 'Ese correo ya esta en uso.' };
    }
  }

  var now = new Date().toISOString();
  soyibaAuthSetCell_(sheet, headers, found.row, 'email', email);
  soyibaAuthSetCell_(sheet, headers, found.row, 'display_name', displayName);
  soyibaAuthSetCell_(sheet, headers, found.row, 'first_name', firstName);
  soyibaAuthSetCell_(sheet, headers, found.row, 'last_name', lastName);
  soyibaAuthSetCell_(sheet, headers, found.row, 'phone', phone);
  soyibaAuthSetCell_(sheet, headers, found.row, 'tiempo_iba', tiempoIba);
  soyibaAuthSetCell_(sheet, headers, found.row, 'updated_at', now);

  return soyibaAuthSessionFromRow_(sheet, found.row, data.token);
}

function soyibaAuthChangePassword_(data) {
  var currentPassword = String(data.currentPassword || '');
  var newPassword = String(data.newPassword || '');
  var sheet = soyibaAuthGetSheet_();
  var found = soyibaAuthFindUserByIdOrEmail_(sheet, data.userId, data.email);

  if (found.row < 1) {
    return { ok: false, error: 'Usuario no encontrado.' };
  }

  if (newPassword.length < 8) {
    return { ok: false, error: 'La contrasena debe tener minimo 8 caracteres.' };
  }

  var expectedHash = soyibaAuthHashPassword_(currentPassword, found.user.salt);
  if (expectedHash !== found.user.password_hash) {
    return { ok: false, error: 'La contrasena actual no es correcta.' };
  }

  var headers = soyibaAuthGetHeaders_(sheet);
  var now = new Date().toISOString();
  var salt = Utilities.getUuid();
  soyibaAuthSetCell_(sheet, headers, found.row, 'salt', salt);
  soyibaAuthSetCell_(sheet, headers, found.row, 'password_hash', soyibaAuthHashPassword_(newPassword, salt));
  soyibaAuthSetCell_(sheet, headers, found.row, 'updated_at', now);

  return soyibaAuthSessionFromRow_(sheet, found.row, data.token);
}

function soyibaAuthUpdateProfilePhoto_(data) {
  var sheet = soyibaAuthGetSheet_();
  var found = soyibaAuthFindUserByIdOrEmail_(sheet, data.userId, data.email || data.currentEmail);

  if (found.row < 1) {
    return { ok: false, error: 'Usuario no encontrado.' };
  }

  var photoUrl = String(data.photoUrl || data.photo_url || '').trim();

  if (!photoUrl) {
    return { ok: false, error: 'Foto invalida.' };
  }

  var headers = soyibaAuthGetHeaders_(sheet);
  var now = new Date().toISOString();
  soyibaAuthSetCell_(sheet, headers, found.row, 'photo_url', photoUrl);
  soyibaAuthSetCell_(sheet, headers, found.row, 'updated_at', now);

  return soyibaAuthSessionFromRow_(sheet, found.row, data.token);
}

function soyibaAuthListUsers_(data) {
  var sheet = soyibaAuthGetSheet_();
  var actor = soyibaAuthFindUserByIdOrEmail_(sheet, data.actorUserId || data.userId, data.actorEmail || data.email);

  if (!soyibaAuthCanManageUsers_(actor.user)) {
    return { ok: false, error: 'No tienes permisos para gestionar usuarios.' };
  }

  var headers = soyibaAuthGetHeaders_(sheet);
  var values = sheet.getDataRange().getValues();
  var users = [];

  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    users.push(soyibaAuthBuildManagedUser_(soyibaAuthRowToObject_(headers, values[rowIndex])));
  }

  return { ok: true, users: users };
}

function soyibaMembersList_(data) {
  var sheet = soyibaAuthGetSheet_();
  var actor = soyibaAuthFindUserByIdOrEmail_(sheet, data.userId || data.actorUserId, data.email || data.actorEmail);

  if (!soyibaAuthCanViewMembersDirectory_(actor.user)) {
    return { ok: false, error: 'Directorio disponible solo para miembros.' };
  }

  var headers = soyibaAuthGetHeaders_(sheet);
  var values = sheet.getDataRange().getValues();
  var members = [];

  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    var record = soyibaAuthRowToObject_(headers, values[rowIndex]);

    if (soyibaMembersIsVisibleAuthUser_(record)) {
      members.push(soyibaMembersBuildFromAuth_(record));
    }
  }

  return { ok: true, members: members };
}

function soyibaMembersIsVisibleAuthUser_(record) {
  return soyibaAuthCanViewMembersDirectory_(record);
}

function soyibaMembersBuildFromAuth_(record) {
  var displayName = String(record.display_name || '').trim();
  var firstName = String(record.first_name || '').trim();
  var lastName = String(record.last_name || '').trim();

  if (!firstName && displayName) {
    var nameParts = displayName.split(/\s+/);
    firstName = nameParts[0] || '';
    lastName = nameParts.slice(1).join(' ');
  }

  return {
    id: String(record.user_id || record.email || ''),
    nombre: firstName,
    apellido: lastName,
    fotoUrl: String(record.photo_url || record.photoUrl || record.fotoUrl || ''),
    telefono: String(record.phone || ''),
    email: '',
    rol: String(record.rol_sistema || record.role || 'Miembro'),
    rolSistema: String(record.rol_sistema || record.role || 'Miembro'),
    tituloUsuario: String(record.titulo_usuario || 'Miembro'),
    tipoUsuario: 'Miembro',
    ministerio: '',
    grupoEco: '',
    sector: '',
    tiempoEnIBA: String(record.tiempo_iba || ''),
    visibleDirectorio: true,
    mostrarTelefono: Boolean(record.phone),
    permitirWhatsapp: Boolean(record.phone),
    mostrarFoto: true,
    mostrarMinisterio: false,
    mostrarGrupoEco: false,
    verificado: soyibaAuthIsTrue_(record.usuario_verificado),
    estado: 'Activo',
    fechaRegistro: String(record.created_at || ''),
    fechaActualizacion: String(record.updated_at || '')
  };
}

function soyibaAuthUpdateUserAccess_(data) {
  var sheet = soyibaAuthGetSheet_();
  var actor = soyibaAuthFindUserByIdOrEmail_(sheet, data.actorUserId || data.userId, data.actorEmail || data.email);

  if (!soyibaAuthCanManageUsers_(actor.user)) {
    return { ok: false, error: 'No tienes permisos para gestionar usuarios.' };
  }

  var found = soyibaAuthFindUserByIdOrEmail_(sheet, data.targetUserId || data.target_user_id, data.targetEmail || data.target_email);

  if (found.row < 1) {
    return { ok: false, error: 'Usuario no encontrado.' };
  }

  var headers = soyibaAuthGetHeaders_(sheet);
  var rolSistema = soyibaAuthCleanOption_(data.rolSistema || data.rol_sistema || data.role, 'Usuario');
  var tipoUsuario = soyibaAuthNormalizeTipoUsuario_(data.tipoUsuario || data.tipo_usuario);
  var tituloUsuario = soyibaAuthNormalizeTituloUsuario_(data.tituloUsuario || data.titulo_usuario || tipoUsuario, tipoUsuario);
  var estadoUsuario = soyibaAuthCleanOption_(data.estadoUsuario || data.estado_usuario, 'Activo');
  var active = data.active === undefined ? soyibaAuthStateIsActive_(estadoUsuario) : soyibaAuthIsTrue_(data.active);
  var publicador = soyibaAuthIsTrue_(data.publicador);
  var publicadorEco = soyibaAuthIsTrue_(data.publicadorEco !== undefined ? data.publicadorEco : data.publicador_eco);
  var publicadorEvento = soyibaAuthIsTrue_(data.publicadorEvento !== undefined ? data.publicadorEvento : data.publicador_evento);
  var verificado = soyibaAuthIsTrue_(data.verificado !== undefined ? data.verificado : (data.usuarioVerificado !== undefined ? data.usuarioVerificado : data.usuario_verificado));
  var now = new Date().toISOString();

  if (soyibaAuthIsAssistantAccess_(tipoUsuario)) {
    rolSistema = 'Asistente';
    tipoUsuario = 'Asistente';
    tituloUsuario = 'Asistente';
    publicador = false;
    publicadorEco = false;
    publicadorEvento = false;
  } else {
    rolSistema = soyibaAuthCoerceMemberValue_(rolSistema);
    tipoUsuario = 'Miembro';
    tituloUsuario = soyibaAuthCoerceMemberValue_(tituloUsuario);
  }

  soyibaAuthSetCell_(sheet, headers, found.row, 'role', rolSistema);
  soyibaAuthSetCell_(sheet, headers, found.row, 'rol_sistema', rolSistema);
  soyibaAuthSetCell_(sheet, headers, found.row, 'tipo_usuario', tipoUsuario);
  soyibaAuthSetCell_(sheet, headers, found.row, 'titulo_usuario', tituloUsuario);
  soyibaAuthSetCell_(sheet, headers, found.row, 'estado_usuario', estadoUsuario);
  soyibaAuthSetCell_(sheet, headers, found.row, 'publicador', publicador);
  soyibaAuthSetCell_(sheet, headers, found.row, 'publicador_eco', publicadorEco);
  soyibaAuthSetCell_(sheet, headers, found.row, 'publicador_evento', publicadorEvento);
  soyibaAuthSetCell_(sheet, headers, found.row, 'usuario_verificado', verificado);
  soyibaAuthSetCell_(sheet, headers, found.row, 'active', active);
  soyibaAuthSetCell_(sheet, headers, found.row, 'status', active && soyibaAuthStateIsActive_(estadoUsuario) ? 'active' : 'inactive');
  soyibaAuthSetCell_(sheet, headers, found.row, 'updated_at', now);

  return {
    ok: true,
    user: soyibaAuthBuildManagedUser_(soyibaAuthGetUserByRow_(sheet, found.row))
  };
}

function soyibaAuthSessionFromRow_(sheet, row, token) {
  var headers = soyibaAuthGetHeaders_(sheet);
  var values = sheet.getRange(row, 1, 1, Math.max(sheet.getLastColumn(), SOYIBA_AUTH_HEADERS.length)).getValues()[0];
  return {
    ok: true,
    token: token || Utilities.getUuid(),
    user: soyibaAuthBuildUser_(soyibaAuthRowToObject_(headers, values))
  };
}

function soyibaAuthBuildUser_(user) {
  return {
    id: user.user_id,
    email: user.email,
    name: user.display_name,
    role: user.role || user.rol_sistema || 'Usuario',
    firstName: user.first_name || '',
    lastName: user.last_name || '',
    phone: user.phone || '',
    photoUrl: user.photo_url || '',
    tipoUsuario: user.tipo_usuario || 'Asistente',
    tituloUsuario: user.titulo_usuario || 'Asistente',
    rolSistema: user.rol_sistema || user.role || 'Usuario',
    estadoUsuario: user.estado_usuario || (user.status === 'active' ? 'Activo' : 'Inactivo'),
    tiempoIba: user.tiempo_iba || '',
    publicador: soyibaAuthIsTrue_(user.publicador),
    publicadorEco: soyibaAuthIsTrue_(user.publicador_eco),
    publicadorEvento: soyibaAuthIsTrue_(user.publicador_evento),
    verificado: soyibaAuthIsTrue_(user.usuario_verificado),
    active: user.active === '' || user.active === undefined ? user.status === 'active' : soyibaAuthIsTrue_(user.active)
  };
}

function soyibaAuthBuildManagedUser_(user) {
  var managed = soyibaAuthBuildUser_(user);
  managed.status = String(user.status || '');
  managed.createdAt = String(user.created_at || '');
  managed.updatedAt = String(user.updated_at || '');
  managed.lastLoginAt = String(user.last_login_at || '');
  return managed;
}

function soyibaAuthGetSheet_() {
  var spreadsheet = SOYIBA_AUTH_SPREADSHEET_ID
    ? SpreadsheetApp.openById(SOYIBA_AUTH_SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(SOYIBA_AUTH_SHEET) || spreadsheet.insertSheet(SOYIBA_AUTH_SHEET);
  soyibaAuthEnsureHeaders_(sheet);
  return sheet;
}

function soyibaAuthEnsureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(SOYIBA_AUTH_HEADERS);
    return;
  }

  var headers = soyibaAuthGetHeaders_(sheet);
  var needsRewrite = SOYIBA_AUTH_HEADERS.some(function (header) {
    return headers.indexOf(header) === -1;
  });

  if (needsRewrite) {
    sheet.getRange(1, 1, 1, SOYIBA_AUTH_HEADERS.length).setValues([SOYIBA_AUTH_HEADERS]);
  }
}

function soyibaAuthFindUserByEmail_(sheet, email) {
  var headers = soyibaAuthGetHeaders_(sheet);
  var emailColumn = headers.indexOf('email');
  var values = sheet.getDataRange().getValues();

  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    if (soyibaAuthNormalizeEmail_(values[rowIndex][emailColumn]) === email) {
      return { row: rowIndex + 1, user: soyibaAuthRowToObject_(headers, values[rowIndex]) };
    }
  }

  return { row: -1, user: null };
}

function soyibaAuthFindUserByIdOrEmail_(sheet, userId, email) {
  var headers = soyibaAuthGetHeaders_(sheet);
  var idColumn = headers.indexOf('user_id');
  var emailColumn = headers.indexOf('email');
  var normalizedEmail = soyibaAuthNormalizeEmail_(email);
  var normalizedId = String(userId || '').trim();
  var values = sheet.getDataRange().getValues();

  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    var rowId = String(values[rowIndex][idColumn] || '').trim();
    var rowEmail = soyibaAuthNormalizeEmail_(values[rowIndex][emailColumn]);

    if ((normalizedId && rowId === normalizedId) || (normalizedEmail && rowEmail === normalizedEmail)) {
      return { row: rowIndex + 1, user: soyibaAuthRowToObject_(headers, values[rowIndex]) };
    }
  }

  return { row: -1, user: null };
}

function soyibaAuthGetUserByRow_(sheet, row) {
  var headers = soyibaAuthGetHeaders_(sheet);
  var values = sheet.getRange(row, 1, 1, Math.max(sheet.getLastColumn(), SOYIBA_AUTH_HEADERS.length)).getValues()[0];
  return soyibaAuthRowToObject_(headers, values);
}

function soyibaAuthSetCell_(sheet, headers, row, header, value) {
  var column = headers.indexOf(header);

  if (column >= 0) {
    sheet.getRange(row, column + 1).setValue(value);
  }
}

function soyibaAuthRowToObject_(headers, row) {
  return headers.reduce(function (record, header, index) {
    record[header] = row[index];
    return record;
  }, {});
}

function soyibaAuthGetHeaders_(sheet) {
  return sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), SOYIBA_AUTH_HEADERS.length)).getValues()[0];
}

function soyibaAuthNormalizeEmail_(email) {
  return String(email || '').trim().toLowerCase();
}

function soyibaAuthIsTrue_(value) {
  if (value === true) {
    return true;
  }

  return ['true', '1', 'si', 'sí', 'yes'].indexOf(String(value || '').trim().toLowerCase()) >= 0;
}

function soyibaAuthCanManageUsers_(user) {
  if (!user) {
    return false;
  }

  var role = String(user.rol_sistema || user.rolSistema || user.role || '').trim().toLowerCase();
  return role === 'admin' || role === 'moderador';
}

function soyibaAuthCanViewMembersDirectory_(user) {
  if (!user) {
    return false;
  }

  var tipoUsuario = String(user.tipo_usuario || user.tipoUsuario || '').trim().toLowerCase();
  var estadoUsuario = String(user.estado_usuario || user.estadoUsuario || '').trim().toLowerCase();
  var active = user.active === '' || user.active === undefined ? user.status === 'active' : soyibaAuthIsTrue_(user.active);
  return soyibaAuthCanManageUsers_(user) || (active && tipoUsuario === 'miembro' && (estadoUsuario === 'activo' || estadoUsuario === 'active'));
}

function soyibaAuthCleanOption_(value, fallback) {
  var text = String(value || '').trim();
  return text || fallback;
}

function soyibaAuthStateIsActive_(estadoUsuario) {
  var state = String(estadoUsuario || '').trim().toLowerCase();
  return state === 'activo' || state === 'active';
}

function soyibaAuthNormalizeTipoUsuario_(value) {
  return soyibaAuthIsAssistantAccess_(value) ? 'Asistente' : 'Miembro';
}

function soyibaAuthNormalizeTituloUsuario_(value, tipoUsuario) {
  var normalized = soyibaAuthNormalizeAccessText_(value);
  var options = ['Asistente', 'Miembro', 'Servidor', 'Líder', 'Pastor', 'Administrativo', 'Músico', 'Audiovisuales', 'Creador de contenido'];

  for (var index = 0; index < options.length; index += 1) {
    if (soyibaAuthNormalizeAccessText_(options[index]) === normalized) {
      return options[index];
    }
  }

  return soyibaAuthIsAssistantAccess_(tipoUsuario) ? 'Asistente' : 'Miembro';
}

function soyibaAuthCoerceMemberValue_(value) {
  return value && !soyibaAuthIsAssistantAccess_(value) ? value : 'Miembro';
}

function soyibaAuthIsAssistantAccess_(value) {
  return soyibaAuthNormalizeAccessText_(value) === 'asistente';
}

function soyibaAuthNormalizeAccessText_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u');
}

function soyibaAuthHashPassword_(password, salt) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ':' + password, Utilities.Charset.UTF_8);
  return soyibaAuthBytesToHex_(digest);
}

function soyibaAuthBytesToHex_(bytes) {
  var hex = '';

  for (var index = 0; index < bytes.length; index += 1) {
    var value = bytes[index];
    if (value < 0) {
      value += 256;
    }
    hex += ('0' + value.toString(16)).slice(-2);
  }

  return hex;
}

function soyibaDonacionesHandle_(action, data) {
  if (action === 'health') {
    return { ok: true, module: 'Donaciones', version: SOYIBA_INICIO_CODE_VERSION };
  }

  if (action === 'config' || action === 'getConfig' || action === 'activeConfig') {
    return soyibaDonacionesGetActiveConfig_();
  }

  return { ok: false, error: 'Accion no soportada: ' + action };
}

function soyibaDonacionesGetActiveConfig_() {
  var sheet = soyibaDonacionesGetConfigSheet_();
  var values = sheet.getDataRange().getValues();
  var headers = soyibaDonacionesGetHeaders_(sheet);
  var activeConfigs = [];

  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    var record = soyibaDonacionesRowToObject_(headers, values[rowIndex]);

    if (soyibaDonacionesIsTrue_(record.activo)) {
      activeConfigs.push(record);
    }
  }

  if (activeConfigs.length === 0) {
    return {
      ok: false,
      error: 'No fue posible cargar la informacion de donacion. Por favor intenta mas tarde o comunicate con contabilidad.'
    };
  }

  activeConfigs.sort(function (first, second) {
    return soyibaDonacionesTimestamp_(second.updatedAt || second.updated_at) - soyibaDonacionesTimestamp_(first.updatedAt || first.updated_at);
  });

  var warning = '';

  if (activeConfigs.length > 1) {
    warning = 'Hay mas de una configuracion activa en DonacionesConfig. Se uso la mas reciente por updatedAt.';
    console.warn(warning);
  }

  var config = soyibaDonacionesBuildConfig_(activeConfigs[0]);
  var validationError = soyibaDonacionesValidateConfig_(config);

  if (validationError) {
    return {
      ok: false,
      error: 'No fue posible cargar la informacion de donacion. Por favor intenta mas tarde o comunicate con contabilidad.',
      detail: validationError
    };
  }

  return {
    ok: true,
    config: config,
    warning: warning
  };
}

function soyibaDonacionesBuildConfig_(record) {
  return {
    id: String(record.id || '').trim(),
    banco: String(record.banco || '').trim(),
    tipoCuenta: String(record.tipoCuenta || record.tipo_cuenta || '').trim(),
    numeroCuenta: String(record.numeroCuenta || record.numero_cuenta || '').trim(),
    titular: String(record.titular || record.nombreTitular || record.nombre_titular || '').trim(),
    nit: String(record.nit || record.Nit || record.NIT || '').trim(),
    qrUrl: String(record.qrUrl || record.qr_url || '').trim(),
    correoContacto: String(record.correoContacto || record.correo_contacto || record.emailContacto || '').trim(),
    updatedAt: String(record.updatedAt || record.updated_at || '').trim()
  };
}

function soyibaDonacionesValidateConfig_(config) {
  var missingFields = [];

  ['banco', 'tipoCuenta', 'numeroCuenta', 'titular', 'correoContacto'].forEach(function (field) {
    if (!config[field]) {
      missingFields.push(field);
    }
  });

  if (missingFields.length > 0) {
    return 'Campos requeridos faltantes: ' + missingFields.join(', ');
  }

  return '';
}

function soyibaDonacionesGetConfigSheet_() {
  var spreadsheet = SOYIBA_DONACIONES_SPREADSHEET_ID
    ? SpreadsheetApp.openById(SOYIBA_DONACIONES_SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(SOYIBA_DONACIONES_CONFIG_SHEET) || spreadsheet.insertSheet(SOYIBA_DONACIONES_CONFIG_SHEET);
  soyibaDonacionesEnsureHeaders_(sheet);
  return sheet;
}

function soyibaDonacionesEnsureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(SOYIBA_DONACIONES_CONFIG_HEADERS);
    return;
  }

  var headers = soyibaDonacionesGetHeaders_(sheet);
  var needsRewrite = SOYIBA_DONACIONES_CONFIG_HEADERS.some(function (header) {
    return headers.indexOf(header) === -1;
  });

  if (needsRewrite) {
    sheet.getRange(1, 1, 1, SOYIBA_DONACIONES_CONFIG_HEADERS.length).setValues([SOYIBA_DONACIONES_CONFIG_HEADERS]);
  }
}

function soyibaDonacionesGetHeaders_(sheet) {
  return sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), SOYIBA_DONACIONES_CONFIG_HEADERS.length)).getValues()[0];
}

function soyibaDonacionesRowToObject_(headers, row) {
  return headers.reduce(function (record, header, index) {
    record[header] = row[index];
    return record;
  }, {});
}

function soyibaDonacionesTimestamp_(value) {
  var timestamp = new Date(value).getTime();
  return isNaN(timestamp) ? 0 : timestamp;
}

function soyibaDonacionesIsTrue_(value) {
  if (value === true) {
    return true;
  }

  return ['true', '1', 'si', 'yes', 'activo', 'active'].indexOf(String(value || '').trim().toLowerCase()) >= 0;
}

function soyibaPublicacionesHandle_(action, data) {
  if (action === 'health') {
    return { ok: true, module: 'Publicaciones', version: SOYIBA_INICIO_CODE_VERSION };
  }

  if (action === 'driveHealth' || action === 'authorizeDrive') {
    return soyibaPublicacionesDriveHealth_();
  }

  if (action === 'driveWriteHealth') {
    return soyibaPublicacionesDriveWriteHealth_();
  }

  if (action === 'list') {
    return soyibaPublicacionesList_(data);
  }

  if (action === 'create') {
    return soyibaPublicacionesCreate_(data);
  }

  if (action === 'update') {
    return soyibaPublicacionesUpdate_(data);
  }

  if (action === 'delete') {
    return soyibaPublicacionesDelete_(data);
  }

  if (action === 'uploadMedia') {
    return soyibaPublicacionesUploadMedia_(data);
  }

  if (action === 'toggleSave') {
    return soyibaPublicacionesToggleSave_(data);
  }

  if (action === 'toggleYoVoy') {
    return soyibaPublicacionesToggleYoVoy_(data);
  }

  if (action === 'toggleEcoAttendance') {
    return soyibaPublicacionesToggleEcoAttendance_(data);
  }

  if (action === 'recordView') {
    return soyibaPublicacionesRecordStat_(data, 'views');
  }

  if (action === 'recordShare') {
    return soyibaPublicacionesRecordStat_(data, 'compartidos');
  }

  return { ok: false, error: 'Accion no soportada: ' + action };
}

function soyibaPublicacionesList_(data) {
  var sheet = soyibaPublicacionesGetSheet_();
  var savedSheet = soyibaGuardadosGetSheet_();
  var yovoySheet = soyibaYoVoyGetSheet_();
  var asistenciasEcoSheet = soyibaAsistenciasEcoGetSheet_();
  var values = sheet.getDataRange().getValues();
  var headers = soyibaPublicacionesGetHeaders_(sheet);
  var currentUser = soyibaPublicacionesGetCurrentUser_(data);
  var savedMap = soyibaPublicacionesGetSavedMap_(savedSheet, currentUser);
  var yovoyMap = soyibaPublicacionesGetYoVoyMap_(yovoySheet, currentUser);
  var ecoAttendanceMap = soyibaPublicacionesGetEcoAttendanceMap_(asistenciasEcoSheet, currentUser);
  var rawTypeFilter = String(data.type || data.tipo_publicacion || '').trim();
  var typeFilter = rawTypeFilter ? soyibaPublicacionesNormalizeType_(rawTypeFilter) : '';
  var publications = [];

  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    var record = soyibaPublicacionesRowToObject_(headers, values[rowIndex]);

    if (String(record.status || '').toLowerCase() === 'deleted') {
      continue;
    }

    if (typeFilter && soyibaPublicacionesNormalizeType_(record.tipo_publicacion) !== typeFilter) {
      continue;
    }

    if (soyibaPublicacionesIsMembersOnly_(record) && !soyibaPublicacionesIsMemberUser_(currentUser)) {
      continue;
    }

    publications.push(soyibaPublicacionesBuildResponse_(
      record,
      savedMap[String(record.publication_id)] === true,
      yovoyMap[String(record.publication_id)] === true,
      ecoAttendanceMap[String(record.publication_id)] === true
    ));
  }

  publications.sort(function (first, second) {
    return Number(second.sortTimestamp || 0) - Number(first.sortTimestamp || 0);
  });

  return { ok: true, publications: publications };
}

function soyibaPublicacionesCreate_(data) {
  var user = soyibaPublicacionesGetCurrentUser_(data);
  var type = soyibaPublicacionesNormalizeType_(data.type || data.tipo_publicacion);

  if (!soyibaPublicacionesCanPublish_(user, type)) {
    return { ok: false, error: 'No tienes permiso para crear este tipo de publicacion.' };
  }

  var title = String(data.title || data.titulo || '').trim();
  if (!title) {
    return { ok: false, error: 'El titulo es requerido.' };
  }

  var now = new Date();
  var nowIso = now.toISOString();
  var publicationId = Utilities.getUuid();
  var eventPayload = soyibaPublicacionesNormalizeEventPayload_(data, 0);
  var ecoPayload = soyibaPublicacionesNormalizeEcoPayload_(data);
  var membersOnly = soyibaPublicacionesNormalizeMembersOnly_(data);
  var row = [
    publicationId,
    nowIso,
    nowIso,
    'published',
    user.id,
    user.name,
    user.email,
    user.photoUrl,
    type,
    title,
    String(data.description || data.descripcion || ''),
    soyibaPublicacionesStringifyArray_(data.mediaItems || data.media_items || []),
    soyibaPublicacionesNormalizeCtaType_(data.cta && data.cta.type ? data.cta.type : data.cta_type),
    String((data.cta && data.cta.url) || data.cta_url || ''),
    String((data.cta && data.cta.phone) || data.cta_phone || ''),
    soyibaPublicacionesStringifyArray_(data.relatedLinks || data.related_links || []),
    0,
    0,
    0,
    now.getTime(),
    type === 'Evento' ? eventPayload.dateTime : '',
    type === 'Evento' ? eventPayload.place : '',
    type === 'Evento' ? eventPayload.validFrom : '',
    type === 'Evento' ? eventPayload.validUntil : '',
    type === 'Evento' ? eventPayload.capacityAvailable : 0,
    0,
    type === 'Grupo ECO' ? ecoPayload.day : '',
    type === 'Grupo ECO' ? ecoPayload.time : '',
    type === 'Grupo ECO' ? ecoPayload.host : '',
    type === 'Grupo ECO' ? ecoPayload.moderator : '',
    type === 'Grupo ECO' ? ecoPayload.phone : '',
    type === 'Grupo ECO' ? ecoPayload.address : '',
    type === 'Grupo ECO' ? ecoPayload.neighborhood : '',
    type === 'Grupo ECO' ? ecoPayload.city : '',
    type === 'Grupo ECO' ? ecoPayload.latitude : '',
    type === 'Grupo ECO' ? ecoPayload.longitude : '',
    0,
    type === 'Grupo ECO' ? ecoPayload.validFrom : '',
    type === 'Grupo ECO' ? ecoPayload.validUntil : '',
    membersOnly
  ];

  var sheet = soyibaPublicacionesGetSheet_();
  sheet.appendRow(row);

  return {
    ok: true,
    publication: soyibaPublicacionesBuildResponse_(soyibaPublicacionesRowToObject_(SOYIBA_PUBLICACIONES_HEADERS, row), false, false, false)
  };
}

function soyibaPublicacionesUpdate_(data) {
  var sheet = soyibaPublicacionesGetSheet_();
  var found = soyibaPublicacionesFindRow_(sheet, data.publicationId || data.publication_id);

  if (found.row < 1) {
    return { ok: false, error: 'Publicacion no encontrada.' };
  }

  var user = soyibaPublicacionesGetCurrentUser_(data);
  if (!soyibaPublicacionesCanManage_(user, found.record)) {
    return { ok: false, error: 'No tienes permiso para editar esta publicacion.' };
  }

  var type = soyibaPublicacionesNormalizeType_(data.type || data.tipo_publicacion || found.record.tipo_publicacion);
  if (!soyibaPublicacionesCanPublish_(user, type) && !soyibaPublicacionesIsManager_(user)) {
    return { ok: false, error: 'No tienes permiso para este tipo de publicacion.' };
  }

  var title = String(data.title || data.titulo || '').trim();
  if (!title) {
    return { ok: false, error: 'El titulo es requerido.' };
  }

  var headers = soyibaPublicacionesGetHeaders_(sheet);
  var nowIso = new Date().toISOString();
  soyibaPublicacionesSetCell_(sheet, headers, found.row, 'updated_at', nowIso);
  soyibaPublicacionesSetCell_(sheet, headers, found.row, 'tipo_publicacion', type);
  soyibaPublicacionesSetCell_(sheet, headers, found.row, 'title', title);
  soyibaPublicacionesSetCell_(sheet, headers, found.row, 'description', String(data.description || data.descripcion || ''));
  soyibaPublicacionesSetCell_(sheet, headers, found.row, 'media_items_json', soyibaPublicacionesStringifyArray_(data.mediaItems || data.media_items || []));
  soyibaPublicacionesSetCell_(sheet, headers, found.row, 'cta_type', soyibaPublicacionesNormalizeCtaType_(data.cta && data.cta.type ? data.cta.type : data.cta_type));
  soyibaPublicacionesSetCell_(sheet, headers, found.row, 'cta_url', String((data.cta && data.cta.url) || data.cta_url || ''));
  soyibaPublicacionesSetCell_(sheet, headers, found.row, 'cta_phone', String((data.cta && data.cta.phone) || data.cta_phone || ''));
  soyibaPublicacionesSetCell_(sheet, headers, found.row, 'related_links_json', soyibaPublicacionesStringifyArray_(data.relatedLinks || data.related_links || []));
  soyibaPublicacionesSetCell_(sheet, headers, found.row, 'solo_miembros', soyibaPublicacionesNormalizeMembersOnly_(data));

  if (type === 'Evento') {
    var currentYoVoy = Number(found.record.yovoy || 0);
    var eventPayload = soyibaPublicacionesNormalizeEventPayload_(data, currentYoVoy);
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'fecha_hora_evento', eventPayload.dateTime);
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'lugar_evento', eventPayload.place);
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'fecha_inicio_vigencia', eventPayload.validFrom);
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'fecha_caducidad', eventPayload.validUntil);
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'cupos', eventPayload.capacityAvailable);
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'yovoy', currentYoVoy);
  } else {
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'fecha_hora_evento', '');
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'lugar_evento', '');
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'fecha_inicio_vigencia', '');
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'fecha_caducidad', '');
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'cupos', 0);
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'yovoy', 0);
  }

  if (type === 'Grupo ECO') {
    var ecoPayload = soyibaPublicacionesNormalizeEcoPayload_(data);
    var currentEcoAttendance = Number(found.record.asistentes || 0);
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'diaEco', ecoPayload.day);
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'horaEco', ecoPayload.time);
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'anfitrion', ecoPayload.host);
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'moderador', ecoPayload.moderator);
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'telefonoContacto', ecoPayload.phone);
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'direccion', ecoPayload.address);
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'barrio', ecoPayload.neighborhood);
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'ciudad', ecoPayload.city);
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'latitud', ecoPayload.latitude);
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'longitud', ecoPayload.longitude);
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'asistentes', currentEcoAttendance);
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'fechaInicioVigencia', ecoPayload.validFrom);
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'fechaFinVigencia', ecoPayload.validUntil);
  } else {
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'diaEco', '');
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'horaEco', '');
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'anfitrion', '');
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'moderador', '');
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'telefonoContacto', '');
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'direccion', '');
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'barrio', '');
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'ciudad', '');
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'latitud', '');
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'longitud', '');
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'asistentes', 0);
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'fechaInicioVigencia', '');
    soyibaPublicacionesSetCell_(sheet, headers, found.row, 'fechaFinVigencia', '');
  }

  var record = soyibaPublicacionesReadRow_(sheet, found.row);
  var yovoySheet = soyibaYoVoyGetSheet_();
  var going = soyibaPublicacionesFindYoVoyRow_(yovoySheet, record.publication_id, user).row > 0;
  var asistenciaEcoSheet = soyibaAsistenciasEcoGetSheet_();
  var attendingEco = soyibaPublicacionesFindEcoAttendanceRow_(asistenciaEcoSheet, record.publication_id, user).row > 0;
  return { ok: true, publication: soyibaPublicacionesBuildResponse_(record, false, going, attendingEco) };
}

function soyibaPublicacionesDelete_(data) {
  var sheet = soyibaPublicacionesGetSheet_();
  var found = soyibaPublicacionesFindRow_(sheet, data.publicationId || data.publication_id);

  if (found.row < 1) {
    return { ok: false, error: 'Publicacion no encontrada.' };
  }

  var user = soyibaPublicacionesGetCurrentUser_(data);
  if (!soyibaPublicacionesCanManage_(user, found.record)) {
    return { ok: false, error: 'No tienes permiso para eliminar esta publicacion.' };
  }

  var headers = soyibaPublicacionesGetHeaders_(sheet);
  soyibaPublicacionesSetCell_(sheet, headers, found.row, 'status', 'deleted');
  soyibaPublicacionesSetCell_(sheet, headers, found.row, 'updated_at', new Date().toISOString());

  return { ok: true };
}

function soyibaPublicacionesUploadMedia_(data) {
  var user = soyibaPublicacionesGetCurrentUser_(data);

  if (!soyibaPublicacionesCanPublish_(user, 'Publicacion') && !soyibaPublicacionesCanPublish_(user, 'Evento') && !soyibaPublicacionesCanPublish_(user, 'Grupo ECO')) {
    return { ok: false, error: 'No tienes permiso para cargar multimedia.' };
  }

  var dataUrl = String(data.dataUrl || '');
  var fileName = String(data.fileName || 'soyiba-publicacion').trim();
  var mediaType = String(data.mediaType || '') === 'image' ? 'image' : 'driveVideo';
  var parsed = dataUrl.match(/^data:([^;]+);base64,(.+)$/);

  if (!parsed) {
    return { ok: false, error: 'Archivo invalido.' };
  }

  var mimeType = String(data.mimeType || parsed[1] || 'application/octet-stream');
  var bytes = Utilities.base64Decode(parsed[2]);
  var blob = Utilities.newBlob(bytes, mimeType, fileName);

  try {
    var folder = soyibaPublicacionesGetMediaFolder_();
    var file = folder.createFile(blob);

    if (SOYIBA_PUBLICACIONES_SHARE_UPLOADED_FILES) {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }

    var fileId = file.getId();
    var mediaUrl =
      mediaType === 'image'
        ? 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1600'
        : 'https://drive.google.com/file/d/' + fileId + '/view';

    return {
      ok: true,
      media: {
        id: fileId,
        type: mediaType,
        url: mediaUrl,
        title: fileName
      }
    };
  } catch (error) {
    return soyibaPublicacionesDriveError_(error);
  }
}

function soyibaPublicacionesToggleSave_(data) {
  var publicationId = String(data.publicationId || data.publication_id || '').trim();
  var publicationSheet = soyibaPublicacionesGetSheet_();
  var foundPublication = soyibaPublicacionesFindRow_(publicationSheet, publicationId);

  if (foundPublication.row < 1) {
    return { ok: false, error: 'Publicacion no encontrada.' };
  }

  var user = soyibaPublicacionesGetCurrentUser_(data);
  if (!user.id && !user.email) {
    return { ok: false, error: 'Usuario requerido para guardar.' };
  }

  var savedSheet = soyibaGuardadosGetSheet_();
  var foundSaved = soyibaPublicacionesFindSavedRow_(savedSheet, publicationId, user);
  var shouldSave = data.saved === true || String(data.saved || '').toLowerCase() === 'true';

  if (shouldSave && foundSaved.row < 1) {
    savedSheet.appendRow([Utilities.getUuid(), publicationId, user.id, user.email, user.name, new Date().toISOString()]);
    soyibaPublicacionesIncrement_(publicationSheet, foundPublication.row, 'guardados', 1);
  }

  if (!shouldSave && foundSaved.row > 0) {
    savedSheet.deleteRow(foundSaved.row);
    soyibaPublicacionesIncrement_(publicationSheet, foundPublication.row, 'guardados', -1);
  }

  return { ok: true, saved: shouldSave };
}

function soyibaPublicacionesToggleYoVoy_(data) {
  var publicationId = String(data.publicationId || data.publication_id || '').trim();
  var user = soyibaPublicacionesGetCurrentUser_(data);

  if (!user.id && !user.email) {
    return { ok: false, error: 'Usuario requerido para marcar Yo voy.' };
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var publicationSheet = soyibaPublicacionesGetSheet_();
    var foundPublication = soyibaPublicacionesFindRow_(publicationSheet, publicationId);

    if (foundPublication.row < 1) {
      return { ok: false, error: 'Evento no encontrado.' };
    }

    if (soyibaPublicacionesNormalizeType_(foundPublication.record.tipo_publicacion) !== 'Evento') {
      return { ok: false, error: 'Yo voy solo esta disponible para eventos.' };
    }

    if (soyibaPublicacionesIsEventExpired_(foundPublication.record.fecha_caducidad)) {
      return { ok: false, error: 'Este evento ya caduco.' };
    }

    var yovoySheet = soyibaYoVoyGetSheet_();
    var foundYoVoy = soyibaPublicacionesFindYoVoyRow_(yovoySheet, publicationId, user);
    var shouldGo = data.going === true || data.yovoy === true || String(data.going || data.yovoy || '').toLowerCase() === 'true';

    if (shouldGo && foundYoVoy.row < 1) {
      var cupos = Number(foundPublication.record.cupos || 0);

      if (cupos <= 0) {
        return { ok: false, error: 'No quedan cupos disponibles para este evento.' };
      }

      yovoySheet.appendRow([Utilities.getUuid(), publicationId, user.id, user.email, user.name, new Date().toISOString()]);
      soyibaPublicacionesIncrement_(publicationSheet, foundPublication.row, 'yovoy', 1);
      soyibaPublicacionesIncrement_(publicationSheet, foundPublication.row, 'cupos', -1);
    }

    if (!shouldGo && foundYoVoy.row > 0) {
      yovoySheet.deleteRow(foundYoVoy.row);
      soyibaPublicacionesIncrement_(publicationSheet, foundPublication.row, 'yovoy', -1);
      soyibaPublicacionesIncrement_(publicationSheet, foundPublication.row, 'cupos', 1);
    }

    var updatedRecord = soyibaPublicacionesReadRow_(publicationSheet, foundPublication.row);
    var going = shouldGo && soyibaPublicacionesFindYoVoyRow_(yovoySheet, publicationId, user).row > 0;

    return {
      ok: true,
      going: going,
      publication: soyibaPublicacionesBuildResponse_(updatedRecord, false, going)
    };
  } finally {
    lock.releaseLock();
  }
}

function soyibaPublicacionesToggleEcoAttendance_(data) {
  var publicationId = String(data.publicationId || data.publication_id || '').trim();
  var user = soyibaPublicacionesGetCurrentUser_(data);

  if (!user.id && !user.email) {
    return { ok: false, error: 'Usuario requerido para marcar asistencia al Grupo ECO.' };
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var publicationSheet = soyibaPublicacionesGetSheet_();
    var foundPublication = soyibaPublicacionesFindRow_(publicationSheet, publicationId);

    if (foundPublication.row < 1) {
      return { ok: false, error: 'Grupo ECO no encontrado.' };
    }

    if (soyibaPublicacionesNormalizeType_(foundPublication.record.tipo_publicacion) !== 'Grupo ECO') {
      return { ok: false, error: 'La asistencia solo esta disponible para Grupos ECO.' };
    }

    var attendanceSheet = soyibaAsistenciasEcoGetSheet_();
    var shouldAttend = data.attending === true ||
      data.asistir === true ||
      String(data.attending || data.asistir || '').toLowerCase() === 'true';

    if (shouldAttend) {
      var existingAttendances = soyibaPublicacionesFindEcoAttendanceRowsForUser_(attendanceSheet, user);
      for (var existingIndex = existingAttendances.length - 1; existingIndex >= 0; existingIndex -= 1) {
        var existing = existingAttendances[existingIndex];
        if (existing.publicationId === publicationId) {
          continue;
        }

        var previousPublication = soyibaPublicacionesFindRow_(publicationSheet, existing.publicationId);
        if (previousPublication.row > 0) {
          soyibaPublicacionesIncrement_(publicationSheet, previousPublication.row, 'asistentes', -1);
        }
        attendanceSheet.deleteRow(existing.row);
      }
    }

    var foundAttendance = soyibaPublicacionesFindEcoAttendanceRow_(attendanceSheet, publicationId, user);

    if (shouldAttend && foundAttendance.row < 1) {
      attendanceSheet.appendRow([
        Utilities.getUuid(),
        publicationId,
        soyibaPublicacionesEcoUserKey_(user),
        new Date().toISOString()
      ]);
      soyibaPublicacionesIncrement_(publicationSheet, foundPublication.row, 'asistentes', 1);
    }

    if (!shouldAttend && foundAttendance.row > 0) {
      attendanceSheet.deleteRow(foundAttendance.row);
      soyibaPublicacionesIncrement_(publicationSheet, foundPublication.row, 'asistentes', -1);
    }

    var updatedRecord = soyibaPublicacionesReadRow_(publicationSheet, foundPublication.row);
    var attending = shouldAttend && soyibaPublicacionesFindEcoAttendanceRow_(attendanceSheet, publicationId, user).row > 0;

    return {
      ok: true,
      attending: attending,
      publication: soyibaPublicacionesBuildResponse_(updatedRecord, false, false, attending)
    };
  } finally {
    lock.releaseLock();
  }
}

function soyibaPublicacionesRecordStat_(data, header) {
  var sheet = soyibaPublicacionesGetSheet_();
  var found = soyibaPublicacionesFindRow_(sheet, data.publicationId || data.publication_id);

  if (found.row < 1) {
    return { ok: false, error: 'Publicacion no encontrada.' };
  }

  soyibaPublicacionesIncrement_(sheet, found.row, header, 1);
  return { ok: true };
}

function soyibaPublicacionesGetCurrentUser_(data) {
  var source = (data && data.user) || {};
  var user = null;

  try {
    var authSheet = soyibaAuthGetSheet_();
    var found = soyibaAuthFindUserByIdOrEmail_(authSheet, source.id || data.userId, source.email || data.email);

    if (found.row > 0) {
      user = found.user;
    }
  } catch (error) {
    user = null;
  }

  var verificado = user
    ? user.usuario_verificado
    : (source.verificado !== undefined ? source.verificado : (source.usuarioVerificado !== undefined ? source.usuarioVerificado : source.usuario_verificado));

  return {
    id: String((user && user.user_id) || source.id || data.userId || '').trim(),
    email: soyibaAuthNormalizeEmail_((user && user.email) || source.email || data.email || ''),
    name: String((user && user.display_name) || source.name || source.displayName || source.email || 'Usuario SOY IBA'),
    photoUrl: String((user && user.photo_url) || source.photoUrl || source.photo_url || ''),
    role: String((user && user.role) || source.role || ''),
    rolSistema: String((user && user.rol_sistema) || source.rolSistema || source.rol_sistema || source.role || ''),
    publicador: soyibaPublicacionesIsTrue_((user && user.publicador) || source.publicador),
    publicadorEco: soyibaPublicacionesIsTrue_((user && user.publicador_eco) || source.publicadorEco || source.publicador_eco),
    publicadorEvento: soyibaPublicacionesIsTrue_((user && user.publicador_evento) || source.publicadorEvento || source.publicador_evento),
    tipoUsuario: String((user && user.tipo_usuario) || source.tipoUsuario || source.tipo_usuario || ''),
    verificado: soyibaPublicacionesIsTrue_(verificado)
  };
}

function soyibaPublicacionesCanPublish_(user, type) {
  if (soyibaPublicacionesIsManager_(user)) {
    return true;
  }

  if (type === 'Evento') {
    return user.publicadorEvento === true;
  }

  if (type === 'Grupo ECO') {
    return user.publicadorEco === true;
  }

  return user.publicador === true;
}

function soyibaPublicacionesCanManage_(user, publication) {
  return soyibaPublicacionesIsManager_(user) ||
    (user.id && String(publication.publisher_user_id || '') === user.id) ||
    (user.email && soyibaAuthNormalizeEmail_(publication.publisher_email) === user.email);
}

function soyibaPublicacionesIsManager_(user) {
  var role = String(user.rolSistema || user.role || '').toLowerCase();
  return role === 'admin' || role === 'moderador';
}

function soyibaPublicacionesFindPublisherUser_(record) {
  try {
    var authSheet = soyibaAuthGetSheet_();
    var found = soyibaAuthFindUserByIdOrEmail_(authSheet, record.publisher_user_id, record.publisher_email);
    return found.row > 0 ? found.user : null;
  } catch (error) {
    return null;
  }
}

function soyibaPublicacionesBuildResponse_(record, savedByCurrentUser, yovoyByCurrentUser, ecoAttendanceByCurrentUser) {
  var capacityAvailable = Number(record.cupos || 0);
  var attendeesCount = Number(record.yovoy || 0);
  var capacityTotal = capacityAvailable + attendeesCount;
  var ecoAttendeesCount = Number(record.asistentes || 0);
  var ecoLatitude = soyibaPublicacionesNumberOrNull_(record.latitud);
  var ecoLongitude = soyibaPublicacionesLongitudeOrNull_(record.longitud);
  var publisherUser = soyibaPublicacionesFindPublisherUser_(record);
  var publisherPhotoUrl = String((publisherUser && publisherUser.photo_url) || record.publisher_photo_url || '');

  return {
    id: String(record.publication_id || ''),
    type: soyibaPublicacionesNormalizeType_(record.tipo_publicacion),
    title: String(record.title || ''),
    description: String(record.description || ''),
    createdAt: String(record.created_at || ''),
    updatedAt: String(record.updated_at || ''),
    sortTimestamp: Number(record.sort_timestamp || 0),
    author: {
      id: String(record.publisher_user_id || ''),
      name: String(record.publisher_name || 'SOY IBA'),
      email: String(record.publisher_email || ''),
      photoUrl: publisherPhotoUrl,
      verified: soyibaPublicacionesIsTrue_(publisherUser ? publisherUser.usuario_verificado : (record.publisher_verified || record.publisher_verificado))
    },
    mediaItems: soyibaPublicacionesParseArray_(record.media_items_json),
    cta: {
      type: soyibaPublicacionesNormalizeCtaType_(record.cta_type),
      url: String(record.cta_url || ''),
      phone: String(record.cta_phone || '')
    },
    relatedLinks: soyibaPublicacionesParseArray_(record.related_links_json),
    membersOnly: soyibaPublicacionesIsMembersOnly_(record),
    savedCount: Number(record.guardados || 0),
    viewsCount: Number(record.views || 0),
    sharedCount: Number(record.compartidos || 0),
    savedByCurrentUser: savedByCurrentUser === true,
    event: {
      dateTime: String(record.fecha_hora_evento || ''),
      place: String(record.lugar_evento || ''),
      validFrom: String(record.fecha_inicio_vigencia || ''),
      validUntil: String(record.fecha_caducidad || ''),
      capacityAvailable: capacityAvailable,
      attendeesCount: attendeesCount,
      capacityTotal: capacityTotal,
      currentUserGoing: yovoyByCurrentUser === true,
      expired: soyibaPublicacionesIsEventExpired_(record.fecha_caducidad)
    },
    eco: {
      day: String(record.diaEco || ''),
      time: String(record.horaEco || ''),
      host: String(record.anfitrion || ''),
      moderator: String(record.moderador || ''),
      phone: String(record.telefonoContacto || ''),
      address: String(record.direccion || ''),
      neighborhood: String(record.barrio || ''),
      city: String(record.ciudad || ''),
      latitude: ecoLatitude,
      longitude: ecoLongitude,
      attendeesCount: ecoAttendeesCount,
      currentUserAttending: ecoAttendanceByCurrentUser === true,
      validFrom: String(record.fechaInicioVigencia || ''),
      validUntil: String(record.fechaFinVigencia || '')
    },
    fecha_hora_evento: String(record.fecha_hora_evento || ''),
    lugar_evento: String(record.lugar_evento || ''),
    fecha_inicio_vigencia: String(record.fecha_inicio_vigencia || ''),
    fecha_caducidad: String(record.fecha_caducidad || ''),
    cupos: capacityAvailable,
    yovoy: attendeesCount,
    yovoy_by_current_user: yovoyByCurrentUser === true,
    diaEco: String(record.diaEco || ''),
    horaEco: String(record.horaEco || ''),
    anfitrion: String(record.anfitrion || ''),
    moderador: String(record.moderador || ''),
    telefonoContacto: String(record.telefonoContacto || ''),
    direccion: String(record.direccion || ''),
    barrio: String(record.barrio || ''),
    ciudad: String(record.ciudad || ''),
    latitud: ecoLatitude,
    longitud: ecoLongitude,
    asistentes: ecoAttendeesCount,
    fechaInicioVigencia: String(record.fechaInicioVigencia || ''),
    fechaFinVigencia: String(record.fechaFinVigencia || ''),
    asistencia_eco_by_current_user: ecoAttendanceByCurrentUser === true
  };
}

function soyibaPublicacionesGetSheet_() {
  var spreadsheet = SOYIBA_PUBLICACIONES_SPREADSHEET_ID
    ? SpreadsheetApp.openById(SOYIBA_PUBLICACIONES_SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(SOYIBA_PUBLICACIONES_SHEET) || spreadsheet.insertSheet(SOYIBA_PUBLICACIONES_SHEET);
  soyibaPublicacionesEnsureHeaders_(sheet, SOYIBA_PUBLICACIONES_HEADERS);
  return sheet;
}

function soyibaPublicacionesGetMediaFolder_() {
  var folderId = String(SOYIBA_PUBLICACIONES_MEDIA_FOLDER_ID || '').trim();

  if (folderId) {
    return DriveApp.getFolderById(folderId);
  }

  var folders = DriveApp.getFoldersByName(SOYIBA_PUBLICACIONES_MEDIA_FOLDER_NAME);

  if (folders.hasNext()) {
    return folders.next();
  }

  return DriveApp.createFolder(SOYIBA_PUBLICACIONES_MEDIA_FOLDER_NAME);
}

function soyibaPublicacionesDriveHealth_() {
  var sessionInfo = soyibaPublicacionesGetSessionInfo_();

  try {
    var folder = soyibaPublicacionesGetMediaFolder_();
    return {
      ok: true,
      module: 'Publicaciones',
      version: SOYIBA_INICIO_CODE_VERSION,
      drive: true,
      folderId: folder.getId(),
      folderName: folder.getName(),
      folderConfiguredById: Boolean(String(SOYIBA_PUBLICACIONES_MEDIA_FOLDER_ID || '').trim()),
      sharingMode: SOYIBA_PUBLICACIONES_SHARE_UPLOADED_FILES ? 'file' : 'folder',
      effectiveUser: sessionInfo.effectiveUser,
      activeUser: sessionInfo.activeUser
    };
  } catch (error) {
    return soyibaPublicacionesDriveError_(error);
  }
}

function soyibaPublicacionesAutorizarDrive() {
  return soyibaPublicacionesDriveHealth_();
}

function soyibaPublicacionesDriveWriteHealth_() {
  var sessionInfo = soyibaPublicacionesGetSessionInfo_();
  var step = 'start';

  try {
    step = 'getMediaFolder';
    var folder = soyibaPublicacionesGetMediaFolder_();
    step = 'createBlob';
    var blob = Utilities.newBlob('soyiba drive health ' + new Date().toISOString(), 'text/plain', 'soyiba-drive-health.txt');
    step = 'createFile';
    var file = folder.createFile(blob);

    if (SOYIBA_PUBLICACIONES_SHARE_UPLOADED_FILES) {
      step = 'setSharing';
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }

    step = 'getFileInfo';
    var fileId = file.getId();
    var fileUrl = file.getUrl();
    step = 'trashFile';
    file.setTrashed(true);

    return {
      ok: true,
      module: 'Publicaciones',
      version: SOYIBA_INICIO_CODE_VERSION,
      drive: true,
      write: true,
      sharing: SOYIBA_PUBLICACIONES_SHARE_UPLOADED_FILES,
      sharingMode: SOYIBA_PUBLICACIONES_SHARE_UPLOADED_FILES ? 'file' : 'folder',
      folderConfiguredById: Boolean(String(SOYIBA_PUBLICACIONES_MEDIA_FOLDER_ID || '').trim()),
      folderId: folder.getId(),
      folderName: folder.getName(),
      testFileId: fileId,
      testFileUrl: fileUrl,
      testFileTrashed: true,
      effectiveUser: sessionInfo.effectiveUser,
      activeUser: sessionInfo.activeUser
    };
  } catch (error) {
    return soyibaPublicacionesDriveError_(error, step);
  }
}

function soyibaPublicacionesDriveError_(error, failedStep) {
  var message = error && error.message ? error.message : String(error || '');
  var needsAuthorization = /DriveApp|Authorization|permission|denied|acceso denegado|autoriz/i.test(message);
  var sessionInfo = soyibaPublicacionesGetSessionInfo_();

  return {
    ok: false,
    module: 'Publicaciones',
    version: SOYIBA_INICIO_CODE_VERSION,
    drive: false,
    error: needsAuthorization
      ? 'Drive no esta autorizado para este Apps Script o el Web App no esta ejecutandose como soyiba.app@gmail.com. En Deploy > Manage deployments debe quedar Execute as: Me y la cuenta que despliega debe autorizar Drive ejecutando soyibaPublicacionesAutorizarDrive.'
      : 'No fue posible cargar el archivo a Drive: ' + message,
    failedStep: failedStep || '',
    effectiveUser: sessionInfo.effectiveUser,
    activeUser: sessionInfo.activeUser,
    detail: message
  };
}

function soyibaPublicacionesGetSessionInfo_() {
  var effectiveUser = '';
  var activeUser = '';

  try {
    effectiveUser = Session.getEffectiveUser().getEmail();
  } catch (error) {
    effectiveUser = 'No disponible: ' + (error && error.message ? error.message : String(error || ''));
  }

  try {
    activeUser = Session.getActiveUser().getEmail();
  } catch (error) {
    activeUser = 'No disponible: ' + (error && error.message ? error.message : String(error || ''));
  }

  return {
    effectiveUser: effectiveUser,
    activeUser: activeUser
  };
}

function soyibaGuardadosGetSheet_() {
  var spreadsheet = SOYIBA_PUBLICACIONES_SPREADSHEET_ID
    ? SpreadsheetApp.openById(SOYIBA_PUBLICACIONES_SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(SOYIBA_GUARDADOS_SHEET) || spreadsheet.insertSheet(SOYIBA_GUARDADOS_SHEET);
  soyibaPublicacionesEnsureHeaders_(sheet, SOYIBA_GUARDADOS_HEADERS);
  return sheet;
}

function soyibaYoVoyGetSheet_() {
  var spreadsheet = SOYIBA_PUBLICACIONES_SPREADSHEET_ID
    ? SpreadsheetApp.openById(SOYIBA_PUBLICACIONES_SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(SOYIBA_YOVOY_SHEET) || spreadsheet.insertSheet(SOYIBA_YOVOY_SHEET);
  soyibaPublicacionesEnsureHeaders_(sheet, SOYIBA_YOVOY_HEADERS);
  return sheet;
}

function soyibaAsistenciasEcoGetSheet_() {
  var spreadsheet = SOYIBA_PUBLICACIONES_SPREADSHEET_ID
    ? SpreadsheetApp.openById(SOYIBA_PUBLICACIONES_SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(SOYIBA_ASISTENCIAS_ECO_SHEET) || spreadsheet.insertSheet(SOYIBA_ASISTENCIAS_ECO_SHEET);
  soyibaPublicacionesEnsureHeaders_(sheet, SOYIBA_ASISTENCIAS_ECO_HEADERS);
  return sheet;
}

function soyibaPublicacionesEnsureHeaders_(sheet, expectedHeaders) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(expectedHeaders);
    return;
  }

  var headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), expectedHeaders.length)).getValues()[0];
  var needsRewrite = expectedHeaders.some(function (header) {
    return headers.indexOf(header) === -1;
  });

  if (needsRewrite) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
  }
}

function soyibaPublicacionesGetHeaders_(sheet) {
  return sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), SOYIBA_PUBLICACIONES_HEADERS.length)).getValues()[0];
}

function soyibaPublicacionesReadRow_(sheet, row) {
  var headers = soyibaPublicacionesGetHeaders_(sheet);
  var values = sheet.getRange(row, 1, 1, Math.max(sheet.getLastColumn(), SOYIBA_PUBLICACIONES_HEADERS.length)).getValues()[0];
  return soyibaPublicacionesRowToObject_(headers, values);
}

function soyibaPublicacionesFindRow_(sheet, publicationId) {
  var headers = soyibaPublicacionesGetHeaders_(sheet);
  var idColumn = headers.indexOf('publication_id');
  var values = sheet.getDataRange().getValues();
  var target = String(publicationId || '').trim();

  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    if (String(values[rowIndex][idColumn] || '').trim() === target) {
      return { row: rowIndex + 1, record: soyibaPublicacionesRowToObject_(headers, values[rowIndex]) };
    }
  }

  return { row: -1, record: null };
}

function soyibaPublicacionesGetSavedMap_(sheet, user) {
  var headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), SOYIBA_GUARDADOS_HEADERS.length)).getValues()[0];
  var publicationColumn = headers.indexOf('publication_id');
  var userIdColumn = headers.indexOf('user_id');
  var emailColumn = headers.indexOf('user_email');
  var values = sheet.getDataRange().getValues();
  var map = {};

  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    var rowUserId = String(values[rowIndex][userIdColumn] || '').trim();
    var rowEmail = soyibaAuthNormalizeEmail_(values[rowIndex][emailColumn]);

    if ((user.id && rowUserId === user.id) || (user.email && rowEmail === user.email)) {
      map[String(values[rowIndex][publicationColumn])] = true;
    }
  }

  return map;
}

function soyibaPublicacionesFindSavedRow_(sheet, publicationId, user) {
  var headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), SOYIBA_GUARDADOS_HEADERS.length)).getValues()[0];
  var publicationColumn = headers.indexOf('publication_id');
  var userIdColumn = headers.indexOf('user_id');
  var emailColumn = headers.indexOf('user_email');
  var values = sheet.getDataRange().getValues();

  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    var samePublication = String(values[rowIndex][publicationColumn] || '').trim() === publicationId;
    var sameUser = (user.id && String(values[rowIndex][userIdColumn] || '').trim() === user.id) ||
      (user.email && soyibaAuthNormalizeEmail_(values[rowIndex][emailColumn]) === user.email);

    if (samePublication && sameUser) {
      return { row: rowIndex + 1 };
    }
  }

  return { row: -1 };
}

function soyibaPublicacionesGetYoVoyMap_(sheet, user) {
  var headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), SOYIBA_YOVOY_HEADERS.length)).getValues()[0];
  var publicationColumn = headers.indexOf('publication_id');
  var userIdColumn = headers.indexOf('user_id');
  var emailColumn = headers.indexOf('user_email');
  var values = sheet.getDataRange().getValues();
  var map = {};

  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    var rowUserId = String(values[rowIndex][userIdColumn] || '').trim();
    var rowEmail = soyibaAuthNormalizeEmail_(values[rowIndex][emailColumn]);

    if ((user.id && rowUserId === user.id) || (user.email && rowEmail === user.email)) {
      map[String(values[rowIndex][publicationColumn])] = true;
    }
  }

  return map;
}

function soyibaPublicacionesFindYoVoyRow_(sheet, publicationId, user) {
  var headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), SOYIBA_YOVOY_HEADERS.length)).getValues()[0];
  var publicationColumn = headers.indexOf('publication_id');
  var userIdColumn = headers.indexOf('user_id');
  var emailColumn = headers.indexOf('user_email');
  var values = sheet.getDataRange().getValues();

  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    var samePublication = String(values[rowIndex][publicationColumn] || '').trim() === publicationId;
    var sameUser = (user.id && String(values[rowIndex][userIdColumn] || '').trim() === user.id) ||
      (user.email && soyibaAuthNormalizeEmail_(values[rowIndex][emailColumn]) === user.email);

    if (samePublication && sameUser) {
      return { row: rowIndex + 1 };
    }
  }

  return { row: -1 };
}

function soyibaPublicacionesGetEcoAttendanceMap_(sheet, user) {
  var headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), SOYIBA_ASISTENCIAS_ECO_HEADERS.length)).getValues()[0];
  var publicationColumn = headers.indexOf('idPublicacion');
  var userColumn = headers.indexOf('idUsuario');
  var values = sheet.getDataRange().getValues();
  var userKey = soyibaPublicacionesEcoUserKey_(user);
  var map = {};

  if (!userKey) {
    return map;
  }

  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    var rowUser = String(values[rowIndex][userColumn] || '').trim();

    if (rowUser === userKey) {
      map[String(values[rowIndex][publicationColumn])] = true;
    }
  }

  return map;
}

function soyibaPublicacionesFindEcoAttendanceRow_(sheet, publicationId, user) {
  var headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), SOYIBA_ASISTENCIAS_ECO_HEADERS.length)).getValues()[0];
  var publicationColumn = headers.indexOf('idPublicacion');
  var userColumn = headers.indexOf('idUsuario');
  var values = sheet.getDataRange().getValues();
  var userKey = soyibaPublicacionesEcoUserKey_(user);

  if (!userKey) {
    return { row: -1 };
  }

  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    var samePublication = String(values[rowIndex][publicationColumn] || '').trim() === publicationId;
    var sameUser = String(values[rowIndex][userColumn] || '').trim() === userKey;

    if (samePublication && sameUser) {
      return { row: rowIndex + 1 };
    }
  }

  return { row: -1 };
}

function soyibaPublicacionesFindEcoAttendanceRowsForUser_(sheet, user) {
  var headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), SOYIBA_ASISTENCIAS_ECO_HEADERS.length)).getValues()[0];
  var publicationColumn = headers.indexOf('idPublicacion');
  var userColumn = headers.indexOf('idUsuario');
  var values = sheet.getDataRange().getValues();
  var userKey = soyibaPublicacionesEcoUserKey_(user);
  var rows = [];

  if (!userKey) {
    return rows;
  }

  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    var rowUser = String(values[rowIndex][userColumn] || '').trim();

    if (rowUser === userKey) {
      rows.push({
        row: rowIndex + 1,
        publicationId: String(values[rowIndex][publicationColumn] || '').trim()
      });
    }
  }

  return rows;
}

function soyibaPublicacionesEcoUserKey_(user) {
  return String((user && (user.id || user.email)) || '').trim();
}

function soyibaPublicacionesIncrement_(sheet, row, header, delta) {
  var headers = soyibaPublicacionesGetHeaders_(sheet);
  var column = headers.indexOf(header);

  if (column < 0) {
    return;
  }

  var range = sheet.getRange(row, column + 1);
  var nextValue = Math.max(0, Number(range.getValue() || 0) + delta);
  range.setValue(nextValue);
}

function soyibaPublicacionesSetCell_(sheet, headers, row, header, value) {
  var column = headers.indexOf(header);

  if (column >= 0) {
    sheet.getRange(row, column + 1).setValue(value);
  }
}

function soyibaPublicacionesRowToObject_(headers, row) {
  return headers.reduce(function (record, header, index) {
    record[header] = row[index];
    return record;
  }, {});
}

function soyibaPublicacionesStringifyArray_(value) {
  if (!value) {
    return '[]';
  }

  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value);
}

function soyibaPublicacionesParseArray_(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  try {
    var parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function soyibaPublicacionesNormalizeEventPayload_(data, currentYoVoy) {
  var event = data && data.event ? data.event : {};
  var attendees = Math.max(0, Number(currentYoVoy || 0));
  var rawCapacityTotal = Number(
    event.capacityTotal ||
    event.capacity_total ||
    data.capacityTotal ||
    data.cupos_total ||
    data.cuposTotales ||
    data.cupos ||
    0
  );
  var capacityTotal = Math.max(0, rawCapacityTotal);
  var capacityAvailable = Math.max(0, capacityTotal - attendees);

  return {
    dateTime: String(event.dateTime || event.fechaHora || data.eventDateTime || data.fecha_hora_evento || data.fecha_evento || ''),
    place: String(event.place || data.eventPlace || data.lugar_evento || ''),
    validFrom: String(event.validFrom || data.eventValidFrom || data.fecha_inicio_vigencia || ''),
    validUntil: String(event.validUntil || data.eventValidUntil || data.fecha_caducidad || ''),
    capacityAvailable: capacityAvailable
  };
}

function soyibaPublicacionesNormalizeEcoPayload_(data) {
  var eco = data && data.eco ? data.eco : {};

  return {
    day: String(soyibaPublicacionesFirstValue_(eco.day, eco.diaEco, data.diaEco, data.dia_eco)),
    time: String(soyibaPublicacionesFirstValue_(eco.time, eco.horaEco, data.horaEco, data.hora_eco)),
    host: String(soyibaPublicacionesFirstValue_(eco.host, eco.anfitrion, data.anfitrion)),
    moderator: String(soyibaPublicacionesFirstValue_(eco.moderator, eco.moderador, data.moderador)),
    phone: String(soyibaPublicacionesFirstValue_(eco.phone, eco.telefonoContacto, data.telefonoContacto, data.telefono_contacto)),
    address: String(soyibaPublicacionesFirstValue_(eco.address, eco.direccion, data.direccion)),
    neighborhood: String(soyibaPublicacionesFirstValue_(eco.neighborhood, eco.barrio, data.barrio, data.sector)),
    city: String(soyibaPublicacionesFirstValue_(eco.city, eco.ciudad, data.ciudad)),
    latitude: soyibaPublicacionesCoordinateValue_(soyibaPublicacionesFirstValue_(eco.latitude, eco.latitud, data.latitud)),
    longitude: soyibaPublicacionesLongitudeValue_(soyibaPublicacionesFirstValue_(eco.longitude, eco.longitud, data.longitud)),
    validFrom: String(soyibaPublicacionesFirstValue_(eco.validFrom, eco.fechaInicioVigencia, data.fechaInicioVigencia)),
    validUntil: String(soyibaPublicacionesFirstValue_(eco.validUntil, eco.fechaFinVigencia, data.fechaFinVigencia))
  };
}

function soyibaPublicacionesIsEventExpired_(value) {
  if (!value) {
    return false;
  }

  var timestamp = new Date(value).getTime();
  return !isNaN(timestamp) && timestamp < new Date().getTime();
}

function soyibaPublicacionesNormalizeType_(value) {
  var text = String(value || '').toLowerCase();

  if (text.indexOf('evento') >= 0) {
    return 'Evento';
  }

  if (text.indexOf('eco') >= 0) {
    return 'Grupo ECO';
  }

  if (text.indexOf('devoc') >= 0) {
    return 'Devocional';
  }

  if (text.indexOf('trans') >= 0) {
    return 'Transmision';
  }

  return 'Publicacion';
}

function soyibaPublicacionesNormalizeCtaType_(value) {
  var text = String(value || '').toLowerCase();

  if (!text || text.indexOf('ninguno') >= 0 || text.indexOf('sin') >= 0) {
    return 'Ninguno';
  }

  if (text.indexOf('inscrip') >= 0) {
    return 'Inscripcion';
  }

  if (text.indexOf('whatsapp') >= 0) {
    return 'Whatsapp';
  }

  return 'Enlace';
}

function soyibaPublicacionesNormalizeMembersOnly_(data) {
  return soyibaPublicacionesIsTrue_(soyibaPublicacionesFirstValue_(
    data && data.membersOnly,
    data && data.members_only,
    data && data.soloMiembros,
    data && data.solo_miembros
  ));
}

function soyibaPublicacionesIsMembersOnly_(record) {
  return soyibaPublicacionesIsTrue_(soyibaPublicacionesFirstValue_(
    record && record.membersOnly,
    record && record.members_only,
    record && record.soloMiembros,
    record && record.solo_miembros
  ));
}

function soyibaPublicacionesIsMemberUser_(user) {
  return String((user && (user.tipoUsuario || user.tipo_usuario)) || '').trim().toLowerCase() === 'miembro';
}

function soyibaPublicacionesIsTrue_(value) {
  if (value === true) {
    return true;
  }

  return ['true', '1', 'si', 'yes'].indexOf(String(value || '').trim().toLowerCase()) >= 0;
}

function soyibaPublicacionesFirstValue_() {
  for (var index = 0; index < arguments.length; index += 1) {
    var value = arguments[index];

    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }

  return '';
}

function soyibaPublicacionesCoordinateValue_(value) {
  var normalized = String(value === undefined || value === null ? '' : value).trim().replace(',', '.');

  if (!normalized) {
    return '';
  }

  var parsed = Number(normalized);
  return isNaN(parsed) ? '' : parsed;
}

function soyibaPublicacionesNumberOrNull_(value) {
  var normalized = String(value === undefined || value === null ? '' : value).trim().replace(',', '.');

  if (!normalized) {
    return null;
  }

  var parsed = Number(normalized);
  return isNaN(parsed) ? null : parsed;
}

function soyibaPublicacionesLongitudeValue_(value) {
  var parsed = soyibaPublicacionesCoordinateValue_(value);

  if (parsed === '') {
    return '';
  }

  if (parsed > 0 && parsed >= 60 && parsed <= 85) {
    return -parsed;
  }

  return parsed;
}

function soyibaPublicacionesLongitudeOrNull_(value) {
  var parsed = soyibaPublicacionesNumberOrNull_(value);

  if (parsed === null) {
    return null;
  }

  if (parsed > 0 && parsed >= 60 && parsed <= 85) {
    return -parsed;
  }

  return parsed;
}

function soyibaInicioGetSheet_() {
  var spreadsheet = SOYIBA_INICIO_SPREADSHEET_ID
    ? SpreadsheetApp.openById(SOYIBA_INICIO_SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(SOYIBA_INICIO_SHEET) || spreadsheet.insertSheet(SOYIBA_INICIO_SHEET);
  soyibaInicioEnsureHeaders_(sheet);
  return sheet;
}

function soyibaInicioEnsureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(SOYIBA_INICIO_HEADERS);
    return;
  }

  var headers = soyibaInicioGetHeaders_(sheet);
  var needsRewrite = SOYIBA_INICIO_HEADERS.some(function (header) {
    return headers.indexOf(header) === -1;
  });

  if (needsRewrite) {
    sheet.getRange(1, 1, 1, SOYIBA_INICIO_HEADERS.length).setValues([SOYIBA_INICIO_HEADERS]);
  }
}

function soyibaInicioFindMetricRow_(sheet, metricId) {
  var headers = soyibaInicioGetHeaders_(sheet);
  var idColumn = headers.indexOf('metric_id');
  var values = sheet.getDataRange().getValues();

  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    if (String(values[rowIndex][idColumn]) === metricId) {
      return rowIndex + 1;
    }
  }

  return -1;
}

function soyibaInicioRowToObject_(headers, row) {
  return headers.reduce(function (record, header, index) {
    record[header] = row[index];
    return record;
  }, {});
}

function soyibaInicioGetHeaders_(sheet) {
  return sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), SOYIBA_INICIO_HEADERS.length)).getValues()[0];
}

function soyibaInicioParsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return {};
  }

  return JSON.parse(e.postData.contents);
}

function soyibaInicioJson_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
