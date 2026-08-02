import type { Vec2 } from "./camera";

export const GESTURE_TAP = "tap";
export const GESTURE_DRAG = "drag";
export const GESTURE_PINCH = "pinch";

export enum DragKind {
  Pan = "pan",
  Box = "box",
}

export interface PointData { start: Vec2; end: Vec2; }
export interface GestureResult {
  kind: "tap" | "drag" | "pinch";
  x: number; y: number;          // end position
  dx: number; dy: number;        // drag delta
  dragKind: DragKind | null;
  scale: number;                 // pinch scale (1 = unchanged)
  center: Vec2;                  // pinch center
}

const TAP_MAX_PX = 12;

export function classifyGesture(
  primary: PointData,
  secondary?: PointData,
): GestureResult {
  const dx = primary.end.x - primary.start.x;
  const dy = primary.end.y - primary.start.y;
  const dist = Math.hypot(dx, dy);

  if (secondary) {
    const startDist = Math.hypot(secondary.start.x - primary.start.x, secondary.start.y - primary.start.y);
    const endDist = Math.hypot(secondary.end.x - primary.end.x, secondary.end.y - primary.end.y);
    const scale = startDist === 0 ? 1 : endDist / startDist;
    return {
      kind: GESTURE_PINCH,
      x: primary.end.x,
      y: primary.end.y,
      dx: 0,
      dy: 0,
      dragKind: null,
      scale,
      center: { x: (primary.end.x + secondary.end.x) / 2, y: (primary.end.y + secondary.end.y) / 2 },
    };
  }

  if (dist <= TAP_MAX_PX) {
    return { kind: GESTURE_TAP, x: primary.end.x, y: primary.end.y, dx: 0, dy: 0, dragKind: null, scale: 1, center: { x: primary.end.x, y: primary.end.y } };
  }

  return { kind: GESTURE_DRAG, x: primary.end.x, y: primary.end.y, dx, dy, dragKind: DragKind.Pan, scale: 1, center: { x: primary.end.x, y: primary.end.y } };
}
