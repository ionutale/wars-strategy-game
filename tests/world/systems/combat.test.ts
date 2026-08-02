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
});
