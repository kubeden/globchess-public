// Import the functions you need from the SDKs you need
import { initializeApp, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getFirestore, collection, doc, getDoc, getDocs, deleteDoc, setDoc, addDoc, updateDoc, onSnapshot, query, orderBy, serverTimestamp, limit, startAfter } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithPopup, TwitterAuthProvider, linkWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCH59QrKRbyrYw6QaJV6iA0wvdmzQ6BfC0",
    authDomain: "globchess.firebaseapp.com",
    projectId: "globchess",
    storageBucket: "globchess.appspot.com",
    messagingSenderId: "315143989472",
    appId: "1:315143989472:web:353bafdf38a0c1bf884885",
    measurementId: "G-J7MCC9J3G4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, analytics, auth, TwitterAuthProvider, signInWithPopup, db, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, onSnapshot, query, orderBy, deleteDoc, serverTimestamp, limit, startAfter, linkWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword };