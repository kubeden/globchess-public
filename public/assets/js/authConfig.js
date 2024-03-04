
import { auth, TwitterAuthProvider, signInWithPopup, db, doc, getDoc, setDoc, linkWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from '/assets/js/firebaseInit.js';

const user = auth.currentUser;

auth.onAuthStateChanged(async function(user) {
    if (user) {
        console.log('user is signed in');

        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);

        if (!docSnap.exists()) {
            await setDoc(userRef, {
                uid: user.uid,
                tokens: 50
            });
            console.log('New user record created');

            // Redirect to game.html
            // window.location.href = '/game';
        } else {
            console.log('User exists');
            // window.location.href = '/game';
        }
    } else {
        console.log('user is not signed in');
    }
});

async function twitterLogin(){
    var provider = new TwitterAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const userRef = doc(db, "users", user.uid);

        const docSnap = await getDoc(userRef);

        if (!docSnap.exists()) {
            await setDoc(userRef, {
                uid: user.uid,
                tokens: 0
            });
            console.log('New user record created');

            // Redirect to game.html
            // window.location.href = '/game';
        } else {
            console.log('User exists');
            // window.location.href = '/game';
        }

    } catch (error) {
        console.error('Error during authentication or Firestore operation:', error);
    }
}

async function linkAccount() {
    const provider = new TwitterAuthProvider();
    const user = auth.currentUser;
    try {
        const result = await linkWithPopup(user, provider);
        // The Twitter account is now linked to the existing Firebase user
        console.log('Twitter account linked:', result.user);
    } catch (error) {
        console.error('Error linking Twitter account:', error);
    }
}

function register() {
    // Function to handle registration
    document.getElementById('registerForm').addEventListener('submit', function(event) {
        event.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if(password === confirmPassword) {
            createUserWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    // Registration successful
                    console.log('User registered:', userCredential.user);
                    // Redirect to login page or dashboard
                    window.location.href = '/login'; // Adjust as needed
                })
                .catch((error) => {
                    // Handle Errors here
                    console.error('Error during registration:', error);
                    alert(error.message); // Show error message to the user
                });
        } else {
            alert("Passwords do not match.");
        }
    });

}

function login(auth) {
    document.getElementById('loginEmail').addEventListener('click', function() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
    
        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // Signed in and redirect to game or profile page
                window.location.href = '/game'; // Or wherever you want to redirect
            })
            .catch((error) => {
                console.error('Error during login:', error);
            });
    });
    
}


// Function to handle login
async function loginUser(email, password){
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log(`User logged in: ${userCredential.user.uid}`);
        // Redirect or further actions
    } catch (error) {
        console.error('Error during login:', error);
    }
}

export { twitterLogin, linkAccount, user, signInWithEmailAndPassword, auth };