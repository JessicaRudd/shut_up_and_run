import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDNBP-bkrosDIUm7BmGhtxoEbG-Q5XUezk", // Replace with your actual API key
  authDomain: "shut-up-and-run.firebaseapp.com",
  projectId: "shut-up-and-run",
  storageBucket: "shut-up-and-run.appspot.com",
  messagingSenderId: "1013387810356", // Replace with your actual sender ID
  appId: "1:1013387810356:web:1cf22c2769347c964fdc61" // Replace with your actual app ID
};

// Debug log to verify config
console.log('Firebase Config:', {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey ? '***' : undefined // Hide the actual API key in logs
});

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Debug log to verify initialization
console.log('Firebase initialized:', {
  app: !!app,
  auth: !!auth,
  db: !!db
});

export { app, auth, db }; 