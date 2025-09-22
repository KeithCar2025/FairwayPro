import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertCoachSchema, insertStudentSchema, insertBookingSchema, insertReviewSchema } from "@shared/schema";
import { fetchGoogleReviewsData, isValidGoogleReviewsUrl } from "@shared/googleReviews";
import bcrypt from "bcrypt";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage.js";
import { ObjectPermission } from "./objectAcl.js";

export async function registerRoutes(app: Express): Promise<Server> {
  // Trust proxy for secure cookies in Replit's production environment
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }
  
  // Configure PostgreSQL session store for reliable session persistence
  const PgSession = ConnectPgSimple(session);
  
  // Session middleware for authentication with PostgreSQL store
  app.use(session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'session', // Table name for storing sessions
      createTableIfMissing: true, // Automatically create session table
    }),
    secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }));

  // Authentication Routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists with this email" });
      }

      // SECURITY: Always create new users as 'student' role only
      // Admin users must be created manually by existing admins
      const userData = { email, password, role: "student" };
      const user = await storage.createUser(userData);
      (req.session as any).userId = user.id;
      
      res.json({ user: { id: user.id, email: user.email, role: user.role } });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      
      const user = await storage.verifyPassword(email, password);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Regenerate session to prevent session fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration failed:", err);
        }
        (req.session as any).userId = user.id;
        res.json({ user: { id: user.id, email: user.email, role: user.role } });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie('connect.sid');
      res.json({ message: "Logged out successfully" });
    });
  });

  // Check authentication status
  app.get("/api/auth/me", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      res.json({ user: { id: user.id, email: user.email, role: user.role } });
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ error: "Authentication check failed" });
    }
  });

  // Coach Registration and Profile Routes
  app.post("/api/coaches/register", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'coach') {
        return res.status(403).json({ error: "Only users with coach role can create coach profiles" });
      }

      const coachData = insertCoachSchema.parse({ ...req.body, userId });
      const coach = await storage.createCoach(coachData);
      
      // Handle specialties, tools, certifications, videos
      const { specialties = [], tools = [], certifications = [], videos = [] } = req.body;
      
      // Persist specialties
      for (const specialty of specialties) {
        await storage.createCoachSpecialty(coach.id, specialty);
      }
      
      // Persist tools
      for (const tool of tools) {
        await storage.createCoachTool(coach.id, tool);
      }
      
      // Persist certifications
      for (const certification of certifications) {
        await storage.createCoachCertification(coach.id, certification);
      }
      
      // Persist videos
      for (const video of videos) {
        await storage.createCoachVideo(coach.id, video);
      }
      
      res.json({
        message: "Coach registration successful! Your profile is pending admin approval. You will be notified once approved and your profile will become visible to students.",
        coach,
        specialties,
        tools, 
        certifications,
        videos,
        status: "pending_approval"
      });
    } catch (error) {
      console.error("Coach registration error:", error);
      res.status(400).json({ error: "Coach registration failed" });
    }
  });

  app.get("/api/coaches/:id", async (req, res) => {
    try {
      const coach = await storage.getCoachWithDetails(req.params.id);
      if (!coach) {
        return res.status(404).json({ error: "Coach not found" });
      }
      res.json(coach);
    } catch (error) {
      console.error("Get coach error:", error);
      res.status(500).json({ error: "Failed to fetch coach" });
    }
  });

  app.put("/api/coaches/:id", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const coach = await storage.getCoach(req.params.id);
      if (!coach || coach.userId !== userId) {
        return res.status(403).json({ error: "Not authorized to update this coach profile" });
      }

      const updates = insertCoachSchema.partial().parse(req.body);
      const updatedCoach = await storage.updateCoach(req.params.id, updates);
      
      res.json(updatedCoach);
    } catch (error) {
      console.error("Update coach error:", error);
      res.status(400).json({ error: "Failed to update coach profile" });
    }
  });

  // Coach Search Routes
  app.get("/api/coaches/search", async (req, res) => {
    try {
      const { location, specialties, minPrice, maxPrice, rating, tools } = req.query;
      
      const searchParams: any = {};
      
      if (location) searchParams.location = location as string;
      if (minPrice && maxPrice) {
        searchParams.priceRange = { 
          min: parseFloat(minPrice as string), 
          max: parseFloat(maxPrice as string) 
        };
      }
      if (rating) searchParams.rating = parseFloat(rating as string);
      if (specialties) {
        searchParams.specialties = Array.isArray(specialties) 
          ? specialties as string[] 
          : [specialties as string];
      }
      if (tools) {
        searchParams.tools = Array.isArray(tools) 
          ? tools as string[] 
          : [tools as string];
      }

      const coaches = await storage.searchCoaches(searchParams);
      res.json(coaches);
    } catch (error) {
      console.error("Coach search error:", error);
      res.status(500).json({ error: "Coach search failed" });
    }
  });

  // Google Reviews Routes
  app.post("/api/coaches/fetch-google-reviews", async (req, res) => {
    try {
      const { googleReviewsUrl } = req.body;
      
      if (!googleReviewsUrl) {
        return res.status(400).json({ error: "Google Reviews URL is required" });
      }

      if (!isValidGoogleReviewsUrl(googleReviewsUrl)) {
        return res.status(400).json({ error: "Invalid Google Reviews URL format" });
      }

      const reviewsData = await fetchGoogleReviewsData(googleReviewsUrl);
      
      if (!reviewsData.isValid) {
        return res.status(400).json({ error: reviewsData.error || "Failed to fetch Google Reviews data" });
      }

      res.json({
        rating: reviewsData.rating,
        reviewCount: reviewsData.reviewCount,
        businessName: reviewsData.businessName,
        isValid: reviewsData.isValid
      });
    } catch (error) {
      console.error("Google Reviews fetch error:", error);
      res.status(500).json({ error: "Failed to fetch Google Reviews data" });
    }
  });

  app.post("/api/coaches/:id/sync-google-reviews", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const coach = await storage.getCoach(req.params.id);
      if (!coach) {
        return res.status(404).json({ error: "Coach not found" });
      }

      // Check if user owns this coach profile or is admin
      const user = await storage.getUser(userId);
      if (coach.userId !== userId && user?.role !== 'admin') {
        return res.status(403).json({ error: "Unauthorized to update this coach profile" });
      }

      if (!coach.googleReviewsUrl) {
        return res.status(400).json({ error: "No Google Reviews URL set for this coach" });
      }

      const reviewsData = await fetchGoogleReviewsData(coach.googleReviewsUrl);
      
      if (!reviewsData.isValid) {
        return res.status(400).json({ error: reviewsData.error || "Failed to fetch Google Reviews data" });
      }

      // Update coach with Google Reviews data
      await storage.updateCoachGoogleReviews(req.params.id, {
        googleRating: reviewsData.rating,
        googleReviewCount: reviewsData.reviewCount,
        lastGoogleSync: new Date()
      });

      res.json({
        message: "Google Reviews data synced successfully",
        rating: reviewsData.rating,
        reviewCount: reviewsData.reviewCount,
        lastSynced: new Date()
      });
    } catch (error) {
      console.error("Google Reviews sync error:", error);
      res.status(500).json({ error: "Failed to sync Google Reviews data" });
    }
  });

  // Student Profile Routes  
  app.post("/api/students/register", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const studentData = insertStudentSchema.parse({ ...req.body, userId });
      const student = await storage.createStudent(studentData);
      
      res.json(student);
    } catch (error) {
      console.error("Student registration error:", error);
      res.status(400).json({ error: "Student registration failed" });
    }
  });

  app.get("/api/students/me", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const student = await storage.getStudentByUserId(userId);
      res.json(student);
    } catch (error) {
      console.error("Get student error:", error);
      res.status(500).json({ error: "Failed to fetch student profile" });
    }
  });

  // Booking Routes
  app.post("/api/bookings", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const student = await storage.getStudentByUserId(userId);
      if (!student) {
        return res.status(400).json({ error: "Student profile required for booking" });
      }

      const bookingData = insertBookingSchema.parse({ 
        ...req.body, 
        studentId: student.id 
      });
      
      const booking = await storage.createBooking(bookingData);
      res.json(booking);
    } catch (error) {
      console.error("Booking creation error:", error);
      res.status(400).json({ error: "Failed to create booking" });
    }
  });

  app.get("/api/bookings/student", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const student = await storage.getStudentByUserId(userId);
      if (!student) {
        return res.json([]);
      }

      const bookings = await storage.getBookingsByStudent(student.id);
      res.json(bookings);
    } catch (error) {
      console.error("Get student bookings error:", error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  app.get("/api/bookings/coach", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'coach') {
        return res.status(403).json({ error: "Only coaches can access coach bookings" });
      }

      const coach = await storage.getCoach(userId);
      if (!coach) {
        return res.json([]);
      }

      const bookings = await storage.getBookingsByCoach(coach.id);
      res.json(bookings);
    } catch (error) {
      console.error("Get coach bookings error:", error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  // Review Routes
  app.post("/api/reviews", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const student = await storage.getStudentByUserId(userId);
      if (!student) {
        return res.status(400).json({ error: "Student profile required for reviews" });
      }

      const reviewData = insertReviewSchema.parse({
        ...req.body,
        studentId: student.id
      });

      const review = await storage.createReview(reviewData);
      res.json(review);
    } catch (error) {
      console.error("Review creation error:", error);
      res.status(400).json({ error: "Failed to create review" });
    }
  });

  app.get("/api/reviews/coach/:coachId", async (req, res) => {
    try {
      const reviews = await storage.getReviewsByCoach(req.params.coachId);
      res.json(reviews);
    } catch (error) {
      console.error("Get coach reviews error:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  // Object Storage Routes
  
  // Serve public assets
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Authentication middleware helper
  const isAuthenticated = (req: any, res: any, next: any) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    req.user = { id: userId };
    next();
  };

  // Admin middleware helper
  const isAdmin = async (req: any, res: any, next: any) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const isAdminUser = await storage.isUserAdmin(userId);
    if (!isAdminUser) {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    req.user = { id: userId };
    next();
  };

  // The endpoint for serving objects with proper public/private access control
  app.get("/objects/:objectPath(*)", async (req, res) => {
    // Get userId from session if available (but don't require authentication)
    const userId = (req.session as any)?.userId;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(404); // Return 404 instead of 401 for better UX
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // The endpoint for getting the upload URL for an object entity
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Update coach profile image endpoint
  app.put("/api/coaches/:id/profile-image", isAuthenticated, async (req, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    const userId = (req.session as any)?.userId;

    try {
      const coach = await storage.getCoach(req.params.id);
      if (!coach || coach.userId !== userId) {
        return res.status(403).json({ error: "Not authorized to update this coach profile" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.imageURL,
        {
          owner: userId,
          visibility: "public", // Profile images should be public
        },
      );

      // Update the coach's image in the database
      const updatedCoach = await storage.updateCoach(req.params.id, { image: objectPath });

      res.status(200).json({
        objectPath: objectPath,
        coach: updatedCoach
      });
    } catch (error) {
      console.error("Error setting profile image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update coach video endpoint
  app.post("/api/coaches/:id/videos", isAuthenticated, async (req, res) => {
    const { title, description, duration, videoURL, thumbnailURL } = req.body;
    
    if (!title || !description || !duration || !videoURL) {
      return res.status(400).json({ error: "Title, description, duration, and videoURL are required" });
    }

    const userId = (req.session as any)?.userId;

    try {
      const coach = await storage.getCoach(req.params.id);
      if (!coach || coach.userId !== userId) {
        return res.status(403).json({ error: "Not authorized to update this coach profile" });
      }

      const objectStorageService = new ObjectStorageService();
      
      // Set ACL for video file
      const videoObjectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        videoURL,
        {
          owner: userId,
          visibility: "public", // Instructional videos should be public
        },
      );

      let thumbnailObjectPath = null;
      if (thumbnailURL) {
        thumbnailObjectPath = await objectStorageService.trySetObjectEntityAclPolicy(
          thumbnailURL,
          {
            owner: userId,
            visibility: "public",
          },
        );
      }

      // Create the video in the database
      const video = await storage.createCoachVideo(coach.id, {
        title,
        description,
        duration,
        videoUrl: videoObjectPath,
        thumbnail: thumbnailObjectPath || videoObjectPath, // Use video as thumbnail if no thumbnail provided
      });

      res.status(201).json({
        video,
        videoObjectPath,
        thumbnailObjectPath
      });
    } catch (error) {
      console.error("Error adding coach video:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Normalize profile image URL and set ACL
  app.post("/api/objects/normalize-profile-image", isAuthenticated, async (req, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    const userId = (req.session as any)?.userId;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.imageURL,
        {
          owner: userId,
          visibility: "public", // Profile images should be public
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error normalizing profile image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Normalize video URL and set ACL
  app.post("/api/objects/normalize-video", isAuthenticated, async (req, res) => {
    if (!req.body.videoURL) {
      return res.status(400).json({ error: "videoURL is required" });
    }

    const userId = (req.session as any)?.userId;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.videoURL,
        {
          owner: userId,
          visibility: "public", // Instructional videos should be public
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error normalizing video:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Normalize thumbnail URL and set ACL
  app.post("/api/objects/normalize-thumbnail", isAuthenticated, async (req, res) => {
    if (!req.body.thumbnailURL) {
      return res.status(400).json({ error: "thumbnailURL is required" });
    }

    const userId = (req.session as any)?.userId;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.thumbnailURL,
        {
          owner: userId,
          visibility: "public", // Thumbnails should be public
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error normalizing thumbnail:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Google Calendar integration routes
  
  // Get Google Calendar authorization URL
  app.get("/api/calendar/auth-url", isAuthenticated, async (req, res) => {
    try {
      const { GoogleCalendarService } = await import("./googleCalendar");
      const calendarService = new GoogleCalendarService();
      
      // Generate state parameter for CSRF protection
      const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      (req.session as any).calendarAuthState = state;
      
      const authUrl = calendarService.getAuthUrl(state);
      
      res.status(200).json({ authUrl });
    } catch (error) {
      console.error("Error generating auth URL:", error);
      res.status(500).json({ error: "Failed to generate authorization URL" });
    }
  });

  // Handle Google Calendar authorization callback
  app.post("/api/calendar/callback", isAuthenticated, async (req, res) => {
    const { code, coachId, state } = req.body;
    
    if (!code || !coachId || !state) {
      return res.status(400).json({ error: "Authorization code, coach ID, and state are required" });
    }

    // Verify state parameter to prevent CSRF
    const expectedState = (req.session as any)?.calendarAuthState;
    if (!expectedState || state !== expectedState) {
      return res.status(400).json({ error: "Invalid state parameter" });
    }

    const userId = (req.session as any)?.userId;

    try {
      // Verify the coach belongs to this user
      const coach = await storage.getCoach(coachId);
      if (!coach || coach.userId !== userId) {
        return res.status(403).json({ error: "Not authorized to update this coach profile" });
      }

      const { GoogleCalendarService } = await import("./googleCalendar");
      const calendarService = new GoogleCalendarService();
      
      // Exchange code for tokens
      const { refreshToken } = await calendarService.exchangeCodeForTokens(code);
      
      // Set refresh token to get calendar ID
      calendarService.setRefreshToken(refreshToken);
      const calendarId = await calendarService.getPrimaryCalendarId();
      
      // Store calendar settings
      await storage.updateCoachCalendarSettings(coachId, {
        googleCalendarId: calendarId,
        googleRefreshToken: refreshToken,
        isEnabled: true,
        lastSyncedAt: new Date(),
      });

      // Perform initial sync
      const syncResult = await calendarService.syncExternalEvents(storage, coachId, calendarId);
      
      res.status(200).json({
        message: "Calendar integration successful",
        syncResult,
      });
    } catch (error) {
      console.error("Error setting up calendar integration:", error);
      res.status(500).json({ error: "Failed to setup calendar integration" });
    }
  });

  // Sync coach calendar manually
  app.post("/api/calendar/sync/:coachId", isAuthenticated, async (req, res) => {
    const { coachId } = req.params;
    const userId = (req.session as any)?.userId;

    try {
      // Verify the coach belongs to this user
      const coach = await storage.getCoach(coachId);
      if (!coach || coach.userId !== userId) {
        return res.status(403).json({ error: "Not authorized to sync this coach's calendar" });
      }

      // Get calendar settings
      const calendarSettings = await storage.getCoachCalendarSettings(coachId);
      if (!calendarSettings?.googleRefreshToken || !calendarSettings?.googleCalendarId) {
        return res.status(400).json({ error: "Calendar integration not set up" });
      }

      const { GoogleCalendarService } = await import("./googleCalendar");
      const calendarService = new GoogleCalendarService();
      calendarService.setRefreshToken(calendarSettings.googleRefreshToken);

      // Perform sync
      const syncResult = await calendarService.syncExternalEvents(
        storage,
        coachId,
        calendarSettings.googleCalendarId,
        calendarSettings.lastSyncToken
      );

      // Update last synced time and sync token
      await storage.updateCoachCalendarSettings(coachId, {
        lastSyncedAt: new Date(),
        lastSyncToken: syncResult.lastSyncToken,
      });

      res.status(200).json({
        message: "Calendar sync completed",
        syncResult,
      });
    } catch (error) {
      console.error("Error syncing calendar:", error);
      res.status(500).json({ error: "Failed to sync calendar" });
    }
  });

  // Get coach availability and busy times
  app.get("/api/coaches/:coachId/availability", async (req, res) => {
    const { coachId } = req.params;
    const { startDate, endDate } = req.query;

    try {
      const coach = await storage.getCoach(coachId);
      if (!coach) {
        return res.status(404).json({ error: "Coach not found" });
      }

      // Get general availability
      const availability = await storage.getCoachAvailability(coachId);

      // Get busy times for date range
      let busyTimes = [];
      if (startDate && endDate) {
        busyTimes = await storage.getCoachBusyTimes(
          coachId,
          new Date(startDate as string),
          new Date(endDate as string)
        );
      }

      res.status(200).json({
        availability,
        busyTimes,
      });
    } catch (error) {
      console.error("Error fetching availability:", error);
      res.status(500).json({ error: "Failed to fetch availability" });
    }
  });

  // Update coach availability
  app.put("/api/coaches/:coachId/availability", isAuthenticated, async (req, res) => {
    const { coachId } = req.params;
    const { availability } = req.body;
    const userId = (req.session as any)?.userId;

    if (!availability || !Array.isArray(availability)) {
      return res.status(400).json({ error: "Valid availability array is required" });
    }

    try {
      // Verify the coach belongs to this user
      const coach = await storage.getCoach(coachId);
      if (!coach || coach.userId !== userId) {
        return res.status(403).json({ error: "Not authorized to update this coach's availability" });
      }

      // Update availability
      await storage.updateCoachAvailability(coachId, availability);

      res.status(200).json({ message: "Availability updated successfully" });
    } catch (error) {
      console.error("Error updating availability:", error);
      res.status(500).json({ error: "Failed to update availability" });
    }
  });

  // Disconnect Google Calendar
  app.delete("/api/calendar/:coachId", isAuthenticated, async (req, res) => {
    const { coachId } = req.params;
    const userId = (req.session as any)?.userId;

    try {
      // Verify the coach belongs to this user
      const coach = await storage.getCoach(coachId);
      if (!coach || coach.userId !== userId) {
        return res.status(403).json({ error: "Not authorized to disconnect this coach's calendar" });
      }

      // Disable calendar integration
      await storage.updateCoachCalendarSettings(coachId, {
        isEnabled: false,
        googleRefreshToken: null,
        googleCalendarId: null,
      });

      res.status(200).json({ message: "Calendar disconnected successfully" });
    } catch (error) {
      console.error("Error disconnecting calendar:", error);
      res.status(500).json({ error: "Failed to disconnect calendar" });
    }
  });

  // Admin routes - protected by isAdmin middleware
  
  // Check if current user is admin
  app.get("/api/admin/check", isAuthenticated, async (req, res) => {
    const userId = (req.session as any)?.userId;
    const isAdminUser = await storage.isUserAdmin(userId);
    res.status(200).json({ isAdmin: isAdminUser });
  });

  // Get all pending coaches for approval
  app.get("/api/admin/pending-coaches", isAdmin, async (req, res) => {
    try {
      const pendingCoaches = await storage.getPendingCoaches();
      res.status(200).json(pendingCoaches);
    } catch (error) {
      console.error("Error fetching pending coaches:", error);
      res.status(500).json({ error: "Failed to fetch pending coaches" });
    }
  });

  // Approve a coach
  app.post("/api/admin/approve-coach/:coachId", isAdmin, async (req, res) => {
    const { coachId } = req.params;
    const adminId = (req.session as any)?.userId;

    try {
      await storage.approveCoach(coachId, adminId);
      res.status(200).json({ message: "Coach approved successfully" });
    } catch (error) {
      console.error("Error approving coach:", error);
      res.status(500).json({ error: "Failed to approve coach" });
    }
  });

  // Reject a coach
  app.post("/api/admin/reject-coach/:coachId", isAdmin, async (req, res) => {
    const { coachId } = req.params;
    const adminId = (req.session as any)?.userId;

    try {
      await storage.rejectCoach(coachId, adminId);
      res.status(200).json({ message: "Coach rejected successfully" });
    } catch (error) {
      console.error("Error rejecting coach:", error);
      res.status(500).json({ error: "Failed to reject coach" });
    }
  });

  // Get all bookings/lessons
  app.get("/api/admin/bookings", isAdmin, async (req, res) => {
    try {
      const bookings = await storage.getAllBookings();
      res.status(200).json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  // Get all coaches (approved, pending, rejected)
  app.get("/api/admin/coaches", isAdmin, async (req, res) => {
    try {
      const coaches = await storage.getAllCoaches();
      res.status(200).json(coaches);
    } catch (error) {
      console.error("Error fetching coaches:", error);
      res.status(500).json({ error: "Failed to fetch coaches" });
    }
  });

  // Get all students
  app.get("/api/admin/students", isAdmin, async (req, res) => {
    try {
      const students = await storage.getAllStudents();
      res.status(200).json(students);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ error: "Failed to fetch students" });
    }
  });

  // Delete a coach
  app.delete("/api/admin/coaches/:coachId", isAdmin, async (req, res) => {
    const { coachId } = req.params;
    const adminId = (req.session as any)?.userId;

    try {
      await storage.deleteCoach(coachId, adminId);
      res.status(200).json({ message: "Coach deleted successfully" });
    } catch (error) {
      console.error("Error deleting coach:", error);
      res.status(500).json({ error: "Failed to delete coach" });
    }
  });

  // Delete a student
  app.delete("/api/admin/students/:studentId", isAdmin, async (req, res) => {
    const { studentId } = req.params;
    const adminId = (req.session as any)?.userId;

    try {
      await storage.deleteStudent(studentId, adminId);
      res.status(200).json({ message: "Student deleted successfully" });
    } catch (error) {
      console.error("Error deleting student:", error);
      res.status(500).json({ error: "Failed to delete student" });
    }
  });

  // Send coach signup link email
  app.post("/api/admin/send-coach-signup", isAdmin, async (req, res) => {
    const { email, message } = req.body;
    const adminId = (req.session as any)?.userId;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    try {
      // Check if SendGrid integration exists
      const { EmailService } = await import("./email.js");
      const emailService = new EmailService();
      
      const signupUrl = `${req.protocol}://${req.get('host')}/coach-registration`;
      const customMessage = message || "You've been invited to join our golf coaching platform as a PGA certified instructor.";
      
      const emailBody = `
        <h2>Golf Coach Platform Invitation</h2>
        <p>${customMessage}</p>
        <p>Click the link below to register as a coach:</p>
        <p><a href="${signupUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Register as Coach</a></p>
        <p>Or copy and paste this URL: ${signupUrl}</p>
        <p>Best regards,<br>The Golf Coach Team</p>
      `;

      await emailService.sendEmail(
        email,
        "Invitation to Join Golf Coach Platform",
        emailBody
      );

      await storage.logAdminAction(adminId, 'send_signup_link', 'email', undefined, JSON.stringify({ email, message: customMessage }));
      
      res.status(200).json({ message: "Coach signup email sent successfully" });
    } catch (error) {
      console.error("Error sending signup email:", error);
      res.status(500).json({ error: "Failed to send signup email" });
    }
  });

  // Get admin action logs
  app.get("/api/admin/actions", isAdmin, async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    
    try {
      const actions = await storage.getAdminActions(limit);
      res.status(200).json(actions);
    } catch (error) {
      console.error("Error fetching admin actions:", error);
      res.status(500).json({ error: "Failed to fetch admin actions" });
    }
  });

  // Profile Routes
  app.get("/api/students/profile/:userId", isAuthenticated, async (req, res) => {
    try {
      const requestedUserId = req.params.userId;
      const currentUserId = (req.session as any)?.userId;
      
      // Users can only access their own profile or admins can access any
      const user = await storage.getUser(currentUserId);
      if (currentUserId !== requestedUserId && user?.role !== 'admin') {
        return res.status(403).json({ error: "Not authorized to access this profile" });
      }
      
      const student = await storage.getStudentByUserId(requestedUserId);
      if (!student) {
        return res.status(404).json({ error: "Student profile not found" });
      }
      
      res.json({ student });
    } catch (error) {
      console.error("Error fetching student profile:", error);
      res.status(500).json({ error: "Failed to fetch student profile" });
    }
  });

  app.get("/api/coaches/profile/:userId", isAuthenticated, async (req, res) => {
    try {
      const requestedUserId = req.params.userId;
      const currentUserId = (req.session as any)?.userId;
      
      // Users can only access their own profile or admins can access any
      const user = await storage.getUser(currentUserId);
      if (currentUserId !== requestedUserId && user?.role !== 'admin') {
        return res.status(403).json({ error: "Not authorized to access this profile" });
      }
      
      // Find coach by user ID
      const coaches = await db.select().from(coaches).where(eq(coaches.userId, requestedUserId));
      const coach = coaches[0];
      
      if (!coach) {
        return res.status(404).json({ error: "Coach profile not found" });
      }
      
      res.json({ coach });
    } catch (error) {
      console.error("Error fetching coach profile:", error);
      res.status(500).json({ error: "Failed to fetch coach profile" });
    }
  });

  app.get("/api/bookings/my-bookings", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      let bookings = [];
      
      if (user.role === 'student') {
        const student = await storage.getStudentByUserId(userId);
        if (student) {
          bookings = await storage.getBookingsByStudent(student.id);
        }
      } else if (user.role === 'coach') {
        const coachList = await db.select().from(coaches).where(eq(coaches.userId, userId));
        const coach = coachList[0];
        if (coach) {
          bookings = await storage.getBookingsByCoach(coach.id);
        }
      }
      
      // Get coach/student names for each booking
      const enrichedBookings = await Promise.all(bookings.map(async (booking) => {
        const coach = await storage.getCoach(booking.coachId);
        const student = await storage.getStudent(booking.studentId);
        
        return {
          ...booking,
          coach: coach ? { name: coach.name, image: coach.image } : null,
          student: student ? { name: student.name } : null,
        };
      }));
      
      res.json({ bookings: enrichedBookings });
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  // Messaging Routes
  app.get("/api/messages/unread-count", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const count = await storage.getUnreadMessagesCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread messages count:", error);
      res.status(500).json({ error: "Failed to fetch unread messages count" });
    }
  });

  app.get("/api/messages/conversations", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const conversations = await storage.getConversations(userId);
      res.json({ conversations });
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/messages/conversation/:otherUserId", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const otherUserId = req.params.otherUserId;
      const messages = await storage.getMessagesWithUser(userId, otherUserId);
      res.json({ messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/messages/mark-read/:senderId", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const senderId = req.params.senderId;
      await storage.markMessagesAsRead(userId, senderId);
      res.json({ message: "Messages marked as read" });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ error: "Failed to mark messages as read" });
    }
  });

  app.post("/api/messages/send", isAuthenticated, async (req, res) => {
    try {
      const senderId = (req.session as any)?.userId;
      const { receiverId, content, bookingId } = req.body;
      
      if (!receiverId || !content?.trim()) {
        return res.status(400).json({ error: "Receiver ID and message content are required" });
      }
      
      // Verify receiver exists
      const receiver = await storage.getUser(receiverId);
      if (!receiver) {
        return res.status(404).json({ error: "Receiver not found" });
      }
      
      const message = await storage.sendMessage({
        senderId,
        receiverId,
        content: content.trim(),
        bookingId: bookingId || null,
      });
      
      res.json({ message });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
