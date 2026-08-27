# Test002Stockfish ♟️

A browser-based chess project powered by **Stockfish 18 Lite WASM**.

## 🌐 Live Website

The project is now deployed with GitHub Pages:

https://lucasli1337unknown.github.io/Test002Stockfish/

No localhost server is required to use the deployed version.

## Features

- Playable 8×8 chess board
- Legal chess moves
- Check and checkmate detection
- Castling
- En passant
- Pawn promotion
- Undo moves
- Flip board
- Stockfish 18 Lite WASM analysis
- NNUE evaluation
- Best-move calculation
- Principal variation
- Adjustable analysis depth
- Engine console
- Responsive interface

## Stockfish Engine

The website runs:

```text
Stockfish 18 Lite WASM
```

The engine is hosted directly inside this repository instead of being loaded from an external CDN.

Current engine files:

```text
stockfish-18-lite-single.js
stockfish-18-lite-single.wasm
```

This avoids the cross-origin Worker and WASM loading problems encountered during the earlier versions of the project.

## Project Structure

```text
Test002Stockfish/
├── index.html
├── stockfish-18-lite-single.js
├── stockfish-18-lite-single.wasm
│
├── css/
│   └── style.css
│
├── js/
│   ├── app.js
│   └── stockfish-client.js
│
├── vendor/
│   └── README.md
│
├── LICENSE-NOTICE.md
└── README.md
```

## How Stockfish Works

The browser creates a Web Worker using:

```javascript
new Worker("./stockfish-18-lite-single.js");
```

The Stockfish JavaScript loader then loads:

```text
stockfish-18-lite-single.wasm
```

from the same GitHub Pages website.

The application communicates with Stockfish using the UCI protocol.

A successful engine startup looks like:

```text
Stockfish 18 Lite WASM
uciok
readyok
```

During analysis, Stockfish produces output such as:

```text
info depth 12 score cp 37 ...
bestmove e2e4 ponder e7e5
```

## GitHub Pages

Changes committed to the GitHub repository are automatically deployed through GitHub Pages.

After making an update, the live website may take a short time to redeploy.

If the browser still shows an older version, perform a hard refresh:

```text
Command + Shift + R
```

## Local Development

Running locally is optional.

If needed, the project can still be served with:

```bash
python3 -m http.server 8000
```

and opened at:

```text
http://localhost:8000
```

However, the main version of the project is now the GitHub Pages deployment.

## Status

✅ Chess board working  
✅ GitHub Pages working  
✅ Stockfish JavaScript worker working  
✅ Stockfish WASM working  
✅ UCI communication working  
✅ NNUE evaluation working  
✅ Position analysis working  

## Live Demo

Visit:

https://lucasli1337unknown.github.io/Test002Stockfish/
