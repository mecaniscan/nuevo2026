
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
  const apps = getApps();
  let app: FirebaseApp;

  if (apps.length > 0) {
    app = apps[0];
  } else {
    // Attempt to initialize with explicit config to ensure all services (like Storage)
    // have the correct bucket information from the start.
    app = initializeApp(firebaseConfig);
  }

  return getSdks(app);
}

export function getSdks(firebaseApp: FirebaseApp) {
  // Ensure the storage bucket URL is correctly formatted with the gs:// prefix.
  // This is critical for connectivity in certain cloud environments.
  const bucketUrl = firebaseConfig.storageBucket.startsWith('gs://') 
    ? firebaseConfig.storageBucket 
    : `gs://${firebaseConfig.storageBucket}`;

  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp, bucketUrl)
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
