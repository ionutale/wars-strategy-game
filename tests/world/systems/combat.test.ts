import { describe, expect, it } from "vitest";
import { createWorld } from "../../../src/world/world";
import { createEntity, type Entity } from "../../../src/world/entity";
import { updateCombat, orderAttack, updateHealing, resolveProjectileHit, type UnitStats } from "../../../src/world/systems/combat";

const FOOTMAN: UnitStats = { hp: 40, attack: 6, range: 1, attackSpeed: 1, armor: 1, splashRadius: 0, missChance: 0, heal: 0, healRange: 0 };

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
    const archerStats: UnitStats = { hp: 25, attack: 6, range: 7, attackSpeed: 1, armor: 0, splashRadius: 0, missChance: 0, heal: 0, healRange: 0 };
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

describe("splash and healing", () => {
  it("mage splash damages all enemies near the target", () => {
    const w = createWorld(30, 30);
    const mage = createEntity("unit", "blue", "mage", 5, 5, 30);
    const t1 = createEntity("unit", "red", "footman", 6, 5, 40);
    const t2 = createEntity("unit", "red", "footman", 6, 6, 40);
    const far = createEntity("unit", "red", "footman", 12, 5, 40);
    w.entities.set(mage.id, mage); w.entities.set(t1.id, t1); w.entities.set(t2.id, t2); w.entities.set(far.id, far);
    const MAGE: UnitStats = { hp: 30, attack: 10, range: 5, attackSpeed: 0.7, armor: 0, splashRadius: 1.5, missChance: 0, heal: 0, healRange: 0 };
    const FOOTMAN: UnitStats = { hp: 40, attack: 6, range: 1, attackSpeed: 1, armor: 1, splashRadius: 0, missChance: 0, heal: 0, healRange: 0 };
    const stats = (e: Entity) => (e.id === mage.id ? MAGE : FOOTMAN);
    mage.order = { type: "attack", targetId: t1.id };
    updateCombat(w, 1 / 60, stats);
    // fire once: mage has a 0.7/s rate; loop until a projectile exists
    for (let i = 0; i < 120 && ![...w.entities.values()].some((e) => e.kind === "projectile"); i++) updateCombat(w, 1 / 60, stats);
    const proj = [...w.entities.values()].find((e) => e.kind === "projectile")!;
    proj.x = t1.x; proj.y = t1.y;
    resolveProjectileHit(proj, t1, w, false);
    expect(t1.hp).toBeLessThan(40); // full damage
    expect(t2.hp).toBeLessThan(40); // splash
    expect(far.hp).toBe(40);        // out of splash range
  });

  it("catapult miss lands off-target but splash still damages", () => {
    const w = createWorld(30, 30);
    const cat = createEntity("unit", "blue", "catapult", 5, 5, 50);
    const t1 = createEntity("unit", "red", "footman", 8, 5, 40);
    w.entities.set(cat.id, cat); w.entities.set(t1.id, t1);
    const CAT: UnitStats = { hp: 50, attack: 25, range: 8, attackSpeed: 0.4, armor: 0, splashRadius: 2, missChance: 1, heal: 0, healRange: 0 };
    const FOOTMAN: UnitStats = { hp: 40, attack: 6, range: 1, attackSpeed: 1, armor: 1, splashRadius: 0, missChance: 0, heal: 0, healRange: 0 };
    const stats = (e: Entity) => (e.id === cat.id ? CAT : FOOTMAN);
    cat.order = { type: "attack", targetId: t1.id };
    for (let i = 0; i < 120 && ![...w.entities.values()].some((e) => e.kind === "projectile"); i++) updateCombat(w, 1 / 60, stats);
    const proj = [...w.entities.values()].find((e) => e.kind === "projectile")!;
    proj.x = t1.x; proj.y = t1.y;
    resolveProjectileHit(proj, t1, w, true); // missed -> splash at offset point
    // the target is within 1..2 + 2 splash tiles of the miss point, so it takes splash damage
    expect(t1.hp).toBeLessThan(40);
  });

  it("priest heals a wounded ally in range", () => {
    const w = createWorld(30, 30);
    const priest = createEntity("unit", "blue", "priest", 5, 5, 30);
    const ally = createEntity("unit", "blue", "footman", 6, 5, 40);
    ally.hp = 20;
    w.entities.set(priest.id, priest); w.entities.set(ally.id, ally);
    const PRIEST: UnitStats = { hp: 30, attack: 0, range: 0, attackSpeed: 0.4, armor: 0, splashRadius: 0, missChance: 0, heal: 8, healRange: 4 };
    const FOOTMAN: UnitStats = { hp: 40, attack: 6, range: 1, attackSpeed: 1, armor: 1, splashRadius: 0, missChance: 0, heal: 0, healRange: 0 };
    const stats = (e: Entity) => (e.id === priest.id ? PRIEST : FOOTMAN);
    updateHealing(w, 1 / 60, stats);
    updateHealing(w, 1, stats); // first cast heals 8
    expect(ally.hp).toBe(28);
    updateHealing(w, 2.6, stats); // cooldown passed (1/0.4 = 2.5s)
    expect(ally.hp).toBe(36);
  });
});
