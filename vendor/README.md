# Vendor folder

The first version intentionally loads Stockfish 18 Lite Single from a pinned CDN.

Pinned engine:

- stockfish@18.0.8
- stockfish-18-lite-single.js
- stockfish-18-lite-single.wasm

Later, if the project needs to run completely offline, place both engine files in this folder and update `js/stockfish-client.js` to point at them.
