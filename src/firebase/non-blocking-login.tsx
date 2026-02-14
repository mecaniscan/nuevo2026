'use client';
import {
  Auth, // Import Auth type for type hinting
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  // Assume getAuth and app are initialized elsewhere
} from 'firebase/auth';

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  // Call signInAnonymously directly. Do NOT use 'await'.
  // Auth state change is handled by onAuthStateChanged listener.
  signInAnonymously(authInstance);
}

/**
 * Initiates email/password sign-up.
 * Returns the promise from createUserWithEmailAndPassword to allow the caller
 * to handle success and error states.
 */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string) {
  return createUserWithEmailAndPassword(authInstance, email, password);
}

/**
 * Initiates email/password sign-in.
 * Returns the promise from signInWithEmailAndPassword to allow the caller
 * to handle success and error states.
 */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string) {
  return signInWithEmailAndPassword(authInstance, email, password);
}
