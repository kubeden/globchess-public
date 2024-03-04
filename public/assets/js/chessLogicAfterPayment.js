import { db, collection, doc, getDoc, updateDoc, deleteDoc, getDocs, setDoc, addDoc, onSnapshot, auth, query, orderBy, serverTimestamp, limit, startAfter } from '/assets/js/firebaseInit.js';

import { handleStripeCheckout } from '/assets/js/payment.js';

let hasPaid = false;
let pendingMove = null;

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('chessboard-loader').style.display = 'block';
    document.getElementById('myBoard').style.display = 'none';
    pendingMove = getMoveData();

    auth.onAuthStateChanged(function(user) {
        if (user) {
            var board = null;
            var game = new Chess();

            onSnapshot(doc(db, "games", "currentGame"), (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const data = docSnapshot.data();
                    game.load(data.fen); // Load the game state
            
                    // Determine whose turn it is from the FEN and set the board orientation
                    const turn = game.turn(); // 'w' for White, 'b' for Black
                    const orientation = (turn === 'w') ? 'white' : 'black';
                    board.orientation(orientation); // Set the board orientation
            
                    board.position(data.fen); // Update the board position
                    // Handle other data like last move, player info, etc.

                    document.getElementById('chessboard-loader').style.display = 'none';
                    document.getElementById('myBoard').style.display = 'block';
                } else {
                    console.log("No current game data found!");
                }
            });
            
            if (pendingMove && hasPaid) {
                game.move(pendingMove); // Apply the move

                const history = game.history({ verbose: true });
                const lastMove = history[history.length - 1];
                const lastMoveGenerated = lastMove.san;

                console.log("Last move generated: ", lastMove);

                // Example move data
                const moveData = {
                    move: lastMoveGenerated, // Standard Algebraic Notation of the move
                    playerHandle: user.displayName, // Fetch the player's Twitter handle
                    amountPaid: '1', // Amount paid for the move
                    moveTimestamp: new Date().getTime() // Timestamp of the move
                };
                addDoc(collection(db, "moves"), moveData)
                .then(() => {
                    console.log("Move data saved successfully!");
                    // updateLastMoveDiv(moveData); // Update the last move div
                })
                .catch((error) => {
                    console.error("Error saving move data: ", error);
                });
        
                // Store the new game state in Firestore
                setDoc(doc(db, "games", "currentGame"), {
                    fen: game.fen(),
                    lastMove: pendingMove,
                    // Add other data as needed
                })
                .then(() => {
                    console.log("Game state updated successfully!");
                })
                .catch((error) => {
                    console.error("Error updating game state: ", error);
                });
        
                board.position(game.fen());
                pendingMove = null;
            }

            async function saveAndStartNewGame() {
                // Fetch the latest moves before clearing
                const movesSnapshot = await getDocs(collection(db, "moves"));
                let movesToSave = movesSnapshot.docs.map(doc => doc.data());
                // Sort the moves by moveTimestamp in ascending order
                movesToSave.sort((a, b) => a.moveTimestamp - b.moveTimestamp);
            
                const finishedGame = {
                    fen: game.fen(),
                    moves: movesToSave,
                    endedAt: new Date().getTime(),
                    lastMoveBy: user.displayName
                };
            
                try {
                    // Add finished game to 'finishedGames' collection in Firestore
                    const docRef = await addDoc(collection(db, "finishedGames"), finishedGame);
                    console.log("Finished game saved successfully!", docRef.id);
                    await updateDoc(docRef, { gameId: docRef.id });
                    console.log("Game ID added to the document successfully");
            
                    // Delete moves from 'moves' collection after saving them
                    for (let doc of movesSnapshot.docs) {
                        await deleteDoc(doc.ref);
                    }
                    console.log("Moves cleared successfully!");
            
                    // Start a new game
                    game.reset();
                    await setDoc(doc(db, "games", "currentGame"), {
                        fen: game.fen(),
                        lastMove: null
                    });
                    console.log("New game started successfully!");
                    totalMoves = []; // Clear move history
                    board.start(); // Reset the board to the initial position
                } catch (error) {
                    console.error("Error processing game end: ", error);
                }
            }
            
            // Update the game status
            function updateStatus () {
                var status = '';

                var moveColor = 'White';
                if (game.turn() === 'b') {
                    moveColor = 'Black';
                }

                if (game.in_checkmate() || game.in_draw()) {
                    if (game.in_checkmate()) {
                        status = 'Game over, ' + moveColor + ' is in checkmate.';
                    } else if (game.in_draw()) {
                        status = 'Game over, drawn position';
                    }
            
                    // Save the finished game and start a new one
                    saveAndStartNewGame();
                    fetchAllFinishedGames();
                }

                // Game still on
                else {
                    status = moveColor + ' to move';

                    // Check?
                    if (game.in_check()) {
                        status += ', ' + moveColor + ' is in check';
                    }
                }

                console.log(status);
            }

            var config = {
                pieceTheme: 'assets/img/chesspieces/wikipedia/{piece}.png',
                draggable: true,
                position: 'start',
                onDragStart: onDragStart,
                onDrop: onDrop,
                // Modify or remove this part
                onSnapEnd: function () {
                    if (!pendingMove) {
                        board.position(game.fen());
                    }
                }

            };

            board = Chessboard('myBoard', config);

            updateStatus();
        }
        else {
            console.log("No user signed in!");
        }
    });
});

function getMoveData() {
    return JSON.parse(localStorage.getItem('moveData'));
}

async function checkPaymentStatus(user) {
    const currentUser = user;
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (sessionId && currentUser) {
        const sessionDocRef = doc(db, `customers/${currentUser.uid}/checkout_sessions/${sessionId}`);
        const sessionDocSnap = await getDoc(sessionDocRef);

        if (sessionDocSnap.exists()) {
            const sessionData = sessionDocSnap.data();
            // Check if payment was successful, e.g., by checking a specific field
            if (sessionData.payment_status === 'paid') { // Adjust field name based on what Firebase Extension sets
                // Handle successful payment
                return true;
            }
        }
    }
    return false;
}