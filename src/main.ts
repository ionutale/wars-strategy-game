import { GameLoop } from "./core/loop";
import { Camera } from "./core/camera";
import { render } from "./render/renderer";
import { Hud } from "./ui/hud";
import { Minimap } from "./ui/minimap";
import { showMainMenu, showEndScreen } from "./ui/screens";
import { createSession, startCampaign, startSkirmish, handleCommand, Session } from "./state/session";
import { tickWorld } from "./state/update";
import { moveTo } from "./world/systems/movement";
import { orderAttack } from "./world/systems/combat";
import { sfx } from "./world/world";
import type { CommandName } from "./ui/hud";
import { MISSIONS } from "./content/missions";
import { saveProgress, loadProgress } from "./net/api";
import { startMusic, playSfx } from "./audio/audio";

declare global {
  interface Window {
    /** E2E test hook — exposes live game state for Playwright assertions. */
    __wars?: {
      session: Session;
      cam: Camera;
      tick: (dt: number) => void;
    };
  }
}

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const session: Session = createSession();

function resize(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  cam.viewW = canvas.width;
  cam.viewH = canvas.height;
}

const cam = new Camera(canvas.width, canvas.height);
window.addEventListener("resize", resize);
resize();

// --- pointer handling ---
let pointers = new Map<number, { startX: number; startY: number; lastX: number; lastY: number }>();
let pinchStartDist = 0;
let commandMode: "none" | "build" = "none";
let buildType = "farm";
let needsTarget: "attack" | "move" | null = null;
let outcomeSent = false;

canvas.addEventListener("pointerdown", (ev) => {
  pointers.set(ev.pointerId, { startX: ev.clientX, startY: ev.clientY, lastX: ev.clientX, lastY: ev.clientY });
  canvas.setPointerCapture(ev.pointerId);
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchStartDist = Math.hypot(a.lastX - b.lastX, a.lastY - b.lastY);
  }
});
canvas.addEventListener("pointermove", (ev) => {
  const p = pointers.get(ev.pointerId);
  if (!p) return;
  if (pointers.size === 2) {
    // pinch zoom about the midpoint of the two fingers
    p.lastX = ev.clientX;
    p.lastY = ev.clientY;
    const [a, b] = [...pointers.values()];
    const dist = Math.hypot(a.lastX - b.lastX, a.lastY - b.lastY);
    if (pinchStartDist > 0 && session.state === "playing") {
      const midX = (a.lastX + b.lastX) / 2;
      const midY = (a.lastY + b.lastY) / 2;
      cam.setZoom(cam.zoom * (dist / pinchStartDist), midX, midY);
      cam.clampToMap(session.world.map.w, session.world.map.h);
    }
    pinchStartDist = dist;
    return;
  }
  const dx = ev.clientX - p.lastX;
  const dy = ev.clientY - p.lastY;
  if (pointers.size === 1 && session.state === "playing") {
    const total = Math.hypot(ev.clientX - p.startX, ev.clientY - p.startY);
    if (total > 12 && commandMode !== "build") {
      cam.panScreen(dx, dy);
      cam.clampToMap(session.world.map.w, session.world.map.h);
    }
  }
  p.lastX = ev.clientX;
  p.lastY = ev.clientY;
});
canvas.addEventListener("pointerup", (ev) => {
  const p = pointers.get(ev.pointerId);
  if (!p) return;
  pointers.delete(ev.pointerId);
  if (session.state !== "playing") return;
  const total = Math.hypot(ev.clientX - p.startX, ev.clientY - p.startY);
  if (total > 12) return; // drag (pan) — not a tap
  handleTap(ev.clientX, ev.clientY);
});
canvas.addEventListener("pointercancel", (ev) => pointers.delete(ev.pointerId));
canvas.addEventListener("contextmenu", (ev) => ev.preventDefault());

function handleTap(sx: number, sy: number): void {
  const w = session.world;
  const worldPt = cam.screenToWorld(sx, sy);
  // 1) building placement
  if (commandMode === "build" && session.selected.size === 1) {
    const worker = w.entities.get([...session.selected][0]);
    if (worker && worker.type === "worker") {
      const tx = Math.floor(worldPt.x - 0.5);
      const ty = Math.floor(worldPt.y - 0.5);
      session.placement = { tx, ty };
      handleCommand(session, `build-${buildType}` as CommandName, worker);
      commandMode = "none";
    }
    return;
  }
  // 2) targeting for attack/move
  if (needsTarget) {
    const hit = pickEntity(worldPt.x, worldPt.y);
    const sel = [...session.selected][0];
    if (sel) {
      const e = w.entities.get(sel)!;
      if (needsTarget === "attack") {
        if (hit && hit.faction !== e.faction) {
          orderAttack(e, hit.id);
        } else {
          moveTo(e, { x: worldPt.x, y: worldPt.y }, w.map);
        }
      } else {
        if (hit && hit.faction === e.faction) { /* ignore friendly */ }
        else {
          moveTo(e, { x: worldPt.x, y: worldPt.y }, w.map);
          if (hit && hit.faction !== e.faction) orderAttack(e, hit.id);
        }
      }
    }
    needsTarget = null;
    return;
  }
  // 3) selection
  const hit = pickEntity(worldPt.x, worldPt.y);
  session.selected.clear();
  if (hit) {
    if (hit.faction === "blue") {
      session.selected.add(hit.id);
      sfx(session.world, "select");
    }
  }
}

function pickEntity(wx: number, wy: number): import("./world/entity").Entity | null {
  let best: import("./world/entity").Entity | null = null;
  let bestD = 0.6;
  for (const e of session.world.entities.values()) {
    if (e.dead || e.kind === "projectile") continue;
    const d = Math.hypot(e.x - wx, e.y - wy);
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}

// --- HUD wiring ---
const hud = new Hud({
  onCommand: (cmd: CommandName, e) => {
    if (session.state !== "playing") return;
    if (cmd === "attack") { needsTarget = "attack"; return; }
    if (cmd === "move") { needsTarget = "move"; return; }
    if (cmd.startsWith("build-")) {
      buildType = cmd.replace("build-", "");
      commandMode = "build";
      session.placement = null;
      return;
    }
    handleCommand(session, cmd, e);
  },
  onSelectAll: () => {
    if (session.state !== "playing") return;
    session.selected.clear();
    for (const ent of session.world.entities.values()) {
      if (ent.kind === "unit" && ent.faction === "blue" && ent.type !== "worker" && !ent.dead) session.selected.add(ent.id);
    }
  },
  onPause: () => { /* pause via loop stop in v1 */ },
});

const minimap = new Minimap(cam, (fx, fy) => {
  const w = session.world;
  cam.x = fx * w.map.w;
  cam.y = fy * w.map.h;
  cam.clampToMap(w.map.w, w.map.h);
});

// --- loop ---
const loop = new GameLoop({
  tick: (dt) => {
    if (session.state === "playing") tickWorld(session, dt);
  },
  render: () => {
    if (session.state === "playing" || session.state === "victory" || session.state === "defeat") {
      render(session.world, cam, ctx, session.selected);
      minimap.draw(session.world);
    }
    const sel = [...session.selected].map((id) => session.world.entities.get(id)).filter(Boolean) as import("./world/entity").Entity[];
    hud.update(session.world, sel);
  },
});

// --- menu wiring ---
let endCleanup: (() => void) | null = null;

/** Fit the whole map in the viewport after starting a game. */
function fitCameraToMap(): void {
  const w = session.world;
  cam.zoom = cam.fitZoomToMap(w.map.w, w.map.h);
  cam.x = w.map.w / 2;
  cam.y = w.map.h / 2;
  cam.clampToMap(w.map.w, w.map.h);
}

showMainMenu({
  onCampaign: () => {
    startMusic();
    startCampaign(session);
    fitCameraToMap();
    if (endCleanup) endCleanup();
    loop.start();
  },
  onSkirmish: (d) => {
    startMusic();
    startSkirmish(session, d);
    fitCameraToMap();
    if (endCleanup) endCleanup();
    loop.start();
  },
});

// --- victory/defeat polling ---
setInterval(() => {
  if ((session.state === "victory" || session.state === "defeat") && !endCleanup) {
    if (!outcomeSent && (session.state === "victory" || session.state === "defeat")) {
      outcomeSent = true;
      const wasVictory = session.state === "victory";
      const wasCampaign = session.mode === "campaign";
      void (async () => {
        const prev = (await loadProgress()) ?? { campaign: {}, skirmish: { wins: 0, losses: 0 } };
        if (wasCampaign) {
          if (wasVictory) prev.campaign[`m${session.missionIndex + 1}`] = "won"; // m1..m5, missionIndex is 0-based
        } else if (wasVictory) {
          prev.skirmish.wins += 1;
        } else {
          prev.skirmish.losses += 1;
        }
        void saveProgress(prev);
      })();
    }
    loop.stop();
    playSfx(session.state === "victory" ? "victory" : "defeat");
    const title = session.state === "victory" ? "VICTORY" : "DEFEAT";
    const wasVictory = session.state === "victory";
    endCleanup = showEndScreen(title, "", () => {
      endCleanup?.();
      endCleanup = null;
      outcomeSent = false;
      if (wasVictory && session.mode === "campaign" && session.missionIndex + 1 < MISSIONS.length) {
        session.missionIndex++;
        startCampaign(session);
      } else if (session.mode === "skirmish") {
        startSkirmish(session, session.difficulty);
      } else if (wasVictory) {
        location.reload(); // campaign complete — back to menu
      } else {
        startCampaign(session); // campaign defeat — replay the mission
      }
      loop.start();
    }, () => {
      endCleanup?.();
      endCleanup = null;
      location.reload();
    });
  }
}, 250);

// --- E2E test hook ---
window.__wars = {
  session,
  cam,
  tick: (dt: number) => tickWorld(session, dt),
};
