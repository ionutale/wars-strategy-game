import { describe, expect, it } from "vitest";
import { MISSIONS } from "../../src/content/missions";

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
});
