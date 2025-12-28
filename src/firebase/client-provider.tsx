'use client';

import React, { useMemo, type ReactNode, useEffect } from 'react';
import { FirebaseProvider, useUser } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { initiateAnonymousSignIn } from './non-blocking-login';
import { useAuth } from '.';

function AuthInitializer({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  
  useEffect(() => {
    // If the auth check is complete and there's still no user,
    // initiate an anonymous sign-in.
    if (!isUserLoading && !user) {
      if (auth) {
        initiateAnonymousSignIn(auth);
      }
    }
  }, [isUserLoading, user, auth]);

  return <>{children}</>;
}


export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, once per component mount.
    return initializeFirebase();
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
      storage={firebaseServices.storage}
    >
      <AuthInitializer>
        {children}
      </AuthInitializer>
    </FirebaseProvider>
  );
}
