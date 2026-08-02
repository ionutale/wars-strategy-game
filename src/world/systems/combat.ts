import type { Entity } from "../entity";
import { createEntity } from "../entity";
import type { World } from "../world";
import { sfx } from "../world";
import { setPath } from "./movement";

export interface UnitStats {
  hp: number;
  attack: number;
  range: number;       // tiles
  attackSpeed: number; // attacks per second
  armor: number;
  splashRadius: number; // 0 = no splash
  missChance: number;   // 0..1 chance the projectile lands off-target
  heal: number;         // 0 = no healing
  healRange: number;    // tiles
}

export const RANGED_SPEED = 12; // projectile tiles/sec

export function orderAttack(u: Entity, targetId: number): void {
  u.order = { type: "attack", targetId };
  u.targetId = targetId;
  u.path = null; // combat system re-paths toward the target
}

export function updateCombat(w: World, dt: number, stats: (e: Entity) => UnitStats): void {
  const units = [...w.entities.values()].filter((e) => e.kind === "unit" && !e.dead);
  for (const u of units) {
    if (u.attackCooldown > 0) u.attackCooldown -= dt;
    acquireTarget(u, w);
    if (u.order && u.order.type === "attack") {
      const t = w.entities.get(u.order.targetId);
      if (!t || t.dead) { u.order = null; u.path = null; continue; }
      const s = stats(u);
      const d = dist(u, t);
      if (d <= s.range) {
        u.path = null; // stop moving, shoot
        if (u.attackCooldown <= 0) fireAt(u, t, s, w);
      } else if (s.range <= 1.2) {
        // melee chases into range; re-path only when off-path
        if (!u.path || u.path.length === 0) setPath(u, { x: t.x, y: t.y }, w.map);
      }
    }
  }
  updateProjectiles(w, dt, stats);
}

function acquireTarget(u: Entity, w: World): void {
  if (!(u.order && u.order.type === "hold")) return;
  let nearest: Entity | null = null;
  let best = Infinity;
  for (const e of w.entities.values()) {
    if (e.faction === u.faction || e.dead || e.kind === "projectile") continue;
    const d = dist(u, e);
    if (d < best) { best = d; nearest = e; }
  }
  if (nearest && best <= 6) {
    u.order = { type: "attack", targetId: nearest.id };
    u.targetId = nearest.id;
  }
}

function fireAt(u: Entity, t: Entity, s: UnitStats, w: World): void {
  u.attackCooldown = 1 / s.attackSpeed;
  if (s.range <= 1.2) {
    applyDamage(t, s.attack, u, w);
  } else {
    const p = createProjectile(w, u.faction, u.x, u.y, s.attack, t.id);
    p.splashRadius = s.splashRadius;
    p.missChance = s.missChance;
    w.entities.set(p.id, p);
  }
  sfx(w, "attack");
}

function createProjectile(w: World, faction: Entity["faction"], x: number, y: number, damage: number, targetId: number): Entity {
  const p = createEntity("projectile", faction, "projectile", x, y, 1);
  p.targetId = targetId;
  p.cargo = damage;
  return p;
}

function updateProjectiles(w: World, dt: number, stats: (e: Entity) => UnitStats): void {
  for (const p of [...w.entities.values()]) {
    if (p.kind !== "projectile") continue;
    const t = w.entities.get(p.targetId!);
    if (!t || t.dead) {
      p.dead = true;
      continue;
    }
    const dx = t.x - p.x;
    const dy = t.y - p.y;
    const d = Math.hypot(dx, dy);
    const step = RANGED_SPEED * dt;
    if (d <= step) {
      resolveProjectileHit(p, t, w, Math.random() < p.missChance);
      p.dead = true;
    } else {
      p.x += (dx / d) * step;
      p.y += (dy / d) * step;
    }
  }
}

/** Resolve a projectile hit; a missed splash shot lands off-target but still splashes. */
export function resolveProjectileHit(p: Entity, t: Entity, w: World, missed: boolean): void {
  if (missed) {
    if (p.splashRadius > 0) {
      // land off-target: random point 1..2 tiles away; splash still applies
      const ang = Math.random() * Math.PI * 2;
      const off = 1 + Math.random();
      splashDamage(p, t.x + Math.cos(ang) * off, t.y + Math.sin(ang) * off, w, false);
    }
    // a miss with no splash deals no damage
    return;
  }
  applyDamage(t, p.cargo, p, w);
  if (p.splashRadius > 0) splashDamage(p, t.x, t.y, w);
}

function splashDamage(p: Entity, x: number, y: number, w: World, excludeTarget = true): void {
  for (const e of w.entities.values()) {
    if (e.dead || e.kind === "projectile" || e.faction === p.faction) continue;
    const d = Math.hypot(e.x - x, e.y - y);
    if (d <= p.splashRadius && (!excludeTarget || e !== w.entities.get(p.targetId!))) {
      applyDamage(e, Math.round(p.cargo / 2), p, w);
    }
  }
}

/** Priests auto-heal the most wounded friendly unit in range. */
export function updateHealing(w: World, dt: number, stats: (e: Entity) => UnitStats): void {
  for (const u of [...w.entities.values()]) {
    if (u.kind !== "unit" || u.dead) continue;
    const s = stats(u);
    if (s.heal <= 0) continue;
    if (u.healCooldown > 0) u.healCooldown -= dt;
    if (u.healCooldown > 0) continue;
    let best: Entity | null = null;
    let bestMissing = 0;
    for (const e of w.entities.values()) {
      if (e.faction !== u.faction || e.dead || e.kind !== "unit") continue;
      const missing = e.maxHp - e.hp;
      if (missing <= 0) continue;
      const d = Math.hypot(e.x - u.x, e.y - u.y);
      if (d <= s.healRange && missing > bestMissing) { bestMissing = missing; best = e; }
    }
    if (best) {
      const healed = Math.min(s.heal, bestMissing);
      best.hp += healed;
      u.healCooldown = 1 / Math.max(0.1, s.attackSpeed); // heal cadence
      sfx(w, "gather");
    }
  }
}

export function applyDamage(t: Entity, amount: number, attacker: Entity, w: World): void {
  if (t.dead) return;
  t.hp -= amount;
  if (t.hp <= 0) {
    t.hp = 0;
    t.dead = true;
    sfx(w, "death");
    if (t.kind === "unit") {
      // workers drop nothing in v1
    }
  } else {
    sfx(w, "hit");
  }
  // retaliate: idle unit attacked while not on stop; projectiles don't count as targets
  if (t.kind === "unit" && !t.dead && attacker.kind !== "projectile" && !(t.order && t.order.type === "stop")) {
    if (!(t.order && t.order.type === "attack")) {
      t.order = { type: "attack", targetId: attacker.id };
    }
  }
}

function dist(a: Entity, b: Entity): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
