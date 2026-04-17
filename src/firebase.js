// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const db = getFirestore(app);
export { auth, db };
