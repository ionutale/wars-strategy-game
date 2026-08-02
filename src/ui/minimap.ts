import type { World } from "../world/world";
import type { Camera } from "../core/camera";
import { el, injectStyles } from "./dom";

injectStyles(`
  .minimap { position: fixed; right: 8px; bottom: 8px; width: 120px; height: 90px; border: 1px solid #4a6741; border-radius: 4px; background: #0f2a12; pointer-events: auto; }
  .minimap canvas { width: 100%; height: 100%; display: block; }
`);

export class Minimap {
  private canvas = el("canvas");
  private ctx: CanvasRenderingContext2D;
  private root = el("div", "minimap");

  constructor(private cam: Camera, private onJump: (wx: number, wy: number) => void) {
    this.canvas.width = 120;
    this.canvas.height = 90;
    this.ctx = this.canvas.getContext("2d")!;
    this.root.appendChild(this.canvas);
    document.body.appendChild(this.root);
    this.root.addEventListener("pointerdown", (ev) => {
      ev.stopPropagation();
      const rect = this.root.getBoundingClientRect();
      const fx = (ev.clientX - rect.left) / rect.width;
      const fy = (ev.clientY - rect.top) / rect.height;
      this.onJump(fx, fy);
    });
  }

  draw(world: World): void {
    const { ctx, canvas } = this;
    ctx.fillStyle = "#0f2a12";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const r of world.resources.values()) {
      ctx.fillStyle = r.kind === "gold" ? "#d4af37" : "#2e6b2e";
      ctx.fillRect(px(r.x, world.map.w, canvas.width), py(r.y, world.map.h, canvas.height), 2, 2);
    }
    for (const e of world.entities.values()) {
      if (e.dead || e.kind === "projectile") continue;
      ctx.fillStyle = e.faction === "blue" ? "#4c8dff" : "#ff5d5d";
      ctx.fillRect(px(e.x, world.map.w, canvas.width), py(e.y, world.map.h, canvas.height), 2, 2);
    }
    // camera viewport
    ctx.strokeStyle = "#9be0ff";
    const halfW = this.cam.viewW / (2 * this.cam.zoom);
    const halfH = this.cam.viewH / (2 * this.cam.zoom);
    ctx.strokeRect(
      px(this.cam.x - halfW, world.map.w, canvas.width),
      py(this.cam.y - halfH, world.map.h, canvas.height),
      (halfW * 2 / world.map.w) * canvas.width,
      (halfH * 2 / world.map.h) * canvas.height,
    );
  }
}

function px(wx: number, mapW: number, cw: number): number {
  return (wx / mapW) * cw;
}
function py(wy: number, mapH: number, ch: number): number {
  return (wy / mapH) * ch;
}
