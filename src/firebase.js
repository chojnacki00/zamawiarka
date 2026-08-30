// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  setPersistence
} from "firebase/auth";
// Zmieniony import pod nowy standard offline
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCnhw0cwcQMuKbrpPH-YpCp-CsAL2w70lo",
  authDomain: "gastromanager-ddcc9.firebaseapp.com",
  projectId: "gastromanager-ddcc9",
  storageBucket: "gastromanager-ddcc9.firebasestorage.app",
  messagingSenderId: "323768771532",
  appId: "1:323768771532:web:f28fde53a58c65c95cf369",
  measurementId: "G-W8G2DZPXKQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = 'pl';
const authPersistenceReady = setPersistence(
  auth,
  browserLocalPersistence
).catch((error) => {
  console.error('Nie udało się ustawić trwałej sesji logowania:', error)
})

// NOWY SPOSÓB: Inicjalizacja bazy od razu z nowym trybem offline
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export { auth, authPersistenceReady, db };
