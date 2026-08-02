import type { Vec2 } from "../../core/camera";
import type { MapData } from "../map";
import { findPath } from "../map";
import type { Entity } from "../entity";
import type { World } from "../world";

export const UNIT_SPEED = 6; // tiles per second
export const PUSH_APART = 0.35;

/** Set a path without touching `order` — used by systems that keep their own order (e.g. gather). */
export function setPath(u: Entity, target: Vec2, map: MapData): void {
  const path = findPath(map, { x: u.x, y: u.y }, target);
  u.path = path ?? [target];
  u.pathIndex = 0;
}

/** Order a plain move: sets both the order and the path. */
export function moveTo(u: Entity, target: Vec2, map: MapData): void {
  setPath(u, target, map);
  u.order = { type: "move", x: target.x, y: target.y };
}

export function updateMovement(w: World, dt: number): void {
  const units = [...w.entities.values()].filter((e) => e.kind === "unit" && !e.dead);
  for (const u of units) {
    if (!u.path || u.path.length === 0) {
      if (u.path !== null) { u.path = null; u.order = null; }
      continue;
    }
    let remaining = UNIT_SPEED * dt;
    while (u.path && u.pathIndex < u.path.length && remaining > 0) {
      const target = u.path[u.pathIndex];
      const dx = target.x - u.x;
      const dy = target.y - u.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= remaining) {
        u.x = target.x;
        u.y = target.y;
        remaining -= dist;
        u.pathIndex++;
        if (u.pathIndex >= u.path.length) {
          u.path = null;
          if (u.order && (u.order.type === "move" || u.order.type === "attackMove")) u.order = null;
        }
      } else {
        u.x += (dx / dist) * remaining;
        u.y += (dy / dist) * remaining;
        u.facing = Math.atan2(dy, dx);
        remaining = 0;
      }
    }
  }
  // Only separate idle units (no active path). Units following a path are
  // moving toward a target; shoving them around cancels their movement and
  // jams them in clusters (e.g. workers at a mine).
  separateUnits(units.filter((u) => u.path === null));
}

export function separateUnits(units: Entity[]): void {
  for (let i = 0; i < units.length; i++) {
    for (let j = i + 1; j < units.length; j++) {
      const a = units[i];
      const b = units[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = 0.5;
      if (d > 0 && d < min) {
        const push = (min - d) / 2;
        const nx = dx / d;
        const ny = dy / d;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
      }
    }
  }
}
