import { auth, linkWithPopup, TwitterAuthProvider } from '/assets/js/firebaseInit.js';

auth.onAuthStateChanged(function(user) {
    if (user) {
        console.log('user is signed in');
        if(user.photoURL === null) {
            // random gravatar with the user's id
            const gravatar = `https://www.gravatar.com/avatar/${user.uid}?d=identicon`;
            document.querySelector('#userImage').innerHTML = `<img src="${gravatar}" alt="user image" class="w-11 h-11 rounded-full border-2 border-neutral-800">`;
            document.querySelector('#userImage2').innerHTML = `<img src="${gravatar}" alt="user image" class="w-8 h-8 rounded-full border-2 border-neutral-800">`;
        }
        else {
            document.querySelector('#userImage').innerHTML = `<img src="${user.photoURL}" alt="user image" class="w-11 h-11 rounded-full border-2 border-neutral-800">`;
            document.querySelector('#userImage2').innerHTML = `<img src="${user.photoURL}" alt="user image" class="w-8 h-8 rounded-full border-2 border-neutral-800">`;
        }

        document.getElementById('logoutBtn').addEventListener('click', function() {
            auth.signOut().then(() => {
                console.log('User logged out');
                // Redirect to the login page or home page
                window.location.href = '/'; // Update this as per your routing
            }).catch((error) => {
                // Handle errors
                console.error('Error logging out', error);
            });
        });
    } else {
        console.log('user is not signed in');
        window.location.href = '/'; // Redirect to index.html if not signed in
    }

});