const defaultApiBaseUrl = 'http://localhost:5000/api';

export const apiBaseUrl = import.meta.env.VITE_API_URL || defaultApiBaseUrl;
export const socketUrl = import.meta.env.VITE_SOCKET_URL || apiBaseUrl.replace(/\/api$/, '');

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseAuthFlow = import.meta.env.VITE_FIREBASE_AUTH_FLOW || '';
