import { db, collection, doc, getDoc, updateDoc, deleteDoc, getDocs, setDoc, addDoc, onSnapshot, auth, query, orderBy, serverTimestamp, limit, startAfter } from '/assets/js/firebaseInit.js';

import { updateLastMoveDiv, fetchMoves } from '/assets/js/handleHtml.js';

onSnapshot(query(collection(db, "moves"), orderBy("moveTimestamp", "desc")), (snapshot) => {
    if (!snapshot.empty) {
        const latestMove = snapshot.docs[0].data();
        updateLastMoveDiv(latestMove);
    }

    // fetchAllMoves(); // Call this function to fetch and display moves
    fetchMoves();
});