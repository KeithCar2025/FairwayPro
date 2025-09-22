// javascript_database integration - from blueprint:javascript_database
import { 
  users, coaches, students, bookings, reviews, 
  coachSpecialties, coachTools, coachCertifications, coachVideos,
  coachCalendarSettings, coachBusyTimes, coachAvailability, adminActions, messages,
  type User, type InsertUser, type Coach, type Student, 
  type InsertCoach, type InsertStudent, type Booking, type InsertBooking,
  type Review, type InsertReview, type Message, type InsertMessage
} from "@shared/schema";
import { db } from "./db";
import { eq, like, and, desc, sql, type SQL } from "drizzle-orm";
import bcrypt from "bcrypt";

// Interface for user creation with plain password (for internal use)
interface CreateUserData {
  email: string;
  password: string;
  role?: string;
}

// CRUD methods for the golf coach platform
export interface IStorage {
  // User authentication
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: CreateUserData): Promise<User>;
  verifyPassword(email: string, password: string): Promise<User | null>;
  
  // Coach management
  getCoach(id: string): Promise<Coach | undefined>;
  getCoachWithDetails(id: string): Promise<any>;
  createCoach(coach: InsertCoach): Promise<Coach>;
  updateCoach(id: string, coach: Partial<InsertCoach>): Promise<Coach>;
  updateCoachGoogleReviews(id: string, reviews: {
    googleRating?: string;
    googleReviewCount?: number;
    lastGoogleSync?: Date;
  }): Promise<void>;
  searchCoaches(params: {
    location?: string;
    specialties?: string[];
    priceRange?: { min: number; max: number };
    rating?: number;
    tools?: string[];
  }): Promise<any[]>;
  
  // Student management
  getStudent(id: string): Promise<Student | undefined>;
  getStudentByUserId(userId: string): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: string, student: Partial<InsertStudent>): Promise<Student>;
  
  // Booking management
  getBooking(id: string): Promise<Booking | undefined>;
  getBookingsByStudent(studentId: string): Promise<Booking[]>;
  getBookingsByCoach(coachId: string): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: string, updates: Partial<Booking>): Promise<Booking>;
  
  // Review management
  createReview(review: InsertReview): Promise<Review>;
  getReviewsByCoach(coachId: string): Promise<Review[]>;
  
  // Coach specialties, tools, certifications, and videos
  createCoachSpecialty(coachId: string, specialty: string): Promise<void>;
  createCoachTool(coachId: string, tool: string): Promise<void>;
  createCoachCertification(coachId: string, certification: string): Promise<void>;
  createCoachVideo(coachId: string, video: { title: string; description: string; thumbnail: string; duration: string; videoUrl?: string }): Promise<void>;
  
  // Calendar and availability management
  getCoachCalendarSettings(coachId: string): Promise<any>;
  updateCoachCalendarSettings(coachId: string, settings: {
    googleCalendarId?: string | null;
    googleRefreshToken?: string | null;
    isEnabled?: boolean;
    lastSyncedAt?: Date;
    lastSyncToken?: string;
  }): Promise<void>;
  updateCoachBusyTime(busyTime: {
    coachId: string;
    startDateTime: Date;
    endDateTime: Date;
    source: string;
    externalEventId: string | null;
    title?: string;
  }): Promise<void>;
  removeCoachBusyTime(coachId: string, externalEventId: string): Promise<void>;
  getCoachBusyTimes(coachId: string, startDate?: Date, endDate?: Date): Promise<any[]>;
  getCoachAvailability(coachId: string): Promise<any[]>;
  updateCoachAvailability(coachId: string, availability: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }[]): Promise<void>;
  
  // Admin functionality
  isUserAdmin(userId: string): Promise<boolean>;
  getPendingCoaches(): Promise<any[]>;
  approveCoach(coachId: string, adminId: string): Promise<void>;
  rejectCoach(coachId: string, adminId: string): Promise<void>;
  getAllBookings(): Promise<any[]>;
  deleteCoach(coachId: string, adminId: string): Promise<void>;
  deleteStudent(studentId: string, adminId: string): Promise<void>;
  deleteUser(userId: string, adminId: string): Promise<void>;
  logAdminAction(adminId: string, action: string, targetType: string, targetId?: string, details?: string): Promise<void>;
  getAdminActions(limit?: number): Promise<any[]>;

  // Messaging functionality
  sendMessage(message: InsertMessage): Promise<Message>;
  getConversations(userId: string): Promise<any[]>;
  getMessagesWithUser(userId1: string, userId2: string): Promise<Message[]>;
  markMessagesAsRead(userId: string, senderId: string): Promise<void>;
  getUnreadMessagesCount(userId: string): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(userData: CreateUserData): Promise<User> {
    // Hash the password before storing
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
    
    // Create the user data for insertion
    const userToInsert = {
      email: userData.email,
      passwordHash: hashedPassword,
      role: userData.role || "student",
    };
    
    const [user] = await db
      .insert(users)
      .values(userToInsert)
      .returning();
    return user;
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) {
      return null;
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    return isPasswordValid ? user : null;
  }

  // Coach methods
  async getCoach(id: string): Promise<Coach | undefined> {
    const [coach] = await db.select().from(coaches).where(eq(coaches.id, id));
    return coach || undefined;
  }

  async getCoachWithDetails(id: string): Promise<any> {
    const coach = await db.query.coaches.findFirst({
      where: eq(coaches.id, id),
      with: {
        specialties: true,
        tools: true,
        certifications: true,
        videos: true,
        reviews: {
          with: {
            student: true,
          },
        },
      },
    });
    return coach;
  }

  async createCoach(insertCoach: InsertCoach): Promise<Coach> {
    const [coach] = await db
      .insert(coaches)
      .values(insertCoach)
      .returning();
    return coach;
  }

  async updateCoach(id: string, updates: Partial<InsertCoach>): Promise<Coach> {
    const [coach] = await db
      .update(coaches)
      .set(updates)
      .where(eq(coaches.id, id))
      .returning();
    return coach;
  }

  async updateCoachGoogleReviews(id: string, reviews: {
    googleRating?: string;
    googleReviewCount?: number;
    lastGoogleSync?: Date;
  }): Promise<void> {
    await db
      .update(coaches)
      .set(reviews)
      .where(eq(coaches.id, id));
  }

  async searchCoaches(params: {
    location?: string;
    specialties?: string[];
    priceRange?: { min: number; max: number };
    rating?: number;
    tools?: string[];
  }): Promise<any[]> {
    const conditions = [
      eq(coaches.approvalStatus, 'approved') // Only show approved coaches
    ];
    
    if (params.location) {
      conditions.push(like(coaches.location, `%${params.location}%`));
    }
    
    if (params.priceRange) {
      conditions.push(sql`${coaches.pricePerHour} >= ${params.priceRange.min}`);
      conditions.push(sql`${coaches.pricePerHour} <= ${params.priceRange.max}`);
    }
    
    if (params.rating) {
      conditions.push(sql`${coaches.rating} >= ${params.rating}`);
    }

    const coachResults = await db.query.coaches.findMany({
      where: and(...conditions),
      with: {
        specialties: true,
        tools: true,
        certifications: true,
        videos: true,
      },
      orderBy: [desc(coaches.rating)],
    });

    return coachResults;
  }

  // Student methods
  async getStudent(id: string): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student || undefined;
  }

  async getStudentByUserId(userId: string): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.userId, userId));
    return student || undefined;
  }

  async createStudent(insertStudent: InsertStudent): Promise<Student> {
    const [student] = await db
      .insert(students)
      .values(insertStudent)
      .returning();
    return student;
  }

  async updateStudent(id: string, updates: Partial<InsertStudent>): Promise<Student> {
    const [student] = await db
      .update(students)
      .set(updates)
      .where(eq(students.id, id))
      .returning();
    return student;
  }

  // Booking methods
  async getBooking(id: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking || undefined;
  }

  async getBookingsByStudent(studentId: string): Promise<Booking[]> {
    return await db.select().from(bookings)
      .where(eq(bookings.studentId, studentId))
      .orderBy(desc(bookings.createdAt));
  }

  async getBookingsByCoach(coachId: string): Promise<Booking[]> {
    return await db.select().from(bookings)
      .where(eq(bookings.coachId, coachId))
      .orderBy(desc(bookings.createdAt));
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const [booking] = await db
      .insert(bookings)
      .values(insertBooking)
      .returning();
    return booking;
  }

  async updateBooking(id: string, updates: Partial<Booking>): Promise<Booking> {
    const [booking] = await db
      .update(bookings)
      .set(updates)
      .where(eq(bookings.id, id))
      .returning();
    return booking;
  }

  // Review methods
  async createReview(insertReview: InsertReview): Promise<Review> {
    const [review] = await db
      .insert(reviews)
      .values(insertReview)
      .returning();
    
    // Update coach's rating and review count
    const coachReviews = await this.getReviewsByCoach(insertReview.coachId);
    const averageRating = coachReviews.reduce((sum, r) => sum + r.rating, 0) / coachReviews.length;
    
    await db
      .update(coaches)
      .set({
        rating: averageRating.toFixed(2),
        reviewCount: coachReviews.length,
      })
      .where(eq(coaches.id, insertReview.coachId));
    
    return review;
  }

  async getReviewsByCoach(coachId: string): Promise<Review[]> {
    return await db.select().from(reviews)
      .where(eq(reviews.coachId, coachId))
      .orderBy(desc(reviews.createdAt));
  }

  // Coach specialties, tools, certifications, and videos methods
  async createCoachSpecialty(coachId: string, specialty: string): Promise<void> {
    await db.insert(coachSpecialties).values({
      coachId,
      specialty,
    });
  }

  async createCoachTool(coachId: string, tool: string): Promise<void> {
    await db.insert(coachTools).values({
      coachId,
      tool,
    });
  }

  async createCoachCertification(coachId: string, certification: string): Promise<void> {
    await db.insert(coachCertifications).values({
      coachId,
      certification,
    });
  }

  async createCoachVideo(coachId: string, video: { title: string; description: string; thumbnail: string; duration: string; videoUrl?: string }): Promise<void> {
    await db.insert(coachVideos).values({
      coachId,
      title: video.title,
      description: video.description,
      thumbnail: video.thumbnail,
      duration: video.duration,
      videoUrl: video.videoUrl || null,
    });
  }

  // Calendar and availability methods
  async getCoachCalendarSettings(coachId: string): Promise<any> {
    const [settings] = await db.select().from(coachCalendarSettings).where(eq(coachCalendarSettings.coachId, coachId));
    return settings || null;
  }

  async updateCoachCalendarSettings(coachId: string, settings: {
    googleCalendarId?: string | null;
    googleRefreshToken?: string | null;
    isEnabled?: boolean;
    lastSyncedAt?: Date;
    lastSyncToken?: string;
  }): Promise<void> {
    const existingSettings = await this.getCoachCalendarSettings(coachId);
    
    if (existingSettings) {
      await db.update(coachCalendarSettings)
        .set(settings)
        .where(eq(coachCalendarSettings.coachId, coachId));
    } else {
      await db.insert(coachCalendarSettings).values({
        coachId,
        ...settings,
      });
    }
  }

  async updateCoachBusyTime(busyTime: {
    coachId: string;
    startDateTime: Date;
    endDateTime: Date;
    source: string;
    externalEventId: string | null;
    title?: string;
  }): Promise<void> {
    // Check if busy time already exists for this external event
    if (busyTime.externalEventId) {
      const [existingBusyTime] = await db.select()
        .from(coachBusyTimes)
        .where(and(
          eq(coachBusyTimes.coachId, busyTime.coachId),
          eq(coachBusyTimes.externalEventId, busyTime.externalEventId)
        ));
      
      if (existingBusyTime) {
        // Update existing busy time
        await db.update(coachBusyTimes)
          .set({
            startDateTime: busyTime.startDateTime,
            endDateTime: busyTime.endDateTime,
            title: busyTime.title || 'Busy',
          })
          .where(eq(coachBusyTimes.id, existingBusyTime.id));
        return;
      }
    }
    
    // Insert new busy time
    await db.insert(coachBusyTimes).values({
      coachId: busyTime.coachId,
      startDateTime: busyTime.startDateTime,
      endDateTime: busyTime.endDateTime,
      source: busyTime.source,
      externalEventId: busyTime.externalEventId,
      title: busyTime.title || 'Busy',
    });
  }

  async removeCoachBusyTime(coachId: string, externalEventId: string): Promise<void> {
    await db.delete(coachBusyTimes)
      .where(and(
        eq(coachBusyTimes.coachId, coachId),
        eq(coachBusyTimes.externalEventId, externalEventId)
      ));
  }

  async getCoachBusyTimes(coachId: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    let query = db.select().from(coachBusyTimes).where(eq(coachBusyTimes.coachId, coachId));
    
    if (startDate && endDate) {
      query = db.select().from(coachBusyTimes).where(and(
        eq(coachBusyTimes.coachId, coachId),
        sql`${coachBusyTimes.startDateTime} >= ${startDate}`,
        sql`${coachBusyTimes.endDateTime} <= ${endDate}`
      ));
    }
    
    return await query.orderBy(coachBusyTimes.startDateTime);
  }

  async getCoachAvailability(coachId: string): Promise<any[]> {
    return await db.select().from(coachAvailability)
      .where(eq(coachAvailability.coachId, coachId))
      .orderBy(coachAvailability.dayOfWeek);
  }

  async updateCoachAvailability(coachId: string, availability: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }[]): Promise<void> {
    // Delete existing availability
    await db.delete(coachAvailability).where(eq(coachAvailability.coachId, coachId));
    
    // Insert new availability
    if (availability.length > 0) {
      await db.insert(coachAvailability).values(
        availability.map(avail => ({
          coachId,
          dayOfWeek: avail.dayOfWeek,
          startTime: avail.startTime,
          endTime: avail.endTime,
          isAvailable: avail.isAvailable,
        }))
      );
    }
  }

  // Admin functionality
  async isUserAdmin(userId: string): Promise<boolean> {
    const user = await db.select().from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    return user.length > 0 && user[0].role === 'admin';
  }

  async getPendingCoaches(): Promise<any[]> {
    return await db.select({
      id: coaches.id,
      name: coaches.name,
      email: users.email,
      bio: coaches.bio,
      location: coaches.location,
      pricePerHour: coaches.pricePerHour,
      yearsExperience: coaches.yearsExperience,
      image: coaches.image,
      createdAt: coaches.createdAt,
      approvalStatus: coaches.approvalStatus,
    })
    .from(coaches)
    .innerJoin(users, eq(coaches.userId, users.id))
    .where(eq(coaches.approvalStatus, 'pending'))
    .orderBy(desc(coaches.createdAt));
  }

  async getAllCoaches(): Promise<any[]> {
    return await db.select({
      id: coaches.id,
      name: coaches.name,
      email: users.email,
      bio: coaches.bio,
      location: coaches.location,
      pricePerHour: coaches.pricePerHour,
      yearsExperience: coaches.yearsExperience,
      image: coaches.image,
      createdAt: coaches.createdAt,
      approvalStatus: coaches.approvalStatus,
      userId: coaches.userId,
    })
    .from(coaches)
    .innerJoin(users, eq(coaches.userId, users.id))
    .orderBy(desc(coaches.createdAt));
  }

  async getAllStudents(): Promise<any[]> {
    return await db.select({
      id: students.id,
      name: students.name,
      email: users.email,
      phone: students.phone,
      skillLevel: students.skillLevel,
      createdAt: students.createdAt,
      userId: students.userId,
    })
    .from(students)
    .innerJoin(users, eq(students.userId, users.id))
    .orderBy(desc(students.createdAt));
  }

  async approveCoach(coachId: string, adminId: string): Promise<void> {
    await db.update(coaches)
      .set({
        approvalStatus: 'approved',
        approvedAt: new Date(),
        approvedBy: adminId,
      })
      .where(eq(coaches.id, coachId));
    
    await this.logAdminAction(adminId, 'approve_coach', 'coach', coachId);
  }

  async rejectCoach(coachId: string, adminId: string): Promise<void> {
    await db.update(coaches)
      .set({
        approvalStatus: 'rejected',
        approvedAt: new Date(),
        approvedBy: adminId,
      })
      .where(eq(coaches.id, coachId));
    
    await this.logAdminAction(adminId, 'reject_coach', 'coach', coachId);
  }

  async getAllBookings(): Promise<any[]> {
    return await db.select({
      id: bookings.id,
      studentName: students.name,
      studentEmail: users.email,
      coachName: coaches.name,
      date: bookings.date,
      time: bookings.time,
      status: bookings.status,
      totalAmount: bookings.totalAmount,
      createdAt: bookings.createdAt,
    })
    .from(bookings)
    .innerJoin(students, eq(bookings.studentId, students.id))
    .innerJoin(coaches, eq(bookings.coachId, coaches.id))
    .innerJoin(users, eq(students.userId, users.id))
    .orderBy(desc(bookings.createdAt));
  }

  async deleteCoach(coachId: string, adminId: string): Promise<void> {
    // Get coach details first for logging
    const coach = await this.getCoach(coachId);
    if (!coach) throw new Error('Coach not found');

    // Delete coach (cascade will handle related records)
    await db.delete(coaches).where(eq(coaches.id, coachId));
    
    await this.logAdminAction(adminId, 'delete_coach', 'coach', coachId, JSON.stringify({ name: coach.name }));
  }

  async deleteStudent(studentId: string, adminId: string): Promise<void> {
    // Get student details first for logging
    const student = await this.getStudent(studentId);
    if (!student) throw new Error('Student not found');

    // Delete student (cascade will handle related records)
    await db.delete(students).where(eq(students.id, studentId));
    
    await this.logAdminAction(adminId, 'delete_student', 'student', studentId, JSON.stringify({ name: student.name }));
  }

  async deleteUser(userId: string, adminId: string): Promise<void> {
    // Get user details first for logging
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');

    // Delete user (cascade will handle related records)
    await db.delete(users).where(eq(users.id, userId));
    
    await this.logAdminAction(adminId, 'delete_user', 'user', userId, JSON.stringify({ email: user.email, role: user.role }));
  }

  async logAdminAction(adminId: string, action: string, targetType: string, targetId?: string, details?: string): Promise<void> {
    await db.insert(adminActions).values({
      adminId,
      action,
      targetType,
      targetId: targetId || null,
      details: details || null,
    });
  }

  async getAdminActions(limit: number = 50): Promise<any[]> {
    return await db.select({
      id: adminActions.id,
      adminEmail: users.email,
      action: adminActions.action,
      targetType: adminActions.targetType,
      targetId: adminActions.targetId,
      details: adminActions.details,
      createdAt: adminActions.createdAt,
    })
    .from(adminActions)
    .innerJoin(users, eq(adminActions.adminId, users.id))
    .orderBy(desc(adminActions.createdAt))
    .limit(limit);
  }

  // Messaging methods
  async sendMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async getConversations(userId: string): Promise<any[]> {
    // Get all unique users this user has had conversations with
    const conversationsQuery = await db.select({
      userId: sql<string>`CASE 
        WHEN ${messages.senderId} = ${userId} THEN ${messages.receiverId} 
        ELSE ${messages.senderId} 
      END`.as('userId'),
      userName: sql<string>`CASE 
        WHEN ${messages.senderId} = ${userId} THEN receiver_users.email 
        ELSE sender_users.email 
      END`.as('userName'),
      lastMessage: sql<string>`
        (SELECT content FROM ${messages} m2 
         WHERE (m2.senderId = ${userId} AND m2.receiverId = CASE WHEN ${messages.senderId} = ${userId} THEN ${messages.receiverId} ELSE ${messages.senderId} END) 
            OR (m2.receiverId = ${userId} AND m2.senderId = CASE WHEN ${messages.senderId} = ${userId} THEN ${messages.receiverId} ELSE ${messages.senderId} END)
         ORDER BY m2.createdAt DESC LIMIT 1)
      `.as('lastMessage'),
      lastMessageTime: sql<string>`
        (SELECT createdAt FROM ${messages} m2 
         WHERE (m2.senderId = ${userId} AND m2.receiverId = CASE WHEN ${messages.senderId} = ${userId} THEN ${messages.receiverId} ELSE ${messages.senderId} END) 
            OR (m2.receiverId = ${userId} AND m2.senderId = CASE WHEN ${messages.senderId} = ${userId} THEN ${messages.receiverId} ELSE ${messages.senderId} END)
         ORDER BY m2.createdAt DESC LIMIT 1)
      `.as('lastMessageTime'),
      unreadCount: sql<number>`
        (SELECT COUNT(*) FROM ${messages} m3 
         WHERE m3.receiverId = ${userId} 
           AND m3.senderId = CASE WHEN ${messages.senderId} = ${userId} THEN ${messages.receiverId} ELSE ${messages.senderId} END
           AND m3.isRead = false)
      `.as('unreadCount'),
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .innerJoin(users, eq(messages.receiverId, users.id))
    .where(sql`${messages.senderId} = ${userId} OR ${messages.receiverId} = ${userId}`)
    .groupBy(sql`CASE WHEN ${messages.senderId} = ${userId} THEN ${messages.receiverId} ELSE ${messages.senderId} END`)
    .orderBy(desc(sql`lastMessageTime`));

    return conversationsQuery;
  }

  async getMessagesWithUser(userId1: string, userId2: string): Promise<Message[]> {
    return await db.select()
      .from(messages)
      .where(
        sql`(${messages.senderId} = ${userId1} AND ${messages.receiverId} = ${userId2}) 
            OR (${messages.senderId} = ${userId2} AND ${messages.receiverId} = ${userId1})`
      )
      .orderBy(messages.createdAt);
  }

  async markMessagesAsRead(userId: string, senderId: string): Promise<void> {
    await db.update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.receiverId, userId),
          eq(messages.senderId, senderId)
        )
      );
  }

  async getUnreadMessagesCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`COUNT(*)` })
      .from(messages)
      .where(
        and(
          eq(messages.receiverId, userId),
          eq(messages.isRead, false)
        )
      );
    
    return result[0]?.count || 0;
  }
}

export const storage = new DatabaseStorage();
