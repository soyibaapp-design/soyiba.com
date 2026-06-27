var SOYIBA_AUTH_SPREADSHEET_ID = '1Sk6f6mScrMTcXfa-psxoY4boa_1gqJmFt7anP-lpErM';
var SOYIBA_AUTH_SHEET = 'Auth';
var SOYIBA_AUTH_CODE_VERSION = 'users-verification-2026-06-24';
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

function doGet() {
  return soyibaAuthJson_({ ok: true, module: 'Auth', screen: 'Auth', version: SOYIBA_AUTH_CODE_VERSION });
}

function doPost(e) {
  try {
    var payload = soyibaAuthParsePayload_(e);
    var action = payload.action || 'health';
    var data = payload.data || {};

    if (action === 'health') {
      return soyibaAuthJson_({ ok: true, module: 'Auth', version: SOYIBA_AUTH_CODE_VERSION });
    }

    if (action === 'version') {
      return soyibaAuthJson_({ ok: true, module: 'Auth', version: SOYIBA_AUTH_CODE_VERSION });
    }

    if (action === 'register') {
      return soyibaAuthJson_(soyibaAuthRegister_(data));
    }

    if (action === 'login') {
      return soyibaAuthJson_(soyibaAuthLogin_(data));
    }

    if (action === 'updateFcmToken') {
      return soyibaAuthJson_(soyibaAuthUpdateFcmToken_(data));
    }

    if (action === 'updateProfile') {
      return soyibaAuthJson_(soyibaAuthUpdateProfile_(data));
    }

    if (action === 'updateProfilePhoto') {
      return soyibaAuthJson_(soyibaAuthUpdateProfilePhoto_(data));
    }

    if (action === 'changePassword') {
      return soyibaAuthJson_(soyibaAuthChangePassword_(data));
    }

    if (action === 'listUsers') {
      return soyibaAuthJson_(soyibaAuthListUsers_(data));
    }

    if (action === 'listMembers' || action === 'listDirectoryMembers') {
      return soyibaAuthJson_(soyibaMembersList_(data));
    }

    if (action === 'updateUserAccess') {
      return soyibaAuthJson_(soyibaAuthUpdateUserAccess_(data));
    }

    return soyibaAuthJson_({ ok: false, error: 'Accion no soportada: ' + action });
  } catch (error) {
    return soyibaAuthJson_({ ok: false, error: error.message || String(error) });
  }
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

  sheet.appendRow([
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
  ]);

  return {
    ok: true,
    token: Utilities.getUuid(),
    user: soyibaAuthBuildUser_(soyibaAuthRowToObject_(SOYIBA_AUTH_HEADERS, [
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
    ]))
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

function soyibaAuthParsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return {};
  }

  return JSON.parse(e.postData.contents);
}

function soyibaAuthJson_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
