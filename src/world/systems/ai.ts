import type { Entity } from "../entity";
import type { World } from "../world";
import { foodUsed } from "../world";
import { BUILDINGS, trainQueue, placeFoundation, buildCost } from "./building";
import { UNIT_DEFS } from "../../content/units";
import { orderGather } from "./economy";
import { orderAttack } from "./combat";
import { setPath } from "./movement";

export type Difficulty = "easy" | "normal" | "hard";

const DIFF: Record<Difficulty, { waveCount: number; waveInterval: number; workerTarget: number }> = {
  easy: { waveCount: 3, waveInterval: 90, workerTarget: 3 },
  normal: { waveCount: 5, waveInterval: 60, workerTarget: 5 },
  hard: { waveCount: 8, waveInterval: 45, workerTarget: 7 },
};

export class AIController {
  timer = 0;
  waveTimer = 0;
  cfg: (typeof DIFF)["normal"];
  waveCount = 0;

  constructor(readonly faction: Entity["faction"], readonly w: World, private difficulty: Difficulty) {
    this.cfg = DIFF[difficulty];
  }

  get base(): Entity | null {
    for (const e of this.w.entities.values()) {
      if (e.faction === this.faction && !e.dead && (e.type === "town-hall" || e.type === "castle")) return e;
    }
    return null;
  }

  count(type: string): number {
    let n = 0;
    for (const e of this.w.entities.values()) {
      if (e.faction === this.faction && e.type === type && !e.dead) n++;
    }
    return n;
  }
}

export function updateAI(ai: AIController, w: World, dt: number): void {
  ai.timer += dt;
  ai.waveTimer += dt;
  const base = ai.base;
  if (!base) return;

  // Phase 1: economy — train workers up to target (spawned + queued), keep them gathering
  if (ai.count("worker") + base.queue.length < ai.cfg.workerTarget && canAfford(w, ai.faction, UNIT_DEFS.worker.cost)) {
    trainQueue(w, base, "worker");
  } else {
    for (const e of w.entities.values()) {
      if (e.kind === "unit" && e.type === "worker" && e.faction === ai.faction && !e.dead && !e.order) {
        assignGather(e, w);
      }
    }
  }

  // Phase 2: build farm then barracks once affordable
  if (ai.count("farm") < 1 && canAfford(w, ai.faction, buildCost("farm"))) {
    placeIfAble(ai, "farm", base.x - 4, base.y - 4);
  } else if (ai.count("barracks") < 1 && canAfford(w, ai.faction, buildCost("barracks"))) {
    placeIfAble(ai, "barracks", base.x - 4, base.y + 2);
  } else if (ai.count("farm") < 2 && foodUsed(w, ai.faction) >= w.foodCap[ai.faction] - 2 && canAfford(w, ai.faction, buildCost("farm"))) {
    placeIfAble(ai, "farm", base.x - 7, base.y - 4);
  }

  // Phase 2b: assign free workers to incomplete foundations (they appear before any worker exists)
  for (const b of w.entities.values()) {
    if (b.kind === "building" && b.faction === ai.faction && !b.dead && b.progress > 0 && b.progress < 1 && b.queue.length === 0) {
      const worker = pickBuilder(ai);
      if (!worker) break;
      worker.order = { type: "build", buildingId: b.id };
      worker.cargo = 0;
      worker.cargoType = null;
      setPath(worker, { x: b.x + 1, y: b.y + 1 }, w.map);
    }
  }

  // Phase 3: train footmen up to wave size (respecting food cap)
  const barracks = [...w.entities.values()].find(
    (e) => e.faction === ai.faction && e.type === "barracks" && !e.dead && e.progress >= 1,
  );
  if (barracks && ai.count("footman") < ai.cfg.waveCount + 2 && canAfford(w, ai.faction, UNIT_DEFS.footman.cost)) {
    if (foodUsed(w, ai.faction) < w.foodCap[ai.faction]) {
      trainQueue(w, barracks, "footman");
    }
  }

  // Phase 4: defense — respond to intruders near our buildings
  defend(ai, w);

  // Attack waves
  if (ai.waveTimer >= ai.cfg.waveInterval) {
    ai.waveTimer = 0;
    sendWave(ai, w);
  }
}

function canAfford(w: World, faction: Entity["faction"], cost: { gold: number; wood: number }): boolean {
  const pool = w.pools[faction];
  return pool.gold >= cost.gold && pool.wood >= cost.wood;
}

function pickBuilder(ai: AIController): Entity | null {
  const w = ai.w;
  const candidates = [...w.entities.values()].filter(
    (e) => e.kind === "unit" && e.type === "worker" && e.faction === ai.faction && !e.dead,
  );
  return (
    candidates.find((e) => !e.order) ??
    candidates.find((e) => !(e.order && e.order.type === "build")) ??
    null
  );
}

function placeIfAble(ai: AIController, type: string, tx: number, ty: number): void {
  const b = placeFoundation(ai.w, type, ai.faction, Math.round(tx), Math.round(ty));
  if (!b) return;
  const w = ai.w;
  const worker = pickBuilder(ai);
  if (worker) {
    worker.order = { type: "build", buildingId: b.id };
    worker.cargo = 0;
    worker.cargoType = null;
    setPath(worker, { x: b.x + 1, y: b.y + 1 }, w.map);
  }
}

function assignGather(e: Entity, w: World): void {
  const gold = [...w.resources.values()].find((r) => r.kind === "gold" && r.amount > 0);
  const wood = [...w.resources.values()].find((r) => r.kind === "wood" && r.amount > 0);
  const node = gold ?? wood;
  if (node) orderGather(e, node.id);
}

const DEFEND_RADIUS = 8; // tiles from any AI building

function defend(ai: AIController, w: World): void {
  const intruder = nearestIntruder(ai, w);
  if (!intruder) return;
  // pull up to 3 combat units that are idle or already attacking this intruder's area
  const defenders = [...w.entities.values()].filter(
    (e) => e.kind === "unit" && e.faction === ai.faction && !e.dead && e.type !== "worker"
      && (!e.order || (e.order.type === "attack" && e.order.targetId === intruder.id)),
  );
  for (const u of defenders.slice(0, 3)) {
    orderAttack(u, intruder.id);
  }
}

function nearestIntruder(ai: AIController, w: World): Entity | null {
  let best: Entity | null = null;
  let bestD = Infinity;
  for (const b of w.entities.values()) {
    if (b.kind !== "building" || b.faction !== ai.faction || b.dead) continue;
    for (const e of w.entities.values()) {
      if (e.faction === ai.faction || e.dead || e.kind === "projectile") continue;
      const d = Math.hypot(e.x - b.x, e.y - b.y);
      if (d < bestD && d <= DEFEND_RADIUS) { bestD = d; best = e; }
    }
  }
  return best;
}

function sendWave(ai: AIController, w: World): void {
  const combat = [...w.entities.values()].filter(
    (e) => e.kind === "unit" && e.faction === ai.faction && !e.dead && e.type !== "worker",
  );
  if (combat.length < ai.cfg.waveCount) return;
  const target = firstEnemyBuilding(w, ai.faction);
  if (!target) return;
  for (const u of combat.slice(0, ai.cfg.waveCount)) {
    orderAttack(u, target.id);
  }
  ai.waveCount++;
}

function firstEnemyBuilding(w: World, faction: Entity["faction"]): Entity | null {
  for (const e of w.entities.values()) {
    if (e.kind === "building" && e.faction !== faction && !e.dead) return e;
  }
  return null;
}
