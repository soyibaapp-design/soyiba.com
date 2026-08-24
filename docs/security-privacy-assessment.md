# SOY IBA - Respuestas de seguridad y datos personales

Fecha: 2026-08-24

Este documento resume controles implementados en la app y asuntos que la Iglesia Biblica Antioquia debe mantener como proceso interno. No reemplaza asesoria juridica.

## Marco legal

Referencia base:

- Ley 1581 de 2012 sobre proteccion y tratamiento de datos personales en Colombia: https://www.secretariasenado.gov.co/senado/basedoc/ley_1581_2012.html
- Decreto 1377 de 2013, reglamentario parcial de la Ley 1581 de 2012: https://www.alcaldiabogota.gov.co/sisjur/normas/Norma1.jsp?i=53646

## Respuestas

1. Cumplimiento con normativa colombiana

La app incorpora autorizacion expresa, politica de tratamiento accesible, registro de fecha/version de aceptacion, minimizacion de visibilidad en directorio y controles de acceso por usuario autenticado, estado activo y rol/tipo validado. La iglesia debe complementar esto con politica formal publicada, canal de habeas data, inventario de bases de datos, responsable interno y revision juridica.

2. Autorizacion expresa al registrarse

El registro exige aceptar la Politica de Tratamiento de Datos y los Terminos de Uso antes de crear la cuenta. Se registra `aceptoPoliticaDatos`, `fechaAceptacionPolitica`, `politicaDatosVersion`, `autorizacionTratamientoDatos` y `tratamientoDatosAutorizadoAt`.

3. Politica accesible

La pantalla de autenticacion muestra la Politica de Tratamiento de Datos y Terminos de Uso en modales accesibles antes del registro. La politica resume responsable/finalidad, datos tratados, visibilidad, menores de edad y derechos del titular.

4. Datos visibles para usuarios con acceso

En el directorio de miembros solo se muestran perfiles de miembros activos y validados que hayan activado `visibleDirectorio`. Por defecto se muestran nombre, apellidos, titulo/rol y tiempo en la IBA. Foto, telefono y WhatsApp dependen de preferencias individuales: `mostrarFoto`, `mostrarTelefono` y `permitirWhatsapp`. El correo no se publica en el directorio.

5. Limitacion o decision del usuario

Desde Perfil > Editar perfil > Privacidad, cada usuario puede decidir si aparece en el directorio y si comparte foto, telefono o WhatsApp. Los nuevos usuarios quedan fuera del directorio por defecto.

6. Control aunque alguien tenga enlace o QR

Instalar la PWA no da acceso a informacion interna. El directorio requiere sesion autenticada, cuenta activa, estado activo y tipo `Miembro`; los gestores se limitan a roles `Admin` o `Moderador`. Las reglas de Firestore y el backend de Apps Script filtran datos sensibles del directorio.

7. Menores de edad

El registro solicita `fechaNacimiento` y calcula si el usuario es menor de edad. Si es menor, se exige confirmacion de autorizacion del representante legal y se registra `fechaNacimiento`, `registroMenorEdad` y `autorizacionAcudiente`. La iglesia debe conservar un procedimiento externo para validar esa autorizacion cuando sea necesario.

8. Revisiones o auditorias

Se realizo una revision tecnica de codigo enfocada en privacidad, autenticacion, reglas de Firestore, Storage y datos visibles. Queda recomendado ejecutar una auditoria externa o prueba de penetracion antes de ampliar el uso con datos reales de toda la congregacion.

9. Proteccion y minimizacion de riesgos

Controles presentes o agregados: contrasenas con reglas minimas, recuperacion por token, perfiles protegidos por autenticacion, permisos por rol, directorio solo para miembros validados, opt-in de visibilidad, fotos de perfil no publicas anonimamente en Storage, y separacion entre usuarios publicos/visitantes y usuarios autenticados.

10. Buenas practicas aun sin tiendas oficiales

La distribucion por enlace/QR debe acompanarse de controles de cuenta. La app no depende de App Store o Google Play para restringir informacion: el control relevante esta en autenticacion, roles, estado de cuenta, reglas de base de datos y preferencias de privacidad. Se recomienda activar HTTPS, mantener dependencias actualizadas, revisar reglas antes de publicar cambios y limitar usuarios administrativos.

## Pendientes organizacionales

- Publicar la politica formal completa en un canal permanente de la iglesia.
- Definir correo o canal para consultas, actualizaciones, revocatorias y supresion de datos.
- Nombrar responsable interno del tratamiento de datos.
- Completar el procedimiento verificable para menores de edad con autorizacion del representante, revision interna y evidencia de validacion.
- Revisar si aplica inscripcion o actualizacion de bases de datos ante la RNBD/SIC segun la naturaleza juridica y obligaciones de la iglesia.
- Programar auditoria externa o revision periodica de seguridad.
