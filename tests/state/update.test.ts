import { describe, expect, it } from "vitest";
import { createSession, startMission } from "../../src/state/session";
import { MISSIONS } from "../../src/content/missions";
import { tickWorld } from "../../src/state/update";

describe("tickWorld", () => {
  it("runs all systems without error and advances time", () => {
    const s = createSession();
    startMission(s, MISSIONS[0]);
    tickWorld(s, 1 / 60);
    expect(s.world.time).toBeGreaterThan(0);
  });

  it("ends in victory when enemy buildings are destroyed", () => {
    const s = createSession();
    startMission(s, MISSIONS[0]);
    for (const e of [...s.world.entities.values()]) {
      if (e.faction === "red" && e.kind === "building") e.dead = true;
    }
    tickWorld(s, 1 / 60);
    expect(s.victory).toBe(true);
  });

  it("ends in defeat when the player base is lost", () => {
    const s = createSession();
    startMission(s, MISSIONS[0]);
    for (const e of [...s.world.entities.values()]) {
      if (e.faction === "blue" && (e.type === "town-hall" || e.type === "castle")) e.dead = true;
    }
    tickWorld(s, 1 / 60);
    expect(s.victory).toBe(false);
    expect(s.state).toBe("defeat");
  });

  it("wins a survive mission when time expires", () => {
    const s = createSession();
    startMission(s, { ...MISSIONS[1], win: { kind: "survive", seconds: 5 } });
    for (let i = 0; i < 60 * 5; i++) tickWorld(s, 1 / 60);
    expect(s.state).toBe("victory");
  });
});
