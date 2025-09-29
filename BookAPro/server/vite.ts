import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { type Server } from "http";
import { nanoid } from "nanoid";

// Convert ESM import.meta.url to __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Logger for Express + Vite
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// Setup Vite in middleware mode
export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    configFile: path.resolve(__dirname, "../vite.config.ts"),
    server: { middlewareMode: true },
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    try {
      const indexPath = path.resolve(__dirname, "../client/index.html");
      let template = await fs.promises.readFile(indexPath, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );

      const html = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (err) {
      vite.ssrFixStacktrace(err as Error);
      next(err);
    }
  });
}

// Serve static production build
export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "../dist/public");
  if (!fs.existsSync(distPath)) {
    throw new Error(`Build directory not found: ${distPath}. Run client build first.`);
  }

  app.use(express.static(distPath));

  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
