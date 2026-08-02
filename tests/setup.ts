// Vitest 2.x bug: populateGlobal skips re-binding keys not in its KEYS list, so
// the global getter for localStorage keeps referencing a closed jsdom window.
// Re-bind it to the live jsdom window when the jsdom environment is active.
const g = globalThis as Record<string, unknown> & typeof globalThis;
const jsdomWin = g.jsdom as { window?: Window } | undefined;
if (typeof g.localStorage === "undefined" && jsdomWin && typeof jsdomWin.window !== "undefined") {
  Object.defineProperty(g, "localStorage", {
    configurable: true,
    value: jsdomWin.window.localStorage,
  });
}
