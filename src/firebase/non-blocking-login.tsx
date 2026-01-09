'use client';
import {
  Auth, // Import Auth type for type hinting
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  // Assume getAuth and app are initialized elsewhere
} from 'firebase/auth';

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  // CRITICAL: Call signInAnonymously directly. Do NOT use 'await signInAnonymously(...)'.
  signInAnonymously(authInstance).catch(error => {
    // Optional: Add logging or emit a global error event if needed
    console.error("Anonymous sign-in failed:", error);
  });
  // Code continues immediately. Auth state change is handled by onAuthStateChanged listener.
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string): Promise<void> {
  // CRITICAL: Call createUserWithEmailAndPassword directly. Do NOT use 'await createUserWithEmailAndPassword(...)'.
  return createUserWithEmailAndPassword(authInstance, email, password).then(() => {}).catch(error => {
    console.error("Email sign-up failed:", error);
    throw error; // Re-throw to be caught by the calling function's catch block
  });
  // Code continues immediately. Auth state change is handled by onAuthStateChanged listener.
}

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): Promise<void> {
  // CRITICAL: Call signInWithEmailAndPassword directly. Do NOT use 'await signInWithEmailAndPassword(...)'.
  return signInWithEmailAndPassword(authInstance, email, password).then(() => {}).catch(error => {
    // Re-throw to be caught by the calling function's catch block
    throw error;
  });
  // Code continues immediately. Auth state change is handled by onAuthStateChanged listener.
}

/** Initiate sign-out (non-blocking). */
export function initiateSignOut(authInstance: Auth): void {
    signOut(authInstance).catch(error => {
        console.error("Sign-out failed:", error);
    });
}
