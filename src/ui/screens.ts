import { el, button, injectStyles } from "./dom";

injectStyles(`
  .screen { position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; background: rgba(8,12,6,.92); z-index: 100; font-family: monospace; color: #e8f5e0; }
  .screen h1 { font-size: 42px; margin: 0; letter-spacing: 4px; color: #d4af37; }
  .screen h2 { margin: 0; font-size: 24px; }
  .screen p { margin: 0; font-size: 14px; color: #9db88f; }
`);

export interface MenuCallbacks {
  onCampaign: () => void;
  onSkirmish: (difficulty: "easy" | "normal" | "hard") => void;
}

export function showMainMenu(cb: MenuCallbacks): () => void {
  const screen = el("div", "screen");
  screen.append(
    el("h1", undefined, "WARS"),
    el("p", undefined, "A mobile-friendly Warcraft-like RTS"),
  );
  const campaignBtn = button("Campaign", cb.onCampaign, "hud-btn");
  const easy = button("Skirmish — Easy", () => cb.onSkirmish("easy"), "hud-btn");
  const normal = button("Skirmish — Normal", () => cb.onSkirmish("normal"), "hud-btn");
  const hard = button("Skirmish — Hard", () => cb.onSkirmish("hard"), "hud-btn");
  screen.append(campaignBtn, easy, normal, hard);
  document.body.appendChild(screen);
  return () => screen.remove();
}

export function showEndScreen(title: string, subtitle: string, onRestart: () => void, onMenu: () => void): () => void {
  const screen = el("div", "screen");
  screen.append(
    el("h2", undefined, title),
    el("p", undefined, subtitle),
    button("Play Again", onRestart, "hud-btn"),
    button("Main Menu", onMenu, "hud-btn"),
  );
  document.body.appendChild(screen);
  return () => screen.remove();
}
