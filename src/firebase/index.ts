'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage';

/**
 * Initializes Firebase with a defensive strategy for SSR and Build time.
 */
export function initializeFirebase() {
  const apps = getApps();
  let app: FirebaseApp;

  if (apps.length > 0) {
    app = apps[0];
  } else {
    app = initializeApp(firebaseConfig);
  }

  return getSdks(app);
}

export function getSdks(firebaseApp: FirebaseApp) {
  // Ensure we use the exact bucket name for reliability
  const bucketName = firebaseConfig.storageBucket.replace('gs://', '');
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp, bucketName)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';