import { db, collection, doc, getDoc, updateDoc, deleteDoc, getDocs, setDoc, addDoc, onSnapshot, auth, query, orderBy, serverTimestamp, limit, startAfter } from '/assets/js/firebaseInit.js';
import { fetchMoves, fetchAllFinishedGames, startBoardTimeCountdown, updateTokens, shareTwitter, moveProgress } from '/assets/js/handleHtml.js';

auth.onAuthStateChanged(function (user) {
    if (user) {
        // clear the session id from session storage
        sessionStorage.removeItem("sessionId");
        updateTokens(user);

        // set displayName
        var displayName;
        if (user.displayName) {
            displayName = user.displayName;
        } else {
            displayName = user.email;
        }

        // Initialize the board
        var board = null;
        let pendingMove = null;
        var game = new Chess();

        onSnapshot(doc(db, "games", "currentGame"), (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                game.load(data.fen); // Load the game state
                const turn = game.turn(); // 'w' for White, 'b' for Black
                const orientation = (turn === 'w') ? 'white' : 'black';
                board.orientation(orientation); // Set the board orientation
                board.position(data.fen); // Update the board position
                pendingMove = null;
                moveProgress(false);

                // highlight the last move
                if (data.lastMove) {
                    const move = data.lastMove;
                    const moveFrom = move.from;
                    const moveTo = move.to;
                    const squareEl = document.querySelector(`.square-${moveFrom}`);
                    const squareToEl = document.querySelector(`.square-${moveTo}`);
                    squareEl.classList.add('highlight-move');
                    squareToEl.classList.add('highlight-move');
                }

                // check if the board is locked
                if (data.lockUntil) {
                    const lockUntil = data.lockUntil;
                    const currentTime = new Date().getTime();
                    if (currentTime < lockUntil) {
                        console.log("Board is locked!");
                        // start the countdown
                        startBoardTimeCountdown(data);
                        document.getElementById('chessboard-loader').style.display = 'none';
                        document.getElementById('myBoard').style.display = 'block';
                    }
                    else {
                        console.log("Board is not locked!");
                        document.getElementById('chessboard-loader').style.display = 'none';
                        document.getElementById('myBoard').style.display = 'block';
                    }
                }
                else {
                    console.log("Board is not locked!");
                    document.getElementById('chessboard-loader').style.display = 'none';
                    document.getElementById('myBoard').style.display = 'block';
                }
            } else {
                console.log("No current game data found!");
            }
        });

        document.getElementById('makeAMove').disabled = true;
        document.getElementById('makeAMove').addEventListener('click', function () {
            console.log('make a move clicked');
            if (pendingMove) {
                // get the user tokens from the firestore
                const userRef = doc(db, "users", user.uid);
                getDoc(userRef).then((userDoc) => {
                    const userWithTokens = userDoc.data();
                    const userTokens = userWithTokens.tokens;
                    if (userTokens >= 1) {
                        // check if the board is already locked
                        // from here
                        const gameRef = doc(db, "games", "currentGame");
                        getDoc(gameRef).then((gameDoc) => {
                            const gameData = gameDoc.data();
                            if (gameData.lockUntil) {
                                const currentTime = new Date().getTime();
                                if (currentTime < gameData.lockUntil) {
                                    console.log("Board is already locked!");
                                    return;
                                }
                                else {
                                    const lockUntil = new Date().getTime() + 15000;
                                    // Deduct the tokens from the user
                                    game.move(pendingMove); // Apply the move

                                    const history = game.history({ verbose: true });
                                    const lastMove = history[history.length - 1];
                                    const lastMoveGenerated = lastMove.san;

                                    console.log("Last move generated: ", lastMove);

                                    // Example move data
                                    const moveData = {
                                        move: lastMoveGenerated, // Standard Algebraic Notation of the move
                                        playerHandle: displayName, // Fetch the player's Twitter handle
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
                                        lockUntil: lockUntil
                                        // Add other data as needed
                                    })
                                    .then(() => {
                                        console.log("Game state updated successfully!");
                                        console.log("Board locked until: ", lockUntil);
                                    })
                                    .catch((error) => {
                                        console.error("Error updating game state: ", error);
                                    });

                                    board.position(game.fen());
                                    pendingMove = null;
                                    moveProgress(false);
                                    updateStatus();
                                    shareTwitter();
                                    
                                    userWithTokens.tokens = userTokens - 1;
                                    updateDoc(userRef, userWithTokens).then(() => {
                                        console.log("User tokens updated successfully!");
                                        // Update the UI to reflect the new token count
                                        document.getElementById('userTokens').textContent = userWithTokens.tokens;
                                        updateTokens(user);
                                    }).catch((error) => {
                                        console.error("Error updating user tokens: ", error);
                                    });

                                    console.log("Board is not locked!");
                                }
                            }
                            else {
                                const lockUntil = new Date().getTime() + 1000;
                                // Deduct the tokens from the user
                                userWithTokens.tokens = userTokens - 1;
                                updateDoc(userRef, userWithTokens).then(() => {
                                    console.log("User tokens updated successfully!");
                                    // Update the UI to reflect the new token count
                                    document.getElementById('userTokens').textContent = userWithTokens.tokens;
                                }).catch((error) => {
                                    console.error("Error updating user tokens: ", error);
                                });

                                game.move(pendingMove); // Apply the move

                                const history = game.history({ verbose: true });
                                const lastMove = history[history.length - 1];
                                const lastMoveGenerated = lastMove.san;

                                console.log("Last move generated: ", lastMove);

                                // Example move data
                                const moveData = {
                                    move: lastMoveGenerated, // Standard Algebraic Notation of the move
                                    playerHandle: displayName, // Fetch the player's Twitter handle
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
                                    lockUntil: lockUntil
                                    // Add other data as needed
                                })
                                .then(() => {
                                    console.log("Game state updated successfully!");
                                    console.log("Board locked until: ", lockUntil);
                                })
                                .catch((error) => {
                                    console.error("Error updating game state: ", error);
                                });

                                board.position(game.fen());
                                pendingMove = null;
                                moveProgress(false);
                                updateStatus();
                                shareTwitter();

                                console.log("Board is not locked!");
                            }
                        }
                        ).catch((error) => {
                            console.error("Error getting game data: ", error);
                        });
                    } else {
                        console.log("Insufficient tokens!");
                        document.getElementById('insufficientTokensModal').classList.remove('hidden');
                        document.getElementById('insufficientTokensModal').classList.add('show');
                    }
                }).catch((error) => {
                    console.error("Error getting user tokens: ", error);
                });
            }
            else {
                console.log("No move to make!");
            }
        });

        document.getElementById('resetMove').disabled = true;
        document.getElementById('resetMove').addEventListener('click', function () {
            if (pendingMove) {
                board.position(game.fen()); // Reset the board to the current game state
                pendingMove = null; // Clear the pending move
                moveProgress(false);
            }
        });

        function onDragStart(source, piece, position, orientation) {
            // Do not pick up pieces if the game is over
            if (game.game_over()) return false;

            // Only pick up pieces for the side to move
            if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
                (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
                return false;
            }

            // Do not pick up pieces if a move is pending
            if (pendingMove) return false;
        }

        function onDrop(source, target) {
            var move = {
                from: source,
                to: target,
                promotion: 'q' // NOTE: Always promote to a queen for simplicity
            };

            // Check if the move is legal
            if (game.move(move)) {
                game.undo(); // Undo the move in the game logic, but keep the visual change
                pendingMove = move; // Store the move
                moveProgress(true);
            } else {
                return 'snapback'; // If the move is illegal, snap the piece back

            }
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
                lastMoveBy: displayName
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
                // fetchAllMoves(); // Refresh move list
                fetchMoves();
                board.start(); // Reset the board to the initial position
            } catch (error) {
                console.error("Error processing game end: ", error);
            }
        }

        // Update the game status
        function updateStatus() {
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

            // Update the status element
            // You might want to display this status on your webpage
            console.log(status);
        }

        var config = {
            pieceTheme: 'assets/img/chesspieces/wikipedia/{piece}.png',
            draggable: true,
            position: 'start',
            onDragStart: onDragStart,
            onDrop: onDrop,

        };

        board = Chessboard('myBoard', config);
    }
    else {
        console.log("No user signed in!");
    }
});