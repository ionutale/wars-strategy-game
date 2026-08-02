import { describe, expect, it, beforeEach } from "vitest";
import { createProgressRouter } from "../../server/src/routes";

interface StubCol {
  findOne: (filter: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  insertOne: (doc: Record<string, unknown>) => Promise<unknown>;
  updateOne: (filter: Record<string, unknown>, update: unknown) => Promise<unknown>;
}

interface StubDb {
  collection: (name: string) => StubCol;
}

function stubDb(): StubDb & { docs: Record<string, unknown> } {
  const docs: Record<string, unknown> = {};
  const col: StubCol = {
    async findOne(filter) {
      return (docs[filter.playerId as string] ?? null) as Record<string, unknown> | null;
    },
    async insertOne(doc) {
      docs[doc.playerId as string] = doc;
    },
    async updateOne(filter, update) {
      const playerId = filter.playerId as string;
      const existing = (docs[playerId] as Record<string, unknown>) ?? {};
      const set = (update as { $set: Record<string, unknown> }).$set;
      docs[playerId] = { playerId, ...existing, ...set };
    },
  };
  return {
    docs,
    collection: () => col,
  };
}

describe("progress routes", () => {
  let db: ReturnType<typeof stubDb>;
  beforeEach(() => { db = stubDb(); });

  it("creates a profile on get", async () => {
    const router = createProgressRouter(db as never);
    const req = { query: { playerId: "p1" } } as never;
    const out = await router.handleGetProfile(req);
    expect((out as { playerId: string }).playerId).toBe("p1");
  });

  it("saves and loads progress", async () => {
    const router = createProgressRouter(db as never);
    const save = await router.handleSaveProgress(
      { body: { playerId: "p1", campaign: { m1: "won" }, skirmish: { wins: 2, losses: 1 } } } as never,
    );
    expect((save as { ok: boolean }).ok).toBe(true);
    const loaded = await router.handleGetProgress({ query: { playerId: "p1" } } as never);
    expect((loaded as { skirmish: { wins: number } }).skirmish.wins).toBe(2);
  });
});
