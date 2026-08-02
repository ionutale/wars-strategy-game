import { expect, type Page } from "@playwright/test";

/** Live game state snapshot pulled through the __wars hook. */
export interface GameSnapshot {
  state: string;
  mode: string;
  missionIndex: number;
  cam: { x: number; y: number; zoom: number; viewW: number; viewH: number };
  pools: { blue: { gold: number; wood: number }; red: { gold: number; wood: number } };
  foodCap: { blue: number; red: number };
  time: number;
  selected: number[];
  entities: {
    id: number;
    kind: string;
    faction: string;
    type: string;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    order: unknown;
    progress: number;
    queue: string[];
    dead: boolean;
  }[];
  resources: { id: number; kind: string; x: number; y: number; amount: number }[];
}

export async function snapshot(page: Page): Promise<GameSnapshot> {
  return page.evaluate(() => {
    const w = window.__wars!;
    const s = w.session;
    return {
      state: s.state,
      mode: s.mode,
      missionIndex: s.missionIndex,
      cam: { x: w.cam.x, y: w.cam.y, zoom: w.cam.zoom, viewW: w.cam.viewW, viewH: w.cam.viewH },
      pools: JSON.parse(JSON.stringify(s.world.pools)),
      foodCap: JSON.parse(JSON.stringify(s.world.foodCap)),
      time: s.world.time,
      selected: [...s.selected],
      entities: [...s.world.entities.values()].map((e) => ({
        id: e.id,
        kind: e.kind,
        faction: e.faction,
        type: e.type,
        x: e.x,
        y: e.y,
        hp: e.hp,
        maxHp: e.maxHp,
        order: e.order,
        progress: e.progress,
        queue: e.queue,
        dead: e.dead,
      })),
      resources: [...s.world.resources.values()].map((r) => ({
        id: r.id,
        kind: r.kind,
        x: r.x,
        y: r.y,
        amount: r.amount,
      })),
    };
  });
}

export function entityById(snap: GameSnapshot, id: number) {
  return snap.entities.find((e) => e.id === id);
}

export function entityByType(snap: GameSnapshot, type: string, faction: string) {
  return snap.entities.find((e) => e.type === type && e.faction === faction);
}

export function entitiesByType(snap: GameSnapshot, type: string, faction: string) {
  return snap.entities.filter((e) => e.type === type && e.faction === faction);
}

/** World tile -> screen px using the live camera. */
export async function worldToScreen(page: Page, wx: number, wy: number): Promise<{ x: number; y: number }> {
  return page.evaluate(([x, y]) => {
    const cam = window.__wars!.cam;
    const s = cam.worldToScreen(x, y);
    return { x: s.x, y: s.y };
  }, [wx, wy] as const);
}

/** Screen px -> world tile. */
export async function screenToWorld(page: Page, sx: number, sy: number): Promise<{ x: number; y: number }> {
  return page.evaluate(([x, y]) => {
    const cam = window.__wars!.cam;
    const s = cam.screenToWorld(x, y);
    return { x: s.x, y: s.y };
  }, [sx, sy] as const);
}

export async function startSkirmish(page: Page, difficulty: "easy" | "normal" | "hard" = "normal"): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: `Skirmish — ${capitalize(difficulty)}` }).click();
  await expect.poll(() => snapshot(page).then((s) => s.state)).toBe("playing");
}

export async function startCampaignAt(page: Page, missionIndex: number): Promise<void> {
  await page.goto("/");
  await page.evaluate((idx) => {
    window.__wars!.session.missionIndex = idx;
  }, missionIndex);
  await page.getByRole("button", { name: "Campaign" }).click();
  const begin = page.getByRole("button", { name: "Begin" });
  if (await begin.isVisible().catch(() => false)) {
    await begin.click();
  }
  await expect.poll(() => snapshot(page).then((s) => s.state)).toBe("playing");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Click a position on the canvas (screen coords). */
export async function tapCanvas(page: Page, sx: number, sy: number): Promise<void> {
  await page.mouse.click(sx, sy);
}

/**
 * Click a HUD button by label. The command bar is rebuilt every frame, so
 * Playwright's actionability wait (stability check) races with DOM teardown.
 * Dispatch the click directly on the live element — retries a few times since
 * the button may vanish mid-click.
 */
export async function clickButton(page: Page, label: string): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const clicked = await page.evaluate((lbl) => {
      const btn = [...document.querySelectorAll<HTMLButtonElement>("button.hud-btn")].find(
        (b) => b.textContent?.trim() === lbl,
      );
      if (!btn) return false;
      btn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1, clientX: 0, clientY: 0 }));
      return true;
    }, label);
    if (clicked) return;
    await page.waitForTimeout(100);
  }
  throw new Error(`HUD button "${label}" not found after retries`);
}

/** Select an entity by tapping its screen position. */
export async function selectEntity(page: Page, id: number): Promise<void> {
  const snap = await snapshot(page);
  const e = entityById(snap, id);
  if (!e) throw new Error(`entity ${id} not found`);
  const { x, y } = await worldToScreen(page, e.x, e.y);
  await tapCanvas(page, x, y);
  await expect.poll(() => snapshot(page).then((s) => s.selected)).toContain(id);
}

/** Drag from one screen point to another (used for pan). */
export async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
}

/** Two-finger pinch via CDP touch events; fingers start `startDist` apart and end `endDist` apart around a center. */
export async function pinch(
  page: Page,
  center: { x: number; y: number },
  startDist: number,
  endDist: number,
): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  const half = startDist / 2;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: center.x - half, y: center.y, id: 1 },
      { x: center.x + half, y: center.y, id: 2 },
    ],
  });
  const steps = 6;
  for (let i = 1; i <= steps; i++) {
    const d = startDist + ((endDist - startDist) * i) / steps;
    const h = d / 2;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: center.x - h, y: center.y, id: 1 },
        { x: center.x + h, y: center.y, id: 2 },
      ],
    });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

/** Spawn a unit through the test hook. Returns its id. */
export async function spawnUnit(
  page: Page,
  type: string,
  faction: "blue" | "red",
  x: number,
  y: number,
): Promise<number> {
  return page.evaluate(([t, f, wx, wy]) => {
    const w = window.__wars!;
    const defs = { worker: 20, footman: 40, archer: 25, knight: 70, mage: 30, priest: 30, catapult: 50 } as Record<string, number>;
    const e = w.createEntity("unit", f, t, wx, wy, defs[t] ?? 40);
    w.session.world.entities.set(e.id, e);
    return e.id;
  }, [type, faction, x, y] as const);
}

/** Kill an entity (sets dead; next tick removes it). */
export async function killEntity(page: Page, id: number): Promise<void> {
  await page.evaluate((eid) => {
    const w = window.__wars!;
    const e = w.session.world.entities.get(eid);
    if (e) e.dead = true;
  }, id);
}

/**
 * Kill every building of a faction atomically (single JS task — the game loop
 * cannot interleave, so the AI can't build a new one mid-kill).
 */
export async function killAllBuildings(page: Page, faction: "blue" | "red"): Promise<void> {
  await page.evaluate((f) => {
    const w = window.__wars!;
    for (const e of w.session.world.entities.values()) {
      if (e.kind === "building" && e.faction === f) e.dead = true;
    }
  }, faction);
}

/**
 * Fast-forward the simulation by running `seconds` of ticks directly through
 * the hook (the live loop keeps running on top; total time advances faster).
 * Used for time-based scenarios (survive missions) where waiting in real time
 * would be too slow.
 */
export async function advance(page: Page, seconds: number): Promise<void> {
  const ticks = Math.round(seconds * 60);
  await page.evaluate((n) => {
    const w = window.__wars!;
    for (let i = 0; i < n; i++) w.tick(1 / 60);
  }, ticks);
}

/** Set a faction's resource pools through the hook. */
export async function setPools(
  page: Page,
  faction: "blue" | "red",
  pools: { gold: number; wood: number },
): Promise<void> {
  await page.evaluate(([f, p]) => {
    const w = window.__wars!;
    w.session.world.pools[f].gold = p.gold;
    w.session.world.pools[f].wood = p.wood;
  }, [faction, pools] as const);
}
