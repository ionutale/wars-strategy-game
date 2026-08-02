# Mobile-Friendly Warcraft-Like RTS — Design Spec

**Date:** 2026-08-02
**Status:** Approved for planning
**Game:** A Warcraft 1/2-inspired real-time strategy game, simplified for touch controls, playable in the browser on phone (landscape) and desktop.

## 1. Vision

A classic RTS experience — gather resources, build a base, train an army, defeat the enemy — redesigned around mobile constraints: no right-click, no keyboard, no pixel-precise box-select. One finger and clear command buttons do everything. Flat geometric art, drawn entirely with code (zero image assets).

## 2. Locked Decisions

| Topic | Decision |
|---|---|
| Command scheme | Select + Command Buttons (Attack / Move / Stop / Hold; Build / Gather for workers) |
| Game modes | Campaign missions + Skirmish vs AI (single-player) |
| Platform | Web — Vite + TypeScript + Canvas 2D; Vitest for tests |
| Art style | Flat geometric, code-drawn, no external assets |
| Orientation | Landscape |
| Economy | Gold + wood, workers auto-gather once assigned |
| Units | 7 types (Worker, Footman, Archer, Knight, Mage, Priest, Catapult) |
| Buildings | 9 (Town Hall, Farm, Barracks, Tower, Lumber Mill, Blacksmith, Castle, Stables, Church) — no naval |
| Camera | One-finger drag to pan, pinch to zoom (0.8×–2×), minimap tap-to-jump |
| Architecture | Modular core with entity-component-lite; systems as pure-ish functions over state |
| Persistence | MongoDB Atlas via small Express API — campaign progress + skirmish stats only (no mid-game saves) |
| Audio | jsfxr-generated SFX (no external files) + one Mixkit music track |

## 3. Project Structure

```
wars-strategy-game/
  index.html
  package.json
  vite.config.ts
  tsconfig.json
  .env                      # gitignored — Atlas connection string
  .env.example
  server/
    src/
      index.ts              # Express bootstrap
      db.ts                 # Mongo client (connection from .env only)
      routes/
        profile.ts          # get-or-create player profile
        progress.ts         # save/load campaign + skirmish stats
  tools/
    gen-sfx.mjs             # jsfxr presets -> WAV files in assets/sfx/
  assets/
    sfx/                    # ~10 generated WAVs
    audio/music.mp3         # Mixkit "Pop 05" (154s, looped)
  src/
    main.ts                 # bootstrap: canvas, loop wiring, screens
    core/
      loop.ts               # fixed 60 Hz sim tick; render at display rate
      camera.ts             # world<->screen transform, pan, zoom
      input.ts              # tap/drag/pinch -> commands (pure mapping)
    world/
      entity.ts             # entity types (unit/building/projectile)
      map.ts                # tile grid, terrain, gold mines, trees
      systems/
        movement.ts         # grid A* pathfinding, steering, arrival
        combat.ts           # targeting, damage, projectiles, splash
        economy.ts          # auto-gather cycles, resource ticking
        building.ts         # placement, construction, training queues, tech gating
        ai.ts               # skirmish opponent: build order + attack waves
    render/
      renderer.ts           # draw pass over world state (read-only)
    ui/
      hud.ts                # top resource bar, command bar, selection panel
      minimap.ts            # overview + jump-to-tap
      screens.ts            # main menu, victory/defeat overlays
    net/
      api.ts                # fetch client for progress API
    content/
      units.ts              # 7 unit type definitions
      buildings.ts          # 9 building definitions
      missions.ts           # campaign mission definitions
    state/
      session.ts            # menu -> playing -> won/lost state machine
  tests/                    # Vitest unit tests per system
```

**Rules:** UI/render read game state but never mutate it. Systems are pure-ish modules — take state, return/mutate per tick — so combat, economy, and AI are unit-testable in isolation. The browser never touches MongoDB; it talks only to our API.

## 4. Core Loop, Camera, Input

- **Loop:** fixed 60 Hz simulation tick (dt-independent), render at display refresh. Pause when tab hidden or menu open.
- **Camera:** world coordinates, pan by one-finger drag on empty terrain (not on a unit), pinch zoom clamped 0.8×–2×. Minimap tap jumps camera.
- **Input mapping:**
  - Tap unit/building → select; selection panel shows HP, orders, stats.
  - Tap empty ground → deselect. Drag from empty ground → pan.
  - Command bar (context-sensitive): combat units → Attack/Move/Stop/Hold; workers → Build/Gather Gold/Gather Wood/Stop; buildings → train/research queues.
  - Targeting: after Attack/Move, tap enemy or ground; range ring shown on selected unit.
  - **Select-all-army button** (top-right) — one tap selects all combat units (box-select conflicts with drag-pan on mobile, so it's excluded).

## 5. Game Systems

- **Movement:** grid A* with diagonals; circle units on tile grid; push-apart collision; face target on arrival.
- **Combat:** HP, attack, range (melee 1 tile), attack speed, armor. Auto-attack on order or when attacked while on Hold/guard. Melee chases into range; ranged fires projectiles with travel time; catapult has AoE splash + miss chance. Death → fading corpse.
- **Economy:** gold mines (fixed) and trees (depleting) as nodes; assigned workers auto-cycle (pickup → carry → deposit); per-mine worker cap limits income; farm = +4 food; food cap blocks training/building.
- **Building:** grid placement with green/red ghost preview; cost paid upfront; any worker can construct; queue-based production; tech gating (Castle → Stables/Church units).
- **Skirmish AI:** fixed adaptive build order (worker → farm → barracks → army); keeps gathering; sends attack waves on a timer scaled by difficulty (Easy/Normal/Hard); defends when attacked.
- **Campaign:** data-defined missions with per-mission win/lose conditions, starting state, and brief intro text.

## 6. Content

**Units (7):**
| Unit | Role | Source |
|---|---|---|
| Worker | build + gather | Town Hall |
| Footman | cheap melee | Barracks |
| Archer | fast ranged | Barracks |
| Knight | heavy fast melee | Stables |
| Mage | AoE blast | Church |
| Priest | heal | Church |
| Catapult | slow siege, AoE splash | Blacksmith |

**Buildings (9):** Town Hall (workers, tier 1), Farm (+4 food), Barracks, Tower (auto-attack defense), Lumber Mill, Blacksmith (attack/armor upgrades + Catapult), Castle (Town Hall upgrade), Stables, Church.

**Tunable numbers (in `content/`):** start gold 1200 / wood 800; mine ~1500 gold; tree patch ~100 wood; worker carries 50/trip; base food cap 5. All values editable without code changes.

## 7. Rendering & UI

- **Rendering:** flat geometric — subtle tile checker + terrain patches, buildings as rounded rects with roof accents, units as distinct silhouettes (round melee, triangle archer, etc.), faction colors (blue vs red), selection ring, HP bars, range ring, projectile streaks, attack flash. Canvas primitives only.
- **UI:** top bar (gold/wood/food), command bar (bottom), selection panel, minimap (bottom-right), select-all button, pause button; victory/defeat overlays; main menu (Campaign / Skirmish / difficulty).

## 8. Persistence (MongoDB Atlas)

- **Backend:** `server/` — Node + Express + official `mongodb` driver. Connection string only in `.env` (gitignored; `.env.example` committed). Uses the provided shared Atlas cluster, database `games`.
- **Model:** anonymous player profiles keyed by a client-generated UUID stored in localStorage. No auth.
- **API:**
  - `GET /api/profile?playerId=...` → create or return profile
  - `GET /api/progress?playerId=...` → campaign completion map + skirmish wins/losses
  - `POST /api/progress` `{ playerId, campaign: { [missionId]: "won" }, skirmish: { wins, losses } }`
- **Scope:** progress + stats only. No mid-game save/load in v1 (full state serialization deferred).

## 9. Audio

- **SFX:** `tools/gen-sfx.mjs` — jsfxr (npm port of sfxr) with tuned presets (wave type, envelope, pitch slide) rendered to ~10 WAVs in `assets/sfx/`: select, command, attack, hit, death, build placed, resource collected, upgrade, victory, defeat. No external files; presets editable in the tool.
- **Music:** Mixkit free-stock track "Pop 05" (154 s), saved as `assets/audio/music.mp3`, looped quietly in-game (Mixkit/Envato license permits free commercial/personal use without attribution).

## 10. Testing

- Vitest unit tests: pathfinding/arrival, combat math (range, damage, projectile travel, splash), economy (gather cycles, caps, costs), building (placement validity, queues, tech gating), AI (build order, wave timing), input mapping (pure functions), API handlers (db behind a stub interface).
- Manual play testing on phone (landscape) + desktop.

## 11. Out of Scope (v1)

- Multiplayer/PvP, naval units, mid-game saves, save/load UI, sound volume settings, animations beyond simple effects, touch haptics.
