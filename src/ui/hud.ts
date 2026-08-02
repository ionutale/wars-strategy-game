import type { World } from "../world/world";
import type { Entity } from "../world/entity";
import { foodUsed } from "../world/world";
import { el, button, injectStyles } from "./dom";

export interface HudActions {
  onCommand: (cmd: CommandName, entity: Entity) => void;
  onSelectAll: () => void;
  onPause: () => void;
}

export type CommandName = "attack" | "move" | "stop" | "hold" | "gather-gold" | "gather-wood" | "build-farm" | "build-barracks" | "build-tower" | "build-lumber-mill" | "build-blacksmith" | "build-stables" | "build-church" | "build-castle" | "train-worker" | "train-footman" | "train-archer" | "train-knight" | "train-mage" | "train-priest" | "train-catapult" | "select-all";

injectStyles(`
  .hud-root { position: fixed; inset: 0; pointer-events: none; font-family: monospace; color: #e8f5e0; user-select: none; -webkit-user-select: none; }
  .hud-root > * { pointer-events: auto; }
  .hud-top { position: absolute; top: 8px; left: 8px; right: 8px; display: flex; gap: 10px; align-items: center; background: rgba(0,0,0,.6); border-radius: 6px; padding: 6px 10px; font-size: 14px; }
  .hud-top .spacer { flex: 1; }
  .hud-top .gold { color: #d4af37; } .hud-top .wood { color: #8b5a2b; } .hud-top .food { color: #86efac; }
  .hud-btn { background: #3d4a3a; border: 1px solid #7a8a70; color: #e8f5e0; border-radius: 5px; padding: 8px 10px; font-size: 13px; font-family: monospace; }
  .hud-btn:active { background: #b45309; border-color: #fbbf24; }
  .hud-commandbar { position: absolute; left: 8px; right: 8px; bottom: 8px; display: flex; gap: 6px; justify-content: center; }
  .hud-panel { position: absolute; left: 8px; bottom: 64px; background: rgba(0,0,0,.7); border-radius: 6px; padding: 8px 10px; font-size: 12px; min-width: 160px; }
  .hud-panel h3 { margin: 0 0 4px; font-size: 13px; }
  .hud-panel .row { display: flex; justify-content: space-between; gap: 12px; }
  .hud-queue { position: absolute; right: 8px; bottom: 110px; background: rgba(0,0,0,.7); border-radius: 6px; padding: 6px; display: flex; gap: 4px; }
  .hud-queue .q-item { background: #2a3328; border: 1px solid #55604f; border-radius: 3px; padding: 4px 6px; font-size: 10px; }
  .hud-select-all { position: absolute; top: 52px; right: 8px; }
  .hud-pause { position: absolute; top: 52px; right: 8px; margin-right: 90px; }
`);

export class Hud {
  private root = el("div", "hud-root");
  private top = el("div", "hud-top");
  private panel: HTMLDivElement | null = null;
  private queue: HTMLDivElement | null = null;
  private commandBar = el("div", "hud-commandbar");
  private selectAllBtn = button("⚔ All", () => this.actions.onSelectAll(), "hud-btn hud-select-all");
  private pauseBtn = button("⏸", () => this.actions.onPause(), "hud-btn hud-pause");

  constructor(private actions: HudActions) {
    this.root.append(this.top, this.commandBar, this.selectAllBtn, this.pauseBtn);
    document.body.appendChild(this.root);
  }

  update(world: World, selected: Entity[]): void {
    this.top.innerHTML = "";
    this.top.append(
      span("gold", `Gold ${world.pools.blue.gold}`),
      span("wood", `Wood ${world.pools.blue.wood}`),
      span("food", `Food ${foodUsed(world, "blue")}/${world.foodCap.blue}`),
    );
    const spacer = el("span", "spacer");
    this.top.append(spacer);
    this.commandBar.innerHTML = "";
    this.panel?.remove();
    this.queue?.remove();
    this.panel = null;
    this.queue = null;

    if (selected.length === 0) return;
    const e = selected[0];
    const name = e.kind === "unit" ? unitName(e.type) : buildingName(e.type);
    this.panel = el("div", "hud-panel");
    const rows = el("div");
    rows.append(
      row("HP", `${Math.ceil(e.hp)}/${e.maxHp}`),
      row("Order", orderText(e)),
    );
    this.panel.append(el("h3", undefined, name), rows);
    this.root.appendChild(this.panel);

    if (e.kind === "unit") this.unitBar(e);
    else this.buildingBar(e, world);
    if (e.kind === "building" && e.queue.length > 0) {
      this.queue = el("div", "hud-queue");
      for (const q of e.queue) {
        this.queue.append(el("span", "q-item", q));
      }
      this.root.appendChild(this.queue);
    }
  }

  private unitBar(e: Entity): void {
    if (e.type === "worker") {
      this.addBtn("Build", "build-farm", e);
      this.addBtn("Gather Gold", "gather-gold", e);
      this.addBtn("Gather Wood", "gather-wood", e);
      this.addBtn("Stop", "stop", e);
      this.addBtn("Hold", "hold", e);
    } else {
      this.addBtn("Attack", "attack", e);
      this.addBtn("Move", "move", e);
      this.addBtn("Stop", "stop", e);
      this.addBtn("Hold", "hold", e);
    }
  }

  private buildingBar(e: Entity, world: World): void {
    if (e.type === "town-hall" || e.type === "castle") this.addBtn("Worker", "train-worker", e);
    if (e.type === "barracks") { this.addBtn("Footman", "train-footman", e); this.addBtn("Archer", "train-archer", e); }
    if (e.type === "stables") this.addBtn("Knight", "train-knight", e);
    if (e.type === "church") { this.addBtn("Mage", "train-mage", e); this.addBtn("Priest", "train-priest", e); }
    if (e.type === "blacksmith") this.addBtn("Catapult", "train-catapult", e);
  }

  private addBtn(label: string, cmd: CommandName, e: Entity): void {
    this.commandBar.appendChild(button(label, () => this.actions.onCommand(cmd, e)));
  }
}

function span(cls: string, text: string): HTMLSpanElement {
  const s = el("span", cls, text);
  return s;
}

function row(label: string, value: string): HTMLDivElement {
  const r = el("div", "row");
  r.append(el("span", undefined, label), el("span", undefined, value));
  return r;
}

function unitName(type: string): string {
  const names: Record<string, string> = { worker: "Worker", footman: "Footman", archer: "Archer", knight: "Knight", mage: "Mage", priest: "Priest", catapult: "Catapult" };
  return names[type] ?? type;
}

function buildingName(type: string): string {
  const names: Record<string, string> = { "town-hall": "Town Hall", farm: "Farm", barracks: "Barracks", tower: "Tower", "lumber-mill": "Lumber Mill", blacksmith: "Blacksmith", castle: "Castle", stables: "Stables", church: "Church" };
  return names[type] ?? type;
}

function orderText(e: Entity): string {
  if (!e.order) return "Idle";
  switch (e.order.type) {
    case "move": return "Moving";
    case "attack": return "Attacking";
    case "gather": return "Gathering";
    case "build": return "Building";
    case "hold": return "Hold";
    case "stop": return "Stopped";
    default: return e.order.type;
  }
}
