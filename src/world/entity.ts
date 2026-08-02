export type Faction = "blue" | "red";
export type EntityKind = "unit" | "building" | "projectile";

export type Order =
  | { type: "move"; x: number; y: number }
  | { type: "attack"; targetId: number }
  | { type: "attackMove"; x: number; y: number }
  | { type: "gather"; resourceId: number }
  | { type: "build"; buildingId: number }
  | { type: "hold" }
  | { type: "stop" };

export interface Entity {
  id: number;
  kind: EntityKind;
  faction: Faction;
  type: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  order: Order | null;
  path: { x: number; y: number }[] | null;
  pathIndex: number;
  targetId: number | null;
  attackCooldown: number;
  cargo: number;
  cargoType: "gold" | "wood" | null;
  progress: number;
  queue: string[];
  facing: number;
  dead: boolean;
}

let nextId = 1;

export function createEntity(
  kind: EntityKind,
  faction: Faction,
  type: string,
  x: number,
  y: number,
  maxHp = 1,
): Entity {
  return {
    id: nextId++,
    kind,
    faction,
    type,
    x,
    y,
    hp: maxHp,
    maxHp,
    order: null,
    path: null,
    pathIndex: 0,
    targetId: null,
    attackCooldown: 0,
    cargo: 0,
    cargoType: null,
    progress: 0,
    queue: [],
    facing: 0,
    dead: false,
  };
}

export function isUnit(e: Entity): boolean { return e.kind === "unit"; }
export function isBuilding(e: Entity): boolean { return e.kind === "building"; }
