
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage';

/**
 * Initializes Firebase with a defensive strategy for SSR and Build time.
 */
export function initializeFirebase() {
  if (typeof window === 'undefined') {
    // During SSR/Build, we always use the config object to be safe
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    return getSdks(app);
  }

  if (!getApps().length) {
    let firebaseApp;
    try {
      // Attempt automatic initialization (App Hosting env vars)
      firebaseApp = initializeApp();
    } catch (e) {
      // Fallback to explicit config
      firebaseApp = initializeApp(firebaseConfig);
    }
    return getSdks(firebaseApp);
  }

  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  // Ensure the storage bucket has the correct gs:// prefix
  let bucket = firebaseApp.options.storageBucket || firebaseConfig.storageBucket;
  
  if (bucket && !bucket.startsWith('gs://')) {
    bucket = `gs://${bucket}`;
  }

  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp, bucket || undefined)
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
