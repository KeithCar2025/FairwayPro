import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { supabase } from "./supabaseClient";
import passport from "passport";
import helmet from "helmet";

const PgSession = ConnectPgSimple(session);
const app = express();

// --- Essential Middleware ---
app.use(express.json());

// Configure Helmet CSP to keep default-src 'self', allow same-origin XHR/fetch,
// and allow Google iframe for embedded map.
const dev = app.get("env") === "development";
const connectSrc: string[] = ["'self'"];
if (dev) {
  // If you use Vite HMR websockets, allow ws/wss during dev
  connectSrc.push("ws:", "wss:");
}

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        // Allow API/XHR to our origin and Supabase storage endpoints (PUT/GET signed URLs)
        "connect-src": connectSrc,
        // Allow images from our origin, base64 data URLs, local blob previews, and Supabase storage CDN
        "img-src": ["'self'", "data:", "blob:", "https://*.supabase.co"],
        // If you render uploaded videos (Uppy previews or Supabase files)
        "media-src": ["'self'", "data:", "blob:", "https://*.supabase.co"],
        // Allow Google maps iframe and reCAPTCHA
        "frame-src": ["'self'", "https://www.google.com", "https://recaptcha.google.com"],
        // Add this directive for reCAPTCHA
        "script-src": ["'self'", "https://www.google.com", "https://www.gstatic.com", "https://www.recaptcha.net"],
        // Optional (if you use inline styles or CSS-in-JS): "style-src": ["'self'", "'unsafe-inline'"],
        // Optional (if you load fonts from CDNs): "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
        // Optional (if using web workers created from blobs): "worker-src": ["'self'", "blob:"],
      },
    },
    // Optional: disable CORP if you embed assets cross-origin and see CORP-related issues
    // crossOriginResourcePolicy: false,
  })
);
app.use(express.urlencoded({ extended: false }));

// --- CORS: Allow frontend to send cookies for session auth ---
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// --- Session: Store sessions in Postgres ---
app.use(
  session({
    store: new PgSession({ pool, tableName: "session", createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: false, // dev over HTTP
      sameSite: "lax",
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Mount all application routes
await registerRoutes(app);

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

// Optional: Supabase JWT middleware if you support token auth
app.use((req, _res, next) => {
  console.log("Session check:", req.session ? "exists" : "undefined");
  next();
});

app.use(async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error) {
    console.warn("Supabase auth error:", error.message);
    return next();
  }

  (req as any).user = user;
  next();
});

(async () => {
  try {
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