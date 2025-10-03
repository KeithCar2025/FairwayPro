import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- Table Definitions ---

// Users table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("student"), // "student", "coach", or "admin"
  createdAt: timestamp("created_at").defaultNow(),
});

// Students table for customer profiles
export const students = pgTable("students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone"),
  skillLevel: text("skill_level"), // beginner, intermediate, advanced
  preferences: text("preferences"), // JSON string for lesson preferences
  createdAt: timestamp("created_at").defaultNow(),
});

// Coaches table for instructor profiles
export const coaches = pgTable("coaches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  bio: text("bio").notNull(),
  location: text("location").notNull(),
  pricePerHour: decimal("price_per_hour", { precision: 10, scale: 2 }).notNull(),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  reviewCount: integer("review_count").default(0),
  responseTime: text("response_time").default("24 hours"),
  availability: text("availability").default("Available"),
  yearsExperience: integer("years_experience").notNull(),
  pgaCertificationId: text("pga_certification_id").notNull(), // PGA certification number or ID
  image: text("image"), // URL to profile image
  isVerified: boolean("is_verified").default(false),
  approvalStatus: text("approval_status").notNull().default("pending"), // "pending", "approved", "rejected"
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by").references(() => users.id),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  googleReviewsUrl: text("google_reviews_url"),
  googleRating: decimal("google_rating", { precision: 3, scale: 2 }),
  googleReviewCount: integer("google_review_count").default(0),
  lastGoogleSync: timestamp("last_google_sync"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Coach specialties
export const coachSpecialties = pgTable("coach_specialties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: varchar("coach_id").notNull().references(() => coaches.id, { onDelete: "cascade" }),
  specialty: text("specialty").notNull(),
});

// Coach tools and equipment
export const coachTools = pgTable("coach_tools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: varchar("coach_id").notNull().references(() => coaches.id, { onDelete: "cascade" }),
  tool: text("tool").notNull(),
});

// Coach certifications
export const coachCertifications = pgTable("coach_certifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: varchar("coach_id").notNull().references(() => coaches.id, { onDelete: "cascade" }),
  certification: text("certification").notNull(),
});

// Coach instructional videos
export const coachVideos = pgTable("coach_videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: varchar("coach_id").notNull().references(() => coaches.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  thumbnail: text("thumbnail").notNull(),
  duration: text("duration").notNull(),
  videoUrl: text("video_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Lesson bookings
export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  coachId: varchar("coach_id").notNull().references(() => coaches.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  time: text("time").notNull(),
  duration: integer("duration").notNull().default(60), // minutes
  lessonType: text("lesson_type").notNull(),
  location: text("location").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("pending"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentStatus: text("payment_status").notNull().default("pending"),
  paymentIntentId: text("payment_intent_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reviews and ratings
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull().unique().references(() => bookings.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  coachId: varchar("coach_id").notNull().references(() => coaches.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Coach availability and calendar integration
export const coachAvailability = pgTable("coach_availability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: varchar("coach_id").notNull().references(() => coaches.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Coach calendar integration settings
export const coachCalendarSettings = pgTable("coach_calendar_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: varchar("coach_id").notNull().unique().references(() => coaches.id, { onDelete: "cascade" }),
  googleCalendarId: text("google_calendar_id"),
  googleRefreshToken: text("google_refresh_token"),
  isEnabled: boolean("is_enabled").default(false),
  lastSyncedAt: timestamp("last_synced_at"),
  lastSyncToken: text("last_sync_token"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Time blocks to represent busy periods from external calendars
export const coachBusyTimes = pgTable("coach_busy_times", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: varchar("coach_id").notNull().references(() => coaches.id, { onDelete: "cascade" }),
  startDateTime: timestamp("start_date_time").notNull(),
  endDateTime: timestamp("end_date_time").notNull(),
  source: text("source").notNull().default("google_calendar"),
  externalEventId: text("external_event_id"),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Admin actions log for tracking admin activities
export const adminActions = pgTable("admin_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: varchar("target_id"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Messages between coaches and students
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: varchar("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bookingId: varchar("booking_id").references(() => bookings.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- Relationships ---
export const usersRelations = relations(users, ({ one }) => ({
  student: one(students, { fields: [users.id], references: [students.userId] }),
  coach: one(coaches, { fields: [users.id], references: [coaches.userId] }),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  user: one(users, { fields: [students.userId], references: [users.id] }),
  bookings: many(bookings),
  reviews: many(reviews),
}));

export const coachesRelations = relations(coaches, ({ one, many }) => ({
  user: one(users, { fields: [coaches.userId], references: [users.id] }),
  specialties: many(coachSpecialties),
  tools: many(coachTools),
  certifications: many(coachCertifications),
  videos: many(coachVideos),
  bookings: many(bookings),
  reviews: many(reviews),
  availability: many(coachAvailability),
  calendarSettings: one(coachCalendarSettings, { fields: [coaches.id], references: [coachCalendarSettings.coachId] }),
  busyTimes: many(coachBusyTimes),
}));

export const coachSpecialtiesRelations = relations(coachSpecialties, ({ one }) => ({
  coach: one(coaches, { fields: [coachSpecialties.coachId], references: [coaches.id] }),
}));

export const coachToolsRelations = relations(coachTools, ({ one }) => ({
  coach: one(coaches, { fields: [coachTools.coachId], references: [coaches.id] }),
}));

export const coachCertificationsRelations = relations(coachCertifications, ({ one }) => ({
  coach: one(coaches, { fields: [coachCertifications.coachId], references: [coaches.id] }),
}));

export const coachVideosRelations = relations(coachVideos, ({ one }) => ({
  coach: one(coaches, { fields: [coachVideos.coachId], references: [coaches.id] }),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  student: one(students, { fields: [bookings.studentId], references: [students.id] }),
  coach: one(coaches, { fields: [bookings.coachId], references: [coaches.id] }),
  review: one(reviews, { fields: [bookings.id], references: [reviews.bookingId] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  booking: one(bookings, { fields: [reviews.bookingId], references: [bookings.id] }),
  student: one(students, { fields: [reviews.studentId], references: [students.id] }),
  coach: one(coaches, { fields: [reviews.coachId], references: [coaches.id] }),
}));

export const coachAvailabilityRelations = relations(coachAvailability, ({ one }) => ({
  coach: one(coaches, { fields: [coachAvailability.coachId], references: [coaches.id] }),
}));

export const coachCalendarSettingsRelations = relations(coachCalendarSettings, ({ one }) => ({
  coach: one(coaches, { fields: [coachCalendarSettings.coachId], references: [coaches.id] }),
}));

export const coachBusyTimesRelations = relations(coachBusyTimes, ({ one }) => ({
  coach: one(coaches, { fields: [coachBusyTimes.coachId], references: [coaches.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
  receiver: one(users, { fields: [messages.receiverId], references: [users.id] }),
  booking: one(bookings, { fields: [messages.bookingId], references: [bookings.id] }),
}));

// --- Zod Insert Schemas ---
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
  createdAt: true,
});

const baseCoachSchema = createInsertSchema(coaches).omit({
  id: true,
  createdAt: true,
  rating: true,
  reviewCount: true,
});

export const insertCoachSchema = z.object({
  ...baseCoachSchema.shape,
  pricePerHour: z.number(),
});

// -- Booking Zod Schema (explicit, snake_case) --
export const insertBookingSchema = z.object({
  id: z.string().optional(),
  student_id: z.string(),
  coach_id: z.string(),
  date: z.date(),
  time: z.string(),
  duration: z.number(),
  lesson_type: z.string(),
  location: z.string(),
  notes: z.string().optional(),
  status: z.string().optional(),
  total_amount: z.number(),
  payment_status: z.string().optional(),
  payment_intent_id: z.string().optional(),
  created_at: z.date().optional(),
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  isRead: true,
});

// --- TypeScript Types ---
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;

export type Coach = typeof coaches.$inferSelect;
export type InsertCoach = z.infer<typeof insertCoachSchema>;

export type CoachSpecialty = typeof coachSpecialties.$inferSelect;
export type CoachTool = typeof coachTools.$inferSelect;
export type CoachCertification = typeof coachCertifications.$inferSelect;
export type CoachVideo = typeof coachVideos.$inferSelect;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

export type CoachAvailability = typeof coachAvailability.$inferSelect;
export type CoachCalendarSettings = typeof coachCalendarSettings.$inferSelect;
export type CoachBusyTimes = typeof coachBusyTimes.$inferSelect;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;