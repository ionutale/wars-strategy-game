import type { World } from "../world/world";
import type { Camera } from "../core/camera";
import { drawBuilding, drawUnit, FACTION_COLORS } from "./sprites";
import { BUILDINGS } from "../world/systems/building";
import { UNIT_DEFS } from "../content/units";

const TILE = 1; // world coordinates are already in tile units; camera maps 1 unit -> zoom px

export function render(world: World, cam: Camera, ctx: CanvasRenderingContext2D, selected: Set<number>): void {
  ctx.clearRect(0, 0, cam.viewW, cam.viewH);
  drawTerrain(world, cam, ctx);
  drawResourceNodes(world, cam, ctx);
  for (const e of world.entities.values()) {
    if (e.kind === "projectile") continue;
    const s = cam.worldToScreen(e.x, e.y);
    if (s.x < -50 || s.y < -50 || s.x > cam.viewW + 50 || s.y > cam.viewH + 50) continue;
    if (e.kind === "unit") {
      drawUnit(ctx, e.type, e.faction, s.x, s.y, e.facing);
    } else {
      const def = BUILDINGS[e.type];
      const size = def.footprint * TILE * cam.zoom;
      drawBuilding(ctx, e.type, e.faction, s.x, s.y, size, e.progress);
    }
    if (selected.has(e.id)) drawSelection(ctx, s.x, s.y, (e.kind === "building" ? 1.2 : 0.7) * cam.zoom, cam.zoom);
    if (e.hp < e.maxHp) drawHpBar(ctx, s.x, s.y, e.hp / e.maxHp, (e.kind === "building" ? 2.4 : 1) * cam.zoom);
  }
  for (const p of world.entities.values()) {
    if (p.kind !== "projectile") continue;
    const s = cam.worldToScreen(p.x, p.y);
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(s.x, s.y, 0.18 * cam.zoom, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTerrain(world: World, cam: Camera, ctx: CanvasRenderingContext2D): void {
  const tl = cam.screenToWorld(0, 0);
  const br = cam.screenToWorld(cam.viewW, cam.viewH);
  const x0 = Math.max(0, Math.floor(tl.x));
  const y0 = Math.max(0, Math.floor(tl.y));
  const x1 = Math.min(world.map.w, Math.ceil(br.x));
  const y1 = Math.min(world.map.h, Math.ceil(br.y));
  ctx.fillStyle = "#2c5230";
  ctx.fillRect(0, 0, cam.viewW, cam.viewH);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const px = cam.worldToScreen(x, y);
      ctx.fillStyle = (x + y) % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)";
      ctx.fillRect(px.x, px.y, cam.zoom + 1, cam.zoom + 1);
      if (!world.map.walkable(x, y)) {
        ctx.fillStyle = "#1c3520";
        ctx.fillRect(px.x, px.y, cam.zoom + 1, cam.zoom + 1);
      }
    }
  }
}

function drawResourceNodes(world: World, cam: Camera, ctx: CanvasRenderingContext2D): void {
  for (const r of world.resources.values()) {
    const s = cam.worldToScreen(r.x, r.y);
    if (r.kind === "gold") {
      ctx.fillStyle = "#d4af37";
      ctx.beginPath();
      ctx.arc(s.x, s.y, 10 * cam.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#a3832b";
      ctx.beginPath();
      ctx.arc(s.x - 2, s.y - 2, 4 * cam.zoom, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#2e6b2e";
      ctx.beginPath();
      ctx.arc(s.x, s.y, 9 * cam.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#5b4027";
      ctx.fillRect(s.x - 1, s.y + 4, 2, 6 * cam.zoom);
    }
  }
}

function drawSelection(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, zoom: number): void {
  ctx.strokeStyle = "#9be0ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r * zoom, 0, Math.PI * 2);
  ctx.stroke();
}

function drawHpBar(ctx: CanvasRenderingContext2D, x: number, y: number, frac: number, w: number): void {
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(x - w / 2, y - 14, w, 4);
  ctx.fillStyle = frac > 0.5 ? "#4ade80" : frac > 0.25 ? "#fbbf24" : "#ef4444";
  ctx.fillRect(x - w / 2, y - 14, w * frac, 4);
}
