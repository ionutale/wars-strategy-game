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
          else reassignGather(w, u); // node depleted — move to the next one
        }
      } else if (!u.path || u.path.length === 0) {
        if (depot) setPath(u, { x: depot.x, y: depot.y }, w.map);
      }
      continue;
    }

    // 2) gather order
    if (u.order && u.order.type === "gather") {
      const node = w.resources.get(u.order.resourceId);
      if (!node || node.amount <= 0) {
        // the node is exhausted — switch to the next available node of the
        // same kind instead of idling forever
        reassignGather(w, u);
        continue;
      }
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
        // if the node depleted, the deposit handler reassigns to the next one
      } else if (!u.path || u.path.length === 0) {
        setPath(u, { x: node.x, y: node.y }, w.map);
      }
    }
  }
}

/** Point the worker at the nearest node of the same kind as its current order, or idle if none. */
function reassignGather(w: World, u: Entity): void {
  const current = u.order;
  if (!current || current.type !== "gather") { u.order = null; u.path = null; return; }
  const oldNode = w.resources.get(current.resourceId);
  const kind = oldNode?.kind ?? "gold";
  let best: ResourceNode | null = null;
  let bestD = Infinity;
  for (const r of w.resources.values()) {
    if (r.kind !== kind || r.amount <= 0 || r.id === current.resourceId) continue;
    const d = Math.hypot(r.x - u.x, r.y - u.y);
    if (d < bestD) { bestD = d; best = r; }
  }
  if (best) {
    u.order = { type: "gather", resourceId: best.id };
    u.path = null;
  } else {
    u.order = null;
    u.path = null;
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
