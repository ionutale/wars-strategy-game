import type { Db } from "mongodb";

export interface ProgressRouter {
  handleGetProfile: (req: { query: { playerId?: string } }) => Promise<{ playerId: string }>;
  handleGetProgress: (req: { query: { playerId?: string } }) => Promise<unknown>;
  handleSaveProgress: (req: { body: { playerId: string; campaign?: Record<string, string>; skirmish?: { wins?: number; losses?: number } } }) => Promise<{ ok: boolean }>;
}

interface ProfileDoc {
  playerId: string;
  campaign: Record<string, string>;
  skirmish: { wins: number; losses: number };
}

export function createProgressRouter(db: Db): ProgressRouter {
  const col = db.collection<ProfileDoc>("profiles");

  async function getOrCreate(playerId: string) {
    const existing = await col.findOne({ playerId });
    if (existing) return existing;
    const doc = { playerId, campaign: {}, skirmish: { wins: 0, losses: 0 } };
    await col.insertOne(doc);
    return doc;
  }

  return {
    async handleGetProfile(req) {
      const playerId = req.query.playerId ?? "anon";
      return getOrCreate(playerId);
    },
    async handleGetProgress(req) {
      const playerId = req.query.playerId ?? "anon";
      const doc = await getOrCreate(playerId);
      return { playerId: doc.playerId, campaign: doc.campaign, skirmish: doc.skirmish };
    },
    async handleSaveProgress(req) {
      const { playerId } = req.body;
      if (!playerId) return { ok: false };
      const existing = await getOrCreate(playerId);
      await col.updateOne(
        { playerId },
        {
          $set: {
            campaign: req.body.campaign ?? existing.campaign,
            skirmish: {
              wins: req.body.skirmish?.wins ?? existing.skirmish.wins,
              losses: req.body.skirmish?.losses ?? existing.skirmish.losses,
            },
          },
        },
      );
      return { ok: true };
    },
  };
}
