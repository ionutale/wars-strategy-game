import { describe, expect, it } from "vitest";
import { createSession, Session, buildMissionWorld } from "../../src/state/session";
import { MISSIONS } from "../../src/content/missions";

describe("buildMissionWorld", () => {
  it("places player and enemy buildings from mission data", () => {
    const w = buildMissionWorld(MISSIONS[0]);
    const blues = [...w.entities.values()].filter((e) => e.faction === "blue" && e.kind === "building");
    const reds = [...w.entities.values()].filter((e) => e.faction === "red" && e.kind === "building");
    expect(blues.length).toBe(MISSIONS[0].playerBuildings.length);
    expect(reds.length).toBe(MISSIONS[0].enemyBuildings.length);
  });
});

describe("createSession", () => {
  it("starts in menu state", () => {
    const s = createSession();
    expect(s.state).toBe("menu");
  });
});
