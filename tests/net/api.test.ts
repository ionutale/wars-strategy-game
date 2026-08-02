// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { getPlayerId, loadProgress, saveProgress, SAVE_URL } from "../../src/net/api";

describe("api client", () => {
  it("returns a stable player id from localStorage", () => {
    localStorage.setItem("wars.playerId", "abc-123");
    expect(getPlayerId()).toBe("abc-123");
    localStorage.removeItem("wars.playerId");
    const id = getPlayerId();
    expect(id.length).toBeGreaterThan(8);
    expect(getPlayerId()).toBe(id); // stable
  });

  it("posts progress to the save url", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);
    await saveProgress({ campaign: { m1: "won" }, skirmish: { wins: 1, losses: 0 } });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(SAVE_URL);
    expect(JSON.parse(String(init.body)).playerId).toBe(getPlayerId());
    vi.unstubAllGlobals();
  });

  it("loads progress", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ campaign: {}, skirmish: { wins: 3, losses: 2 } }) });
    vi.stubGlobal("fetch", fetchMock);
    const out = await loadProgress();
    expect(out?.skirmish.wins).toBe(3);
    vi.unstubAllGlobals();
  });
});
