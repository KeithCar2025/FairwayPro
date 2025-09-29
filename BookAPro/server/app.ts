import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// This MUST point to dist/public relative to dist/index.js
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));
app.get("*", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});