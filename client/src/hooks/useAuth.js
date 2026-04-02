import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  getFirebaseInitError,
  isFirebaseConfigured,
  resolveRedirectSignIn,
  signInWithGoogle,
  signOutFromFirebase,
} from '../services/firebase';
import { getCurrentUser, setAuthTokenProvider } from '../services/api';
import { setSocketAuthToken } from '../services/socket';
import { setVersionTokenProvider } from '../services/versionService';

const toAppUser = (dbUser, firebaseUser) => ({
  userId: dbUser.firebaseUid,
  uid: dbUser.firebaseUid,
  username: firebaseUser?.displayName || dbUser.name,
  name: firebaseUser?.displayName || dbUser.name,
  email: firebaseUser?.email || dbUser.email,
  avatar: firebaseUser?.photoURL || dbUser.avatar,
});

export const useAuth = () => {
  const [firebaseUser, setFirebaseUser] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setFirebaseUser(null);
      setProfile(null);
      setToken(null);
      setAuthError(getFirebaseInitError());
      setAuthTokenProvider(async () => null);
      setVersionTokenProvider(async () => null);
      setSocketAuthToken(null);
      setLoading(false);
      return undefined;
    }

    let unsubscribe = () => {};
    let cancelled = false;

    const syncAuth = async (nextUser) => {
      setLoading(true);

      try {
        setFirebaseUser(nextUser);

        if (!nextUser) {
          setProfile(null);
          setToken(null);
          setAuthError('');
          setAuthTokenProvider(async () => null);
          setVersionTokenProvider(async () => null);
          setSocketAuthToken(null);
          return;
        }

        const nextToken = await nextUser.getIdToken(true);
        setToken(nextToken);
        setAuthTokenProvider(async () => nextToken);
        setVersionTokenProvider(async () => nextToken);
        setSocketAuthToken(nextToken);

        const dbUser = await getCurrentUser();
        setProfile(toAppUser(dbUser, nextUser));
        setAuthError('');
      } catch (error) {
        setProfile(null);
        setToken(null);
        setAuthTokenProvider(async () => null);
        setVersionTokenProvider(async () => null);
        setSocketAuthToken(null);

        if (error.response?.status === 401) {
          setAuthError('Signed in with Google, but the backend rejected the token. Check Firebase Admin credentials on the server.');
        } else if (error.code === 'ERR_NETWORK') {
          setAuthError('Signed in with Google, but the backend is unavailable. Start the server and try again.');
        } else {
          setAuthError(error.message || 'Authentication failed');
        }

        await signOutFromFirebase();
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    const initializeAuth = async () => {
      try {
        await resolveRedirectSignIn();
      } catch (error) {
        if (!cancelled) {
          setAuthError(error.message || 'Authentication failed');
        }
      } finally {
        if (!cancelled) {
          setIsSigningIn(false);
        }
      }

      if (cancelled) {
        return;
      }

      unsubscribe = onAuthStateChanged(auth, (nextUser) => {
        syncAuth(nextUser);
      });
    };

    initializeAuth();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({
    firebaseUser,
    isAuthenticated: Boolean(profile && token),
    loading,
    profile,
    token,
    authError,
    isSigningIn,
    signIn: async () => {
      if (loading || isSigningIn) {
        return;
      }

      setAuthError('');
      setIsSigningIn(true);
      try {
        await signInWithGoogle();
      } catch (error) {
        setAuthError(error.message || 'Authentication failed');
        setIsSigningIn(false);
      }
    },
    signOut: async () => {
      setProfile(null);
      setToken(null);
      setAuthError('');
      setAuthTokenProvider(async () => null);
      setVersionTokenProvider(async () => null);
      setSocketAuthToken(null);
      await signOutFromFirebase();
    },
  }), [authError, firebaseUser, isSigningIn, loading, profile, token]);

  return value;
};
