const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, collection, doc, getDoc, getDocs, deleteDoc, setDoc, addDoc, updateDoc, onSnapshot, query, orderBy, serverTimestamp, limit, startAfter } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

const admin = require('firebase-admin');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
  
const path = require('path');
const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);

const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const stripe = require('stripe')('sk_test_51Oj5JZD41r71UjhtCeL9J7vyEkabtQKg9HwdKjB7JSPxNGPRATemMSnlmL9F9oJnAzH3er1hppaCSND32kcU1q3S00DCKRPXkB');
const db = getFirestore();

// Serve static files from 'public' directory
app.use(express.static('public'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public/views'));


sessionConfig = {
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
};

app.use(session(sessionConfig));

// middleware if user is authenticated
const isAuthenticated = (req, res, next) => {
    if(req.session.authenticated) {
        next();
    }
    else {
        res.redirect('/');
    }
};

// /game only if authenticated
// app.use('/game', isAuthenticated);

// Routes for API
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/getTokens', async (req, res) => {
    const username = req.session.username;
    const userRef = db.collection('users').doc(username);
    const userDoc = await userRef.get();
    const user = userDoc.data();

    res.send(user.tokens.toString());
});

// app.get('/getGameHistory', async (req, res) => {
//     const username = req.session.username;
//     const gameRef = db.collection('games');
//     const gameQuery = query(gameRef, orderBy('timestamp', 'desc'), limit(10));
//     const gameDocs = await getDocs(gameQuery);

//     let games = [];
//     gameDocs.forEach(doc => {
//         if(doc.data().player1 === username || doc.data().player2 === username) {
//             games.push(doc.data());
//         }
//     });

//     res.send(games);
// });

// Routes for HTML files
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/game', (req, res) => {
    res.render('game');
});

app.get('/gameHistory', (req, res) => {
    res.render('gameHistory');
});

app.get('/success', (req, res) => {
    res.render('success');
});

app.get('/cancel', (req, res) => {
    res.render('cancel');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

server.listen(3000, () => {
    console.log('Listening on *:3000');
});


// api endpoint to check the payment status of the session Id and return the status. keep in mind that payment status is not stored in the database, it can only be retrieved from the stripe API

app.get('/payment-status/:userId/:sessionId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const sessionId = req.params.sessionId;

        // Check if session already processed
        const processedSessionRef = db.collection('processedSessions').doc(sessionId);
        const processedSessionDoc = await processedSessionRef.get();

        if (processedSessionDoc.exists) {
            return res.status(400).send("Session already processed");
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['line_items']
        });

        const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
        const product = await stripe.products.retrieve(session.line_items.data[0].price.product);
        const productTokenValue = parseInt(product.metadata.tokenValue);

        if(paymentIntent.status === 'succeeded') {
            const userRef = db.collection('users').doc(userId);
            const userDoc = await userRef.get();
            const user = userDoc.data();
            const currentTokens = parseInt(user.tokens);

            user.tokens = currentTokens + productTokenValue;
            await userRef.update(user);

            // Record the processed session
            await processedSessionRef.set({ processed: true });

            let response = {
                status: 'succeeded',
                tokens: user.tokens
            };

            res.send(response);
        }
        else {
            res.send('Payment Failed');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});
