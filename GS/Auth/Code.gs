var SOYIBA_AUTH_SPREADSHEET_ID = '1Sk6f6mScrMTcXfa-psxoY4boa_1gqJmFt7anP-lpErM';
var SOYIBA_AUTH_SHEET = 'Auth';
var SOYIBA_MINOR_VALIDATION_SHEET = 'MinorValidationRequests';
var SOYIBA_MIEMBROS_IBA_SHEET = 'MiembrosIBA';
var SOYIBA_HEALTH_SESSIONS_SHEET = 'AppHealthSessions';
var SOYIBA_AUTH_CODE_VERSION = 'membership-email-claim-validation-2026-07-21';
var SOYIBA_PASSWORD_RESET_TTL_MINUTES = 60;
var SOYIBA_HEALTH_ACTIVE_WINDOW_MS = 2 * 60 * 1000;
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
  'minor_validator',
  'acepto_politica_datos',
  'fecha_aceptacion_politica',
  'active',
  'tiempo_iba',
  'usuario_verificado',
  'photo_url',
  'reset_token_hash',
  'reset_token_salt',
  'reset_token_expires_at',
  'reset_requested_at',
  'cc',
  'miembro_validado_at',
  'miembro_validado_por',
  'miembro_validacion_estado',
  'miembro_validacion_notas',
  'politica_datos_version',
  'tratamiento_datos_autorizado_at',
  'fecha_nacimiento',
  'registro_menor_edad',
  'autorizacion_acudiente',
  'guardian_name',
  'guardian_email',
  'guardian_phone',
  'minor_validation_status',
  'minor_validation_request_id',
  'visible_directorio',
  'mostrar_telefono',
  'permitir_whatsapp',
  'mostrar_foto'
];
var SOYIBA_MINOR_VALIDATION_HEADERS = [
  'request_id',
  'user_id',
  'user_name',
  'user_email',
  'user_phone',
  'fecha_nacimiento',
  'guardian_name',
  'guardian_email',
  'guardian_phone',
  'status',
  'approval_token_hash',
  'approval_token_salt',
  'created_at',
  'guardian_approved_at',
  'reviewed_at',
  'reviewed_by_user_id',
  'reviewed_by_email',
  'rejection_reason',
  'updated_at'
];
var SOYIBA_MIEMBROS_IBA_HEADERS = [
  'cc',
  'nombre',
  'apellido',
  'estado',
  'email',
  'telefono',
  'claimed_user_id',
  'claimed_email',
  'claimed_at',
  'claim_status',
  'claim_notes',
  'updated_at'
];
var SOYIBA_HEALTH_SESSION_HEADERS = [
  'session_id',
  'token_hash',
  'user_id',
  'email',
  'display_name',
  'role',
  'status',
  'started_at',
  'last_seen_at',
  'ended_at',
  'revoked_at',
  'revoked_by_user_id',
  'revoked_by_email',
  'revoke_reason',
  'ip_address',
  'user_agent',
  'page',
  'active_call_count',
  'call_summary',
  'total_calls',
  'updated_at'
];

function doGet(e) {
  var params = (e && e.parameter) || {};

  if (params.action === 'approveMinor') {
    return soyibaAuthGuardianApprovalHtml_(soyibaAuthApproveMinorByGuardian_(params));
  }

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

    if (action === 'recordLogin') {
      return soyibaAuthJson_(soyibaAuthRecordLogin_(data));
    }

    if (action === 'getCurrentUser') {
      return soyibaAuthJson_(soyibaAuthGetCurrentUser_(data));
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

    if (action === 'verifyMembershipByCc') {
      return soyibaAuthJson_(soyibaAuthVerifyMembershipByCc_(data));
    }

    if (action === 'changePassword') {
      return soyibaAuthJson_(soyibaAuthChangePassword_(data));
    }

    if (action === 'requestPasswordReset') {
      return soyibaAuthJson_(soyibaAuthRequestPasswordReset_(data));
    }

    if (action === 'completePasswordReset') {
      return soyibaAuthJson_(soyibaAuthCompletePasswordReset_(data));
    }

    if (action === 'createMinorValidationRequest') {
      return soyibaAuthJson_(soyibaAuthCreateMinorValidationRequest_(data));
    }

    if (action === 'getMinorValidationRequestStatus') {
      return soyibaAuthJson_(soyibaAuthGetMinorValidationRequestStatus_(data));
    }

    if (action === 'approveMinorByGuardian') {
      return soyibaAuthJson_(soyibaAuthApproveMinorByGuardian_(data));
    }

    if (action === 'reviewMinorValidationRequest') {
      return soyibaAuthJson_(soyibaAuthReviewMinorValidationRequest_(data));
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

    if (action === 'healthPing') {
      return soyibaAuthJson_(soyibaAuthHealthPing_(data));
    }

    if (action === 'healthDashboard') {
      return soyibaAuthJson_(soyibaAuthHealthDashboard_(data));
    }

    if (action === 'forceLogoutSessions') {
      return soyibaAuthJson_(soyibaAuthForceLogoutSessions_(data));
    }

    if (action === 'closeOtherHealthSessions') {
      return soyibaAuthJson_(soyibaAuthCloseOtherHealthSessions_(data));
    }

    if (action === 'endHealthSession') {
      return soyibaAuthJson_(soyibaAuthEndHealthSession_(data));
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
  var fechaNacimiento = soyibaAuthNormalizeBirthDate_(data.fechaNacimiento || data.fecha_nacimiento);
  var registroMenorEdad = soyibaAuthIsMinorFromBirthDate_(fechaNacimiento);
  var autorizacionAcudiente = registroMenorEdad ? soyibaAuthIsTrue_(data.autorizacionAcudiente !== undefined ? data.autorizacionAcudiente : data.autorizacion_acudiente) : false;
  var guardianName = registroMenorEdad ? String(data.guardianName || data.guardian_name || '').trim() : '';
  var guardianEmail = registroMenorEdad ? soyibaAuthNormalizeEmail_(data.guardianEmail || data.guardian_email) : '';
  var guardianPhone = registroMenorEdad ? String(data.guardianPhone || data.guardian_phone || '').trim() : '';
  var requestId = registroMenorEdad ? String(data.requestId || data.request_id || Utilities.getUuid()).trim() : '';
  var minorValidationStatus = registroMenorEdad ? 'guardian_pending' : 'not_required';

  if (!email || !password || !firstName || !lastName || !phone) {
    return { ok: false, error: 'Correo, contrasena, nombres, apellidos y celular son requeridos.' };
  }

  if (!fechaNacimiento) {
    return { ok: false, error: 'Fecha de nacimiento requerida.' };
  }

  if (registroMenorEdad && !autorizacionAcudiente) {
    return { ok: false, error: 'Para menores de edad se requiere autorizacion del representante legal.' };
  }

  if (registroMenorEdad && (!guardianName || !guardianEmail || !guardianPhone)) {
    return { ok: false, error: 'Datos del representante legal requeridos.' };
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
    registroMenorEdad ? 'minor_pending_guardian' : 'active',
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
    registroMenorEdad ? 'Pendiente representante' : estadoUsuario,
    false,
    false,
    false,
    false,
    true,
    now,
    !registroMenorEdad,
    '',
    false,
    '',
    String(data.politicaDatosVersion || data.politica_datos_version || '2026-08-24'),
    now,
    fechaNacimiento,
    registroMenorEdad,
    autorizacionAcudiente,
    guardianName,
    guardianEmail,
    guardianPhone,
    minorValidationStatus,
    requestId,
    false,
    false,
    false,
    true
  ]);

  if (registroMenorEdad) {
    soyibaAuthCreateMinorValidationRequest_({
      requestId: requestId,
      userId: userId,
      userName: displayName,
      userEmail: email,
      userPhone: phone,
      fechaNacimiento: fechaNacimiento,
      guardianName: guardianName,
      guardianEmail: guardianEmail,
      guardianPhone: guardianPhone,
      appUrl: data.appUrl || data.app_url
    });

    return {
      ok: false,
      pending: true,
      message: 'Registro recibido. Enviamos un correo al representante legal; cuando apruebe, IBA revisara y activara la cuenta.',
      requestId: requestId
    };
  }

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
      false,
      true,
      now,
      true,
      '',
      false,
      '',
      String(data.politicaDatosVersion || data.politica_datos_version || '2026-08-24'),
      now,
      fechaNacimiento,
      registroMenorEdad,
      autorizacionAcudiente,
      guardianName,
      guardianEmail,
      guardianPhone,
      minorValidationStatus,
      requestId,
      false,
      false,
      false,
      true
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

  return {
    ok: true,
    token: Utilities.getUuid(),
    user: soyibaAuthBuildUser_(user)
  };
}

function soyibaAuthRecordLogin_(data) {
  var email = soyibaAuthNormalizeEmail_(data.email);
  var userId = String(data.userId || data.user_id || '').trim();
  var sheet = soyibaAuthGetSheet_();
  var found = soyibaAuthFindUserByIdOrEmail_(sheet, userId, email);

  if (found.row < 1) {
    return { ok: false, error: 'Usuario no encontrado para actualizar login.' };
  }

  var headers = soyibaAuthGetHeaders_(sheet);
  var now = new Date().toISOString();
  sheet.getRangeList([
    sheet.getRange(found.row, headers.indexOf('last_login_at') + 1).getA1Notation(),
    sheet.getRange(found.row, headers.indexOf('updated_at') + 1).getA1Notation()
  ]).setValue(now);

  return { ok: true, updatedAt: now };
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
    cc: user.cc || '',
    miembroValidadoAt: user.miembro_validado_at || '',
    miembroValidadoPor: user.miembro_validado_por || '',
    miembroValidacionEstado: user.miembro_validacion_estado || '',
    miembroValidacionNotas: user.miembro_validacion_notas || '',
    photoUrl: user.photo_url || '',
    tipoUsuario: user.tipo_usuario || 'Asistente',
    tituloUsuario: user.titulo_usuario || 'Asistente',
    rolSistema: user.rol_sistema || user.role || 'Usuario',
    estadoUsuario: user.estado_usuario || (user.status === 'active' ? 'Activo' : 'Inactivo'),
    tiempoIba: user.tiempo_iba || '',
    publicador: soyibaAuthIsTrue_(user.publicador),
    publicadorEco: soyibaAuthIsTrue_(user.publicador_eco),
    publicadorEvento: soyibaAuthIsTrue_(user.publicador_evento),
    minorValidator: soyibaAuthIsTrue_(user.minor_validator),
    verificado: soyibaAuthIsTrue_(user.usuario_verificado),
    aceptoPoliticaDatos: soyibaAuthIsTrue_(user.acepto_politica_datos),
    fechaAceptacionPolitica: user.fecha_aceptacion_politica || '',
    politicaDatosVersion: user.politica_datos_version || '',
    autorizacionTratamientoDatos: Boolean(user.tratamiento_datos_autorizado_at),
    fechaNacimiento: user.fecha_nacimiento || '',
    registroMenorEdad: soyibaAuthIsTrue_(user.registro_menor_edad),
    autorizacionAcudiente: soyibaAuthIsTrue_(user.autorizacion_acudiente),
    guardianName: user.guardian_name || '',
    guardianEmail: user.guardian_email || '',
    guardianPhone: user.guardian_phone || '',
    minorValidationStatus: user.minor_validation_status || '',
    minorValidationRequestId: user.minor_validation_request_id || '',
    visibleDirectorio: soyibaAuthIsTrue_(user.visible_directorio),
    mostrarTelefono: soyibaAuthIsTrue_(user.mostrar_telefono),
    permitirWhatsapp: soyibaAuthIsTrue_(user.permitir_whatsapp),
    mostrarFoto: user.mostrar_foto === '' || user.mostrar_foto === undefined ? true : soyibaAuthIsTrue_(user.mostrar_foto),
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

function soyibaAuthGetCurrentUser_(data) {
  var sheet = soyibaAuthGetSheet_();
  var found = soyibaAuthFindUserByIdOrEmail_(sheet, data.userId, data.email || data.currentEmail);

  if (found.row < 1) {
    return { ok: false, error: 'Usuario no encontrado.' };
  }

  return soyibaAuthSessionFromRow_(sheet, found.row, data.token);
}

function soyibaAuthUpdateProfile_(data) {
  var sheet = soyibaAuthGetSheet_();
  var found = soyibaAuthFindUserByIdOrEmail_(sheet, data.userId, data.currentEmail || data.email);

  if (found.row < 1) {
    return { ok: false, error: 'Usuario no encontrado.' };
  }

  var headers = soyibaAuthGetHeaders_(sheet);
  var currentEmail = soyibaAuthNormalizeEmail_(found.user.email);
  var email = currentEmail;
  var firstName = String(data.firstName || data.first_name || '').trim();
  var lastName = String(data.lastName || data.last_name || '').trim();
  var phone = String(data.phone || data.celular || '').trim();
  var tiempoIba = String(data.tiempoIba || data.tiempo_iba || '').trim();
  var displayName = String(data.displayName || data.display_name || [firstName, lastName].join(' ').trim() || email.split('@')[0] || 'Usuario');
  var visibleDirectorio = soyibaAuthIsTrue_(data.visibleDirectorio !== undefined ? data.visibleDirectorio : data.visible_directorio);
  var mostrarTelefono = soyibaAuthIsTrue_(data.mostrarTelefono !== undefined ? data.mostrarTelefono : data.mostrar_telefono);
  var permitirWhatsapp = soyibaAuthIsTrue_(data.permitirWhatsapp !== undefined ? data.permitirWhatsapp : data.permitir_whatsapp);
  var mostrarFoto = data.mostrarFoto === undefined && data.mostrar_foto === undefined ? true : soyibaAuthIsTrue_(data.mostrarFoto !== undefined ? data.mostrarFoto : data.mostrar_foto);

  if (!email || !firstName || !lastName || !phone) {
    return { ok: false, error: 'Nombre, apellido y celular son requeridos.' };
  }

  var now = new Date().toISOString();
  soyibaAuthSetCell_(sheet, headers, found.row, 'display_name', displayName);
  soyibaAuthSetCell_(sheet, headers, found.row, 'first_name', firstName);
  soyibaAuthSetCell_(sheet, headers, found.row, 'last_name', lastName);
  soyibaAuthSetCell_(sheet, headers, found.row, 'phone', phone);
  soyibaAuthSetCell_(sheet, headers, found.row, 'tiempo_iba', tiempoIba);
  soyibaAuthSetCell_(sheet, headers, found.row, 'visible_directorio', visibleDirectorio);
  soyibaAuthSetCell_(sheet, headers, found.row, 'mostrar_telefono', mostrarTelefono);
  soyibaAuthSetCell_(sheet, headers, found.row, 'permitir_whatsapp', permitirWhatsapp);
  soyibaAuthSetCell_(sheet, headers, found.row, 'mostrar_foto', mostrarFoto);
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

function soyibaAuthRequestPasswordReset_(data) {
  var email = soyibaAuthNormalizeEmail_(data.email);
  var genericMessage = 'Si el correo esta registrado, enviaremos un enlace para restablecer la contrasena.';

  if (!email) {
    return { ok: false, error: 'Ingresa tu correo electronico.' };
  }

  var sheet = soyibaAuthGetSheet_();
  var found = soyibaAuthFindUserByEmail_(sheet, email);

  if (found.row < 1 || found.user.status !== 'active') {
    return { ok: true, message: genericMessage };
  }

  var headers = soyibaAuthGetHeaders_(sheet);
  var now = new Date();
  var token = soyibaAuthCreateResetToken_();
  var tokenSalt = Utilities.getUuid();
  var expiresAt = new Date(now.getTime() + SOYIBA_PASSWORD_RESET_TTL_MINUTES * 60 * 1000).toISOString();
  var resetLink = soyibaAuthBuildResetLink_(data.appUrl, email, token);

  soyibaAuthSetCell_(sheet, headers, found.row, 'reset_token_hash', soyibaAuthHashPassword_(token, tokenSalt));
  soyibaAuthSetCell_(sheet, headers, found.row, 'reset_token_salt', tokenSalt);
  soyibaAuthSetCell_(sheet, headers, found.row, 'reset_token_expires_at', expiresAt);
  soyibaAuthSetCell_(sheet, headers, found.row, 'reset_requested_at', now.toISOString());
  soyibaAuthSetCell_(sheet, headers, found.row, 'updated_at', now.toISOString());

  MailApp.sendEmail({
    to: email,
    subject: 'Restablece tu contrasena de SOY IBA',
    name: 'SOY IBA',
    body:
      'Hola ' + soyibaAuthGetFirstName_(found.user) + ',\n\n' +
      'Recibimos una solicitud para restablecer tu contrasena de SOY IBA.\n\n' +
      'Abre este enlace durante los proximos ' + SOYIBA_PASSWORD_RESET_TTL_MINUTES + ' minutos:\n' +
      resetLink + '\n\n' +
      'Si no hiciste esta solicitud, puedes ignorar este mensaje.',
    htmlBody: soyibaAuthBuildPasswordResetEmailHtml_(found.user, resetLink)
  });

  return { ok: true, message: genericMessage };
}

function soyibaAuthCompletePasswordReset_(data) {
  var email = soyibaAuthNormalizeEmail_(data.email);
  var token = String(data.token || '').trim();
  var newPassword = String(data.newPassword || '');

  if (!email || !token || !newPassword) {
    return { ok: false, error: 'El enlace de recuperacion no esta completo.' };
  }

  if (newPassword.length < 8) {
    return { ok: false, error: 'La contrasena debe tener minimo 8 caracteres.' };
  }

  var sheet = soyibaAuthGetSheet_();
  var found = soyibaAuthFindUserByEmail_(sheet, email);

  if (found.row < 1) {
    return { ok: false, error: 'El enlace de recuperacion no es valido o expiro.' };
  }

  var resetSalt = String(found.user.reset_token_salt || '');
  var resetHash = String(found.user.reset_token_hash || '');
  var resetExpiresAt = new Date(found.user.reset_token_expires_at || '').getTime();

  if (!resetSalt || !resetHash || !resetExpiresAt || resetExpiresAt < new Date().getTime()) {
    soyibaAuthClearPasswordReset_(sheet, found.row);
    return { ok: false, error: 'El enlace de recuperacion no es valido o expiro.' };
  }

  if (soyibaAuthHashPassword_(token, resetSalt) !== resetHash) {
    return { ok: false, error: 'El enlace de recuperacion no es valido o expiro.' };
  }

  var headers = soyibaAuthGetHeaders_(sheet);
  var now = new Date().toISOString();
  var passwordSalt = Utilities.getUuid();

  soyibaAuthSetCell_(sheet, headers, found.row, 'salt', passwordSalt);
  soyibaAuthSetCell_(sheet, headers, found.row, 'password_hash', soyibaAuthHashPassword_(newPassword, passwordSalt));
  soyibaAuthSetCell_(sheet, headers, found.row, 'updated_at', now);
  soyibaAuthSetCell_(sheet, headers, found.row, 'reset_token_hash', '');
  soyibaAuthSetCell_(sheet, headers, found.row, 'reset_token_salt', '');
  soyibaAuthSetCell_(sheet, headers, found.row, 'reset_token_expires_at', '');
  soyibaAuthSetCell_(sheet, headers, found.row, 'reset_requested_at', '');

  return { ok: true, message: 'Tu contrasena fue actualizada. Ya puedes iniciar sesion.' };
}

function soyibaAuthCreateMinorValidationRequest_(data) {
  var requestId = String(data.requestId || data.request_id || Utilities.getUuid()).trim();
  var userId = String(data.userId || data.user_id || '').trim();
  var userName = String(data.userName || data.user_name || '').trim();
  var userEmail = soyibaAuthNormalizeEmail_(data.userEmail || data.user_email);
  var userPhone = String(data.userPhone || data.user_phone || '').trim();
  var fechaNacimiento = soyibaAuthNormalizeBirthDate_(data.fechaNacimiento || data.fecha_nacimiento);
  var guardianName = String(data.guardianName || data.guardian_name || '').trim();
  var guardianEmail = soyibaAuthNormalizeEmail_(data.guardianEmail || data.guardian_email);
  var guardianPhone = String(data.guardianPhone || data.guardian_phone || '').trim();

  if (!requestId || !userId || !userEmail || !fechaNacimiento || !guardianName || !guardianEmail || !guardianPhone) {
    return { ok: false, error: 'Solicitud de menor incompleta.' };
  }

  var sheet = soyibaMinorValidationGetSheet_();
  var existing = soyibaMinorValidationFindById_(sheet, requestId);
  var now = new Date().toISOString();
  var token = soyibaAuthCreateResetToken_();
  var tokenSalt = Utilities.getUuid();
  var tokenHash = soyibaAuthHashPassword_(token, tokenSalt);
  var approvalLink = soyibaAuthBuildMinorApprovalLink_(requestId, token, data.appUrl || data.app_url, data.approvalBaseUrl || data.approval_base_url || data.authUrl || data.auth_url);
  var row = [
    requestId,
    userId,
    userName,
    userEmail,
    userPhone,
    fechaNacimiento,
    guardianName,
    guardianEmail,
    guardianPhone,
    'guardian_pending',
    tokenHash,
    tokenSalt,
    now,
    '',
    '',
    '',
    '',
    '',
    now
  ];

  if (existing.row > 0) {
    soyibaMinorValidationReplaceRow_(sheet, existing.row, row);
  } else {
    sheet.appendRow(row);
  }

  MailApp.sendEmail({
    to: guardianEmail,
    subject: 'Aprobacion de registro de menor en SOY IBA',
    name: 'SOY IBA',
    body:
      'Hola ' + guardianName + ',\n\n' +
      userName + ' solicito registrarse en SOY IBA como menor de edad.\n\n' +
      'Para autorizar que IBA revise y active esta cuenta, abre este enlace:\n' +
      approvalLink + '\n\n' +
      'Si no reconoces esta solicitud, ignora este correo.',
    htmlBody: soyibaAuthBuildMinorApprovalEmailHtml_(guardianName, userName, approvalLink)
  });

  return { ok: true, requestId: requestId, status: 'guardian_pending' };
}

function soyibaAuthApproveMinorByGuardian_(params) {
  var requestId = String(params.requestId || params.request_id || '').trim();
  var token = String(params.token || '').trim();

  if (!requestId || !token) {
    return { ok: false, title: 'Enlace incompleto', message: 'El enlace de aprobacion no esta completo.' };
  }

  var sheet = soyibaMinorValidationGetSheet_();
  var found = soyibaMinorValidationFindById_(sheet, requestId);

  if (found.row < 1) {
    return { ok: false, title: 'Solicitud no encontrada', message: 'No encontramos esta solicitud de validacion.' };
  }

  var salt = String(found.record.approval_token_salt || '');
  var hash = String(found.record.approval_token_hash || '');

  if (!salt || !hash || soyibaAuthHashPassword_(token, salt) !== hash) {
    return { ok: false, title: 'Enlace no valido', message: 'El enlace de aprobacion no es valido.' };
  }

  var status = String(found.record.status || '').trim();
  if (status !== 'guardian_pending') {
    return { ok: true, title: 'Solicitud ya procesada', message: 'Esta autorizacion ya fue registrada anteriormente.' };
  }

  var headers = soyibaMinorValidationGetHeaders_(sheet);
  var now = new Date().toISOString();
  soyibaMinorValidationSetCell_(sheet, headers, found.row, 'status', 'iba_pending');
  soyibaMinorValidationSetCell_(sheet, headers, found.row, 'guardian_approved_at', now);
  soyibaMinorValidationSetCell_(sheet, headers, found.row, 'approval_token_hash', '');
  soyibaMinorValidationSetCell_(sheet, headers, found.row, 'approval_token_salt', '');
  soyibaMinorValidationSetCell_(sheet, headers, found.row, 'updated_at', now);

  var authSheet = soyibaAuthGetSheet_();
  var userFound = soyibaAuthFindUserByIdOrEmail_(authSheet, found.record.user_id, found.record.user_email);
  if (userFound.row > 0) {
    var authHeaders = soyibaAuthGetHeaders_(authSheet);
    soyibaAuthSetCell_(authSheet, authHeaders, userFound.row, 'minor_validation_status', 'iba_pending');
    soyibaAuthSetCell_(authSheet, authHeaders, userFound.row, 'estado_usuario', 'Pendiente IBA');
    soyibaAuthSetCell_(authSheet, authHeaders, userFound.row, 'status', 'minor_pending_iba');
    soyibaAuthSetCell_(authSheet, authHeaders, userFound.row, 'active', false);
    soyibaAuthSetCell_(authSheet, authHeaders, userFound.row, 'updated_at', now);
  }

  return { ok: true, title: 'Autorizacion registrada', message: 'Gracias. IBA revisara la solicitud y activara la cuenta si corresponde.' };
}

function soyibaAuthGetMinorValidationRequestStatus_(data) {
  var requestId = String(data.requestId || data.request_id || '').trim();

  if (!requestId) {
    return { ok: false, error: 'Solicitud requerida.' };
  }

  var sheet = soyibaMinorValidationGetSheet_();
  var found = soyibaMinorValidationFindById_(sheet, requestId);

  if (found.row < 1) {
    return { ok: false, error: 'Solicitud no encontrada.' };
  }

  return {
    ok: true,
    requestId: requestId,
    status: String(found.record.status || ''),
    guardianApprovedAt: String(found.record.guardian_approved_at || ''),
    reviewedAt: String(found.record.reviewed_at || ''),
    rejectionReason: String(found.record.rejection_reason || '')
  };
}

function soyibaAuthReviewMinorValidationRequest_(data) {
  var requestId = String(data.requestId || data.request_id || '').trim();
  var decision = String(data.decision || '').trim();
  var reviewerUserId = String(data.reviewerUserId || data.reviewer_user_id || data.actorUserId || '').trim();
  var reviewerEmail = soyibaAuthNormalizeEmail_(data.reviewerEmail || data.reviewer_email || data.actorEmail);
  var rejectionReason = String(data.rejectionReason || data.rejection_reason || '').trim();

  if (!requestId || ['approved', 'rejected'].indexOf(decision) < 0) {
    return { ok: false, error: 'Decision de validacion no valida.' };
  }

  var sheet = soyibaMinorValidationGetSheet_();
  var found = soyibaMinorValidationFindById_(sheet, requestId);

  if (found.row < 1) {
    return { ok: false, error: 'Solicitud no encontrada.' };
  }

  var headers = soyibaMinorValidationGetHeaders_(sheet);
  var now = new Date().toISOString();
  soyibaMinorValidationSetCell_(sheet, headers, found.row, 'status', decision);
  soyibaMinorValidationSetCell_(sheet, headers, found.row, 'reviewed_at', now);
  soyibaMinorValidationSetCell_(sheet, headers, found.row, 'reviewed_by_user_id', reviewerUserId);
  soyibaMinorValidationSetCell_(sheet, headers, found.row, 'reviewed_by_email', reviewerEmail);
  soyibaMinorValidationSetCell_(sheet, headers, found.row, 'rejection_reason', decision === 'rejected' ? rejectionReason : '');
  soyibaMinorValidationSetCell_(sheet, headers, found.row, 'updated_at', now);

  return { ok: true, requestId: requestId, status: decision };
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

function soyibaAuthVerifyMembershipByCc_(data) {
  var cc = soyibaAuthNormalizeCc_(data.cc || data.cedula || data.cedulaCiudadania);

  if (!cc) {
    return { ok: false, error: 'Ingresa tu CC sin puntos ni comas.' };
  }

  var authSheet = soyibaAuthGetSheet_();
  var found = soyibaAuthFindUserByIdOrEmail_(authSheet, data.userId, data.email || data.currentEmail);

  if (found.row < 1) {
    return { ok: false, error: 'Usuario no encontrado.' };
  }

  var currentEmail = soyibaAuthNormalizeEmail_(found.user.email || data.email || data.currentEmail);
  var membersSheet = soyibaMiembrosIbaGetSheet_();
  var member = soyibaMiembrosIbaFindByCc_(membersSheet, cc);

  if (member.row < 1) {
    return { ok: false, error: 'No encontramos esa CC en el listado de miembros IBA.' };
  }

  if (soyibaMiembrosIbaIsInactiveRecord_(member.record)) {
    return { ok: false, error: 'Tu registro existe en MiembrosIBA, pero aparece inactivo.' };
  }

  var existingClaim = soyibaAuthFindUserByCc_(authSheet, cc, found.user.user_id, currentEmail);
  if (existingClaim.row > 0) {
    return { ok: false, error: 'Esta CC ya fue reclamada por otra cuenta.' };
  }

  if (!soyibaMembershipClaimBelongsToUser_(member.record, found.user, currentEmail)) {
    return { ok: false, error: 'Esta CC ya tiene una solicitud o validacion asociada a otra cuenta.' };
  }

  var now = new Date().toISOString();
  var memberEmail = soyibaAuthNormalizeEmail_(soyibaMiembrosIbaRecordValue_(member.record, ['email', 'correo', 'correo_electronico', 'correo electronico']));

  if (!memberEmail || memberEmail !== currentEmail) {
    var pendingReason = memberEmail
      ? 'El correo de MiembrosIBA no coincide con el correo de la cuenta.'
      : 'El registro de MiembrosIBA no tiene correo para validacion automatica.';
    var pendingHeaders = soyibaAuthGetHeaders_(authSheet);
    soyibaAuthSetMembershipPending_(authSheet, pendingHeaders, found.row, cc, pendingReason, now);
    soyibaMiembrosIbaSetClaim_(membersSheet, member.row, found.user, currentEmail, 'pendiente_revision', pendingReason, now);

    var pendingResult = soyibaAuthSessionFromRow_(authSheet, found.row, data.token);
    pendingResult.message = 'Recibimos tu solicitud de membresia. Queda pendiente de revision por un administrador.';
    return pendingResult;
  }

  var headers = soyibaAuthGetHeaders_(authSheet);
  soyibaAuthSetMembershipValidated_(authSheet, headers, found.row, cc, now);
  soyibaMiembrosIbaSetClaim_(membersSheet, member.row, found.user, currentEmail, 'validado', 'Validado automaticamente por correo coincidente.', now);

  var result = soyibaAuthSessionFromRow_(authSheet, found.row, data.token);
  result.message = 'Tu CC fue validada. Ahora eres miembro SOY IBA.';
  return result;
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
  return soyibaAuthCanViewMembersDirectory_(record) && soyibaAuthIsTrue_(record.visible_directorio);
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
    fotoUrl: soyibaMembersShowValue_(record.mostrar_foto, true) ? String(record.photo_url || record.photoUrl || record.fotoUrl || '') : '',
    telefono: soyibaMembersShowValue_(record.mostrar_telefono, false) && soyibaMembersShowValue_(record.permitir_whatsapp, false) ? String(record.phone || '') : '',
    email: '',
    rol: String(record.rol_sistema || record.role || 'Miembro'),
    rolSistema: String(record.rol_sistema || record.role || 'Miembro'),
    tituloUsuario: String(record.titulo_usuario || 'Miembro'),
    tipoUsuario: 'Miembro',
    ministerio: '',
    grupoEco: '',
    sector: '',
    tiempoEnIBA: String(record.tiempo_iba || ''),
    visibleDirectorio: soyibaAuthIsTrue_(record.visible_directorio),
    mostrarTelefono: soyibaMembersShowValue_(record.mostrar_telefono, false),
    permitirWhatsapp: soyibaMembersShowValue_(record.permitir_whatsapp, false),
    mostrarFoto: soyibaMembersShowValue_(record.mostrar_foto, true),
    mostrarMinisterio: false,
    mostrarGrupoEco: false,
    verificado: soyibaAuthIsTrue_(record.usuario_verificado),
    estado: 'Activo',
    fechaRegistro: String(record.created_at || ''),
    fechaActualizacion: String(record.updated_at || '')
  };
}

function soyibaMembersShowValue_(value, fallback) {
  if (value === '' || value === undefined || value === null) {
    return fallback;
  }

  return soyibaAuthIsTrue_(value);
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
  var minorValidator = soyibaAuthIsTrue_(data.minorValidator !== undefined ? data.minorValidator : data.minor_validator);
  var verificado = soyibaAuthIsTrue_(data.verificado !== undefined ? data.verificado : (data.usuarioVerificado !== undefined ? data.usuarioVerificado : data.usuario_verificado));
  var now = new Date().toISOString();

  if (soyibaAuthIsAssistantAccess_(tipoUsuario)) {
    rolSistema = 'Asistente';
    tipoUsuario = 'Asistente';
    tituloUsuario = 'Asistente';
    publicador = false;
    publicadorEco = false;
    publicadorEvento = false;
    minorValidator = false;
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
  soyibaAuthSetCell_(sheet, headers, found.row, 'minor_validator', minorValidator);
  soyibaAuthSetCell_(sheet, headers, found.row, 'usuario_verificado', verificado);
  soyibaAuthSetCell_(sheet, headers, found.row, 'active', active);
  soyibaAuthSetCell_(sheet, headers, found.row, 'status', active && soyibaAuthStateIsActive_(estadoUsuario) ? 'active' : 'inactive');
  soyibaAuthSetCell_(sheet, headers, found.row, 'updated_at', now);

  return {
    ok: true,
    user: soyibaAuthBuildManagedUser_(soyibaAuthGetUserByRow_(sheet, found.row))
  };
}

function soyibaAuthHealthPing_(data) {
  var sessionId = String(data.sessionId || data.session_id || '').trim();

  if (!sessionId) {
    return { ok: false, error: 'Falta sessionId para registrar health.' };
  }

  var authSheet = soyibaAuthGetSheet_();
  var found = soyibaAuthFindUserByIdOrEmail_(authSheet, data.userId || data.user_id, data.email);

  if (found.row < 1) {
    return { ok: false, error: 'Usuario no encontrado para health.' };
  }

  var healthSheet = soyibaHealthGetSheet_();
  var located = soyibaHealthFindSessionById_(healthSheet, sessionId);

  if (located.row > 0 && String(located.record.revoked_at || '').trim()) {
    return {
      ok: true,
      sessionRevoked: true,
      revokedAt: String(located.record.revoked_at || ''),
      message: String(located.record.revoke_reason || 'Tu sesion fue cerrada por un administrador.')
    };
  }

  var now = new Date().toISOString();
  var user = found.user;
  var token = String(data.token || '').trim();
  var record = {
    session_id: sessionId,
    token_hash: token ? soyibaAuthHashPassword_(token, 'soyiba-health-token') : '',
    user_id: String(user.user_id || data.userId || ''),
    email: soyibaAuthNormalizeEmail_(user.email || data.email),
    display_name: String(data.displayName || data.display_name || user.display_name || user.email || 'Usuario SOY IBA'),
    role: String(data.role || user.rol_sistema || user.role || 'Usuario'),
    status: 'active',
    started_at: located.row > 0 ? String(located.record.started_at || now) : now,
    last_seen_at: now,
    ended_at: '',
    revoked_at: '',
    revoked_by_user_id: '',
    revoked_by_email: '',
    revoke_reason: '',
    ip_address: String(data.ipAddress || data.ip_address || '').trim(),
    user_agent: String(data.userAgent || data.user_agent || '').slice(0, 600),
    page: String(data.page || '').slice(0, 220),
    active_call_count: soyibaHealthNumber_(data.activeCallCount || data.active_call_count),
    call_summary: String(data.callSummary || data.call_summary || '{}').slice(0, 1000),
    total_calls: soyibaHealthNumber_(data.totalCalls || data.total_calls),
    updated_at: now
  };

  soyibaHealthWriteRecord_(healthSheet, located.row, record);
  var otherActiveSessionCount = soyibaHealthCountOtherActiveSessions_(healthSheet, record.user_id, record.email, sessionId);
  return {
    ok: true,
    hasOtherActiveSessions: otherActiveSessionCount > 0,
    otherActiveSessionCount: otherActiveSessionCount
  };
}

function soyibaAuthHealthDashboard_(data) {
  var authSheet = soyibaAuthGetSheet_();
  var actor = soyibaAuthFindUserByIdOrEmail_(authSheet, data.actorUserId || data.userId, data.actorEmail || data.email);

  if (!soyibaAuthIsAdmin_(actor.user)) {
    return { ok: false, error: 'No tienes permisos para ver el health de la app.' };
  }

  var healthSheet = soyibaHealthGetSheet_();
  var values = healthSheet.getDataRange().getValues();
  var headers = values[0] || SOYIBA_HEALTH_SESSION_HEADERS;
  var nowMs = new Date().getTime();
  var sessions = [];
  var callsByUser = {};

  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    var record = soyibaAuthRowToObject_(headers, values[rowIndex]);

    if (!soyibaHealthIsActive_(record, nowMs)) {
      continue;
    }

    var session = soyibaHealthBuildSession_(record);
    sessions.push(session);

    var key = session.userId || session.email || session.name;
    if (!callsByUser[key]) {
      callsByUser[key] = {
        userId: session.userId,
        email: session.email,
        name: session.name,
        activeCallCount: 0,
        sessionCount: 0
      };
    }

    callsByUser[key].activeCallCount += session.activeCallCount;
    callsByUser[key].sessionCount += 1;
  }

  sessions.sort(function (left, right) {
    return new Date(right.lastSeenAt).getTime() - new Date(left.lastSeenAt).getTime();
  });

  var calls = [];
  for (var userKey in callsByUser) {
    if (Object.prototype.hasOwnProperty.call(callsByUser, userKey)) {
      calls.push(callsByUser[userKey]);
    }
  }
  calls.sort(function (left, right) {
    return right.activeCallCount - left.activeCallCount || String(left.name).localeCompare(String(right.name));
  });

  return {
    ok: true,
    dashboard: {
      generatedAt: new Date().toISOString(),
      activeUsers: calls.length,
      activeSessions: sessions.length,
      activeCalls: sessions.reduce(function (total, item) {
        return total + item.activeCallCount;
      }, 0),
      sessions: sessions,
      callsByUser: calls
    }
  };
}

function soyibaAuthForceLogoutSessions_(data) {
  var authSheet = soyibaAuthGetSheet_();
  var actor = soyibaAuthFindUserByIdOrEmail_(authSheet, data.actorUserId || data.userId, data.actorEmail || data.email);

  if (!soyibaAuthIsAdmin_(actor.user)) {
    return { ok: false, error: 'No tienes permisos para cerrar sesiones.' };
  }

  var sessionIds = soyibaHealthSessionIds_(data.sessionIds || data.session_ids);
  if (!sessionIds.length) {
    return { ok: false, error: 'Selecciona al menos una sesion.' };
  }

  var selected = {};
  sessionIds.forEach(function (sessionId) {
    selected[sessionId] = true;
  });

  var sheet = soyibaHealthGetSheet_();
  var headers = soyibaHealthGetHeaders_(sheet);
  var values = sheet.getDataRange().getValues();
  var now = new Date().toISOString();
  var revokedCount = 0;
  var reason = String(data.reason || 'Cerrada desde Health SOY IBA');

  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    var record = soyibaAuthRowToObject_(headers, values[rowIndex]);
    var sessionId = String(record.session_id || '').trim();

    if (!selected[sessionId] || String(record.revoked_at || '').trim()) {
      continue;
    }

    var row = rowIndex + 1;
    soyibaAuthSetCell_(sheet, headers, row, 'status', 'revoked');
    soyibaAuthSetCell_(sheet, headers, row, 'revoked_at', now);
    soyibaAuthSetCell_(sheet, headers, row, 'revoked_by_user_id', String(actor.user.user_id || ''));
    soyibaAuthSetCell_(sheet, headers, row, 'revoked_by_email', String(actor.user.email || data.actorEmail || ''));
    soyibaAuthSetCell_(sheet, headers, row, 'revoke_reason', reason);
    soyibaAuthSetCell_(sheet, headers, row, 'active_call_count', 0);
    soyibaAuthSetCell_(sheet, headers, row, 'updated_at', now);
    revokedCount += 1;
  }

  return { ok: true, revokedCount: revokedCount };
}

function soyibaAuthCloseOtherHealthSessions_(data) {
  var currentSessionId = String(data.currentSessionId || data.current_session_id || data.sessionId || data.session_id || '').trim();

  if (!currentSessionId) {
    return { ok: false, error: 'Falta la sesion actual.' };
  }

  var authSheet = soyibaAuthGetSheet_();
  var actor = soyibaAuthFindUserByIdOrEmail_(authSheet, data.userId || data.actorUserId, data.email || data.actorEmail);

  if (actor.row < 1) {
    return { ok: false, error: 'Usuario no encontrado para cerrar sesiones.' };
  }

  var sheet = soyibaHealthGetSheet_();
  var headers = soyibaHealthGetHeaders_(sheet);
  var values = sheet.getDataRange().getValues();
  var now = new Date().toISOString();
  var revokedCount = 0;
  var actorUserId = String(actor.user.user_id || '').trim();
  var actorEmail = soyibaAuthNormalizeEmail_(actor.user.email || data.email || data.actorEmail);
  var reason = String(data.reason || 'Cerrada por nuevo inicio de sesion');

  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    var record = soyibaAuthRowToObject_(headers, values[rowIndex]);
    var sessionId = String(record.session_id || '').trim();
    var sameUser = (actorUserId && String(record.user_id || '').trim() === actorUserId) ||
      (actorEmail && soyibaAuthNormalizeEmail_(record.email) === actorEmail);

    if (!sameUser || sessionId === currentSessionId || String(record.revoked_at || '').trim() || String(record.ended_at || '').trim()) {
      continue;
    }

    var row = rowIndex + 1;
    soyibaAuthSetCell_(sheet, headers, row, 'status', 'revoked');
    soyibaAuthSetCell_(sheet, headers, row, 'revoked_at', now);
    soyibaAuthSetCell_(sheet, headers, row, 'revoked_by_user_id', actorUserId);
    soyibaAuthSetCell_(sheet, headers, row, 'revoked_by_email', actorEmail);
    soyibaAuthSetCell_(sheet, headers, row, 'revoke_reason', reason);
    soyibaAuthSetCell_(sheet, headers, row, 'active_call_count', 0);
    soyibaAuthSetCell_(sheet, headers, row, 'updated_at', now);
    revokedCount += 1;
  }

  return { ok: true, revokedCount: revokedCount };
}

function soyibaAuthEndHealthSession_(data) {
  var sessionId = String(data.sessionId || data.session_id || '').trim();
  if (!sessionId) {
    return { ok: true };
  }

  var sheet = soyibaHealthGetSheet_();
  var located = soyibaHealthFindSessionById_(sheet, sessionId);

  if (located.row < 1 || String(located.record.revoked_at || '').trim()) {
    return { ok: true };
  }

  var headers = soyibaHealthGetHeaders_(sheet);
  var now = new Date().toISOString();
  soyibaAuthSetCell_(sheet, headers, located.row, 'status', 'ended');
  soyibaAuthSetCell_(sheet, headers, located.row, 'ended_at', now);
  soyibaAuthSetCell_(sheet, headers, located.row, 'active_call_count', 0);
  soyibaAuthSetCell_(sheet, headers, located.row, 'updated_at', now);
  return { ok: true };
}

function soyibaHealthBuildSession_(record) {
  return {
    sessionId: String(record.session_id || ''),
    userId: String(record.user_id || ''),
    email: soyibaAuthNormalizeEmail_(record.email),
    name: String(record.display_name || record.email || 'Usuario SOY IBA'),
    role: String(record.role || 'Usuario'),
    status: String(record.status || 'active'),
    startedAt: String(record.started_at || ''),
    lastSeenAt: String(record.last_seen_at || ''),
    endedAt: String(record.ended_at || ''),
    revokedAt: String(record.revoked_at || ''),
    revokedByEmail: String(record.revoked_by_email || ''),
    revokeReason: String(record.revoke_reason || ''),
    ipAddress: String(record.ip_address || ''),
    userAgent: String(record.user_agent || ''),
    page: String(record.page || ''),
    activeCallCount: soyibaHealthNumber_(record.active_call_count),
    callSummary: String(record.call_summary || '{}')
  };
}

function soyibaHealthIsActive_(record, nowMs) {
  var lastSeenMs = new Date(record.last_seen_at || '').getTime();
  return !String(record.revoked_at || '').trim() &&
    !String(record.ended_at || '').trim() &&
    lastSeenMs &&
    nowMs - lastSeenMs <= SOYIBA_HEALTH_ACTIVE_WINDOW_MS;
}

function soyibaHealthCountOtherActiveSessions_(sheet, userId, email, currentSessionId) {
  var headers = soyibaHealthGetHeaders_(sheet);
  var values = sheet.getDataRange().getValues();
  var nowMs = new Date().getTime();
  var normalizedUserId = String(userId || '').trim();
  var normalizedEmail = soyibaAuthNormalizeEmail_(email);
  var count = 0;

  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    var record = soyibaAuthRowToObject_(headers, values[rowIndex]);
    var sameUser = (normalizedUserId && String(record.user_id || '').trim() === normalizedUserId) ||
      (normalizedEmail && soyibaAuthNormalizeEmail_(record.email) === normalizedEmail);

    if (sameUser && String(record.session_id || '').trim() !== currentSessionId && soyibaHealthIsActive_(record, nowMs)) {
      count += 1;
    }
  }

  return count;
}

function soyibaHealthSessionIds_(value) {
  if (Array.isArray(value)) {
    return value.map(function (item) {
      return String(item || '').trim();
    }).filter(Boolean);
  }

  return String(value || '').split(',').map(function (item) {
    return item.trim();
  }).filter(Boolean);
}

function soyibaHealthNumber_(value) {
  var number = Number(value || 0);
  return isNaN(number) ? 0 : Math.max(0, number);
}

function soyibaHealthGetSheet_() {
  var spreadsheet = SOYIBA_AUTH_SPREADSHEET_ID
    ? SpreadsheetApp.openById(SOYIBA_AUTH_SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(SOYIBA_HEALTH_SESSIONS_SHEET) || spreadsheet.insertSheet(SOYIBA_HEALTH_SESSIONS_SHEET);
  soyibaHealthEnsureHeaders_(sheet);
  return sheet;
}

function soyibaHealthEnsureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(SOYIBA_HEALTH_SESSION_HEADERS);
    return;
  }

  var headers = soyibaHealthGetHeaders_(sheet);
  var needsRewrite = SOYIBA_HEALTH_SESSION_HEADERS.some(function (header) {
    return headers.indexOf(header) === -1;
  });

  if (needsRewrite) {
    sheet.getRange(1, 1, 1, SOYIBA_HEALTH_SESSION_HEADERS.length).setValues([SOYIBA_HEALTH_SESSION_HEADERS]);
  }
}

function soyibaHealthGetHeaders_(sheet) {
  return sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), SOYIBA_HEALTH_SESSION_HEADERS.length)).getValues()[0];
}

function soyibaHealthFindSessionById_(sheet, sessionId) {
  var headers = soyibaHealthGetHeaders_(sheet);
  var sessionColumn = headers.indexOf('session_id');
  var values = sheet.getDataRange().getValues();

  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    if (String(values[rowIndex][sessionColumn] || '').trim() === sessionId) {
      return { row: rowIndex + 1, record: soyibaAuthRowToObject_(headers, values[rowIndex]) };
    }
  }

  return { row: -1, record: null };
}

function soyibaHealthWriteRecord_(sheet, row, record) {
  var values = SOYIBA_HEALTH_SESSION_HEADERS.map(function (header) {
    return record[header] === undefined ? '' : record[header];
  });

  if (row > 0) {
    sheet.getRange(row, 1, 1, SOYIBA_HEALTH_SESSION_HEADERS.length).setValues([values]);
  } else {
    sheet.appendRow(values);
  }
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

function soyibaMiembrosIbaGetSheet_() {
  var spreadsheet = SOYIBA_AUTH_SPREADSHEET_ID
    ? SpreadsheetApp.openById(SOYIBA_AUTH_SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(SOYIBA_MIEMBROS_IBA_SHEET) || spreadsheet.insertSheet(SOYIBA_MIEMBROS_IBA_SHEET);
  soyibaMiembrosIbaEnsureHeaders_(sheet);
  return sheet;
}

function soyibaMinorValidationGetSheet_() {
  var spreadsheet = SOYIBA_AUTH_SPREADSHEET_ID
    ? SpreadsheetApp.openById(SOYIBA_AUTH_SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(SOYIBA_MINOR_VALIDATION_SHEET) || spreadsheet.insertSheet(SOYIBA_MINOR_VALIDATION_SHEET);
  soyibaMinorValidationEnsureHeaders_(sheet);
  return sheet;
}

function soyibaMinorValidationEnsureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(SOYIBA_MINOR_VALIDATION_HEADERS);
    return;
  }

  var headers = soyibaMinorValidationGetHeaders_(sheet);
  var needsRewrite = SOYIBA_MINOR_VALIDATION_HEADERS.some(function (header) {
    return headers.indexOf(header) === -1;
  });

  if (needsRewrite) {
    sheet.getRange(1, 1, 1, SOYIBA_MINOR_VALIDATION_HEADERS.length).setValues([SOYIBA_MINOR_VALIDATION_HEADERS]);
  }
}

function soyibaMinorValidationGetHeaders_(sheet) {
  return sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), SOYIBA_MINOR_VALIDATION_HEADERS.length)).getValues()[0];
}

function soyibaMinorValidationFindById_(sheet, requestId) {
  var headers = soyibaMinorValidationGetHeaders_(sheet);
  var idColumn = headers.indexOf('request_id');
  var lastRow = sheet.getLastRow();

  if (idColumn < 0 || lastRow < 2) {
    return { row: -1, record: null };
  }

  var values = sheet.getRange(2, 1, lastRow - 1, Math.max(sheet.getLastColumn(), SOYIBA_MINOR_VALIDATION_HEADERS.length)).getValues();
  for (var index = 0; index < values.length; index += 1) {
    if (String(values[index][idColumn] || '').trim() === requestId) {
      return { row: index + 2, record: soyibaAuthRowToObject_(headers, values[index]) };
    }
  }

  return { row: -1, record: null };
}

function soyibaMinorValidationReplaceRow_(sheet, row, values) {
  sheet.getRange(row, 1, 1, values.length).setValues([values]);
}

function soyibaMinorValidationSetCell_(sheet, headers, row, header, value) {
  var column = headers.indexOf(header);
  if (column >= 0) {
    sheet.getRange(row, column + 1).setValue(value);
  }
}

function soyibaMiembrosIbaEnsureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(SOYIBA_MIEMBROS_IBA_HEADERS);
    return;
  }

  var currentWidth = Math.max(sheet.getLastColumn(), SOYIBA_MIEMBROS_IBA_HEADERS.length);
  var headers = sheet.getRange(1, 1, 1, currentWidth).getValues()[0].map(function (value) {
    return soyibaMiembrosIbaNormalizeHeader_(value);
  });
  var hasKnownCcHeader = headers.some(function (header) {
    return soyibaMiembrosIbaIsCcHeader_(header);
  });

  if (!hasKnownCcHeader) {
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, SOYIBA_MIEMBROS_IBA_HEADERS.length).setValues([SOYIBA_MIEMBROS_IBA_HEADERS]);
    return;
  }

  var originalHeaders = sheet.getRange(1, 1, 1, currentWidth).getValues()[0];
  var needsRewrite = false;

  SOYIBA_MIEMBROS_IBA_HEADERS.forEach(function (expectedHeader) {
    if (headers.indexOf(soyibaMiembrosIbaNormalizeHeader_(expectedHeader)) === -1) {
      originalHeaders.push(expectedHeader);
      headers.push(soyibaMiembrosIbaNormalizeHeader_(expectedHeader));
      needsRewrite = true;
    }
  });

  if (needsRewrite) {
    sheet.getRange(1, 1, 1, originalHeaders.length).setValues([originalHeaders]);
  }
}

function soyibaMiembrosIbaFindByCc_(sheet, cc) {
  var values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return { row: -1, record: null };
  }

  var headers = values[0].map(function (header) {
    return soyibaMiembrosIbaNormalizeHeader_(header);
  });
  var ccColumn = -1;

  for (var index = 0; index < headers.length; index += 1) {
    if (soyibaMiembrosIbaIsCcHeader_(headers[index])) {
      ccColumn = index;
      break;
    }
  }

  if (ccColumn < 0) {
    ccColumn = 0;
  }

  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    if (soyibaAuthNormalizeCc_(values[rowIndex][ccColumn]) === cc) {
      return { row: rowIndex + 1, record: soyibaAuthRowToObject_(values[0], values[rowIndex]) };
    }
  }

  return { row: -1, record: null };
}

function soyibaMiembrosIbaNormalizeHeader_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function soyibaMiembrosIbaIsCcHeader_(header) {
  return ['cc', 'cedula', 'cedula_ciudadania', 'cedula_de_ciudadania', 'documento', 'numero_documento'].indexOf(header) >= 0;
}

function soyibaMiembrosIbaRecordValue_(record, aliases) {
  if (!record) {
    return '';
  }

  var normalizedAliases = aliases.map(function (alias) {
    return soyibaMiembrosIbaNormalizeHeader_(alias);
  });

  for (var key in record) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) {
      continue;
    }

    if (normalizedAliases.indexOf(soyibaMiembrosIbaNormalizeHeader_(key)) >= 0) {
      var value = record[key];
      return value === null || value === undefined ? '' : String(value).trim();
    }
  }

  return '';
}

function soyibaMiembrosIbaIsInactiveRecord_(record) {
  var estado = soyibaAuthNormalizeNameForMatch_(soyibaMiembrosIbaRecordValue_(record, ['estado', 'status', 'active', 'activo']));
  return ['inactivo', 'inactive', 'false', 'no', '0'].indexOf(estado) >= 0;
}

function soyibaMiembrosIbaGetHeaders_(sheet) {
  return sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), SOYIBA_MIEMBROS_IBA_HEADERS.length)).getValues()[0];
}

function soyibaMiembrosIbaSetCell_(sheet, headers, row, header, value) {
  var normalizedHeaders = headers.map(function (item) {
    return soyibaMiembrosIbaNormalizeHeader_(item);
  });
  var column = normalizedHeaders.indexOf(soyibaMiembrosIbaNormalizeHeader_(header));

  if (column >= 0) {
    sheet.getRange(row, column + 1).setValue(value);
  }
}

function soyibaMiembrosIbaSetClaim_(sheet, row, authUser, email, status, notes, now) {
  var headers = soyibaMiembrosIbaGetHeaders_(sheet);
  var userId = String((authUser && (authUser.user_id || authUser.id)) || '').trim();

  soyibaMiembrosIbaSetCell_(sheet, headers, row, 'claimed_user_id', userId);
  soyibaMiembrosIbaSetCell_(sheet, headers, row, 'claimed_email', soyibaAuthNormalizeEmail_(email));
  soyibaMiembrosIbaSetCell_(sheet, headers, row, 'claimed_at', now);
  soyibaMiembrosIbaSetCell_(sheet, headers, row, 'claim_status', status);
  soyibaMiembrosIbaSetCell_(sheet, headers, row, 'claim_notes', notes);
  soyibaMiembrosIbaSetCell_(sheet, headers, row, 'updated_at', now);
}

function soyibaMembershipClaimBelongsToUser_(record, authUser, currentEmail) {
  var claimUserId = String(soyibaMiembrosIbaRecordValue_(record, ['claimed_user_id', 'claim_user_id', 'user_id']) || '').trim();
  var claimEmail = soyibaAuthNormalizeEmail_(soyibaMiembrosIbaRecordValue_(record, ['claimed_email', 'claim_email', 'email_reclamado']));
  var claimStatus = soyibaAuthNormalizeMembershipStatus_(soyibaMiembrosIbaRecordValue_(record, ['claim_status', 'estado_validacion', 'validacion_estado']));
  var userId = String((authUser && (authUser.user_id || authUser.id)) || '').trim();
  var email = soyibaAuthNormalizeEmail_(currentEmail || (authUser && authUser.email));

  if (!claimUserId && !claimEmail) {
    return true;
  }

  if (claimStatus === 'rechazado' || claimStatus === 'rejected') {
    return true;
  }

  return (!!claimUserId && !!userId && claimUserId === userId) || (!!claimEmail && !!email && claimEmail === email);
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
  var lastRow = sheet.getLastRow();

  if (emailColumn < 0 || lastRow < 2) {
    return { row: -1, user: null };
  }

  var cachedRow = soyibaAuthGetCachedEmailRow_(email);

  if (cachedRow > 1 && cachedRow <= lastRow) {
    var cachedValues = sheet.getRange(cachedRow, 1, 1, Math.max(sheet.getLastColumn(), SOYIBA_AUTH_HEADERS.length)).getValues()[0];
    var cachedUser = soyibaAuthRowToObject_(headers, cachedValues);

    if (soyibaAuthNormalizeEmail_(cachedUser.email) === email) {
      return { row: cachedRow, user: cachedUser };
    }
  }

  var foundCell = sheet
    .getRange(2, emailColumn + 1, lastRow - 1, 1)
    .createTextFinder(email)
    .matchEntireCell(true)
    .matchCase(false)
    .findNext();

  if (foundCell) {
    var row = foundCell.getRow();
    var values = sheet.getRange(row, 1, 1, Math.max(sheet.getLastColumn(), SOYIBA_AUTH_HEADERS.length)).getValues()[0];
    soyibaAuthPutCachedEmailRow_(email, row);
    return { row: row, user: soyibaAuthRowToObject_(headers, values) };
  }

  return { row: -1, user: null };
}

function soyibaAuthGetCachedEmailRow_(email) {
  try {
    var value = CacheService.getScriptCache().get(soyibaAuthEmailRowCacheKey_(email));
    return value ? Number(value) : -1;
  } catch (error) {
    return -1;
  }
}

function soyibaAuthPutCachedEmailRow_(email, row) {
  try {
    CacheService.getScriptCache().put(soyibaAuthEmailRowCacheKey_(email), String(row), 21600);
  } catch (error) {
  }
}

function soyibaAuthEmailRowCacheKey_(email) {
  return 'auth-email-row:' + soyibaAuthNormalizeEmail_(email);
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
      if (normalizedEmail && rowEmail === normalizedEmail) {
        soyibaAuthPutCachedEmailRow_(normalizedEmail, rowIndex + 1);
      }

      return { row: rowIndex + 1, user: soyibaAuthRowToObject_(headers, values[rowIndex]) };
    }
  }

  return { row: -1, user: null };
}

function soyibaAuthFindUserByCc_(sheet, cc, currentUserId, currentEmail) {
  var headers = soyibaAuthGetHeaders_(sheet);
  var ccColumn = headers.indexOf('cc');
  var idColumn = headers.indexOf('user_id');
  var emailColumn = headers.indexOf('email');
  var normalizedCc = soyibaAuthNormalizeCc_(cc);
  var normalizedUserId = String(currentUserId || '').trim();
  var normalizedEmail = soyibaAuthNormalizeEmail_(currentEmail);

  if (ccColumn < 0 || !normalizedCc) {
    return { row: -1, user: null };
  }

  var values = sheet.getDataRange().getValues();

  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    if (soyibaAuthNormalizeCc_(values[rowIndex][ccColumn]) !== normalizedCc) {
      continue;
    }

    var rowUserId = String(values[rowIndex][idColumn] || '').trim();
    var rowEmail = soyibaAuthNormalizeEmail_(values[rowIndex][emailColumn]);

    if ((normalizedUserId && rowUserId === normalizedUserId) || (normalizedEmail && rowEmail === normalizedEmail)) {
      continue;
    }

    return { row: rowIndex + 1, user: soyibaAuthRowToObject_(headers, values[rowIndex]) };
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

function soyibaAuthSetMembershipValidated_(sheet, headers, row, cc, now) {
  soyibaAuthSetCell_(sheet, headers, row, 'role', 'Miembro');
  soyibaAuthSetCell_(sheet, headers, row, 'tipo_usuario', 'Miembro');
  soyibaAuthSetCell_(sheet, headers, row, 'titulo_usuario', 'Miembro');
  soyibaAuthSetCell_(sheet, headers, row, 'rol_sistema', 'Miembro');
  soyibaAuthSetCell_(sheet, headers, row, 'estado_usuario', 'Activo');
  soyibaAuthSetCell_(sheet, headers, row, 'status', 'active');
  soyibaAuthSetCell_(sheet, headers, row, 'active', true);
  soyibaAuthSetCell_(sheet, headers, row, 'cc', cc);
  soyibaAuthSetCell_(sheet, headers, row, 'miembro_validado_at', now);
  soyibaAuthSetCell_(sheet, headers, row, 'miembro_validado_por', 'MiembrosIBA.email');
  soyibaAuthSetCell_(sheet, headers, row, 'miembro_validacion_estado', 'validado');
  soyibaAuthSetCell_(sheet, headers, row, 'miembro_validacion_notas', '');
  if (String(soyibaAuthGetUserByRow_(sheet, row).visible_directorio || '') === '') {
    soyibaAuthSetCell_(sheet, headers, row, 'visible_directorio', false);
  }
  soyibaAuthSetCell_(sheet, headers, row, 'updated_at', now);
}

function soyibaAuthSetMembershipPending_(sheet, headers, row, cc, reason, now) {
  soyibaAuthSetCell_(sheet, headers, row, 'cc', cc);
  soyibaAuthSetCell_(sheet, headers, row, 'miembro_validado_at', '');
  soyibaAuthSetCell_(sheet, headers, row, 'miembro_validado_por', '');
  soyibaAuthSetCell_(sheet, headers, row, 'miembro_validacion_estado', 'pendiente_revision');
  soyibaAuthSetCell_(sheet, headers, row, 'miembro_validacion_notas', reason);
  soyibaAuthSetCell_(sheet, headers, row, 'updated_at', now);
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

function soyibaAuthNormalizeBirthDate_(value) {
  var text = String(value || '').trim();
  var match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return '';
  }

  var year = Number(match[1]);
  var month = Number(match[2]);
  var day = Number(match[3]);
  var birthDate = new Date(year, month - 1, day);

  if (birthDate.getFullYear() !== year || birthDate.getMonth() !== month - 1 || birthDate.getDate() !== day) {
    return '';
  }

  var today = new Date();
  var todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (birthDate > todayStart) {
    return '';
  }

  var age = todayStart.getFullYear() - year;
  var birthdayThisYear = new Date(todayStart.getFullYear(), month - 1, day);

  if (birthdayThisYear > todayStart) {
    age -= 1;
  }

  return age >= 0 && age <= 120 ? text : '';
}

function soyibaAuthIsMinorFromBirthDate_(value) {
  var text = soyibaAuthNormalizeBirthDate_(value);

  if (!text) {
    return false;
  }

  var parts = text.split('-');
  var year = Number(parts[0]);
  var month = Number(parts[1]);
  var day = Number(parts[2]);
  var today = new Date();
  var todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  var age = todayStart.getFullYear() - year;
  var birthdayThisYear = new Date(todayStart.getFullYear(), month - 1, day);

  if (birthdayThisYear > todayStart) {
    age -= 1;
  }

  return age < 18;
}

function soyibaAuthNormalizeCc_(value) {
  return String(value || '').replace(/\D/g, '').trim();
}

function soyibaAuthNormalizeMembershipStatus_(value) {
  return soyibaAuthNormalizeNameForMatch_(value).replace(/\s+/g, '_');
}

function soyibaAuthNormalizeNameForMatch_(value) {
  var text = String(value || '').trim().toLowerCase();

  if (text.normalize) {
    text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  return text
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

function soyibaAuthIsAdmin_(user) {
  if (!user) {
    return false;
  }

  var role = String(user.rol_sistema || user.rolSistema || user.role || '').trim().toLowerCase();
  return role === 'admin';
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

function soyibaAuthClearPasswordReset_(sheet, row) {
  var headers = soyibaAuthGetHeaders_(sheet);
  soyibaAuthSetCell_(sheet, headers, row, 'reset_token_hash', '');
  soyibaAuthSetCell_(sheet, headers, row, 'reset_token_salt', '');
  soyibaAuthSetCell_(sheet, headers, row, 'reset_token_expires_at', '');
  soyibaAuthSetCell_(sheet, headers, row, 'reset_requested_at', '');
}

function soyibaAuthCreateResetToken_() {
  return Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
}

function soyibaAuthBuildResetLink_(appUrl, email, token) {
  var baseUrl = String(appUrl || '').trim().split('#')[0];

  if (!baseUrl) {
    throw new Error('Falta la URL de la app para generar el enlace de recuperacion.');
  }

  return baseUrl + '#restablecer?email=' + encodeURIComponent(email) + '&token=' + encodeURIComponent(token);
}

function soyibaAuthBuildMinorApprovalLink_(requestId, token, appUrl, approvalBaseUrl) {
  var appBaseUrl = soyibaAuthNormalizeAppUrl_(appUrl);

  if (appBaseUrl) {
    return appBaseUrl + '#aprobar-menor?requestId=' + encodeURIComponent(requestId) + '&token=' + encodeURIComponent(token);
  }

  var serviceUrl = soyibaAuthNormalizeWebAppUrl_(approvalBaseUrl) || soyibaAuthNormalizeWebAppUrl_(ScriptApp.getService().getUrl());

  if (!serviceUrl) {
    throw new Error('Falta desplegar el Web App de Apps Script para generar el enlace del representante.');
  }

  return serviceUrl + '?action=approveMinor&requestId=' + encodeURIComponent(requestId) + '&token=' + encodeURIComponent(token);
}

function soyibaAuthNormalizeAppUrl_(url) {
  var normalized = String(url || '').trim();

  if (!normalized) {
    return '';
  }

  return normalized.replace(/[#?].*$/, '');
}

function soyibaAuthNormalizeWebAppUrl_(url) {
  var normalized = String(url || '').trim();

  if (!normalized) {
    return '';
  }

  normalized = normalized.replace(/\/macros\/u\/\d+\/s\//, '/macros/s/');
  normalized = normalized.replace(/\/dev(\?.*)?$/, '/exec');
  normalized = normalized.replace(/\?.*$/, '');

  return normalized;
}

function soyibaAuthGetFirstName_(user) {
  var firstName = String(user.first_name || user.firstName || '').trim();

  if (firstName) {
    return firstName;
  }

  return String(user.display_name || user.displayName || user.email || 'SOY IBA').trim().split(' ')[0];
}

function soyibaAuthBuildPasswordResetEmailHtml_(user, resetLink) {
  var name = soyibaAuthEscapeHtml_(soyibaAuthGetFirstName_(user));
  var safeLink = soyibaAuthEscapeHtml_(resetLink);

  return [
    '<div style="font-family:Arial,sans-serif;color:#06245c;line-height:1.5">',
    '<h2 style="margin:0 0 12px">Restablece tu contrasena</h2>',
    '<p>Hola ' + name + ', recibimos una solicitud para restablecer tu contrasena de SOY IBA.</p>',
    '<p><a href="' + safeLink + '" style="display:inline-block;background:#062b70;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Crear nueva contrasena</a></p>',
    '<p>Este enlace vence en ' + SOYIBA_PASSWORD_RESET_TTL_MINUTES + ' minutos.</p>',
    '<p>Si no hiciste esta solicitud, puedes ignorar este mensaje.</p>',
    '</div>'
  ].join('');
}

function soyibaAuthBuildMinorApprovalEmailHtml_(guardianName, userName, approvalLink) {
  var safeGuardian = soyibaAuthEscapeHtml_(guardianName || 'representante');
  var safeUser = soyibaAuthEscapeHtml_(userName || 'el menor');
  var safeLink = soyibaAuthEscapeHtml_(approvalLink);

  return [
    '<div style="font-family:Arial,sans-serif;color:#06245c;line-height:1.5">',
    '<h2 style="margin:0 0 12px">Aprobacion de registro de menor</h2>',
    '<p>Hola ' + safeGuardian + ', ' + safeUser + ' solicito registrarse en SOY IBA como menor de edad.</p>',
    '<p>Si autorizas que IBA revise esta solicitud y active la cuenta si corresponde, usa este boton:</p>',
    '<p><a href="' + safeLink + '" style="display:inline-block;background:#062b70;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Autorizar revision por IBA</a></p>',
    '<p>Si no reconoces esta solicitud, ignora este correo.</p>',
    '</div>'
  ].join('');
}

function soyibaAuthGuardianApprovalHtml_(result) {
  var title = soyibaAuthEscapeHtml_(result.title || (result.ok ? 'Solicitud registrada' : 'No fue posible registrar la autorizacion'));
  var message = soyibaAuthEscapeHtml_(result.message || '');
  var color = result.ok ? '#047857' : '#b42318';

  return HtmlService.createHtmlOutput([
    '<!doctype html><html lang="es"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>' + title + '</title></head>',
    '<body style="margin:0;background:#f8fbff;font-family:Arial,sans-serif;color:#06245c">',
    '<main style="min-height:100vh;display:grid;place-items:center;padding:24px">',
    '<section style="max-width:520px;background:#fff;border:1px solid #dce6f5;border-radius:18px;padding:24px;box-shadow:0 18px 42px rgba(15,23,42,.08)">',
    '<div style="width:48px;height:48px;border-radius:999px;background:' + color + ';opacity:.12;margin-bottom:14px"></div>',
    '<h1 style="margin:0 0 10px;font-size:24px;line-height:1.15">' + title + '</h1>',
    '<p style="margin:0;color:#40516f;line-height:1.5">' + message + '</p>',
    '</section></main></body></html>'
  ].join(''));
}

function soyibaAuthEscapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
