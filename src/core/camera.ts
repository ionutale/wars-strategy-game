export interface Vec2 { x: number; y: number; }

/** Screen pixels per world tile at zoom = 1. */
export const PX_PER_TILE = 32;

export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 3;

export class Camera {
  x = 0;
  y = 0;
  zoom = 1;

  constructor(public viewW: number, public viewH: number) {}

  worldToScreen(wx: number, wy: number): Vec2 {
    return { x: (wx - this.x) * this.zoom * PX_PER_TILE + this.viewW / 2, y: (wy - this.y) * this.zoom * PX_PER_TILE + this.viewH / 2 };
  }

  screenToWorld(sx: number, sy: number): Vec2 {
    return { x: (sx - this.viewW / 2) / (this.zoom * PX_PER_TILE) + this.x, y: (sy - this.viewH / 2) / (this.zoom * PX_PER_TILE) + this.y };
  }

  panScreen(dx: number, dy: number): void {
    this.x -= dx / (this.zoom * PX_PER_TILE);
    this.y -= dy / (this.zoom * PX_PER_TILE);
  }

  setZoom(z: number, sx: number, sy: number): void {
    const world = this.screenToWorld(sx, sy);
    this.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
    this.x = world.x - (sx - this.viewW / 2) / (this.zoom * PX_PER_TILE);
    this.y = world.y - (sy - this.viewH / 2) / (this.zoom * PX_PER_TILE);
  }

  clampToMap(mapW: number, mapH: number): void {
    const halfW = this.viewW / (2 * this.zoom * PX_PER_TILE);
    const halfH = this.viewH / (2 * this.zoom * PX_PER_TILE);
    // When the map is smaller than the viewport, center on it instead of
    // producing inverted clamp bounds.
    if (2 * halfW >= mapW) this.x = mapW / 2;
    else this.x = Math.min(mapW - halfW, Math.max(halfW, this.x));
    if (2 * halfH >= mapH) this.y = mapH / 2;
    else this.y = Math.min(mapH - halfH, Math.max(halfH, this.y));
  }

  /** Zoom that fits the whole map in the viewport, clamped to [MIN_ZOOM, MAX_ZOOM]. */
  fitZoomToMap(mapW: number, mapH: number): number {
    const fit = Math.min(this.viewW / (mapW * PX_PER_TILE), this.viewH / (mapH * PX_PER_TILE));
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, fit));
  }
}
