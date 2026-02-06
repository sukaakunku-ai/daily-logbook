import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAGyk2L2RSvizIr_aXKyX44vWPlyM8rMFk",
  authDomain: "pengeluaran-dd4d0.firebaseapp.com",
  projectId: "pengeluaran-dd4d0",
  storageBucket: "pengeluaran-dd4d0.firebasestorage.app",
  messagingSenderId: "254908773545",
  appId: "1:254908773545:web:c52a2a33b081b83e6425b8",
  measurementId: "G-44QZ1165HM"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;
