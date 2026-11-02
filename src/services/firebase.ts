import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getDatabase, type Database } from 'firebase/database';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';

// Production Firebase Project: dooars-daily-basket-53d8a
export const firebaseConfig = {
  apiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_API_KEY) || 'AIzaSyBqQAega2GMyo4YrfekR3NqXlo8W6hfFzs',
  authDomain: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN) || 'dooars-daily-basket-53d8a.firebaseapp.com',
  databaseURL: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_DATABASE_URL) || 'https://dooars-daily-basket-53d8a-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_PROJECT_ID) || 'dooars-daily-basket-53d8a',
  storageBucket: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET) || 'dooars-daily-basket-53d8a.firebasestorage.app',
  messagingSenderId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID) || '619270850844',
  appId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_APP_ID) || '1:619270850844:web:e8498cee54e52a3bb552d9',
  measurementId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID) || 'G-317G42NWGY',
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

// Graceful Analytics initialization for web browsers
let analyticsInstance: Analytics | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analyticsInstance = getAnalytics(app);
    }
  }).catch(() => {
    // Analytics deferred or unsupported in this client context
  });
}
export const analytics = analyticsInstance;

// Graceful RTDB init
let rtdbInstance: Database | null = null;
try {
  rtdbInstance = getDatabase(app);
} catch (err) {
  console.warn('Realtime Database initialization deferred:', err);
}
export const rtdb: Database | null = rtdbInstance;

// Graceful Storage init
let storageInstance: FirebaseStorage | null = null;
try {
  storageInstance = getStorage(app);
} catch (err) {
  console.warn('Firebase Storage initialization deferred:', err);
}
export const storage: FirebaseStorage | null = storageInstance;

export default app;
