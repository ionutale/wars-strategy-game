import { describe, expect, it } from "vitest";
import { createWorld } from "../../../src/world/world";
import { createEntity } from "../../../src/world/entity";
import { updateCombat, orderAttack, type UnitStats } from "../../../src/world/systems/combat";

const FOOTMAN: UnitStats = { hp: 40, attack: 6, range: 1, attackSpeed: 1, armor: 1 };

function setup() {
  const w = createWorld(30, 30);
  const a = createEntity("unit", "blue", "footman", 5, 5, 40);
  const b = createEntity("unit", "red", "footman", 6, 5, 40);
  w.entities.set(a.id, a);
  w.entities.set(b.id, b);
  return { w, a, b };
}

function tick(w: ReturnType<typeof setup>["w"]) {
  updateCombat(w, 1 / 60, () => FOOTMAN);
}

describe("updateCombat", () => {
  it("melee damages target when in range", () => {
    const { w, a, b } = setup();
    a.order = { type: "attack", targetId: b.id };
    tick(w);
    expect(b.hp).toBeLessThan(40);
  });

  it("does not damage when out of range", () => {
    const { w, a, b } = setup();
    b.x = 20;
    a.order = { type: "attack", targetId: b.id };
    tick(w);
    expect(b.hp).toBe(40);
  });

  it("kills entities at 0 hp", () => {
    const { w, a, b } = setup();
    b.hp = 1;
    a.order = { type: "attack", targetId: b.id };
    tick(w);
    expect(b.dead).toBe(true);
  });

  it("respects attack cooldown", () => {
    const { w, a, b } = setup();
    a.order = { type: "attack", targetId: b.id };
    tick(w);
    const hpAfterFirst = b.hp;
    tick(w);
    expect(b.hp).toBe(hpAfterFirst); // still cooling down
  });

  it("does not retaliate against a projectile (hold stance survives)", () => {
    const { w, a, b } = setup();
    b.order = { type: "hold" };
    // archer range 7: can hit b from outside hold auto-acquire range (6), so b's
    // hold stance isn't converted to an attack order before the projectile lands
    const archerStats: UnitStats = { hp: 25, attack: 6, range: 7, attackSpeed: 1, armor: 0 };
    b.x = 12;
    a.order = { type: "attack", targetId: b.id };
    // fire a ranged shot from a (uses projectile), then advance it onto b
    updateCombat(w, 1 / 60, (e) => (e.id === a.id ? archerStats : FOOTMAN));
    const proj = [...w.entities.values()].find((e) => e.kind === "projectile");
    expect(proj).toBeDefined();
    // simulate projectile arrival
    proj!.x = b.x;
    proj!.y = b.y;
    updateCombat(w, 1 / 60, (e) => (e.id === a.id ? archerStats : FOOTMAN));
    expect(b.hp).toBeLessThan(40); // took the hit
    expect(b.order).toEqual({ type: "hold" }); // stance preserved, no attack order on projectile
  });
});
