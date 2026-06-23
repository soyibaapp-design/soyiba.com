# soyIBA PWA movil

App nueva e independiente para trabajar por pantallas en `C:\soyibaapp`.

## Stack inicial

- React + Vite + TypeScript
- Tailwind CSS
- Framer Motion
- Google Apps Script modular
- Google Sheets por modulo
- Leaflet + OpenStreetMap
- YouTube Embed
- Google Drive para imagenes
- Firebase para notificaciones
- Cloudflare Pages para hosting

## Comandos

```powershell
npm.cmd run dev
npm.cmd run build
npm.cmd run preview
npm.cmd run typecheck
```

## Convencion por pantalla

Cada pantalla nueva debe agregar:

- `src/screens/NOMBRE/NOMBREScreen.tsx`
- `src/screens/NOMBRE/nombre.service.ts`
- `GS/NOMBRE/Code.gs`
- `TSV/NOMBRE.tsv`

Para Apps Script se recomienda desplegar cada carpeta `GS/NOMBRE/Code.gs` como un modulo/proyecto separado y guardar su URL en `.env` con `VITE_APPS_SCRIPT_NOMBRE_URL` cuando aplique.

## Modulos conectados

| Pantalla | Variable de entorno | Google Sheet |
| --- | --- | --- |
| Auth | `VITE_APPS_SCRIPT_AUTH_URL` | configurado en `GS/Auth/Code.gs` |
| Inicio | `VITE_APPS_SCRIPT_INICIO_URL` | configurado en `GS/Inicio/Code.gs` |
| Publicaciones | `VITE_APPS_SCRIPT_PUBLICACIONES_URL` | pestanas `Publicaciones` y `Guardados` en el Sheet de Inicio |
| Donaciones | `VITE_APPS_SCRIPT_DONACIONES_URL` | hoja `DonacionesConfig`; si falta, usa el endpoint de Inicio |

Los endpoints reales deben vivir en `.env`. Usa `.env.example` como plantilla local.

## Resolucion y layout

La app no usa una resolucion fija. Esta disenada mobile-first y responsive:

- Ancho principal: `w-full` / 100% del dispositivo.
- Ancho maximo: `max-w-3xl` / 768 px.
- Viewport: `width=device-width, initial-scale=1.0`.
- Orientacion PWA: portrait.
- Contenido movil: `px-4`, equivalente a 16 px por lado.
- Rango objetivo movil: pantallas de 360 a 430 px de ancho.
- En tablet/escritorio: la app se centra y no supera 768 px.
