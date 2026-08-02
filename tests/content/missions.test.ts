import { describe, expect, it } from "vitest";
import { MISSIONS } from "../../src/content/missions";
import { BUILDINGS } from "../../src/content/buildings";
import { UNIT_DEFS } from "../../src/content/units";

describe("MISSIONS", () => {
  it("has five missions in order", () => {
    expect(MISSIONS.length).toBe(5);
    expect(MISSIONS[0].id).toBe("m1");
    expect(MISSIONS[4].id).toBe("m5");
  });

  it("defines win and lose conditions", () => {
    for (const m of MISSIONS) {
      expect(m.win).toBeTruthy();
      expect(m.lose).toBeTruthy();
      expect(m.intro.length).toBeGreaterThan(0);
    }
  });

  it("references only defined buildings and units", () => {
    for (const m of MISSIONS) {
      for (const b of [...m.playerBuildings, ...m.enemyBuildings]) {
        expect(BUILDINGS[b.type], `unknown building ${b.type} in ${m.id}`).toBeDefined();
      }
      for (const u of m.playerUnits) {
        expect(UNIT_DEFS[u.type], `unknown unit ${u.type} in ${m.id}`).toBeDefined();
      }
      for (const r of m.resources) {
        expect(["gold", "wood"]).toContain(r.kind);
      }
      expect(m.mapW).toBeGreaterThan(0);
      expect(m.mapH).toBeGreaterThan(0);
    }
  });
});
