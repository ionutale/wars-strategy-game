export interface UnitDef {
  name: string;
  hp: number;
  cost: { gold: number; wood: number };
  trainTime: number; // seconds
  attack: number;
  attackSpeed: number; // attacks/sec
  range: number; // tiles
  armor: number;
  speed: number; // tiles/sec
  splashRadius: number; // 0 = no splash
  missChance: number;   // 0..1 chance the projectile lands off-target
  heal: number;         // 0 = no healing
  healRange: number;    // tiles
  role: "worker" | "melee" | "ranged" | "siege" | "caster" | "healer";
}

export const UNIT_DEFS: Record<string, UnitDef> = {
  worker: { name: "Worker", hp: 20, cost: { gold: 60, wood: 0 }, trainTime: 8, attack: 2, attackSpeed: 1, range: 1, armor: 0, speed: 5.5, splashRadius: 0, missChance: 0, heal: 0, healRange: 0, role: "worker" },
  footman: { name: "Footman", hp: 40, cost: { gold: 90, wood: 20 }, trainTime: 12, attack: 6, attackSpeed: 1, range: 1, armor: 1, speed: 4.5, splashRadius: 0, missChance: 0, heal: 0, healRange: 0, role: "melee" },
  archer: { name: "Archer", hp: 25, cost: { gold: 100, wood: 40 }, trainTime: 12, attack: 7, attackSpeed: 0.8, range: 4, armor: 0, speed: 5, splashRadius: 0, missChance: 0, heal: 0, healRange: 0, role: "ranged" },
  knight: { name: "Knight", hp: 70, cost: { gold: 180, wood: 60 }, trainTime: 18, attack: 10, attackSpeed: 0.9, range: 1, armor: 2, speed: 6.5, splashRadius: 0, missChance: 0, heal: 0, healRange: 0, role: "melee" },
  mage: { name: "Mage", hp: 30, cost: { gold: 140, wood: 0 }, trainTime: 15, attack: 10, attackSpeed: 0.7, range: 5, armor: 0, speed: 4.5, splashRadius: 1.5, missChance: 0, heal: 0, healRange: 0, role: "caster" },
  priest: { name: "Priest", hp: 30, cost: { gold: 120, wood: 0 }, trainTime: 15, attack: 0, attackSpeed: 0.4, range: 0, armor: 0, speed: 4.5, splashRadius: 0, missChance: 0, heal: 8, healRange: 4, role: "healer" },
  catapult: { name: "Catapult", hp: 50, cost: { gold: 160, wood: 120 }, trainTime: 25, attack: 25, attackSpeed: 0.4, range: 8, armor: 0, speed: 2.5, splashRadius: 2, missChance: 0.3, heal: 0, healRange: 0, role: "siege" },
};
