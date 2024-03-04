import { db, collection, doc, getDoc, updateDoc, deleteDoc, getDocs, setDoc, addDoc, onSnapshot, auth, query, orderBy, serverTimestamp, limit, startAfter } from '/assets/js/obfuscated/firebaseInit.js';
import { handleStripeCheckout } from '/assets/js/obfuscated/payment.js';

let lastVisible;

// moves table
let currentPageMoves = 1;
const itemsPerPageMoves = 10; // Adjust as per your requirement
let totalMoves = []; // Array to store all moves
const tableBodyMoves = document.querySelector("#movesTable tbody");

// finished games
let currentFinishedGamesPage = 1;
const finishedGamesPerPage = 4;
let totalFinishedGames = [];

document.getElementById('prevMove').addEventListener('click', () => changePage(-1));
document.getElementById('nextMove').addEventListener('click', () => changePage(1));

document.getElementById('prevGame').addEventListener('click', () => changeFinishedGamesPage(-1));
document.getElementById('nextGame').addEventListener('click', () => changeFinishedGamesPage(1));

function fetchMoves() {
    tableBodyMoves.innerHTML = "";
    const movesQuery = query(collection(db, "moves"), orderBy("moveTimestamp", "desc"), limit(10));

    getDocs(movesQuery).then(snapshot => {
        lastVisible = snapshot.docs[snapshot.docs.length - 1]; // Get the last visible document

        totalMoves = snapshot.docs.map(doc => doc.data());
        renderTablePageMoves(currentPageMoves);
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
            renderTablePageMoves(++currentPageMoves); // Increment currentPageMoves and render the new page
            console.log("Fetched next set of moves successfully!");
        } else {
            console.log("No more documents to fetch.");
        }
    });
}

function renderTablePageMoves(page) {
    const start = (page - 1) * itemsPerPageMoves;
    const end = start + itemsPerPageMoves;
    const pageMoves = totalMoves.slice(start, end);

    tableBodyMoves.innerHTML = ""; // Clear existing rows
    if (pageMoves.length === 0) {
        tableBodyMoves.innerHTML = "<tr class='text-center'><td class='px-4 py-4' colspan='4'>No moves found</td></tr>";
    }
    else {
        pageMoves.forEach(moveData => {
            // console.log(moveData)
            tableBodyMoves.innerHTML += createTableRow(moveData);
        });
    }

    // Update the current page display
    document.getElementById('page').textContent = page;
}

function changePage(step) {
    const newPage = currentPageMoves + step;
    const totalPages = Math.ceil(totalMoves.length / itemsPerPageMoves);

    if (newPage > 0 && newPage <= totalPages) {
        currentPageMoves = newPage;
        renderTablePageMoves(currentPageMoves);
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
    const gameLink = `gamehistory?gameId=${game.gameId}`;
    console.log(gameLink);


    gameDiv.className = "text-white text-start bg-neutral-800 px-4 pe-8 py-4 rounded-md border border-neutral-700 bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-60 transition hover:bg-opacity-100";


    gameDiv.innerHTML = `
        <a href="${gameLink}">
            <h2 class="font-bold">Game #${game.gameNumber}</h2>
            <div class="h-0.5 bg-neutral-700 w-full my-2"></div>
            <p>Ended On: ${new Date(game.endedAt).toLocaleDateString()}</p>
            <p>Finish Move By: <a href="#" class="text-neutral-500">${game.lastMoveBy}</a></p>
        </a>
        
    `;

    return gameDiv;
}

function createLastGameDiv() {
    // from the firestore data, get the last game
    const game = totalFinishedGames[0];
    console.log(game);
    const gameDiv = document.createElement("div");
    const gameLink = `gamehistory?gameId=${game.gameId}`;
    console.log(gameLink);
    // the container that should be populated is with id lastGameContent
    const lastGameContainer = document.getElementById('lastGameContent');
    lastGameContainer.innerHTML = ""; // Clear existing game

    gameDiv.className = "text-white text-start bg-neutral-800 py-2 bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-60 transition hover:bg-opacity-100";

    gameDiv.innerHTML = `
        <a href="${gameLink}" class="text-neutral-400">
            <h2 class="font-bold">Game #${game.gameNumber}</h2>
            <div class="h-0.5 bg-neutral-700 w-full my-2"></div>
            <p>Ended On: ${new Date(game.endedAt).toLocaleDateString()}</p>
            <p>Finish Move By: <a href="#" class="text-neutral-500">${game.lastMoveBy}</a></p>
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

function createTableRow(moveData) {
    // moveData.moveTimestamp = new Date(moveData.moveTimestamp).toLocaleString();
    let formattedTimestamp = moveData.moveTimestamp ? new Date(moveData.moveTimestamp).toLocaleString() : 'N/A';
    return `<tr>
        <td class="  px-4 py-2">${moveData.move}</td>
        <td class="  px-4 py-2">${moveData.playerHandle}</td>
        <td class="  px-4 py-2">${formattedTimestamp}</td>
    </tr>`;
}

function configurePaymentButtons() {
    document.querySelectorAll("#paymentModalBody button").forEach(button => {
        button.addEventListener("click", async (event) => {
            const priceId = event.target.getAttribute("data-price-id");
            await handleStripeCheckout(priceId).catch((error) => {
                console.error("Error processing payment: ", error);
            });
            document.getElementById('paymentModal').classList.add('hidden');
            // spawn a loader in the middle of the screen with a message "Redirecting you to checkout... Please wait."
            const redirectToCheckoutDiv = document.createElement('div');
            redirectToCheckoutDiv.innerHTML = `
                <div class="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 z-50 flex items-center justify-center">
                    <div class="bg-white p-4 rounded-md text-center flex flex-col gap-4">
                        <p class="text-lg font-bold">Redirecting you to checkout...</p>
                        <p>Please wait. It may take up to 10 seconds until Stripe loads up.</p>
                    </div>
                </div>
            `;
            document.body.appendChild(redirectToCheckoutDiv);
        });
    });
}

function updateTokens(user) {
    let userTokensSpan = document.getElementById('userTokens');
    let userTokensSpanMobile = document.getElementById('userTokensMobile');
    
    const userRef = doc(db, "users", user.uid);
    getDoc(userRef).then((userDoc) => {
        if(userDoc.exists()) {
            const userWithTokens = userDoc.data();
            userTokensSpan.textContent = userWithTokens.tokens;
            userTokensSpanMobile.textContent = userWithTokens.tokens;
        }
        else {
            console.error("User not found in the database");
        }
    }).catch((error) => {
        console.error("Error getting user tokens: ", error);
    });
}

function startBoardTimeCountdown(gameData) {
    console.log("Game data:", gameData); // Debugging line

    const boardLockedDiv = document.getElementById('boardLockedDiv');
    const timeLeftSpan = document.getElementById('boardLockedTime');
    if (!boardLockedDiv || !timeLeftSpan) {
        console.error("Required HTML elements not found.");
        return;
    }

    if (gameData.lockUntil) {
        const lockUntil = new Date(gameData.lockUntil).getTime();
        console.log("Locked until:", lockUntil); // Debugging line

        if (lockUntil > new Date().getTime()) {
            console.log("Board is locked. Starting countdown..."); // Debugging line
            boardLockedDiv.classList.remove('hidden');
            const board = document.getElementById('myBoard');
            board.classList.add('board-locked');

            const interval = setInterval(() => {
                const currentTime = new Date().getTime();
                const timeLeft = lockUntil - currentTime;

                if (timeLeft > 0) {
                    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
                    timeLeftSpan.textContent = `Time left: ${minutes}m ${seconds}s`;
                } else {
                    timeLeftSpan.textContent = "Time left: 0m 0s";
                    boardLockedDiv.classList.add('hidden');
                    board.classList.remove('board-locked');
                    clearInterval(interval);
                }
            }, 1000);
        } else {
            console.log("Board is not locked or the lock time has already passed.");
            boardLockedDiv.classList.add('hidden');
        }
    } else {
        console.log("gameData.lockUntil is not defined.");
    }
}



function updateLastMoveDiv(moveData) {
    // From timestamp to a human-readable date (the timestamp is in the following format 1707834952646)
    // const moveDate = new Date(moveData.moveTimestamp).toLocaleString();

    if (moveData && moveData.move) {
        const moveDate = new Date(moveData.moveTimestamp).toLocaleString();
        // Update the actual content
        document.getElementById('lastMove').textContent = `Move: ${moveData.move}`;
        document.getElementById('lastMoveMadeBy').innerHTML = `Made by: <a href="#" class="text-neutral-500" style="line-break: anywhere;">${moveData.playerHandle}</a>`;
        document.getElementById('lastMoveDate').textContent = `Date: ${moveDate}`;

        // Hide the loader and show the content
        document.getElementById('lastMoveContent').classList.remove('hidden');
    }
}

function shareTwitter(lastMoveGenerated) {
    const moveMadeModal = document.getElementById('moveMadeModal');
    
    // Construct Twitter share URL
    const tweetText = encodeURIComponent(`I just made a move on @globchess !\n\nMy move: ${lastMoveGenerated}\n\nCheck it out at globchess.com - the world's largest chess game!\n\n#globchess #chess`);
    const twitterShareUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;
    document.getElementById('shareMoveBtn').setAttribute('href', twitterShareUrl);
    // remove the hide class from the share button and opacity-0
    moveMadeModal.classList.remove('hidden');
    moveMadeModal.classList.remove('opacity-0');
    // add the show class to the share button
    moveMadeModal.classList.add('show');
    moveMadeModal.classList.add('opacity-100');
}


function moveProgress(moveMade) {
    if (moveMade == true) {
        document.getElementById('makeAMove').disabled = false; // Enable the "Make A Move" button
        document.getElementById('resetMove').disabled = false;
        document.getElementById('makeAMove').classList.add('hover:bg-green-500');
        document.getElementById('makeAMove').innerHTML = "Use 1 Token";
        document.getElementById('makeAMove').classList.add('hover:text-black');
        document.getElementById('makeAMove').classList.add('bg-yellow-600');
        document.getElementById('resetMove').classList.add('hover:bg-red-500');
        document.getElementById('resetMove').classList.add('hover:text-black');
        document.getElementById('resetMove').classList.add('bg-red-600');
    }
    else {
        document.getElementById('makeAMove').disabled = true; // Disable the "Make A Move" button
        document.getElementById('resetMove').disabled = true;
        document.getElementById('makeAMove').classList.remove('hover:bg-green-500');
        document.getElementById('makeAMove').classList.remove('hover:text-black');
        document.getElementById('makeAMove').classList.remove('bg-yellow-600');
        document.getElementById('makeAMove').innerHTML = "Make A Move";
        document.getElementById('resetMove').classList.remove('hover:bg-red-500');
        document.getElementById('resetMove').classList.remove('hover:text-black');
        document.getElementById('resetMove').classList.remove('bg-red-600');
    }
}

export { fetchMoves, fetchAllFinishedGames, configurePaymentButtons, startBoardTimeCountdown, updateTokens, updateLastMoveDiv, shareTwitter, moveProgress };