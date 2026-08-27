export class StockfishClient {
  constructor({ onLine = () => {}, onState = () => {} } = {}) {
    this.onLine = onLine;
    this.onState = onState;
    this.worker = null;
    this.ready = false;
    this.pendingReady = null;
    this.usingFallback = false;
  }

  async start() {
    if (this.worker) return;

    this.onState("loading");

    try {
      await this.#startWorker("./js/stockfish-worker.js");
    } catch (wasmError) {
      this.onLine(`WASM LOADER FAILED: ${wasmError.message || wasmError}`);
      this.onLine("Trying Stockfish ASM fallback…");
      this.usingFallback = true;
      this.#destroyWorker();
      await this.#startWorker("./js/stockfish-worker-asm.js");
      this.onLine("ASM fallback is running. WASM is still preferred.");
    }
  }

  #destroyWorker() {
    if (this.worker) {
      try { this.worker.terminate(); } catch {}
    }
    this.worker = null;
    this.ready = false;
    this.pendingReady = null;
  }

  #startWorker(url) {
    return new Promise((resolve, reject) => {
      let settled = false;
      let sawUciOk = false;

      const worker = new Worker(url);
      this.worker = worker;

      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error("Stockfish startup timed out"));
        }
      }, 12000);

      worker.onerror = (event) => {
        this.onState("error");
        const message = event.message || "Stockfish worker error";
        this.onLine(`WORKER ERROR: ${message}`);
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          reject(new Error(message));
        }
      };

      worker.onmessage = (event) => {
        const raw = String(event.data);

        for (const part of raw.split(/\r?\n/)) {
          const line = part.trim();
          if (!line) continue;

          this.onLine(line);

          if (line.startsWith("loadererror ")) {
            if (!settled) {
              settled = true;
              clearTimeout(timeout);
              reject(new Error(line.slice("loadererror ".length)));
            }
            continue;
          }

          if (line === "uciok" && !sawUciOk) {
            sawUciOk = true;
            worker.postMessage("isready");
          }

          if (line === "readyok" && !settled) {
            settled = true;
            clearTimeout(timeout);
            this.ready = true;
            this.onState(this.usingFallback ? "fallback" : "ready");
            resolve();
          }
        }
      };

      worker.postMessage("uci");
    });
  }

  async ensureReady() {
    if (!this.worker || !this.ready) {
      await this.start();
    }
  }

  async analyze(fen, depth = 12) {
    await this.ensureReady();
    this.send("stop");
    this.send(`position fen ${fen}`);
    this.send(`go depth ${depth}`);
  }

  send(command) {
    if (this.worker) this.worker.postMessage(command);
  }

  newGame() {
    if (!this.worker) return;
    this.send("ucinewgame");
    this.send("isready");
  }

  stop() {
    this.send("stop");
  }
}
