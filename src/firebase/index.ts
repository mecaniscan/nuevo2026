'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage';

/**
 * Initializes Firebase with a defensive strategy for Client-side usage.
 * Explicitly uses the gs:// protocol for the storage bucket as required for Studio.
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

/**
 * Exports core SDK services.
 * Prepend 'gs://' to ensure proper bucket resolution in Studio environments.
 */
export function getSdks(firebaseApp: FirebaseApp) {
  // Ensure we use the gs:// protocol for the bucket name
  const rawBucket = firebaseConfig.storageBucket || 'studio-3565960860-31363.firebasestorage.app';
  const storageBucket = rawBucket.startsWith('gs://') ? rawBucket : `gs://${rawBucket}`;
  
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp, storageBucket)
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
