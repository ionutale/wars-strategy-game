const TICK_RATE = 60;
const TICK_MS = 1000 / TICK_RATE;
const MAX_CATCHUP = 10;

export interface LoopCallbacks {
  tick: (dt: number) => void;
  render: (alpha: number) => void;
}

export class GameLoop {
  private acc = 0;
  private last: number | null = null;
  private rafId: number | null = null;
  private running = false;

  constructor(private cb: LoopCallbacks) {}

  start(): void {
    if (this.running) return;
    this.last = performance.now();
    this.running = true;
    const frame = (now: number) => {
      if (!this.running) return;
      this.step(now);
      this.rafId = requestAnimationFrame(frame);
    };
    this.rafId = requestAnimationFrame(frame);
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  /** Advance the loop by wall-clock now. Public for tests. */
  step(now: number): void {
    if (this.last === null) { this.last = now; return; }
    let elapsed = now - this.last;
    this.last = now;
    if (elapsed < 0) elapsed = 0;
    this.acc = Math.min(this.acc + elapsed, TICK_MS * MAX_CATCHUP);
    while (this.acc >= TICK_MS) {
      this.cb.tick(TICK_MS / 1000);
      this.acc -= TICK_MS;
    }
    this.cb.render(this.acc / TICK_MS);
  }
}
