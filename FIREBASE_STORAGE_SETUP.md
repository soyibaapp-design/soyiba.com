# Firebase Storage para publicaciones

La app sube imagenes y videos directo a Firebase Storage cuando estas variables existen en `.env`:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Tambien debes activar en Firebase Console:

1. Authentication > Sign-in method > Anonymous.
2. Storage > Rules.

Reglas sugeridas para empezar:

```txt
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    match /publicaciones/videos/{filePath=**} {
      allow get, list: if true;
      allow create: if request.auth != null
        && request.resource.size <= 83886080
        && request.resource.contentType.matches('video/.*')
        && request.resource.metadata.ownerUid == request.auth.uid;
      allow update: if request.auth != null
        && resource.metadata.ownerUid == request.auth.uid
        && request.resource.metadata.ownerUid == resource.metadata.ownerUid
        && request.resource.size <= 83886080
        && request.resource.contentType.matches('video/.*');
      allow delete: if request.auth != null
        && resource.metadata.ownerUid == request.auth.uid;
    }

    match /publicaciones/imagenes/{filePath=**} {
      allow get, list: if true;
      allow create: if request.auth != null
        && request.resource.size <= 8388608
        && request.resource.contentType.matches('image/.*')
        && request.resource.metadata.ownerUid == request.auth.uid;
      allow update: if request.auth != null
        && resource.metadata.ownerUid == request.auth.uid
        && request.resource.metadata.ownerUid == resource.metadata.ownerUid
        && request.resource.size <= 8388608
        && request.resource.contentType.matches('image/.*');
      allow delete: if request.auth != null
        && resource.metadata.ownerUid == request.auth.uid;
    }

    match /{allPaths=**} {
      allow get, list, create, update, delete: if false;
    }
  }
}
```

Notas:

- El limite de video en la app es 80 MB.
- El limite de imagen en la app es 8 MB.
- La app elimina de Storage los archivos que reemplaza o quita al editar una publicacion, y los archivos de una publicacion eliminada cuando el mismo usuario Firebase anonimo tiene permiso sobre esos archivos.
- Para mayor seguridad en produccion, habilita Firebase App Check.
