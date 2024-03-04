// import { db, doc, getDoc } from '/assets/js/firebaseInit.js';
import { db, collection, doc, getDoc, updateDoc, deleteDoc, getDocs, setDoc, addDoc, onSnapshot, auth, query, orderBy, serverTimestamp } from '/assets/js/firebaseInit.js';

// Retrieve the gameId from the URL
const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get('gameId');
const docRef = doc(db, "finishedGames", gameId);

const chessGame = new Chess();
let currentMoveIndex = 0;
let moves = [];

// sort moves ascending

function fetchGameDetails(gameId) {
    getDoc(docRef).then((docSnap) => {
        if (docSnap.exists()) {
            const gameData = docSnap.data();
            // Sort the moves by moveTimestamp in ascending order
            moves = gameData.moves;
            moves.sort((a, b) => a.moveTimestamp - b.moveTimestamp);
            console.log(moves);
            
            currentMoveIndex = moves.length - 1;
            // console log last move
            renderMove(currentMoveIndex);
            // Use gameData to display game details
            // Example: displayGameDetails(gameData);
        } else {
            console.log("No such game!");
        }
    }).catch((error) => {
        console.error("Error getting game details: ", error);
    });
}


function displayGameDetails(gameData) {
    // Update UI with gameData details
    // Example:
    // document.getElementById('gameDate').textContent = `Date: ${new Date(gameData.endedAt).toLocaleDateString()}`;
    // ... other details ...
}

function renderMove(index) {
    chessGame.reset();
    for (let i = 0; i <= index; i++) {
        chessGame.move(moves[i].move);
    }
    board.position(chessGame.fen());

    const moveInformationDiv = document.getElementById('moveInformationDiv');
    moveInformationDiv.innerHTML = `
        <p id="moveCurrent">Move #${index + 1}</p>
        <p id="moveCurrent">Move SAN: ${moves[index].move}</p>
        <p id="moveMadeBy">Made By: <a href="#" class="text-neutral-500">@${moves[index].playerHandle}</a></p>
        <p id="moveDate">Date: ${new Date(moves[index].moveTimestamp).toLocaleString()}</p>
    `;
}

document.getElementById('next').addEventListener('click', () => {
    if (currentMoveIndex < moves.length - 1) {
        currentMoveIndex++;
        renderMove(currentMoveIndex);
    }
});

document.getElementById('back').addEventListener('click', () => {
    if (currentMoveIndex > 0) {
        currentMoveIndex--;
        renderMove(currentMoveIndex);
    }
});

var config = {
    pieceTheme: 'assets/img/chesspieces/wikipedia/{piece}.png',
    position: 'start',
};

const board = Chessboard('myBoardHistory', config);

if (gameId) {
    fetchGameDetails(gameId);
    fetchAllFinishedGames();
    // fetchAllMoves();
}








// render html

// moves table
let currentPage = 1;
const itemsPerPage = 10; // Adjust as per your requirement
let totalMoves = []; // Array to store all moves
const tableBody = document.querySelector("#movesTable tbody");

// finished games
let currentFinishedGamesPage = 1;
const finishedGamesPerPage = 4; // Adjust as per your requirement
let totalFinishedGames = []; // Array to store all finished games

document.getElementById('prevGame').addEventListener('click', () => changeFinishedGamesPage(-1));
document.getElementById('nextGame').addEventListener('click', () => changeFinishedGamesPage(1));

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
            <p>Finish Move By: <a href="#" class="text-neutral-500">@${game.lastMoveBy}</a></p>
            <p>Last Move: ToBeAdded</p>
        </a>
        
    `;

    return gameDiv;
}

function changeFinishedGamesPage(step) {
    const newPage = currentFinishedGamesPage + step;
    const totalPages = Math.ceil(totalFinishedGames.length / finishedGamesPerPage);

    if (newPage > 0 && newPage <= totalPages) {
        currentFinishedGamesPage = newPage;
        renderFinishedGamesPage(currentFinishedGamesPage);
    }
}