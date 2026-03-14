import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCC_VbrPua_SsQg9-m5kf_j6qEQcWevgW0",
  authDomain: "lifesync-45e7a.firebaseapp.com",
  projectId: "lifesync-45e7a",
  storageBucket: "lifesync-45e7a.firebasestorage.app",
  messagingSenderId: "160010072637",
  appId: "1:160010072637:web:0e416cf84ad67dcfdbb054",
};

const app = initializeApp(firebaseConfig, 'tripsync');
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
