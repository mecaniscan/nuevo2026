'use client';

import { Auth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, Firestore } from "firebase/firestore";
import type { User as AppUser } from "@/lib/types";

interface UserInfo {
    firstName: string;
    lastName: string;
    email: string;
    password?: string; // Password is not stored in Firestore, but is needed for creation
    whatsappNumber?: string;
}


export async function initiateEmailSignUpAndCreateUser(auth: Auth, firestore: Firestore, userInfo: UserInfo): Promise<void> {

    if (!userInfo.password) {
        throw new Error("Password is required to create a new user.");
    }
    
    // Step 1: Create the user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, userInfo.email, userInfo.password);
    const user = userCredential.user;

    // Step 2: Update the user's profile in Firebase Auth
    await updateProfile(user, {
        displayName: `${userInfo.firstName} ${userInfo.lastName}`
    });


    // Step 3: Create the user document in Firestore
    const userDocRef = doc(firestore, 'users', user.uid);
    
    // Remove password before saving to Firestore
    const { password, ...userDataToSave } = userInfo;

    const userData: Omit<AppUser, 'id'> = {
        ...userDataToSave,
    };

    // Use setDoc to create the document.
    await setDoc(userDocRef, {
        id: user.uid,
        ...userData
    });
}
