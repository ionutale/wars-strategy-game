import express from "express";
import cors from "cors";
import { connectDb, closeDb } from "./db";
import { createProgressRouter } from "./routes";

const PORT = Number(process.env.PORT ?? 3001);

async function main(): Promise<void> {
  const uri = process.env.ATLAS_URI;
  if (!uri) {
    console.error("ATLAS_URI env var missing — copy .env.example to .env and fill it in.");
    process.exit(1);
  }
  const db = await connectDb(uri);
  const router = createProgressRouter(db);

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/profile", async (req, res) => {
    res.json(await router.handleGetProfile({ query: req.query }));
  });
  app.get("/api/progress", async (req, res) => {
    res.json(await router.handleGetProgress({ query: req.query }));
  });
  app.post("/api/progress", async (req, res) => {
    res.json(await router.handleSaveProgress({ body: req.body }));
  });

  app.listen(PORT, () => console.log(`server listening on :${PORT}`));

  process.on("SIGINT", async () => { await closeDb(); process.exit(0); });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
