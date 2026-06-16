import { getFirebaseApp } from './firebase';

export async function requestSoyibaNotificationToken(vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY) {
  const app = getFirebaseApp();

  if (!app || !vapidKey || typeof window === 'undefined') {
    return null;
  }

  const { getMessaging, getToken, isSupported } = await import('firebase/messaging');

  if (!(await isSupported())) {
    return null;
  }

  const permission = await Notification.requestPermission();

  if (permission !== 'granted') {
    return null;
  }

  return getToken(getMessaging(app), { vapidKey });
}
