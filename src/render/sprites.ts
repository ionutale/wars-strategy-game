import type { Faction } from "../world/entity";

export const FACTION_COLORS: Record<Faction, { main: string; accent: string; dark: string }> = {
  blue: { main: "#4c8dff", accent: "#9be0ff", dark: "#1e40af" },
  red: { main: "#ff5d5d", accent: "#ffb3b3", dark: "#991b1b" },
};

export function drawUnit(ctx: CanvasRenderingContext2D, type: string, faction: Faction, x: number, y: number, facing: number): void {
  const c = FACTION_COLORS[faction];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(facing);
  ctx.fillStyle = c.main;
  switch (type) {
    case "worker":
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c.dark; ctx.fillRect(0, -1.5, 5, 3);
      break;
    case "footman":
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(0, -2, 7, 4);
      break;
    case "archer":
      ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-3, -4); ctx.lineTo(-3, 4); ctx.closePath(); ctx.fill();
      break;
    case "knight":
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(0, -2.5, 9, 5);
      break;
    case "mage":
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#c4b5fd"; ctx.fillRect(0, -2, 6, 4);
      break;
    case "priest":
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fef3c7"; ctx.fillRect(0, -2, 6, 4);
      break;
    case "catapult":
      ctx.fillRect(-4, -3, 10, 6); ctx.fillRect(0, -6, 2, 3);
      break;
  }
  ctx.restore();
}

export function drawBuilding(ctx: CanvasRenderingContext2D, type: string, faction: Faction, x: number, y: number, size: number, progress: number): void {
  const c = FACTION_COLORS[faction];
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = c.main;
  ctx.globalAlpha = 0.5 + 0.5 * progress;
  ctx.beginPath();
  ctx.roundRect(-size / 2, -size / 2, size, size, 3);
  ctx.fill();
  ctx.fillStyle = c.dark;
  ctx.beginPath();
  ctx.roundRect(-size / 2, -size / 2, size, size * 0.35, 3);
  ctx.fill();
  if (progress < 1) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#222";
    ctx.fillRect(-size / 2, -size / 2 - 4, size, 3);
    ctx.fillStyle = "#4ade80";
    ctx.fillRect(-size / 2, -size / 2 - 4, size * progress, 3);
  }
  ctx.restore();
}
