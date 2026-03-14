import express from "express";
import cors from "cors";
import { PORT } from "./config";
import { initDb } from "./db/schema";
import { lpRouter } from "./routes/lp";
import { coverageRouter } from "./routes/coverage";
import { oracleRouter } from "./routes/oracle";
import { loansRouter } from "./routes/loans";
import { disconnectClient } from "./xrpl/client";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/lp", lpRouter);
app.use("/coverage", coverageRouter);
app.use("/oracle", oracleRouter);
app.use("/loan", loansRouter);

async function start() {
  await initDb();
  const server = app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
  });
  process.on("SIGINT", async () => {
    server.close();
    await disconnectClient();
    process.exit(0);
  });
  process.on("SIGTERM", async () => {
    server.close();
    await disconnectClient();
    process.exit(0);
  });
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});

