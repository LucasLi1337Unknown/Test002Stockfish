// Emergency compatibility worker.
// This does not use WASM; it is only a fallback if the browser/network refuses
// to load the normal Stockfish WASM build.

const STOCKFISH_ASM =
  "https://cdn.jsdelivr.net/npm/stockfish@18.0.8/bin/stockfish-18-asm.js";

try {
  importScripts(STOCKFISH_ASM);
} catch (error) {
  self.postMessage(
    "loadererror " + (error && error.message ? error.message : String(error))
  );
}
