import { describe, expect, it } from "vitest";
import { GameLoop } from "../../src/core/loop";

describe("GameLoop", () => {
  it("ticks at 60Hz regardless of frame time", () => {
    let ticks = 0;
    let acc = 0;
    const loop = new GameLoop({
      tick: (dt) => { ticks++; acc += dt; },
      render: () => {},
    });
    loop.step(0);
    loop.step(1000 / 60 + 9); // one frame of ~1.55 ticks
    expect(ticks).toBe(1); // fractional tick accumulated, not executed
    loop.step(2 * (1000 / 60) + 9); // now crosses the boundary
    expect(ticks).toBe(2);
    expect(acc).toBeCloseTo(2 / 60, 5);
  });

  it("does not run away accumulating debt beyond 10 ticks", () => {
    let ticks = 0;
    const loop = new GameLoop({ tick: () => { ticks++; }, render: () => {} });
    loop.step(0);
    loop.step(10_000); // huge frame gap
    expect(ticks).toBeLessThanOrEqual(10);
  });
});
