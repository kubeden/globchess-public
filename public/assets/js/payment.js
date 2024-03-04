import { db, collection, doc, getDoc, updateDoc, deleteDoc, getDocs, setDoc, addDoc, onSnapshot, auth, query, orderBy, serverTimestamp, limit, startAfter } from '/assets/js/firebaseInit.js';
// import { auth } from '/assets/js/firebaseInit.js';


// document.getElementById('payment').addEventListener('click', makePayment);
const success_url = window.location.origin + "/success?payment=success";
const cancel_url = window.location.origin + "/cancel?payment=failed";

async function handleStripeCheckout(priceId) {
    const currentUser = auth.currentUser;
    const paymentData = {
        mode: "payment",
        price: priceId, // Replace with your Stripe price ID
        success_url: success_url,
        cancel_url: cancel_url,
        userId: currentUser.uid
    };

    // Add a new checkout session
    const docRef = await addDoc(collection(db, "customers", currentUser.uid, "checkout_sessions"), paymentData);
    
    // Wait for the CheckoutSession to get attached by the extension
    onSnapshot(docRef, (doc) => {
        const { sessionId } = doc.data();
        if (sessionId) {
            // We have a session, let's redirect to Checkout but first save the sessionId and userId to the session storage
            sessionStorage.setItem("sessionId", sessionId);
            sessionStorage.setItem("userId", currentUser.uid);
            // Init Stripe
            const stripe = Stripe("SOMKEY"); // Replace with your Stripe publishable key
            stripe.redirectToCheckout({ sessionId });
        }
    });
}

export { handleStripeCheckout };