var SOYIBA_INICIO_SPREADSHEET_ID = '1D99Q2bZuM8fYg1W_yvbsAT2VqKZZYWk6COGMm3AZar0';
var SOYIBA_INICIO_SHEET = 'Inicio';
var SOYIBA_INICIO_HEADERS = ['metric_id', 'label', 'value', 'sort_order', 'visible', 'updated_at'];
var SOYIBA_AUTH_SPREADSHEET_ID = '1Sk6f6mScrMTcXfa-psxoY4boa_1gqJmFt7anP-lpErM';
var SOYIBA_AUTH_SHEET = 'Auth';
var SOYIBA_INICIO_CODE_VERSION = 'publicaciones-drive-folder-1qq-2026-06-16';
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
  'tiempo_iba'
];
var SOYIBA_PUBLICACIONES_SPREADSHEET_ID = SOYIBA_INICIO_SPREADSHEET_ID;
var SOYIBA_PUBLICACIONES_SHEET = 'Publicaciones';
var SOYIBA_GUARDADOS_SHEET = 'Guardados';
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
  'sort_timestamp'
];
var SOYIBA_GUARDADOS_HEADERS = [
  'saved_id',
  'publication_id',
  'user_id',
  'user_email',
  'user_name',
  'created_at'
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
      action === 'register' ||
      action === 'login' ||
      action === 'updateFcmToken' ||
      action === 'updateProfile' ||
      action === 'changePassword'
    ) {
      return soyibaInicioJson_(soyibaAuthHandle_(action, data));
    }

    if (moduleName === 'Publicaciones') {
      return soyibaInicioJson_(soyibaPublicacionesHandle_(action, data));
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

  if (action === 'changePassword') {
    return soyibaAuthChangePassword_(data);
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
    tipoUsuario: user.tipo_usuario || 'Asistente',
    tituloUsuario: user.titulo_usuario || 'Asistente',
    rolSistema: user.rol_sistema || user.role || 'Usuario',
    estadoUsuario: user.estado_usuario || (user.status === 'active' ? 'Activo' : 'Inactivo'),
    tiempoIba: user.tiempo_iba || '',
    publicador: soyibaAuthIsTrue_(user.publicador),
    publicadorEco: soyibaAuthIsTrue_(user.publicador_eco),
    publicadorEvento: soyibaAuthIsTrue_(user.publicador_evento),
    active: user.active === '' || user.active === undefined ? user.status === 'active' : soyibaAuthIsTrue_(user.active)
  };
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
  var values = sheet.getDataRange().getValues();
  var headers = soyibaPublicacionesGetHeaders_(sheet);
  var currentUser = soyibaPublicacionesGetCurrentUser_(data);
  var savedMap = soyibaPublicacionesGetSavedMap_(savedSheet, currentUser);
  var publications = [];

  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    var record = soyibaPublicacionesRowToObject_(headers, values[rowIndex]);

    if (String(record.status || '').toLowerCase() === 'deleted') {
      continue;
    }

    publications.push(soyibaPublicacionesBuildResponse_(record, savedMap[String(record.publication_id)] === true));
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
    now.getTime()
  ];

  var sheet = soyibaPublicacionesGetSheet_();
  sheet.appendRow(row);

  return {
    ok: true,
    publication: soyibaPublicacionesBuildResponse_(soyibaPublicacionesRowToObject_(SOYIBA_PUBLICACIONES_HEADERS, row), false)
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

  var record = soyibaPublicacionesReadRow_(sheet, found.row);
  return { ok: true, publication: soyibaPublicacionesBuildResponse_(record, false) };
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

  return {
    id: String((user && user.user_id) || source.id || data.userId || '').trim(),
    email: soyibaAuthNormalizeEmail_((user && user.email) || source.email || data.email || ''),
    name: String((user && user.display_name) || source.name || source.displayName || source.email || 'Usuario SOY IBA'),
    photoUrl: String(source.photoUrl || source.photo_url || ''),
    role: String((user && user.role) || source.role || ''),
    rolSistema: String((user && user.rol_sistema) || source.rolSistema || source.rol_sistema || source.role || ''),
    publicador: soyibaPublicacionesIsTrue_((user && user.publicador) || source.publicador),
    publicadorEco: soyibaPublicacionesIsTrue_((user && user.publicador_eco) || source.publicadorEco || source.publicador_eco),
    publicadorEvento: soyibaPublicacionesIsTrue_((user && user.publicador_evento) || source.publicadorEvento || source.publicador_evento)
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

function soyibaPublicacionesBuildResponse_(record, savedByCurrentUser) {
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
      photoUrl: String(record.publisher_photo_url || '')
    },
    mediaItems: soyibaPublicacionesParseArray_(record.media_items_json),
    cta: {
      type: soyibaPublicacionesNormalizeCtaType_(record.cta_type),
      url: String(record.cta_url || ''),
      phone: String(record.cta_phone || '')
    },
    relatedLinks: soyibaPublicacionesParseArray_(record.related_links_json),
    savedCount: Number(record.guardados || 0),
    viewsCount: Number(record.views || 0),
    sharedCount: Number(record.compartidos || 0),
    savedByCurrentUser: savedByCurrentUser === true
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

function soyibaPublicacionesNormalizeType_(value) {
  var text = String(value || '').toLowerCase();

  if (text.indexOf('evento') >= 0) {
    return 'Evento';
  }

  if (text.indexOf('eco') >= 0) {
    return 'Grupo ECO';
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

function soyibaPublicacionesIsTrue_(value) {
  if (value === true) {
    return true;
  }

  return ['true', '1', 'si', 'yes'].indexOf(String(value || '').trim().toLowerCase()) >= 0;
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
