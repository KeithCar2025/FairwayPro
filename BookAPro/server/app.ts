import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import messagesRouter from "./server/routes/messages.js"; // adjust path if needed

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Parse JSON bodies
app.use(express.json());

// --- Logging middleware for debugging ---
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// --- API routes ---
app.use("/api/messages", messagesRouter);

// Serve static files from React build
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

// SPA fallback for React routes (ONLY if no API matched)
app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// --- Error handling middleware for JSON responses ---
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
