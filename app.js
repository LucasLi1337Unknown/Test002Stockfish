import { Chess } from "https://cdn.jsdelivr.net/npm/chess.js@1.4.0/+esm";
import { StockfishClient } from "./stockfish-client.js";

const boardEl = document.querySelector("#board");
const statusEl = document.querySelector("#status");
const evaluationEl = document.querySelector("#evaluation");
const bestMoveEl = document.querySelector("#bestMove");
const depthReadoutEl = document.querySelector("#depthReadout");
const turnReadoutEl = document.querySelector("#turnReadout");
const pvEl = document.querySelector("#pv");
const moveListEl = document.querySelector("#moveList");
const moveCountEl = document.querySelector("#moveCount");
const engineBadge = document.querySelector("#engineBadge");
const consoleEl = document.querySelector("#console");
const depthSlider = document.querySelector("#depthSlider");

const game = new Chess();
let selectedSquare = null;
let legalTargets = [];
let flipped = false;
let currentDepth = Number(depthSlider.value);
let analysisTimer = null;

const glyphs = {
  wp: "♙", wn: "♘", wb: "♗", wr: "♖", wq: "♕", wk: "♔",
  bp: "♟", bn: "♞", bb: "♝", br: "♜", bq: "♛", bk: "♚",
};

function log(line) {
  const stamp = new Date().toLocaleTimeString();
  const lines = consoleEl.textContent === "Booting…" ? [] : consoleEl.textContent.split("\n");
  lines.push(`[${stamp}] ${line}`);
  consoleEl.textContent = lines.slice(-90).join("\n");
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

function setEngineState(state) {
  engineBadge.className = "badge";
  if (state === "ready") {
    engineBadge.textContent = "STOCKFISH WASM READY";
    engineBadge.classList.add("badge-ready");
  } else if (state === "fallback") {
    engineBadge.textContent = "STOCKFISH FALLBACK";
    engineBadge.classList.add("badge-waiting");
  } else if (state === "error") {
    engineBadge.textContent = "ENGINE ERROR";
    engineBadge.classList.add("badge-error");
  } else {
    engineBadge.textContent = "ENGINE STARTING";
    engineBadge.classList.add("badge-waiting");
  }
}

const engine = new StockfishClient({
  onLine: handleEngineLine,
  onState: setEngineState,
});

function squareName(fileIndex, rankIndex) {
  const file = String.fromCharCode(97 + fileIndex);
  const rank = String(8 - rankIndex);
  return `${file}${rank}`;
}

function displaySquares() {
  const result = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const file = flipped ? 7 - col : col;
      const rank = flipped ? 7 - row : row;
      result.push({
        square: squareName(file, rank),
        file,
        rank,
        row,
        col,
      });
    }
  }
  return result;
}

function renderBoard() {
  boardEl.innerHTML = "";

  for (const info of displaySquares()) {
    const square = document.createElement("button");
    square.type = "button";
    square.className = `square ${(info.file + info.rank) % 2 ? "light" : "dark"}`;
    square.dataset.square = info.square;
    square.setAttribute("aria-label", info.square);

    if (selectedSquare === info.square) square.classList.add("selected");

    const legal = legalTargets.find((move) => move.to === info.square);
    if (legal) square.classList.add(legal.captured ? "capture" : "legal");

    const piece = game.get(info.square);
    if (piece) {
      const span = document.createElement("span");
      span.className = "piece";
      span.textContent = glyphs[`${piece.color}${piece.type}`];
      square.appendChild(span);
    }

    if (info.row === 7) {
      const fileLabel = document.createElement("span");
      fileLabel.className = "coord file";
      fileLabel.textContent = info.square[0];
      square.appendChild(fileLabel);
    }

    if (info.col === 0) {
      const rankLabel = document.createElement("span");
      rankLabel.className = "coord rank";
      rankLabel.textContent = info.square[1];
      square.appendChild(rankLabel);
    }

    square.addEventListener("click", () => onSquareClick(info.square));
    boardEl.appendChild(square);
  }

  updateGameText();
}

function onSquareClick(square) {
  if (game.isGameOver()) return;

  const piece = game.get(square);

  if (!selectedSquare) {
    if (!piece || piece.color !== game.turn()) return;
    selectSquare(square);
    return;
  }

  if (square === selectedSquare) {
    clearSelection();
    return;
  }

  const sameSidePiece = piece && piece.color === game.turn();
  if (sameSidePiece) {
    selectSquare(square);
    return;
  }

  const candidate = legalTargets.find((move) => move.to === square);
  if (!candidate) {
    clearSelection();
    return;
  }

  let promotion = undefined;
  if (candidate.promotion) promotion = "q";

  try {
    game.move({
      from: selectedSquare,
      to: square,
      promotion,
    });
  } catch {
    clearSelection();
    return;
  }

  clearSelection(false);
  renderBoard();
  scheduleAnalysis();
}

function selectSquare(square) {
  selectedSquare = square;
  legalTargets = game.moves({ square, verbose: true });
  renderBoard();
}

function clearSelection(render = true) {
  selectedSquare = null;
  legalTargets = [];
  if (render) renderBoard();
}

function updateGameText() {
  turnReadoutEl.textContent = game.turn() === "w" ? "White" : "Black";

  if (game.isCheckmate()) {
    statusEl.textContent =
      `Checkmate — ${game.turn() === "w" ? "Black" : "White"} wins.`;
  } else if (game.isDraw()) {
    statusEl.textContent = "Draw.";
  } else if (game.inCheck()) {
    statusEl.textContent =
      `${game.turn() === "w" ? "White" : "Black"} to move — CHECK.`;
  } else {
    statusEl.textContent =
      `${game.turn() === "w" ? "White" : "Black"} to move. Click a piece, then a highlighted square.`;
  }

  const history = game.history();
  moveCountEl.textContent = `${history.length} ply`;

  if (!history.length) {
    moveListEl.textContent = "No moves yet.";
    return;
  }

  const rows = [];
  for (let i = 0; i < history.length; i += 2) {
    rows.push(`${Math.floor(i / 2) + 1}. ${history[i] || ""} ${history[i + 1] || ""}`);
  }
  moveListEl.textContent = rows.join("\n");
  moveListEl.scrollTop = moveListEl.scrollHeight;
}

function scheduleAnalysis(delay = 140) {
  clearTimeout(analysisTimer);
  analysisTimer = setTimeout(() => analyze(), delay);
}

async function analyze() {
  evaluationEl.textContent = "…";
  bestMoveEl.textContent = "…";
  pvEl.textContent = "Analyzing…";

  try {
    await engine.analyze(game.fen(), currentDepth);
  } catch (error) {
    setEngineState("error");
    log(error.message || String(error));
    pvEl.textContent = "Stockfish could not start. Run the page through localhost or GitHub Pages.";
  }
}

function parseInfo(line) {
  if (!line.startsWith("info ")) return;

  const depthMatch = line.match(/\bdepth (\d+)/);
  const cpMatch = line.match(/\bscore cp (-?\d+)/);
  const mateMatch = line.match(/\bscore mate (-?\d+)/);
  const pvMatch = line.match(/\bpv (.+)$/);

  if (depthMatch) depthReadoutEl.textContent = depthMatch[1];

  if (mateMatch) {
    const mate = Number(mateMatch[1]);
    evaluationEl.textContent = mate > 0 ? `M${mate}` : `-M${Math.abs(mate)}`;
  } else if (cpMatch) {
    const cp = Number(cpMatch[1]);
    // UCI score is from the side-to-move perspective. Convert to White POV.
    const whiteCp = game.turn() === "w" ? cp : -cp;
    evaluationEl.textContent = `${whiteCp >= 0 ? "+" : ""}${(whiteCp / 100).toFixed(2)}`;
  }

  if (pvMatch) pvEl.textContent = pvMatch[1];
}

function handleEngineLine(line) {
  log(line);
  parseInfo(line);

  if (line.startsWith("bestmove ")) {
    const move = line.split(/\s+/)[1] || "—";
    bestMoveEl.textContent = move;
  }
}

document.querySelector("#newGameBtn").addEventListener("click", () => {
  game.reset();
  engine.stop();
  engine.newGame();
  selectedSquare = null;
  legalTargets = [];
  evaluationEl.textContent = "—";
  bestMoveEl.textContent = "—";
  pvEl.textContent = "Waiting for analysis…";
  renderBoard();
  scheduleAnalysis();
});

document.querySelector("#undoBtn").addEventListener("click", () => {
  if (!game.history().length) return;
  game.undo();
  selectedSquare = null;
  legalTargets = [];
  renderBoard();
  scheduleAnalysis();
});

document.querySelector("#flipBtn").addEventListener("click", () => {
  flipped = !flipped;
  renderBoard();
});

document.querySelector("#analyzeBtn").addEventListener("click", () => analyze());

document.querySelector("#clearConsoleBtn").addEventListener("click", () => {
  consoleEl.textContent = "";
});

depthSlider.addEventListener("input", () => {
  currentDepth = Number(depthSlider.value);
  depthReadoutEl.textContent = String(currentDepth);
});

depthSlider.addEventListener("change", () => scheduleAnalysis(0));

renderBoard();
setEngineState("loading");

engine.start()
  .then(() => {
    log("Stockfish UCI ready.");
    scheduleAnalysis(0);
  })
  .catch((error) => {
    setEngineState("error");
    log(error.message || String(error));
    statusEl.textContent =
      "Board is ready, but Stockfish failed to load. Use localhost/GitHub Pages and check your internet connection.";
  });
