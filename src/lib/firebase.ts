import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDHBg7AAxaI_s0x29iS8YL5YobFqE2AvVg",
  authDomain: "scaned-1f910.firebaseapp.com",
  projectId: "scaned-1f910",
  storageBucket: "scaned-1f910.firebasestorage.app",
  messagingSenderId: "370075702754",
  appId: "1:370075702754:web:35124bd08a0f03255d15bb",
  measurementId: "G-LV7WVQZJ0V"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };