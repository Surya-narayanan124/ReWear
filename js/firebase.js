
import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
    getAuth,
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    doc,
    query,
    where,
    updateDoc,
    getDoc,
    setDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// ========================================
// FIREBASE CONFIGURATION
// ========================================

const firebaseConfig = {
    apiKey: "AIzaSyBBZJwhAs5Pb2sXaSQrk0TjaFkLZj5cKwA",
    authDomain: "rewear-69eb4.firebaseapp.com",
    projectId: "rewear-69eb4",
    storageBucket: "rewear-69eb4.firebasestorage.app",
    messagingSenderId: "474728589409",
    appId: "1:474728589409:web:861d30c325e91c8f5ea220",
    measurementId: "G-ED592BDEH4"
};

// ========================================
// INITIALIZE FIREBASE
// ========================================

const app = initializeApp(firebaseConfig);

// Firebase Authentication
export const auth = getAuth(app);

// Cloud Firestore
export const db = getFirestore(app);

// Google Sign-In Provider
export const googleProvider = new GoogleAuthProvider();

// ========================================
// EXPORT FIREBASE FUNCTIONS
// ========================================

export {
    onAuthStateChanged,
    signOut,

    collection,
    addDoc,
    getDocs,
    doc,
    query,
    where,
    updateDoc,
    getDoc,
    setDoc,
    deleteDoc,
    serverTimestamp
};
