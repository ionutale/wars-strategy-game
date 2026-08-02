import type { Session } from "./session";
import { updateMovement } from "../world/systems/movement";
import { updateCombat, applyDamage, type UnitStats } from "../world/systems/combat";
import { updateEconomy } from "../world/systems/economy";
import { updateConstruction } from "../world/systems/building";
import { updateAI } from "../world/systems/ai";
import { UNIT_DEFS } from "../content/units";
import { BUILDINGS } from "../content/buildings";
import type { Entity } from "../world/entity";
import type { World } from "../world/world";

export function tickWorld(s: Session, dt: number): void {
  const w = s.world;
  w.time += dt;

  const stats = (e: Entity): UnitStats => {
    if (e.kind === "building") {
      const d = BUILDINGS[e.type];
      return { hp: d.hp, attack: d.attack, range: d.range, attackSpeed: d.attackSpeed, armor: 0 };
    }
    const d = UNIT_DEFS[e.type];
    return { hp: d.hp, attack: d.attack, range: d.range, attackSpeed: d.attackSpeed, armor: d.armor };
  };

  updateMovement(w, dt);
  updateCombat(w, dt, stats);
  updateEconomy(w, dt);
  updateConstruction(w, dt);
  towerFire(w, dt, stats);
  if (s.ai) updateAI(s.ai, w, dt);

  // cleanup
  for (const e of [...w.entities.values()]) {
    if (e.dead) {
      w.entities.delete(e.id);
      s.selected.delete(e.id);
    }
  }

  checkEndConditions(s);
}

function towerFire(w: World, dt: number, stats: (e: Entity) => UnitStats): void {
  for (const t of w.entities.values()) {
    if (t.kind !== "building" || t.type !== "tower" || t.dead) continue;
    t.attackCooldown -= dt;
    if (t.attackCooldown > 0) continue;
    let target: Entity | null = null;
    let best = Infinity;
    for (const e of w.entities.values()) {
      if (e.faction === t.faction || e.dead || e.kind === "projectile") continue;
      const d = Math.hypot(e.x - t.x, e.y - t.y);
      if (d < best) { best = d; target = e; }
    }
    const s = stats(t);
    if (target && best <= s.range) {
      t.attackCooldown = 1 / s.attackSpeed;
      applyDamage(target, s.attack, t, w);
    }
  }
}

function checkEndConditions(s: Session): void {
  const w = s.world;
  const m = s.mission;

  // mission-specific conditions (survive/timeout) take priority
  if (m) {
    if (m.win.kind === "survive" && w.time + 1e-6 >= m.win.seconds) {
      s.victory = true;
      s.state = "victory";
      w.victory = true;
      return;
    }
    if (m.lose.kind === "timeout" && w.time + 1e-6 >= m.lose.seconds) {
      s.victory = false;
      s.state = "defeat";
      w.defeat = true;
      return;
    }
  }

  const enemyBuildings = [...w.entities.values()].some((e) => e.kind === "building" && e.faction === "red" && !e.dead);
  const playerBase = [...w.entities.values()].some(
    (e) => e.kind === "building" && e.faction === "blue" && !e.dead && (e.type === "town-hall" || e.type === "castle"),
  );
  if (!enemyBuildings) {
    s.victory = true;
    s.state = "victory";
    w.victory = true;
  } else if (!playerBase) {
    s.victory = false;
    s.state = "defeat";
    w.defeat = true;
  }
}
