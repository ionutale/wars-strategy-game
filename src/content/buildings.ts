export interface BuildingDef {
  name: string;
  hp: number;
  cost: { gold: number; wood: number };
  buildTime: number; // seconds of worker work
  footprint: number; // square tiles
  foodBonus: number;
  canAttack: boolean;
  attack: number;
  attackSpeed: number;
  range: number;
  trains: string[];
  requires: string[]; // prerequisite building types
}

export const BUILDINGS: Record<string, BuildingDef> = {
  "town-hall": { name: "Town Hall", hp: 300, cost: { gold: 400, wood: 0 }, buildTime: 30, footprint: 3, foodBonus: 0, canAttack: false, attack: 0, attackSpeed: 0, range: 0, trains: ["worker"], requires: [] },
  "farm": { name: "Farm", hp: 120, cost: { gold: 100, wood: 0 }, buildTime: 10, footprint: 2, foodBonus: 4, canAttack: false, attack: 0, attackSpeed: 0, range: 0, trains: [], requires: [] },
  "barracks": { name: "Barracks", hp: 250, cost: { gold: 180, wood: 60 }, buildTime: 20, footprint: 2, foodBonus: 0, canAttack: false, attack: 0, attackSpeed: 0, range: 0, trains: ["footman", "archer"], requires: [] },
  "tower": { name: "Tower", hp: 180, cost: { gold: 150, wood: 80 }, buildTime: 15, footprint: 1, foodBonus: 0, canAttack: true, attack: 10, attackSpeed: 1.5, range: 5, trains: [], requires: [] },
  "lumber-mill": { name: "Lumber Mill", hp: 200, cost: { gold: 120, wood: 40 }, buildTime: 15, footprint: 2, foodBonus: 0, canAttack: false, attack: 0, attackSpeed: 0, range: 0, trains: [], requires: [] },
  "blacksmith": { name: "Blacksmith", hp: 220, cost: { gold: 150, wood: 100 }, buildTime: 20, footprint: 2, foodBonus: 0, canAttack: false, attack: 0, attackSpeed: 0, range: 0, trains: ["catapult"], requires: ["lumber-mill"] },
  "castle": { name: "Castle", hp: 600, cost: { gold: 900, wood: 0 }, buildTime: 45, footprint: 3, foodBonus: 0, canAttack: false, attack: 0, attackSpeed: 0, range: 0, trains: [], requires: [] },
  "stables": { name: "Stables", hp: 250, cost: { gold: 220, wood: 90 }, buildTime: 20, footprint: 2, foodBonus: 0, canAttack: false, attack: 0, attackSpeed: 0, range: 0, trains: ["knight"], requires: ["castle"] },
  "church": { name: "Church", hp: 250, cost: { gold: 240, wood: 40 }, buildTime: 20, footprint: 2, foodBonus: 0, canAttack: false, attack: 0, attackSpeed: 0, range: 0, trains: ["mage", "priest"], requires: ["castle"] },
};

export function buildCost(type: string): { gold: number; wood: number } {
  return BUILDINGS[type].cost;
}
