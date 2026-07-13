import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import router from "./routes";
import { logger } from "./lib/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// ── Serving statique (Windows / production standalone) ──────────────────────
// Sur Replit, le frontend Vite tourne sur son propre port.
// Sur Windows, Express sert lui-même le dist/ pré-compilé sur Replit.
// STATIC_PATH est injecté par start.bat avec le chemin absolu Windows.
if (process.env.STATIC_PATH || process.env.NODE_ENV === "production") {
  const staticDir =
    process.env.STATIC_PATH ??
    path.resolve(__dirname, "../../meteo-app/dist/public");

  app.use(express.static(staticDir));

  // SPA fallback : toute route non-API → index.html
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });

  logger.info({ staticDir }, "Serving static frontend");
}

export default app;
