export type WinCondition =
  | { kind: "destroy-enemy" }
  | { kind: "survive"; seconds: number };

export type LoseCondition =
  | { kind: "base-lost" }
  | { kind: "timeout"; seconds: number };

export interface MissionDef {
  id: string;
  title: string;
  intro: string;
  mapW: number;
  mapH: number;
  startGold: number;
  startWood: number;
  playerUnits: { type: string; x: number; y: number }[];
  playerBuildings: { type: string; x: number; y: number }[];
  enemyBuildings: { type: string; x: number; y: number }[];
  resources: { kind: "gold" | "wood"; x: number; y: number; amount: number }[];
  win: WinCondition;
  lose: LoseCondition;
}

export const MISSIONS: MissionDef[] = [
  {
    id: "m1",
    title: "First Steps",
    intro: "A small outpost has been established. Build a barracks, train five footmen, and destroy the enemy outpost to the east.",
    mapW: 40, mapH: 30,
    startGold: 1500, startWood: 900,
    playerUnits: [{ type: "worker", x: 6, y: 8 }, { type: "worker", x: 7, y: 8 }, { type: "footman", x: 9, y: 8 }],
    playerBuildings: [{ type: "town-hall", x: 8, y: 8 }, { type: "farm", x: 5, y: 8 }],
    enemyBuildings: [{ type: "town-hall", x: 30, y: 8 }, { type: "barracks", x: 32, y: 10 }],
    resources: [
      { kind: "gold", x: 4, y: 12, amount: 1500 },
      { kind: "wood", x: 12, y: 4, amount: 100 },
      { kind: "wood", x: 10, y: 14, amount: 100 },
    ],
    win: { kind: "destroy-enemy" },
    lose: { kind: "base-lost" },
  },
  {
    id: "m2",
    title: "Hold the Line",
    intro: "Enemy raiders approach from the north. Survive for eight minutes. Build towers and train archers.",
    mapW: 40, mapH: 30,
    startGold: 1800, startWood: 1200,
    playerUnits: [{ type: "worker", x: 6, y: 8 }, { type: "worker", x: 7, y: 8 }, { type: "footman", x: 9, y: 8 }, { type: "archer", x: 10, y: 8 }],
    playerBuildings: [{ type: "town-hall", x: 8, y: 8 }, { type: "farm", x: 5, y: 8 }, { type: "barracks", x: 11, y: 10 }],
    enemyBuildings: [{ type: "town-hall", x: 20, y: 2 }],
    resources: [
      { kind: "gold", x: 4, y: 12, amount: 2000 },
      { kind: "wood", x: 12, y: 4, amount: 150 },
    ],
    win: { kind: "survive", seconds: 8 * 60 },
    lose: { kind: "base-lost" },
  },
  {
    id: "m3",
    title: "The Armory",
    intro: "Upgrade your forces. Build a lumber mill and blacksmith, research attack upgrades, and crush the enemy garrison.",
    mapW: 50, mapH: 40,
    startGold: 2000, startWood: 1400,
    playerUnits: [{ type: "worker", x: 6, y: 8 }, { type: "worker", x: 7, y: 8 }, { type: "worker", x: 6, y: 9 }, { type: "footman", x: 9, y: 8 }, { type: "archer", x: 10, y: 8 }],
    playerBuildings: [{ type: "town-hall", x: 8, y: 8 }, { type: "farm", x: 5, y: 8 }, { type: "barracks", x: 11, y: 10 }],
    enemyBuildings: [{ type: "town-hall", x: 38, y: 8 }, { type: "barracks", x: 36, y: 6 }, { type: "tower", x: 40, y: 10 }],
    resources: [
      { kind: "gold", x: 4, y: 12, amount: 2500 },
      { kind: "wood", x: 12, y: 4, amount: 200 },
      { kind: "wood", x: 14, y: 16, amount: 150 },
    ],
    win: { kind: "destroy-enemy" },
    lose: { kind: "base-lost" },
  },
  {
    id: "m4",
    title: "The Church",
    intro: "With a castle and church, you may summon mages and priests. The enemy has fortified. Destroy their keep.",
    mapW: 60, mapH: 40,
    startGold: 2600, startWood: 1800,
    playerUnits: [{ type: "worker", x: 6, y: 8 }, { type: "worker", x: 7, y: 8 }, { type: "worker", x: 6, y: 9 }, { type: "footman", x: 9, y: 8 }, { type: "knight", x: 12, y: 8 }, { type: "mage", x: 13, y: 8 }],
    playerBuildings: [{ type: "castle", x: 8, y: 8 }, { type: "farm", x: 5, y: 8 }, { type: "farm", x: 4, y: 8 }, { type: "barracks", x: 11, y: 10 }, { type: "church", x: 14, y: 10 }, { type: "stables", x: 13, y: 12 }, { type: "blacksmith", x: 10, y: 12 }],
    enemyBuildings: [{ type: "castle", x: 46, y: 8 }, { type: "barracks", x: 44, y: 6 }, { type: "tower", x: 48, y: 10 }, { type: "tower", x: 44, y: 12 }],
    resources: [
      { kind: "gold", x: 4, y: 12, amount: 3000 },
      { kind: "wood", x: 12, y: 4, amount: 250 },
      { kind: "wood", x: 16, y: 18, amount: 200 },
    ],
    win: { kind: "destroy-enemy" },
    lose: { kind: "base-lost" },
  },
  {
    id: "m5",
    title: "The Final Battle",
    intro: "The enemy's main citadel lies across the river. Gather your full army — catapults and all — and end the war.",
    mapW: 70, mapH: 50,
    startGold: 3000, startWood: 2200,
    playerUnits: [
      { type: "worker", x: 6, y: 8 }, { type: "worker", x: 7, y: 8 }, { type: "worker", x: 6, y: 9 },
      { type: "footman", x: 9, y: 8 }, { type: "footman", x: 10, y: 8 }, { type: "archer", x: 11, y: 8 },
      { type: "knight", x: 12, y: 8 }, { type: "mage", x: 13, y: 8 }, { type: "priest", x: 14, y: 8 }, { type: "catapult", x: 15, y: 8 },
    ],
    playerBuildings: [
      { type: "castle", x: 8, y: 8 }, { type: "farm", x: 5, y: 8 }, { type: "farm", x: 4, y: 8 }, { type: "farm", x: 3, y: 8 },
      { type: "barracks", x: 11, y: 10 }, { type: "church", x: 14, y: 10 }, { type: "stables", x: 13, y: 12 },
      { type: "blacksmith", x: 10, y: 12 }, { type: "tower", x: 6, y: 6 }, { type: "tower", x: 12, y: 6 },
    ],
    enemyBuildings: [
      { type: "castle", x: 58, y: 8 }, { type: "barracks", x: 56, y: 6 }, { type: "barracks", x: 60, y: 6 },
      { type: "tower", x: 60, y: 10 }, { type: "tower", x: 56, y: 12 }, { type: "tower", x: 62, y: 12 },
      { type: "church", x: 58, y: 12 }, { type: "stables", x: 62, y: 8 },
    ],
    resources: [
      { kind: "gold", x: 4, y: 12, amount: 4000 },
      { kind: "wood", x: 12, y: 4, amount: 300 },
      { kind: "wood", x: 16, y: 18, amount: 250 },
      { kind: "gold", x: 30, y: 20, amount: 2000 },
    ],
    win: { kind: "destroy-enemy" },
    lose: { kind: "base-lost" },
  },
];
