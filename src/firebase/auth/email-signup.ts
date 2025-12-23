'use client';

import { Auth, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, Firestore } from "firebase/firestore";

interface UserInfo {
    firstName: string;
    lastName: string;
    email: string;
    password?: string; // Password is not stored in Firestore, but is needed for creation
}


export async function initiateEmailSignUpAndCreateUser(auth: Auth, firestore: Firestore, userInfo: UserInfo): Promise<void> {

    if (!userInfo.password) {
        throw new Error("Password is required to create a new user.");
    }
    
    // Step 1: Create the user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, userInfo.email, userInfo.password);
    const user = userCredential.user;

    // Step 2: Create the user document in Firestore
    const userDocRef = doc(firestore, 'users', user.uid);
    
    const userData = {
        id: user.uid,
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        email: userInfo.email,
        // Do NOT store the password in Firestore
    };

    // Use setDoc to create the document. This is a blocking call within this function.
    await setDoc(userDocRef, userData);
}
