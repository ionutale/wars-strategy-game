import type { Entity } from "../entity";
import { createEntity } from "../entity";
import type { World } from "../world";
import { foodUsed, sfx } from "../world";
import { BUILDINGS, buildCost } from "../../content/buildings";
import { UNIT_DEFS } from "../../content/units";

export { BUILDINGS, buildCost };

export const WORK_BUILD_SPEED = 1; // progress per second per worker (build completes in `buildTime` seconds)

export function canPlace(w: World, type: string, tx: number, ty: number, faction: Entity["faction"]): boolean {
  const def = BUILDINGS[type];
  if (!def) return false;
  const f = def.footprint;
  for (let x = tx; x < tx + f; x++) {
    for (let y = ty; y < ty + f; y++) {
      if (!w.map.walkable(x, y)) return false;
      for (const e of w.entities.values()) {
        if (e.dead) continue;
        if (Math.abs(e.x - (x + 0.5)) < 0.75 && Math.abs(e.y - (y + 0.5)) < 0.75) return false;
      }
    }
  }
  const cost = def.cost;
  const pool = w.pools[faction];
  if (pool.gold < cost.gold || pool.wood < cost.wood) return false;
  return true;
}

export function placeFoundation(w: World, type: string, faction: Entity["faction"], tx: number, ty: number): Entity | null {
  if (!canPlace(w, type, tx, ty, faction)) return null;
  const def = BUILDINGS[type];
  const pool = w.pools[faction];
  pool.gold -= def.cost.gold;
  pool.wood -= def.cost.wood;
  const b = createEntity("building", faction, type, tx + def.footprint / 2, ty + def.footprint / 2, def.hp);
  b.progress = 0.01; // started
  w.entities.set(b.id, b);
  w.foodCap[faction] += def.foodBonus;
  sfx(w, "build");
  return b;
}

export function updateConstruction(w: World, dt: number): void {
  const buildings = [...w.entities.values()].filter((e) => e.kind === "building" && !e.dead);
  for (const b of buildings) {
    if (b.progress >= 1) continue;
    const def = BUILDINGS[b.type];
    if (b.queue.length > 0) {
      // training tick
      const unitType = b.queue[0];
      const udef = UNIT_DEFS[unitType];
      b.progress += (dt / udef.trainTime);
      if (b.progress >= 1) {
        b.progress = 0;
        b.queue.shift();
        spawnTrained(w, b, unitType);
        if (b.queue.length === 0) b.progress = 1; // completed: training timer resets, building stays "done"
      }
      continue;
    }
    // building construction: workers near it add progress
    let workers = 0;
    for (const e of w.entities.values()) {
      if (e.kind === "unit" && e.type === "worker" && !e.dead && e.faction === b.faction) {
        if (e.order && e.order.type === "build" && e.order.buildingId === b.id) {
          if (Math.hypot(e.x - b.x, e.y - b.y) < 1.5) workers++;
        }
      }
    }
    if (workers > 0) {
      b.progress += workers * WORK_BUILD_SPEED * dt / def.buildTime;
      if (b.progress >= 1) {
        b.progress = 1;
        b.hp = def.hp;
        sfx(w, "upgrade");
        for (const e of w.entities.values()) {
          if (e.kind === "unit" && e.type === "worker" && e.order && e.order.type === "build" && e.order.buildingId === b.id) {
            e.order = null;
          }
        }
      }
    }
  }
}

function spawnTrained(w: World, b: Entity, unitType: string): void {
  const udef = UNIT_DEFS[unitType];
  const u = createEntity("unit", b.faction, unitType, b.x + 1.5, b.y, udef.hp);
  u.hp = udef.hp;
  w.entities.set(u.id, u);
}

export function canTrain(w: World, b: Entity, unitType: string): boolean {
  const def = BUILDINGS[b.type];
  if (!def.trains.includes(unitType)) return false;
  const udef = UNIT_DEFS[unitType];
  const pool = w.pools[b.faction];
  if (pool.gold < udef.cost.gold || pool.wood < udef.cost.wood) return false;
  if (foodUsed(w, b.faction) >= w.foodCap[b.faction]) return false;
  return true;
}

export function trainQueue(w: World, b: Entity, unitType: string): boolean {
  if (!canTrain(w, b, unitType)) return false;
  const udef = UNIT_DEFS[unitType];
  const pool = w.pools[b.faction];
  pool.gold -= udef.cost.gold;
  pool.wood -= udef.cost.wood;
  b.queue.push(unitType);
  if (b.progress >= 1) b.progress = 0;
  return true;
}
