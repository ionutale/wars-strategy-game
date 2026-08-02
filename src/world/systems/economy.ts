import type { Entity } from "../entity";
import type { ResourceNode } from "../map";
import type { World } from "../world";
import { sfx } from "../world";
import { setPath } from "./movement";

export const CARGO_CAPACITY = 50;

export function orderGather(u: Entity, resourceId: number): void {
  u.order = { type: "gather", resourceId };
  u.cargo = 0;
  u.cargoType = null;
  u.path = null; // stop following the previous node's path
}

export function updateEconomy(w: World, dt: number): void {
  const workers = [...w.entities.values()].filter((e) => e.kind === "unit" && e.type === "worker" && !e.dead);
  for (const u of workers) {
    // 1) carrying cargo: deliver it even if the gather order was lost
    //    (e.g. the node depleted after the final load was picked up).
    if (u.cargo > 0) {
      const depot = nearestDepot(w, u);
      if (depot && atEntity(u, depot)) {
        if (u.cargoType === "gold") w.pools[u.faction].gold += u.cargo;
        else w.pools[u.faction].wood += u.cargo;
        u.cargo = 0;
        u.cargoType = null;
        if (u.order && u.order.type === "gather") {
          const node = w.resources.get(u.order.resourceId);
          if (node && node.amount > 0) setPath(u, { x: node.x, y: node.y }, w.map);
          else { u.order = null; u.path = null; }
        }
      } else if (!u.path || u.path.length === 0) {
        if (depot) setPath(u, { x: depot.x, y: depot.y }, w.map);
      }
      continue;
    }

    // 2) gather order
    if (u.order && u.order.type === "gather") {
      const node = w.resources.get(u.order.resourceId);
      if (!node || node.amount <= 0) { u.order = null; u.path = null; continue; }
      if (node.maxWorkers > 0 && workersOnNode(w, u, node.id) > node.maxWorkers) {
        u.order = null;
        u.path = null;
        continue;
      }
      if (atNode(u, node)) {
        const take = Math.min(node.amount, CARGO_CAPACITY);
        node.amount -= take;
        u.cargo = take;
        u.cargoType = node.kind;
        sfx(w, "gather");
        const depot = nearestDepot(w, u);
        if (depot) setPath(u, { x: depot.x, y: depot.y }, w.map);
        if (node.amount <= 0) u.order = null; // deliver this final load, then stop
      } else if (!u.path || u.path.length === 0) {
        setPath(u, { x: node.x, y: node.y }, w.map);
      }
    }
  }
}

/** Count this faction's workers assigned to a node (capacity is per-faction). */
function workersOnNode(w: World, self: Entity, resourceId: number): number {
  let n = 0;
  for (const e of w.entities.values()) {
    if (e.kind === "unit" && e.type === "worker" && !e.dead && e.faction === self.faction
      && e.order && e.order.type === "gather" && e.order.resourceId === resourceId) {
      n++;
    }
  }
  return n;
}

function atNode(u: Entity, node: ResourceNode): boolean {
  return Math.hypot(u.x - node.x, u.y - node.y) < 0.8;
}

function atEntity(u: Entity, e: Entity): boolean {
  return Math.hypot(u.x - e.x, u.y - e.y) < 1.0;
}

function nearestDepot(w: World, u: Entity): Entity | null {
  let best: Entity | null = null;
  let bestD = Infinity;
  for (const e of w.entities.values()) {
    if (e.faction !== u.faction || e.kind !== "building" || e.dead) continue;
    if (e.type !== "town-hall" && e.type !== "castle") continue;
    const d = Math.hypot(e.x - u.x, e.y - u.y);
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}
