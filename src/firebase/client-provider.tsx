'use client';

import React, { useMemo, type ReactNode, useEffect } from 'react';
import { FirebaseProvider, useUser } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { initiateAnonymousSignIn } from './non-blocking-login';
import { Auth } from 'firebase/auth';

function AuthInitializer({ children, auth }: { children: ReactNode, auth: Auth | null }) {
  const { user, isUserLoading } = useUser();
  
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
      <AuthInitializer auth={firebaseServices.auth}>
        {children}
      </AuthInitializer>
    </FirebaseProvider>
  );
}
