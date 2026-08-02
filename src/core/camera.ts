export interface Vec2 { x: number; y: number; }

export const MIN_ZOOM = 0.8;
export const MAX_ZOOM = 2;

export class Camera {
  x = 0;
  y = 0;
  zoom = 1;

  constructor(public viewW: number, public viewH: number) {}

  worldToScreen(wx: number, wy: number): Vec2 {
    return { x: (wx - this.x) * this.zoom + this.viewW / 2, y: (wy - this.y) * this.zoom + this.viewH / 2 };
  }

  screenToWorld(sx: number, sy: number): Vec2 {
    return { x: (sx - this.viewW / 2) / this.zoom + this.x, y: (sy - this.viewH / 2) / this.zoom + this.y };
  }

  panScreen(dx: number, dy: number): void {
    this.x -= dx / this.zoom;
    this.y -= dy / this.zoom;
  }

  setZoom(z: number, sx: number, sy: number): void {
    const world = this.screenToWorld(sx, sy);
    this.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
    this.x = world.x - (sx - this.viewW / 2) / this.zoom;
    this.y = world.y - (sy - this.viewH / 2) / this.zoom;
  }

  clampToMap(mapW: number, mapH: number): void {
    const halfW = this.viewW / (2 * this.zoom);
    const halfH = this.viewH / (2 * this.zoom);
    this.x = Math.min(mapW - halfW, Math.max(halfW, this.x));
    this.y = Math.min(mapH - halfH, Math.max(halfH, this.y));
  }
}
