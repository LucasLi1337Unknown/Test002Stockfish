export class StockfishClient {
  constructor({ onLine = () => {}, onState = () => {} } = {}) {
    this.onLine = onLine;
    this.onState = onState;
    this.worker = null;
    this.ready = false;
  }

  async start() {
    if (this.worker) return;

    this.onState("loading");

    this.worker = new Worker(
  "./stockfish-18-lite-single.js"
);

    this.worker.onmessage = (event) => {
      const text = String(event.data);

      for (const part of text.split(/\r?\n/)) {
        const line = part.trim();

        if (!line) continue;

        this.onLine(line);

        if (line === "uciok") {
          this.send("isready");
        }

        if (line === "readyok") {
          this.ready = true;
          this.onState("ready");
        }
      }
    };

    this.worker.onerror = (event) => {
      this.onState("error");
      this.onLine(
        "WORKER ERROR: " +
        (event.message || "Unknown Stockfish error")
      );
    };

    this.send("uci");
  }

  send(command) {
    if (this.worker) {
      this.worker.postMessage(command);
    }
  }

  async analyze(fen, depth = 12) {
    if (!this.worker) {
      await this.start();
    }

    this.send("stop");
    this.send(`position fen ${fen}`);
    this.send(`go depth ${depth}`);
  }

  newGame() {
    this.send("ucinewgame");
    this.send("isready");
  }

  stop() {
    this.send("stop");
  }
}
