// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  setPersistence
} from "firebase/auth";
// Zmieniony import pod nowy standard offline
import {
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";
import emulatorConfig from '../firebase-emulators.json' with { type: 'json' };
import { shouldUseFirebaseEmulators } from './utils/firebaseEmulatorMode.js';

// Your web app's Firebase configuration
const productionFirebaseConfig = {
  apiKey: "AIzaSyCnhw0cwcQMuKbrpPH-YpCp-CsAL2w70lo",
  authDomain: "gastromanager-ddcc9.firebaseapp.com",
  projectId: "gastromanager-ddcc9",
  storageBucket: "gastromanager-ddcc9.firebasestorage.app",
  messagingSenderId: "323768771532",
  appId: "1:323768771532:web:f28fde53a58c65c95cf369",
  measurementId: "G-W8G2DZPXKQ"
};

const viteEnvironment = import.meta.env || {};
const emulatorRequested =
  viteEnvironment.VITE_USE_FIREBASE_EMULATORS === 'true';
const useFirebaseEmulators = shouldUseFirebaseEmulators(viteEnvironment);

if (emulatorRequested && viteEnvironment.DEV !== true) {
  console.warn(
    'Tryb Emulatorów Firebase jest dostępny wyłącznie podczas lokalnego uruchomienia Vite.'
  );
}

const firebaseConfig = useFirebaseEmulators
  ? {
      apiKey: 'demo-api-key',
      authDomain: `${emulatorConfig.projectId}.firebaseapp.com`,
      projectId: emulatorConfig.projectId,
      storageBucket: `${emulatorConfig.projectId}.appspot.com`,
      messagingSenderId: '000000000000',
      appId: '1:000000000000:web:demo'
    }
  : productionFirebaseConfig;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

if (useFirebaseEmulators) {
  connectAuthEmulator(
    auth,
    `http://${emulatorConfig.host}:${emulatorConfig.authPort}`,
    { disableWarnings: true }
  );
}

auth.languageCode = 'pl';
const authPersistenceReady = setPersistence(
  auth,
  browserLocalPersistence
).catch((error) => {
  console.error('Nie udało się ustawić trwałej sesji logowania:', error)
})

// NOWY SPOSÓB: Inicjalizacja bazy od razu z nowym trybem offline
const db = initializeFirestore(app, {
  localCache: useFirebaseEmulators
    ? memoryLocalCache()
    : persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

if (useFirebaseEmulators) {
  connectFirestoreEmulator(
    db,
    emulatorConfig.host,
    emulatorConfig.firestorePort
  );
}

export { auth, authPersistenceReady, db, useFirebaseEmulators };
