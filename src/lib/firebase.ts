import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInAnonymously,
  User,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDoc,
  collection,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Auth instance
export const auth = getAuth(app);

// Providers
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Firestore instance with auto-detect long polling for reliable web & iframe connections
const dbId =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? firebaseConfig.firestoreDatabaseId
    : undefined;

let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      experimentalAutoDetectLongPolling: true,
    },
    dbId
  );
} catch {
  // If already initialized, retrieve existing instance
  firestoreInstance = dbId ? getFirestore(app, dbId) : getFirestore(app);
}

export const db = firestoreInstance;

// Test Firestore connection on boot safely without throwing unauthenticated errors
export async function testFirestoreConnection(): Promise<boolean> {
  // If no user is signed in, skip unauthenticated server probe
  if (!auth.currentUser) {
    return true;
  }
  try {
    const userDocRef = doc(db, 'users', auth.currentUser.uid);
    await getDoc(userDocRef);
    return true;
  } catch (error) {
    console.warn('Firestore connectivity check note:', error instanceof Error ? error.message : error);
    return false;
  }
}

// Export auth helpers
export {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInAnonymously,
  doc,
  collection,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
};
export type { User };
