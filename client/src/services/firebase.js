import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getRedirectResult,
  GoogleAuthProvider,
  getAuth,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const maskValue = (value) => {
  if (!value) {
    return 'missing';
  }

  if (value.length <= 8) {
    return `${value.slice(0, 2)}***`;
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
};

const hasMissingFirebaseConfig = Object.values(firebaseConfig).some((value) => !value);

console.info('[firebase] env check', {
  apiKey: maskValue(firebaseConfig.apiKey),
  authDomain: firebaseConfig.authDomain || 'missing',
  projectId: firebaseConfig.projectId || 'missing',
  appId: maskValue(firebaseConfig.appId),
});

let app = null;
let auth = null;
let firebaseInitError = '';
let googleProvider = null;

const shouldUseRedirectSignIn = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  const configuredMode = import.meta.env.VITE_FIREBASE_AUTH_FLOW;
  if (configuredMode === 'redirect') {
    return true;
  }

  if (configuredMode === 'popup') {
    return false;
  }

  return ['localhost', '127.0.0.1'].includes(window.location.hostname);
};

if (hasMissingFirebaseConfig) {
  firebaseInitError = 'Firebase configuration is missing. Check VITE_FIREBASE_* values in client/.env and restart Vite.';
  console.error(`[firebase] ${firebaseInitError}`);
} else {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({
      prompt: 'select_account',
    });
  } catch (error) {
    firebaseInitError = error.message || 'Firebase initialization failed.';
    console.error('[firebase] initialization failed', error);
  }
}

export const isFirebaseConfigured = !hasMissingFirebaseConfig && !firebaseInitError;
export const getFirebaseInitError = () => firebaseInitError;

export const signInWithGoogle = async () => {
  if (!auth || !googleProvider) {
    throw new Error(firebaseInitError || 'Firebase Auth is not configured correctly.');
  }

  await setPersistence(auth, browserLocalPersistence);

  if (auth.currentUser) {
    await signOut(auth);
  }

  if (shouldUseRedirectSignIn()) {
    return signInWithRedirect(auth, googleProvider);
  }

  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error) {
    const shouldFallbackToRedirect = [
      'auth/popup-blocked',
      'auth/popup-closed-by-user',
      'auth/cancelled-popup-request',
      'auth/operation-not-supported-in-this-environment',
    ].includes(error.code);

    if (!shouldFallbackToRedirect) {
      throw error;
    }

    return signInWithRedirect(auth, googleProvider);
  }
};

export const resolveRedirectSignIn = async () => {
  if (!auth) {
    return null;
  }

  await setPersistence(auth, browserLocalPersistence);
  return getRedirectResult(auth);
};

export const signOutFromFirebase = async () => {
  if (!auth) {
    return;
  }

  return signOut(auth);
};

export {
  auth,
};
