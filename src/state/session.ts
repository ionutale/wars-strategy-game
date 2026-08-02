import type { World } from "../world/world";
import { createWorld } from "../world/world";
import type { Entity } from "../world/entity";
import { createEntity } from "../world/entity";
import { createGoldMine, createTreePatch } from "../world/map";
import type { MissionDef } from "../content/missions";
import { MISSIONS } from "../content/missions";
import { BUILDINGS } from "../world/systems/building";
import { trainQueue, placeFoundation } from "../world/systems/building";
import { UNIT_DEFS } from "../content/units";
import { orderGather } from "../world/systems/economy";
import { moveTo } from "../world/systems/movement";
import type { Difficulty } from "../world/systems/ai";
import { AIController } from "../world/systems/ai";
import type { CommandName } from "../ui/hud";

export type SessionState = "menu" | "campaign" | "skirmish" | "playing" | "victory" | "defeat";

export interface Session {
  state: SessionState;
  world: World;
  selected: Set<number>;
  missionIndex: number;
  mission: MissionDef | null;
  difficulty: Difficulty;
  ai: AIController | null;
  victory: boolean;
  mode: "campaign" | "skirmish";
  placement: { tx: number; ty: number } | null;
}

export function createSession(): Session {
  return {
    state: "menu",
    world: createWorld(40, 30),
    selected: new Set(),
    missionIndex: 0,
    mission: null,
    difficulty: "normal",
    ai: null,
    victory: false,
    mode: "campaign",
    placement: null,
  };
}

export function buildMissionWorld(m: MissionDef): World {
  const w = createWorld(m.mapW, m.mapH, m.startGold, m.startWood);
  for (const r of m.resources) {
    const node = r.kind === "gold" ? createGoldMine(r.x, r.y, r.amount) : createTreePatch(r.x, r.y, r.amount);
    w.resources.set(node.id, node);
  }
  for (const b of m.playerBuildings) spawnBuilding(w, "blue", b.type, b.x, b.y);
  for (const b of m.enemyBuildings) spawnBuilding(w, "red", b.type, b.x, b.y);
  for (const u of m.playerUnits) {
    const def = UNIT_DEFS[u.type];
    const e = createEntity("unit", "blue", u.type, u.x, u.y, def.hp);
    w.entities.set(e.id, e);
  }
  // starting workers auto-gather
  for (const e of w.entities.values()) {
    if (e.kind === "unit" && e.type === "worker") {
      const gold = [...w.resources.values()].find((r) => r.kind === "gold");
      if (gold) orderGather(e, gold.id);
    }
  }
  return w;
}

function spawnBuilding(w: World, faction: Entity["faction"], type: string, tx: number, ty: number): void {
  const def = BUILDINGS[type];
  const b = createEntity("building", faction, type, tx + def.footprint / 2, ty + def.footprint / 2, def.hp);
  b.progress = 1;
  b.hp = def.hp;
  w.entities.set(b.id, b);
  w.foodCap[faction] += def.foodBonus;
}

export function startCampaign(s: Session): void {
  s.state = "campaign";
  startMission(s, MISSIONS[s.missionIndex]);
}

export function startSkirmish(s: Session, difficulty: Difficulty): void {
  s.state = "skirmish";
  s.difficulty = difficulty;
  s.mode = "skirmish";
  const m = skirmishMap();
  s.mission = m;
  s.world = buildMissionWorld(m);
  s.ai = new AIController("red", s.world, difficulty);
  s.selected.clear();
  s.state = "playing";
}

function skirmishMap(): MissionDef {
  return {
    id: "skirmish",
    title: "Skirmish",
    intro: "",
    mapW: 60, mapH: 45,
    startGold: 1200, startWood: 800,
    playerUnits: [{ type: "worker", x: 6, y: 8 }, { type: "worker", x: 7, y: 8 }, { type: "worker", x: 6, y: 9 }],
    playerBuildings: [{ type: "town-hall", x: 8, y: 8 }, { type: "farm", x: 5, y: 8 }],
    enemyBuildings: [{ type: "town-hall", x: 50, y: 36 }, { type: "farm", x: 47, y: 36 }],
    resources: [
      { kind: "gold", x: 4, y: 14, amount: 1500 },
      { kind: "gold", x: 52, y: 30, amount: 1500 },
      { kind: "wood", x: 12, y: 4, amount: 150 },
      { kind: "wood", x: 46, y: 40, amount: 150 },
      { kind: "gold", x: 28, y: 20, amount: 1000 },
    ],
    win: { kind: "destroy-enemy" },
    lose: { kind: "base-lost" },
  };
}

export function startMission(s: Session, m: MissionDef): void {
  s.mission = m;
  s.mode = "campaign";
  s.world = buildMissionWorld(m);
  s.ai = new AIController("red", s.world, "normal");
  s.selected.clear();
  s.victory = false;
  s.state = "playing";
}

export function handleCommand(s: Session, cmd: CommandName, e: Entity): void {
  const w = s.world;
  switch (cmd) {
    case "stop": e.order = { type: "stop" }; e.path = null; break;
    case "hold": e.order = { type: "hold" }; e.path = null; break;
    case "gather-gold": {
      const node = nearestResource(w, e, "gold");
      if (node) orderGather(e, node.id);
      break;
    }
    case "gather-wood": {
      const node = nearestResource(w, e, "wood");
      if (node) orderGather(e, node.id);
      break;
    }
    case "build-farm":
    case "build-barracks":
    case "build-tower":
    case "build-lumber-mill":
    case "build-blacksmith":
    case "build-stables":
    case "build-church":
    case "build-castle": {
      const type = cmd.replace("build-", "");
      if (s.placement) {
        placeWithWorker(w, e, type, s.placement.tx, s.placement.ty);
      }
      break;
    }
    case "train-worker":
    case "train-footman":
    case "train-archer":
    case "train-knight":
    case "train-mage":
    case "train-priest":
    case "train-catapult": {
      if (e.kind === "building") {
        const unitType = cmd.replace("train-", "");
        trainQueue(w, e, unitType);
      }
      break;
    }
  }
}

function placeWithWorker(w: World, worker: Entity, type: string, tx: number, ty: number): void {
  const b = placeFoundation(w, type, worker.faction, tx, ty);
  if (b) {
    worker.path = null;
    moveTo(worker, { x: b.x + 1, y: b.y + 1 }, w.map);
    worker.order = { type: "build", buildingId: b.id };
  }
}

function nearestResource(w: World, u: Entity, kind: "gold" | "wood"): import("../world/map").ResourceNode | null {
  let best: import("../world/map").ResourceNode | null = null;
  let bestD = Infinity;
  for (const r of w.resources.values()) {
    if (r.kind !== kind || r.amount <= 0) continue;
    const d = Math.hypot(r.x - u.x, r.y - u.y);
    if (d < bestD) { bestD = d; best = r; }
  }
  return best;
}
