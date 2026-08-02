import type { Entity, Faction } from "./entity";
import type { MapData, ResourceNode } from "./map";
import { createMap } from "./map";

export type SfxName = "select" | "command" | "attack" | "hit" | "death" | "build" | "gather" | "upgrade" | "victory" | "defeat";

export interface GameEvent {
  kind: "sfx";
  name: SfxName;
}

export interface World {
  entities: Map<number, Entity>;
  resources: Map<number, ResourceNode>;
  map: MapData;
  pools: { blue: { gold: number; wood: number }; red: { gold: number; wood: number } };
  foodCap: { blue: number; red: number };
  time: number;
  events: GameEvent[];
  victory: boolean;
  defeat: boolean;
}

export function createWorld(w: number, h: number, startGold = 1200, startWood = 800): World {
  return {
    entities: new Map(),
    resources: new Map(),
    map: createMap(w, h),
    pools: {
      blue: { gold: startGold, wood: startWood },
      red: { gold: startGold, wood: startWood },
    },
    foodCap: { blue: 5, red: 5 }, // town halls provide this base capacity
    time: 0,
    events: [],
    victory: false,
    defeat: false,
  };
}

export function sfx(w: World, name: SfxName): void {
  w.events.push({ kind: "sfx", name });
}

/** Units consume food; town halls/castles provide the base cap and farms raise it. Per faction. */
export function foodUsed(w: World, faction: Faction): number {
  let n = 0;
  for (const e of w.entities.values()) {
    if (e.dead || e.kind === "projectile" || e.faction !== faction) continue;
    if (e.kind === "unit") n += 1;
  }
  return n;
}

export function drainEvents(w: World): GameEvent[] {
  const out = w.events;
  w.events = [];
  return out;
}
