import { db, collection, doc, getDoc, updateDoc, deleteDoc, getDocs, setDoc, addDoc, onSnapshot, auth, query, orderBy, serverTimestamp, limit, startAfter } from '/assets/js/firebaseInit.js';

import { handleStripeCheckout } from '/assets/js/payment.js';

let lastVisible; // This will hold the last document of the current batch

// moves table
let currentPage = 1;
const itemsPerPage = 10; // Adjust as per your requirement
let totalMoves = []; // Array to store all moves
const tableBody = document.querySelector("#movesTable tbody");

// finished games
let currentFinishedGamesPage = 1;
const finishedGamesPerPage = 4; // Adjust as per your requirement
let totalFinishedGames = []; // Array to store all finished games

document.getElementById('prev').addEventListener('click', () => changePage(-1));
document.getElementById('next').addEventListener('click', () => changePage(1));

document.getElementById('prevGame').addEventListener('click', () => changeFinishedGamesPage(-1));
document.getElementById('nextGame').addEventListener('click', () => changeFinishedGamesPage(1));

function fetchMoves() {
    const movesQuery = query(collection(db, "moves"), orderBy("moveTimestamp", "desc"), limit(10));

    getDocs(movesQuery).then(snapshot => {
        lastVisible = snapshot.docs[snapshot.docs.length - 1]; // Get the last visible document

        totalMoves = snapshot.docs.map(doc => doc.data());
        renderTablePage(currentPage);
    });
}

function fetchNextMoves() {
    if (!lastVisible) {
        console.log("No more documents to fetch.");
        return;
    }

    const nextMovesQuery = query(collection(db, "moves"), orderBy("moveTimestamp", "desc"), startAfter(lastVisible), limit(10));

    getDocs(nextMovesQuery).then(snapshot => {
        if (!snapshot.empty) {
            lastVisible = snapshot.docs[snapshot.docs.length - 1]; // Update the last visible document

            const newMoves = snapshot.docs.map(doc => doc.data());
            totalMoves = totalMoves.concat(newMoves); // Append new moves to the totalMoves array
            renderTablePage(++currentPage); // Increment currentPage and render the new page
            console.log("Fetched next set of moves successfully!");
        } else {
            console.log("No more documents to fetch.");
        }
    });
}

function renderTablePage(page) {
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageMoves = totalMoves.slice(start, end);

    tableBody.innerHTML = ""; // Clear existing rows
    if (pageMoves.length === 0) {
        tableBody.innerHTML = "<tr class='text-center'><td class='px-4 py-4' colspan='4'>No moves found</td></tr>";
    }
    else {
        pageMoves.forEach(moveData => {
            // console.log(moveData)
            tableBody.innerHTML += createTableRow(moveData);
        });
    }

    // Update the current page display
    document.getElementById('page').textContent = page;
}

function changePage(step) {
    const newPage = currentPage + step;
    const totalPages = Math.ceil(totalMoves.length / itemsPerPage);

    if (newPage > 0 && newPage <= totalPages) {
        currentPage = newPage;
        renderTablePage(currentPage);
    } else if (newPage > totalPages) {
        fetchNextMoves(); // Fetch next set of moves when needed
    }
}


// Fetching all finished games from Firestore
function fetchAllFinishedGames() {
    getDocs(collection(db, "finishedGames")).then(snapshot => {
        // sort totalFinishedGames by endedAt, descending
        totalFinishedGames = snapshot.docs.map(doc => doc.data())
            .sort((a, b) => b.endedAt - a.endedAt);

        totalFinishedGames.forEach((game, index) => {
            game.gameNumber = totalFinishedGames.length - index; // Assign a game number
        });

        renderFinishedGamesPage(currentFinishedGamesPage);
    });
}

// Rendering a specific page of finished games
function renderFinishedGamesPage(page) {
    const start = (page - 1) * finishedGamesPerPage;
    const end = start + finishedGamesPerPage;
    const pageGames = totalFinishedGames.slice(start, end);

    console.log(page);

    const gamesContainer = document.querySelector(".games-container");
    gamesContainer.innerHTML = ""; // Clear existing games

    pageGames.forEach(game => {
        gamesContainer.appendChild(createGameDiv(game));
    });

    // Update the current page display
    document.getElementById('pageGame').textContent = page;

    createLastGameDiv();
}

// Creating a game div element
function createGameDiv(game) {
    console.log(game);
    const gameDiv = document.createElement("div");
    const gameLink = `gamehistory.html?gameId=${game.gameId}`;
    console.log(gameLink);


    gameDiv.className = "text-white text-start bg-neutral-800 px-4 pe-8 py-4 rounded-md border border-neutral-700 bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-60 transition hover:bg-opacity-100";


    gameDiv.innerHTML = `
        <a href="${gameLink}">
            <h2 class="font-bold">Game #${game.gameNumber}</h2>
            <div class="h-0.5 bg-neutral-700 w-full my-2"></div>
            <p>Ended On: ${new Date(game.endedAt).toLocaleDateString()}</p>
            <p>Finish Move By: <a href="#" class="text-neutral-500">@${game.lastMoveBy}</a></p>
        </a>
        
    `;

    return gameDiv;
}

function createLastGameDiv() {
    // from the firestore data, get the last game
    const game = totalFinishedGames[0];
    console.log(game);
    const gameDiv = document.createElement("div");
    const gameLink = `gamehistory.html?gameId=${game.gameId}`;
    console.log(gameLink);
    // the container that should be populated is with id lastGameContent
    const lastGameContainer = document.getElementById('lastGameContent');
    lastGameContainer.innerHTML = ""; // Clear existing game

    gameDiv.className = "text-white text-start bg-neutral-800 px-4 pe-8 py-2 rounded-md border border-neutral-700 bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-60 transition hover:bg-opacity-100";

    gameDiv.innerHTML = `
        <a href="${gameLink}">
            <h2 class="font-bold">Game #${game.gameNumber}</h2>
            <div class="h-0.5 bg-neutral-700 w-full my-2"></div>
            <p>Ended On: ${new Date(game.endedAt).toLocaleDateString()}</p>
            <p>Finish Move By: <a href="#" class="text-neutral-500">@${game.lastMoveBy}</a></p>
        </a>
        `;

    lastGameContainer.appendChild(gameDiv);
}

function changeFinishedGamesPage(step) {
    const newPage = currentFinishedGamesPage + step;
    const totalPages = Math.ceil(totalFinishedGames.length / finishedGamesPerPage);

    if (newPage > 0 && newPage <= totalPages) {
        currentFinishedGamesPage = newPage;
        renderFinishedGamesPage(currentFinishedGamesPage);
    }
}

document.querySelectorAll("#paymentModalBody button").forEach(button => {
    button.addEventListener("click", async (event) => {
        const priceId = event.target.getAttribute("data-price-id");
        await handleStripeCheckout(priceId).catch((error) => {
            console.error("Error processing payment: ", error);
        });
        document.getElementById('paymentModal').classList.add('hidden');
    });
});

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('chessboard-loader').style.display = 'block';
    document.getElementById('myBoard').style.display = 'none';

    auth.onAuthStateChanged(function (user) {
        if (user) {
            // clear the session id from session storage
            sessionStorage.removeItem("sessionId");
            let userTokensSpan = document.getElementById('userTokens');
            const userRef = doc(db, "users", user.uid);
            getDoc(userRef).then((userDoc) => {
                const userWithTokens = userDoc.data();
                userTokensSpan.textContent = userWithTokens.tokens;
            }).catch((error) => {
                console.error("Error getting user tokens: ", error);
            });

            var board = null;
            var game = new Chess();
            let pendingMove = null;
            const tableBody = document.querySelector("#movesTable tbody");

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

                    console.log(data);
                    // check if the board is locked
                    if (data.lockUntil) {
                        const lockUntil = data.lockUntil;
                        const currentTime = new Date().getTime();
                        if (currentTime < lockUntil) {
                            // start the countdown
                            startBoardTimeCountdown(lockUntil);
                        }
                    }

                    document.getElementById('chessboard-loader').style.display = 'none';
                    document.getElementById('myBoard').style.display = 'block';
                } else {
                    console.log("No current game data found!");
                }
            });

            onSnapshot(query(collection(db, "moves"), orderBy("moveTimestamp", "desc")), (snapshot) => {
                if (!snapshot.empty) {
                    const latestMove = snapshot.docs[0].data();
                    updateLastMoveDiv(latestMove);
                }

                tableBody.innerHTML = ""; // Clear existing rows
                // fetchAllMoves(); // Call this function to fetch and display moves
                fetchMoves();
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
                        console.log(userTokens);
                        if (userTokens >= 1) {
                            // check if the board is already locked
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
                                        const lockUntil = new Date().getTime() + 10000;
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
                                            playerHandle: user.displayName, // Fetch the player's Twitter handle
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

                                        // Update the board and reset the state
                                        board.position(game.fen());
                                        // board.flip();
                                        pendingMove = null;
                                        document.getElementById('makeAMove').disabled = true;
                                        document.getElementById('resetMove').disabled = true;
                                        document.getElementById('moveMadeModal').classList.remove('hidden');
                                        document.getElementById('moveMadeModal').classList.add('show');
                                        document.getElementById('makeAMove').classList.remove('hover:bg-green-500');
                                        document.getElementById('makeAMove').classList.remove('hover:text-black');
                                        document.getElementById('makeAMove').classList.remove('bg-yellow-600');
                                        document.getElementById('makeAMove').innerHTML = "Make A Move";
                                        document.getElementById('resetMove').classList.remove('hover:bg-red-500');
                                        document.getElementById('resetMove').classList.remove('hover:text-black');
                                        document.getElementById('resetMove').classList.remove('bg-red-600');
                                        updateStatus();

                                        // Construct Twitter share URL
                                        const tweetText = encodeURIComponent(`I just made a move on @globchess !\n\nMy move: ${lastMoveGenerated}\n\nCheck it out at globchess.com - the world's largest chess game!\n\n#globchess #chess`);
                                        const twitterShareUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;

                                        // Set the URL to the share button
                                        document.getElementById('shareMoveBtn').setAttribute('href', twitterShareUrl);

                                        console.log("Board is not locked!");
                                    }
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
            });

            document.getElementById('resetMove').disabled = true;
            document.getElementById('resetMove').addEventListener('click', function () {
                if (pendingMove) {
                    board.position(game.fen()); // Reset the board to the current game state
                    pendingMove = null; // Clear the pending move
                    document.getElementById('makeAMove').disabled = true; // Disable the "Make A Move" button
                    document.getElementById('resetMove').disabled = true;
                    document.getElementById('makeAMove').innerHTML = "Make A Move";
                    document.getElementById('makeAMove').classList.remove('hover:bg-green-500');
                    document.getElementById('makeAMove').classList.remove('hover:text-black');
                    document.getElementById('makeAMove').classList.remove('bg-yellow-600');
                    document.getElementById('resetMove').classList.remove('hover:bg-red-500');
                    document.getElementById('resetMove').classList.remove('hover:text-black');
                    document.getElementById('resetMove').classList.remove('bg-red-600');
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
                    document.getElementById('makeAMove').disabled = false; // Enable the "Make A Move" button
                    document.getElementById('resetMove').disabled = false;
                    document.getElementById('makeAMove').classList.add('hover:bg-green-500');
                    document.getElementById('makeAMove').innerHTML = "Use 1 Token To Confirm";
                    document.getElementById('makeAMove').classList.add('hover:text-black');
                    document.getElementById('makeAMove').classList.add('bg-yellow-600');
                    document.getElementById('resetMove').classList.add('hover:bg-red-500');
                    document.getElementById('resetMove').classList.add('hover:text-black');
                    document.getElementById('resetMove').classList.add('bg-red-600');
                } else {
                    return 'snapback'; // If the move is illegal, snap the piece back
                }
            }


            function onSnapEnd() {
                // Update the board only if there is no pending move
                if (!pendingMove) {
                    board.position(game.fen());
                }
            }



            function updateLastMoveDiv(moveData) {
                // From timestamp to a human-readable date (the timestamp is in the following format 1707834952646)
                // const moveDate = new Date(moveData.moveTimestamp).toLocaleString();

                if (moveData && moveData.move) {
                    const moveDate = new Date(moveData.moveTimestamp).toLocaleString();
                    // Update the actual content
                    document.getElementById('lastMove').textContent = `Move: ${moveData.move}`;
                    document.getElementById('lastMoveMadeBy').innerHTML = `Made by: <a href="#" class="text-neutral-500">@${moveData.playerHandle}</a>`;
                    document.getElementById('lastMoveDate').textContent = `Date: ${moveDate}`;

                    // Hide the loader and show the content
                    document.getElementById('lastMoveContent').classList.remove('hidden');
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
                // Modify or remove this part
                onSnapEnd: function () {
                    if (!pendingMove) {
                        board.position(game.fen());
                    }
                }

            };

            board = Chessboard('myBoard', config);

            updateStatus();
            // fetchAllMoves(); // Call this function to fetch and display moves
            fetchMoves();
            fetchAllFinishedGames(); // Call this function to fetch and display finished games
            updateLastMoveDiv(null);
            // createLastGameDiv();
        }
        else {
            console.log("No user signed in!");
        }
    });
});

function createTableRow(moveData) {
    // moveData.moveTimestamp = new Date(moveData.moveTimestamp).toLocaleString();
    let formattedTimestamp = moveData.moveTimestamp ? new Date(moveData.moveTimestamp).toLocaleString() : 'N/A';
    return `<tr>
        <td class="  px-4 py-2">${moveData.move}</td>
        <td class="  px-4 py-2">${moveData.playerHandle}</td>
        <td class="  px-4 py-2">$${moveData.amountPaid}</td>
        <td class="  px-4 py-2">${formattedTimestamp}</td>
    </tr>`;
}

function startBoardTimeCountdown(lockedUntil) {

    const boardLockedDiv = document.getElementById('boardLockedDiv');
    const timeLeftSpan = document.getElementById('boardLockedTime');
    boardLockedDiv.classList.remove('hidden');
    // lock the board in the database for 5 minutes

    const board = document.getElementById('myBoard');
    board.classList.add('board-locked');

    // start continuous countdown
    setInterval(() => {
        const currentTime = new Date().getTime();
        const timeLeft = lockedUntil - currentTime;
        if (timeLeft > 0) {
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            timeLeftSpan.textContent = `Time left: ${minutes}m ${seconds}s`;
        } else {
            timeLeftSpan.textContent = "Time left: 0m 0s";
            boardLockedDiv.classList.add('hidden');
            board.classList.remove('board-locked');
            clearInterval();
        }
    }, 1000);
}