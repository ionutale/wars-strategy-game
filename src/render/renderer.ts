import type { World } from "../world/world";
import type { Camera } from "../core/camera";
import { PX_PER_TILE } from "../core/camera";
import { drawBuilding, drawUnit } from "./sprites";
import { BUILDINGS } from "../world/systems/building";
import { UNIT_DEFS } from "../content/units";

/** Pixels per tile on screen at the current zoom. */
function S(cam: Camera): number {
  return PX_PER_TILE * cam.zoom;
}

export function render(world: World, cam: Camera, ctx: CanvasRenderingContext2D, selected: Set<number>): void {
  const pxPerTile = S(cam);
  const margin = 100;
  ctx.clearRect(0, 0, cam.viewW, cam.viewH);
  drawTerrain(world, cam, ctx);
  drawResourceNodes(world, cam, ctx);
  for (const e of world.entities.values()) {
    if (e.kind === "projectile" || e.dead) continue;
    const s = cam.worldToScreen(e.x, e.y);
    if (s.x < -margin || s.y < -margin || s.x > cam.viewW + margin || s.y > cam.viewH + margin) continue;
    if (e.kind === "unit") {
      drawUnit(ctx, e.type, e.faction, s.x, s.y, e.facing, pxPerTile / 14);
    } else {
      const def = BUILDINGS[e.type];
      const size = def.footprint * pxPerTile;
      drawBuilding(ctx, e.type, e.faction, s.x, s.y, size, e.progress);
    }
    if (selected.has(e.id)) drawSelection(ctx, s.x, s.y, (e.kind === "building" ? 1.3 : 0.9) * pxPerTile);
    if (e.hp < e.maxHp) drawHpBar(ctx, s.x, s.y, e.hp / e.maxHp, (e.kind === "building" ? 2.2 : 1) * pxPerTile);
    if (selected.has(e.id)) {
      const range = e.kind === "unit" ? UNIT_DEFS[e.type].range : BUILDINGS[e.type].canAttack ? BUILDINGS[e.type].range : 0;
      if (range > 1.2) drawRangeRing(ctx, s.x, s.y, range * pxPerTile);
    }
  }
  for (const p of world.entities.values()) {
    if (p.kind !== "projectile" || p.dead) continue;
    const s = cam.worldToScreen(p.x, p.y);
    const splash = p.splashRadius > 0;
    ctx.fillStyle = splash ? (p.splashRadius > 1.5 ? "#f97316" : "#c084fc") : "#fbbf24";
    ctx.beginPath();
    ctx.arc(s.x, s.y, (splash ? 0.18 : 0.09) * pxPerTile, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRangeRing(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.fillStyle = "rgba(155,224,255,0.10)";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(155,224,255,0.45)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

export function renderBuildPreview(world: World, cam: Camera, ctx: CanvasRenderingContext2D, type: string, tx: number, ty: number, valid: boolean): void {
  const def = BUILDINGS[type];
  const p = cam.worldToScreen(tx, ty);
  const size = def.footprint * PX_PER_TILE * cam.zoom;
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = valid ? "#4ade80" : "#ef4444";
  ctx.fillRect(p.x, p.y, size, size);
  ctx.restore();
}

function drawTerrain(world: World, cam: Camera, ctx: CanvasRenderingContext2D): void {
  const tl = cam.screenToWorld(0, 0);
  const br = cam.screenToWorld(cam.viewW, cam.viewH);
  const x0 = Math.max(0, Math.floor(tl.x));
  const y0 = Math.max(0, Math.floor(tl.y));
  const x1 = Math.min(world.map.w, Math.ceil(br.x));
  const y1 = Math.min(world.map.h, Math.ceil(br.y));
  const pxPerTile = S(cam);
  ctx.fillStyle = "#2c5230";
  ctx.fillRect(0, 0, cam.viewW, cam.viewH);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const px = cam.worldToScreen(x, y);
      ctx.fillStyle = (x + y) % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)";
      ctx.fillRect(px.x, px.y, pxPerTile + 1, pxPerTile + 1);
      if (!world.map.walkable(x, y)) {
        ctx.fillStyle = "#1c3520";
        ctx.fillRect(px.x, px.y, pxPerTile + 1, pxPerTile + 1);
      }
    }
  }
}

function drawResourceNodes(world: World, cam: Camera, ctx: CanvasRenderingContext2D): void {
  const pxPerTile = S(cam);
  for (const r of world.resources.values()) {
    const s = cam.worldToScreen(r.x, r.y);
    if (r.kind === "gold") {
      ctx.fillStyle = "#d4af37";
      ctx.beginPath();
      ctx.arc(s.x, s.y, 0.32 * pxPerTile, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#a3832b";
      ctx.beginPath();
      ctx.arc(s.x - 0.06 * pxPerTile, s.y - 0.06 * pxPerTile, 0.12 * pxPerTile, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#2e6b2e";
      ctx.beginPath();
      ctx.arc(s.x, s.y, 0.28 * pxPerTile, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#5b4027";
      ctx.fillRect(s.x - 0.03 * pxPerTile, s.y + 0.12 * pxPerTile, 0.06 * pxPerTile, 0.18 * pxPerTile);
    }
  }
}

function drawSelection(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.strokeStyle = "#9be0ff";
  ctx.lineWidth = Math.max(1.5, r / 12);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

function drawHpBar(ctx: CanvasRenderingContext2D, x: number, y: number, frac: number, w: number): void {
  const h = Math.max(3, w / 8);
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(x - w / 2, y - w / 2 - h, w, h);
  ctx.fillStyle = frac > 0.5 ? "#4ade80" : frac > 0.25 ? "#fbbf24" : "#ef4444";
  ctx.fillRect(x - w / 2, y - w / 2 - h, w * frac, h);
}
