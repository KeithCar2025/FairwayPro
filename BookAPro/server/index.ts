import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { pool } from "./db"; // Make sure pool is the shared PG pool!
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { supabase } from "./supabase"; // your supabase client
import passport from "passport";

const PgSession = ConnectPgSimple(session);
const app = express();

// --- Essential Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- CORS: Allow frontend to send cookies for session auth ---
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));

// --- Session: Store sessions in Postgres ---
app.use(
  session({
    store: new PgSession({ pool, tableName: "session", createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
cookie: {
  maxAge: 24 * 60 * 60 * 1000, // 1 day
  httpOnly: true,
  secure: false, // ⚠️ must be false for localhost over HTTP
  sameSite: "lax", // ✅ allows cookies between 3000 <-> 5000 in dev
},
  })
);

app.use(passport.initialize());
app.use(passport.session());

// --- Health Check Route ---
app.get("/healthz", (_req, res) => res.send("OK"));

// --- Logging Middleware ---
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});

// --- Supabase JWT Middleware (optional, for API key auth) ---
// If you only use session-based auth, you can remove this.
// If you support both session and token auth, keep it!

app.use((req, _res, next) => {
  console.log("Session check:", req.session ? "exists" : "undefined");
  next();
});

app.use(async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error) {
    console.warn("Supabase auth error:", error.message);
    return next();
  }

  // Attach the user to the request
  (req as any).user = user;
  next();
});

(async () => {
  try {
    // --- Register all API and app routes ---
    await registerRoutes(app);

    // --- Error Handling Middleware ---
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error(err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message, stack: err.stack });
    });

    // --- Serve SPA/static files ---
    if (app.get("env") === "development") {
      await setupVite(app);
    } else {
      serveStatic(app);
    }

    const port = parseInt(process.env.PORT || "5000", 10);
    const host = process.env.HOST || "0.0.0.0";

    app.listen(port, host, () => {
      log(`Server running on http://${host}:${port}`);
    });
  } catch (err) {
    console.error("Server bootstrap failed:", err);
    process.exit(1);
  }
})();