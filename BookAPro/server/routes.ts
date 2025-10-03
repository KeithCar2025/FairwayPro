import type { Express } from "express";
import { pool } from './db';
import { v4 as uuidv4 } from "uuid";
import { supabase } from "./supabaseClient";
import { createServer, type Server } from "http";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { storage } from "./storage";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { z } from "zod";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import express from "express";
import fs from "fs";
import CoachEditProfile from "@/components/CoachEditProfile";
import cors from "cors";import multer from "multer";
const upload = multer();
const { mapCoachDbToApi } = require('./utils/coach-mappers');
import {
  insertUserSchema,
  insertCoachSchema,
  insertStudentSchema,
  insertBookingSchema,
  insertReviewSchema,
} from "@shared/schema";
import {
  fetchGoogleReviewsData,
  isValidGoogleReviewsUrl,
} from "@shared/googleReviews";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage.js";
import { ObjectPermission } from "./objectAcl.js";

import {
  authRedirect,
  oauthCallback,
  getEvents,
  createEvent
} from "./controllers/googleCalendarController.js";
import { createGoogleEvent } from "./services/googleCalendarService.js";

import { pool } from "./db";
pool.query("SELECT NOW()").then(res => {
  console.log("Pool connection OK!", res.rows[0]);
}).catch(err => {
  console.error("Pool connection FAIL!", err);
});
// --- Middleware helpers ---
const isAuthenticated = (req: any, res: any, next: any) => {
  if (!(req.session as any)?.userId) return res.status(401).json({ error: "Not authenticated" });
  req.user = { id: (req.session as any).userId };
  next();
};

const isAdmin = async (req: any, res: any, next: any) => {
  const userId = (req.session as any)?.userId;

  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const isAdmin = await storage.isUserAdmin(userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    req.user = { id: userId };
    next();
  } catch (err) {
    console.error("isAdmin middleware failed:", err);
    return res.status(500).json({ error: "Admin check failed" });
  }
};

export function mapCoachToDB(coach: z.infer<typeof insertCoachSchema>) {
  return {
    id: coach.id || randomUUID(),
    user_id: coach.userId,
    name: coach.name,
    bio: coach.bio || null,
    location: coach.location || null,
    price_per_hour: coach.pricePerHour ?? null,
    rating: coach.rating ?? null,
    review_count: coach.reviewCount ?? null,
    response_time: coach.responseTime || null,
    availability: coach.availability || null,
    years_experiance: coach.yearsExperience ?? null, // note typo
    image: coach.image || null,
    is_verified: coach.isVerified ?? false,
    latitude: coach.latitude ?? null,
    longitude: coach.longitude ?? null,
    approval_status: coach.approvalStatus || "pending",
    approved_at: coach.approvedAt ?? null,
    approved_by: coach.approvedBy ?? null,
    google_reviews_url: coach.googleReviewsUrl || null,
    google_rating: coach.googleRating ?? null,
    google_review_count: coach.googleReviewCount ?? null,
    last_google_sync: coach.lastGoogleSync ?? null,
    pga_certification_id: coach.pgaCertificationId || null,
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // --- CORS ---
  app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }));

  // --- Session setup (ALWAYS use shared pool!) ---
  const PgSession = ConnectPgSimple(session);
  app.use(
    session({
      store: new PgSession({
        pool: pool, // CRITICAL: use shared pool, not conString!
        tableName: "session",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "dev-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
      },
    })
  );

  // --- Body parser ---
  app.use(express.json());

  // -----------------------------
  // AUTH ROUTES
  // -----------------------------
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) return res.status(400).json({ error: "User already exists" });

    const user = await storage.createUser({ email, password, role: "student" });
    (req.session as any).userId = user.id;

    // Automatically create student profile upon registration
await storage.createStudent({
  id: uuidv4(),
  user_id: user.id,
  name: name || "",
  phone: "",
  skill_level: "",
  preferences: ""
});

    res.json({ user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(400).json({ error: "Registration failed" });
  }
});

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: "Email and password required" });

      const user = await storage.verifyPassword(email, password);
      if (!user) return res.status(401).json({ error: "Invalid credentials" });

      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration failed:", err);
          return res.status(500).json({ error: "Session error" }); // return!
        }
        (req.session as any).userId = user.id;
        res.json({ user: { id: user.id, email: user.email, role: user.role } });
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ error: "Logout failed" });
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ error: "User not found" });

      res.json({ user: { id: user.id, email: user.email, role: user.role } });
    } catch (err) {
      console.error("Auth check error:", err);
      res.status(500).json({ error: "Authentication check failed" });
    }
  });

  // -----------------------------
  // ADMIN API ROUTES
  // -----------------------------
  app.get("/api/admin/check", async (req, res) => {
    const userId = (req.session as any)?.userId;

    if (!userId) {
      return res.json({ isAdmin: false });
    }

    try {
      const isAdmin = await storage.isUserAdmin(userId);
      return res.json({ isAdmin });
    } catch (err) {
      console.error("Error in /api/admin/check:", err);
      return res.json({ isAdmin: false });
    }
  });

  app.get("/api/admin/pending-coaches", isAdmin, async (_req, res) => res.json(await storage.getPendingCoaches()));
app.post("/api/admin/approve-coach/:id", isAdmin, async (req, res) => {
  try {
    const coach = await storage.approveCoach(req.params.id, req.user?.id);
    res.json({ success: true, coach });
  } catch (error) {
    console.error("Approve coach error:", error);
    res.status(500).json({ error: "Failed to approve coach", details: error.message });
  }
});

  app.post("/api/admin/reject-coach/:id", isAdmin, async (req, res) => {
    try {
      const coach = await storage.rejectCoach(req.params.id, req.user.id);
      res.json(coach);
    } catch (error) {
      console.error("Reject coach error:", error);
      res.status(500).json({ error: "Failed to reject coach" });
    }
  });
  app.get("/api/admin/bookings", isAdmin, async (_req, res) => res.json(await storage.getAllBookings()));
  app.get("/api/admin/coaches", isAdmin, async (_req, res) => res.json(await storage.getAllCoaches()));
  app.delete("/api/admin/coaches/:id", isAdmin, async (req, res) => { await storage.deleteCoach(req.params.id, req.user.id); res.json({ success: true }); });
  app.get("/api/admin/students", isAdmin, async (_req, res) => res.json(await storage.getAllStudents()));
  app.delete("/api/admin/students/:id", isAdmin, async (req, res) => { await storage.deleteStudent(req.params.id, req.user.id); res.json({ success: true }); });
  app.post("/api/admin/send-coach-signup", isAdmin, async (req, res) => { await storage.sendCoachSignupInvite(req.body.email, req.body.message, req.user.id); res.json({ success: true }); });
  app.get("/api/admin/actions", isAdmin, async (_req, res) => res.json(await storage.getAdminActions()));
  app.get("/api/admin/dashboard", isAdmin, async (req, res) => res.json({ message: "Welcome Admin!", userId: req.user.id }));



  // -----------------------------
  // COACH ROUTES
  // -----------------------------
  app.post("/api/coaches/register", async (req, res) => {
    try {
      const { email, password, ...coachData } = req.body;
      if (!email || !password) return res.status(400).json({ error: "Email and password required" });

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) return res.status(400).json({ error: "User already exists" });

      // 1️⃣ Create the user
      const user = await storage.createUser({ email, password, role: "coach" });
      (req.session as any).userId = user.id;

      // 2️⃣ Validate coach data
      const coachProfile = insertCoachSchema.parse({
        id: randomUUID(),
        userId: user.id,
        ...coachData,
        pricePerHour: coachData.pricePerHour ?? null,
        latitude: coachData.latitude ?? null,
        longitude: coachData.longitude ?? null,
        image: coachData.image ?? null,
        googleReviewsUrl: coachData.googleReviewsUrl ?? null,
      });

      // 3️⃣ Map to DB format
      const dbCoach = mapCoachToDB(coachProfile);

      // 4️⃣ Save coach
      const coach = await storage.createCoach(dbCoach);

      // 5️⃣ Save related entities
      const { specialties = [], tools = [], certifications = [], videos = [] } = req.body;
      for (const s of specialties) await storage.createCoachSpecialty(coach.id, s);
      for (const t of tools) await storage.createCoachTool(coach.id, t);
      for (const c of certifications) await storage.createCoachCertification(coach.id, c);
      for (const v of videos) await storage.createCoachVideo(coach.id, v);

      res.status(201).json({
        message: "Your coach profile has been submitted for admin approval.",
        user: { id: user.id, email: user.email, role: user.role },
        coach,
        specialties,
        tools,
        certifications,
        videos,
        status: "pending_approval",
      });

    } catch (err: any) {
      console.error("Coach registration error:", err);
      res.status(400).json({ error: "Coach registration failed", details: err.errors ?? err });
    }
  });
app.get("/api/coaches/me", async (req, res) => {
  const userId = (req.session as any)?.userId; // THIS SHOULD BE THE USER ID STRING
  console.log("DEBUG /api/coaches/me userId from session:", userId);

  try {
    const coach = await storage.getCoachWithDetailsByUserId(userId);
    if (!coach) return res.status(404).json({ error: "Coach not found" });
    res.json(coach);
  } catch (error) {
    console.error("Get coach by userId error:", error);
    res.status(500).json({ error: "Failed to fetch coach profile", details: error.message });
  }
});
app.get('/api/coaches', async (req, res) => {
  try {
    const coaches = await storage.getApprovedCoaches();

    res.json(coaches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch coaches' });
  }
});
app.put("/api/coaches/me", async (req, res) => {
  const userId = (req.session as any)?.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    console.log("PUT /api/coaches/me body:", req.body); // <--- LOG THIS
    await storage.updateCoachProfileFull(userId, req.body);
    res.json({ message: "Profile updated" });
  } catch (error) {
    console.error("Update coach profile error:", error);
    res.status(400).json({ error: "Failed to update coach profile", details: (error as any).message });
  }
});
  app.get("/api/coaches/:id", async (req, res) => {
    try {
      const coach = await storage.getCoachWithDetailsByUserId(req.params.id);
	  const apiCoaches = coaches.map(mapCoachDbToApi);
      if (!coach) return res.status(404).json({ error: "Coach not found" });
      res.json(coach);
    } catch (error) {
      console.error("Get coach error:", error);
      res.status(500).json({ error: "Failed to fetch coach" });
    }
  });



  app.put("/api/coaches/:id", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const coach = await storage.getCoach(req.params.id);
      if (!coach || coach.userId !== userId) return res.status(403).json({ error: "Not authorized to update this coach profile" });

      const updates = insertCoachSchema.partial().parse(req.body);
      res.json(await storage.updateCoach(req.params.id, updates));
    } catch (error) {
      console.error("Update coach error:", error);
      res.status(400).json({ error: "Failed to update coach profile" });
    }
  });

  app.get("/api/coaches/search", async (req, res) => {
    try {
      const { location, specialties, minPrice, maxPrice, rating, tools } = req.query;
      const searchParams: any = {};
      if (location) searchParams.location = location as string;
      if (minPrice && maxPrice) searchParams.priceRange = { min: parseFloat(minPrice as string), max: parseFloat(maxPrice as string) };
      if (rating) searchParams.rating = parseFloat(rating as string);
      if (specialties) searchParams.specialties = Array.isArray(specialties) ? specialties as string[] : [specialties as string];
      if (tools) searchParams.tools = Array.isArray(tools) ? tools as string[] : [tools as string];
      res.json(await storage.searchCoaches(searchParams));
    } catch (error) {
      console.error("Coach search error:", error);
      res.status(500).json({ error: "Coach search failed" });
    }
  });
app.get("/api/google/auth", isAuthenticated, authRedirect);
app.get("/api/google/callback", isAuthenticated, oauthCallback);
app.get("/api/google/events", isAuthenticated, getEvents);
app.post("/api/google/events", isAuthenticated, async (req, res) => {
  try {
    const { coachUserId, summary, description, start, end } = req.body;
    if (!coachUserId || !summary || !description || !start || !end) {
      return res.status(400).json({
        error: "Missing required fields: coachUserId, summary, description, start, end are all required.",
        received: req.body
      });
    }
    const coach = await storage.getCoachByUserId(coachUserId);
    if (!coach) {
      return res.status(403).json({ error: "Coach not found or not authorized." });
    }
    // Use coach.id for calendar settings and event creation
    const calendarSettings = await storage.getCoachCalendarSettings(coach.id);
    if (!calendarSettings?.googleRefreshToken) {
      return res.status(400).json({ error: "Coach has not connected Google Calendar." });
    }

    // --- THIS IS THE CRITICAL FIX ---
    const event = await createGoogleEvent(coach.id, {
      summary,
      description,
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString()
    });

    res.json({ success: true, event });

  } catch (error) {
    console.error("Error in /api/google/events:", error);
    if (error.response?.data) {
      console.error("Google API error details:", error.response.data);
    }
    res.status(400).json({
      error: error.message,
      details: error.stack,
      google: error.response?.data
    });
  }
});
  // --- Google Reviews ---
  app.post("/api/coaches/fetch-google-reviews", async (req, res) => {
    try {
      const { googleReviewsUrl } = req.body;
      if (!googleReviewsUrl) return res.status(400).json({ error: "Google Reviews URL is required" });
      if (!isValidGoogleReviewsUrl(googleReviewsUrl)) return res.status(400).json({ error: "Invalid Google Reviews URL" });

      const reviewsData = await fetchGoogleReviewsData(googleReviewsUrl);
      if (!reviewsData.isValid) return res.status(400).json({ error: reviewsData.error || "Failed to fetch Google Reviews" });

      res.json({
        rating: reviewsData.rating,
        reviewCount: reviewsData.reviewCount,
        businessName: reviewsData.businessName,
        isValid: reviewsData.isValid
      });
    } catch (error) {
      console.error("Google Reviews fetch error:", error);
      res.status(500).json({ error: "Failed to fetch Google Reviews" });
    }
  });

  app.post("/api/coaches/:id/sync-google-reviews", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const coach = await storage.getCoach(req.params.id);
      if (!coach) return res.status(404).json({ error: "Coach not found" });

      const user = await storage.getUser(userId);
      if (coach.userId !== userId && user?.role !== 'admin') return res.status(403).json({ error: "Unauthorized" });
      if (!coach.googleReviewsUrl) return res.status(400).json({ error: "No Google Reviews URL set" });

      const reviewsData = await fetchGoogleReviewsData(coach.googleReviewsUrl);
      if (!reviewsData.isValid) return res.status(400).json({ error: reviewsData.error || "Failed to fetch Google Reviews" });

      await storage.updateCoachGoogleReviews(req.params.id, {
        googleRating: reviewsData.rating,
        googleReviewCount: reviewsData.reviewCount,
        lastGoogleSync: new Date()
      });

      res.json({ message: "Google Reviews synced successfully", rating: reviewsData.rating, reviewCount: reviewsData.reviewCount, lastSynced: new Date() });
    } catch (error) {
      console.error("Google Reviews sync error:", error);
      res.status(500).json({ error: "Failed to sync Google Reviews" });
    }
  });
app.get("/api/coaches/:id/available-times", async (req, res) => {
  try {
    const { id: coachId } = req.params;
    const { date } = req.query; // Expecting YYYY-MM-DD

    if (!coachId || !date) {
      return res.status(400).json({ error: "coachId and date are required" });
    }

    // Example: generate candidate slots (adjust as needed)
    const defaultSlots = [
      "9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM",
      "2:00 PM", "3:00 PM", "4:00 PM"
    ];

    // --- Fetch Google Calendar Events for the day ---
    // You should implement this utility function
    const { fetchGoogleEvents } = await import("./services/googleCalendarService.js");
    let busyTimes: { start: string, end: string }[] = [];
    try {
      const events = await fetchGoogleEvents(coachId);
      // Filter events for this date
      busyTimes = events
        .filter(event => {
          // event.start.dateTime and event.end.dateTime are ISO strings
          return event.start?.dateTime && event.end?.dateTime &&
            event.start.dateTime.startsWith(date); // crude check, works for single-day events
        })
        .map(event => ({
          start: event.start.dateTime,
          end: event.end.dateTime
        }));
    } catch (err) {
      console.error("Error fetching Google events:", err);
      // Optionally, return all slots if calendar is not connected
    }

    // Utility to check for overlap; you may want to make this time-zone aware
    function isSlotAvailable(slotTime: string) {
      // Convert slotTime (e.g., '9:00 AM') to a Date on the target day
      const slotStart = new Date(`${date} ${slotTime}`);
      const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000); // 1hr slot
      return !busyTimes.some(({ start, end }) => {
        const busyStart = new Date(start);
        const busyEnd = new Date(end);
        return slotStart < busyEnd && slotEnd > busyStart;
      });
    }

    // Filter out busy slots
    const available = defaultSlots.filter(isSlotAvailable);

    res.json({ times: available });
  } catch (error) {
    console.error("Available times error:", error);
    res.status(500).json({ error: "Failed to fetch available times" });
  }
});
  // -----------------------------
  // STUDENT ROUTES
  // -----------------------------
  app.post("/api/students/register", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const student = await storage.createStudent(insertStudentSchema.parse({ ...req.body, userId }));
      res.json(student);
    } catch (error) {
      console.error("Student registration error:", error);
      res.status(400).json({ error: "Student registration failed" });
    }
  });

  app.get("/api/students/me", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      res.json(await storage.getStudentByUserId(userId));
    } catch (error) {
      console.error("Get student error:", error);
      res.status(500).json({ error: "Failed to fetch student profile" });
    }
  });

  // -----------------------------
  // BOOKING ROUTES
  // -----------------------------
app.post("/api/bookings", async (req, res) => {
  try {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const student = await storage.getStudentByUserId(userId);
    if (!student) return res.status(400).json({ error: "Student profile required for booking" });

    // Map frontend fields to DB columns
    const reqBody = {
      ...req.body,
	  id: uuidv4(),
	  lesson_type: req.body.lesson_type ?? req.body.lessonType,
      student_id: student.id,
      coach_id: req.body.coachId,                  // <-- map correctly
      date: req.body.date ? new Date(req.body.date) : undefined,
      duration: req.body.duration ? Number(req.body.duration) : undefined,
      total_amount: req.body.totalAmount ? Number(req.body.totalAmount) : undefined, // <-- map and convert
    };

    // Optionally delete camelCase props to avoid confusion
    delete reqBody.coachId;
    delete reqBody.studentId;
    delete reqBody.totalAmount;

    const booking = await storage.createBooking(insertBookingSchema.parse(reqBody));
    res.json(booking);
  } catch (error) {
    console.error("Booking creation error:", error);
    res.status(400).json({ error: "Failed to create booking" });
  }
});

  app.get("/api/bookings/my-bookings", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ error: "User not found" });

      let bookings: any[] = [];
      if (user.role === 'student') {
        const student = await storage.getStudentByUserId(userId);
        if (student) bookings = await storage.getBookingsByStudent(student.id);
      } else if (user.role === 'coach') {
        const coach = await storage.getCoach(userId);
        if (coach) bookings = await storage.getBookingsByCoach(coach.id);
      }

      const enriched = await Promise.all(bookings.map(async b => {
        const coach = await storage.getCoach(b.coachId);
        const student = await storage.getStudent(b.studentId);
        return {
          ...b,
          coach: coach ? { name: coach.name, image: coach.image } : null,
          student: student ? { name: student.name } : null
        };
      }));

      res.json({ bookings: enriched });
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  // -----------------------------
  // REVIEW ROUTES
  // -----------------------------
  app.post("/api/reviews", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const student = await storage.getStudentByUserId(userId);
      if (!student) return res.status(400).json({ error: "Student profile required for reviews" });

      res.json(await storage.createReview(insertReviewSchema.parse({ ...req.body, studentId: student.id })));
    } catch (error) {
      console.error("Review creation error:", error);
      res.status(400).json({ error: "Failed to create review" });
    }
  });

  app.get("/api/reviews/coach/:coachId", async (req, res) => {
    try {
      res.json(await storage.getReviewsByCoach(req.params.coachId));
    } catch (error) {
      console.error("Get coach reviews error:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  // -----------------------------
  // OBJECT STORAGE ROUTES
  // -----------------------------
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const userId = (req.session as any)?.userId;
    const service = new ObjectStorageService();
    try {
      const objectFile = await service.getObjectEntityFile(req.path);
      const canAccess = await service.canAccessObjectEntity({ objectFile, userId, requestedPermission: ObjectPermission.READ });
      if (!canAccess) return res.sendStatus(404);
      service.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Object access error:", error);
      if (error instanceof ObjectNotFoundError) return res.sendStatus(404);
      res.sendStatus(500);
    }
  });

app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
  try {
    const { filename, contentType } = req.body;
    if (!filename || !contentType) {
      return res.status(400).json({ error: "filename and contentType required" });
    }

    const { data, error } = await supabase.storage
      .from("profile-images")
      .createSignedUploadUrl(filename, { contentType });

    if (error) throw error;

    res.json({
      uploadURL: data.signedUrl,
      path: data.path,
    });
  } catch (err: any) {
    console.error("Error getting Supabase upload URL:", err);
    res.status(500).json({ error: err.message });
  }
});

  // -----------------------------
  // MESSAGING ROUTES
  // -----------------------------
  app.get("/api/messages/unread-count", isAuthenticated, async (req, res) => {
    try { const count = await storage.getUnreadMessagesCount((req.session as any).userId); res.json({ count }); } 
    catch (error) { console.error(error); res.status(500).json({ error: "Failed to fetch unread messages" }); }
  });

  app.get("/api/messages/conversations", isAuthenticated, async (req, res) => {
    try { const conversations = await storage.getConversations((req.session as any).userId); res.json({ conversations }); } 
    catch (error) { console.error(error); res.status(500).json({ error: "Failed to fetch conversations" }); }
  });

  app.post("/api/messages/send", isAuthenticated, async (req, res) => {
    try {
      const senderId = (req.session as any).userId;
      const { receiverId, content, bookingId } = req.body;
      if (!receiverId || !content?.trim()) return res.status(400).json({ error: "Receiver ID and message content required" });

      const receiver = await storage.getUser(receiverId);
      if (!receiver) return res.status(404).json({ error: "Receiver not found" });

      const message = await storage.sendMessage({ senderId, receiverId, content: content.trim(), bookingId: bookingId || null });
      res.json({ message });
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });
  
   // --- STATIC SERVING (ALWAYS LAST) ---
  const publicDir = path.join(__dirname, "public"); // dist/public
  const publicIndex = path.join(publicDir, "index.html");
  if (fs.existsSync(publicIndex)) {
    app.use(express.static(publicDir));
    app.get("*", (_req, res) => res.sendFile(publicIndex));
  } else {
    app.get("*", (_req, res) => {
      res.status(200).send(`
        <html>
          <body style="font-family: sans-serif; padding: 2em;">
            <h2>⚠️ No frontend build found</h2>
            <p>
              <b>dist/public/index.html</b> was not found.<br>
              <br>
              <b>DEV HINT:</b> Run <code>npm run build</code> to generate your frontend.<br>
              API routes at <code>/api/*</code> are working!
            </p>
          </body>
        </html>
      `);
    });
  }

console.log("publicDir:", publicDir);
console.log("publicIndex exists?", fs.existsSync(publicIndex));
 
  // --- HTTP Server ---
  const httpServer = createServer(app);
  return httpServer;
}