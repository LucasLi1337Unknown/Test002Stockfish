// Local same-origin worker wrapper for Stockfish 18.
//
// Why this exists:
// Creating a Worker directly from a CDN URL is cross-origin and unreliable.
// Instead, this file is served from the same origin as the app, then it
// imports Stockfish from jsDelivr. We provide locateFile() first so Emscripten
// knows the exact URL of the WASM binary.

const STOCKFISH_BASE =
  "https://cdn.jsdelivr.net/npm/stockfish@18.0.8/bin/";

self.Module = {
  locateFile(path) {
    if (path.endsWith(".wasm")) {
      return STOCKFISH_BASE + "stockfish-18-lite-single.wasm";
    }
    return STOCKFISH_BASE + path;
  }
};

try {
  importScripts(STOCKFISH_BASE + "stockfish-18-lite-single.js");
} catch (error) {
  self.postMessage(
    "loadererror " + (error && error.message ? error.message : String(error))
  );
}
