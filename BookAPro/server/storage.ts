import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { mapCoachDbToApi } from './utils/coach-mappers'; 
import { 
  type User, type InsertCoach, type Coach, type InsertStudent, type Student,
  type Booking, type InsertBooking, type Review, type InsertReview,
  type InsertMessage, type Message
} from "@shared/schema";

interface CreateUserData {
  email: string;
  password: string;
  role?: string;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(userData: CreateUserData): Promise<User>;
  verifyPassword(email: string, password: string): Promise<User | null>;
  isUserAdmin(userId: string): Promise<boolean>;

  getCoach(id: string): Promise<Coach | undefined>;
  createCoach(coach: InsertCoach): Promise<Coach>;
  updateCoach(id: string, coach: Partial<InsertCoach>): Promise<Coach>;
  deleteCoach(coachId: string, adminId: string): Promise<void>;

  getStudent(id: string): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: string, student: Partial<InsertStudent>): Promise<Student>;
  deleteStudent(studentId: string, adminId: string): Promise<void>;

  getBooking(id: string): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: string, updates: Partial<Booking>): Promise<Booking>;

  createReview(review: InsertReview): Promise<Review>;
  getReviewsByCoach(coachId: string): Promise<Review[]>;

  logAdminAction(adminId: string, action: string, targetType: string, targetId?: string, details?: string): Promise<void>;
  getAdminActions(): Promise<any[]>;

  sendMessage(message: InsertMessage): Promise<Message>;
  getMessagesWithUser(userId1: string, userId2: string): Promise<Message[]>;

  createCoachSpecialty(coachId: string, specialty: string): Promise<void>;
  createCoachTool(coachId: string, tool: string): Promise<void>;
  createCoachCertification(coachId: string, certification: string): Promise<void>;
  createCoachVideo(coachId: string, video: any): Promise<void>;
  approveCoach(coachId: string, adminId: string): Promise<Coach>;
  rejectCoach(coachId: string, adminId: string): Promise<Coach>;
  getApprovedCoaches(): Promise<Coach[]>;
  getStudentByUserId(userId: string): Promise<Student | undefined>;
  // messaging helpers
  getConversations?(userId: string): Promise<any[]>;
  getMessagesForConversation?(conversationId: string): Promise<Message[]>;
}

function mapCoachUpdatesToDb(updates: any) {
  console.log("mapCoachUpdatesToDb input:", updates);
  const dbUpdates = {
    ...(updates.name !== undefined && { name: updates.name }),
    ...(updates.bio !== undefined && { bio: updates.bio }),
    ...(updates.location !== undefined && { location: updates.location }),
    ...(updates.pricePerHour !== undefined && { price_per_hour: updates.pricePerHour }),
    ...(updates.yearsExperience !== undefined && { years_experiance: updates.yearsExperience }),
    ...(updates.pgaCertificationId !== undefined && { pga_certification_id: updates.pgaCertificationId }),
    ...(updates.responseTime !== undefined && { response_time: updates.responseTime }),
    ...(updates.availability !== undefined && { availability: updates.availability }),
    ...(updates.googleReviewsUrl !== undefined && { google_reviews_url: updates.googleReviewsUrl }),
    ...(updates.image !== undefined && { image: updates.image }),
    ...(updates.latitude !== undefined && { latitude: updates.latitude }),
    ...(updates.longitude !== undefined && { longitude: updates.longitude }),
    ...(updates.isVerified !== undefined && { is_verified: updates.isVerified }),
    // Add more mappings as needed
  };
  console.log("mapCoachUpdatesToDb output (dbUpdates):", dbUpdates);
  return dbUpdates;
}
export class DatabaseStorage implements IStorage {

  // --------- PROFILE UPDATE: FULL ---------
  async updateCoachProfileFull(userId: string, updates: any) {
    // 1. Get coachId
    const coach = await this.getCoachByUserId(userId);
    if (!coach) throw new Error("Coach not found");
    const coachId = coach.id;

    // 2. Update scalars in main coach row
    const dbUpdates = mapCoachUpdatesToDb(updates);
    if (Object.keys(dbUpdates).length > 0) {
      const { error: coachUpdateError } = await supabase
        .from('coaches')
        .update(dbUpdates)
        .eq('user_id', userId);
      if (coachUpdateError) throw coachUpdateError;
    }

    // 3. Replace join-table data for arrays
    // --- Specialties ---
    if (Array.isArray(updates.specialties)) {
      await supabase.from('coach_specialties').delete().eq('coach_id', coachId);
      for (const specialty of updates.specialties) {
        await this.createCoachSpecialty(coachId, specialty);
      }
    }
    // --- Tools ---
    if (Array.isArray(updates.tools)) {
      await supabase.from('coach_tools').delete().eq('coach_id', coachId);
      for (const tool of updates.tools) {
        await this.createCoachTool(coachId, tool);
      }
    }
    // --- Certifications ---
    if (Array.isArray(updates.certifications)) {
      await supabase.from('coach_certifications').delete().eq('coach_id', coachId);
      for (const cert of updates.certifications) {
        await this.createCoachCertification(coachId, cert);
      }
    }
    // --- Videos ---
    if (Array.isArray(updates.videos)) {
      await supabase.from('coach_videos').delete().eq('coach_id', coachId);
      for (const video of updates.videos) {
        await this.createCoachVideo(coachId, video);
      }
    }
    // You may want to return the updated coach profile here if desired
  }

  async getApprovedCoaches(): Promise<Coach[]> {
    const { data, error } = await supabase
      .from('coaches')
      .select(`
        *,
        coach_specialties (specialty),
        coach_tools (tool),
        coach_certifications (certification)
      `)
      .eq('approval_status', 'approved');

    if (error) throw error;

    return (data || []).map(mapCoachDbToApi);
  }
  
  async getCoachCalendarSettings(coachId: string) {
    const { data, error } = await supabase
      .from('coach_calendar_settings')
      .select('*')
      .eq('coach_id', coachId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    if (!data) return null;

    return {
      coachId: data.coach_id,
      googleCalendarId: data.google_calendar_id,
      googleRefreshToken: data.google_refresh_token,
      isEnabled: data.is_enabled,
      lastSyncedAt: data.last_synced_at,
      lastSyncToken: data.last_sync_token
    };
  }

  // ------------------ Users ------------------
  async getUser(id: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    return error ? undefined : (data as User);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    return error ? null : (data as User);
  }

  async createUser(userData: CreateUserData): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    const { data, error } = await supabase
      .from('users')
      .insert({
        id: uuidv4(),
        email: userData.email,
        password_hash: hashedPassword,
        role: userData.role || 'student',
        auth_provider: 'password',
      })
      .select()
      .single();

    if (error) throw error;
    return data as User;
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;

    // Allow password login for 'password', 'local', or null (legacy)
    if (
      user.auth_provider !== 'password' &&
      user.auth_provider !== 'local' &&
      user.auth_provider !== null
    ) {
      // prevent password login for Google or other OAuth users
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    return isValid ? user : null;
  }

  async isUserAdmin(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) {
      console.error("isUserAdmin error:", error);
      return false;
    }
    return data?.role === 'admin';
  }

  // ------------------ Admin Lists ------------------
  async getAllStudents(): Promise<Student[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Student[];
  }

  async getAllCoaches(): Promise<Coach[]> {
    const { data, error } = await supabase
      .from('coaches')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Coach[];
  }

  async getBookingsByCoach(coachId: string) {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('coach_id', coachId)
      .order('date', { ascending: false });
    if (error) throw error;
    return data;
  }

  async getAllBookings(): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Booking[];
  }

  async approveCoach(coachId: string, adminId: string): Promise<Coach> {
    const { data, error } = await supabase
      .from('coaches')
      .update({
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: adminId
      })
      .eq('id', coachId)
      .select()
      .single();

    if (error) throw error;

    await this.logAdminAction(adminId, 'approve_coach', 'coach', coachId);

    return data as Coach;
  }

  async rejectCoach(coachId: string, adminId: string): Promise<Coach> {
    const { data, error } = await supabase
      .from('coaches')
      .update({
        approval_status: 'rejected',
        approved_at: new Date().toISOString(),
        approved_by: adminId
      })
      .eq('id', coachId)
      .select()
      .single();

    if (error) throw error;

    await this.logAdminAction(adminId, 'reject_coach', 'coach', coachId);

    return data as Coach;
  }

  // ------------------ Coaches ------------------
  async getCoach(id: string): Promise<Coach | undefined> {
    const { data, error } = await supabase
      .from('coaches')
      .select('*')
      .eq('id', id)
      .single();
    return error ? undefined : (data as Coach);
  }

  async createCoach(coach: InsertCoach): Promise<Coach> {
    const { data, error } = await supabase
      .from('coaches')
      .insert(coach)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateCoach(id: string, updates: Partial<InsertCoach>): Promise<Coach> {
    const { data, error } = await supabase
      .from('coaches')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteCoach(coachId: string, adminId: string): Promise<void> {
    const { error } = await supabase
      .from('coaches')
      .delete()
      .eq('id', coachId);
    if (error) throw error;
    await this.logAdminAction(adminId, 'delete_coach', 'coach', coachId);
  }

  async getCoachByUserId(userId: string) {
    const { data, error } = await supabase
      .from('coaches')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    return data;
  }

  async getCoachWithDetailsByUserId(userId: string) {
    const { data: coach, error } = await supabase
      .from('coaches')
      .select(`
        *,
        coach_specialties (specialty),
        coach_tools (tool),
        coach_certifications (certification),
        coach_videos (*)
      `)
      .eq('user_id', userId)
      .single();

    if (error?.code === 'PGRST116') return null;
    if (error) throw error;
    if (!coach) return null;

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();
    if (userError) throw userError;

    return {
      id: coach.id,
      userId: coach.user_id,
      email: user?.email || "",
      name: coach.name,
      bio: coach.bio,
      location: coach.location,
      pricePerHour: coach.price_per_hour,
      yearsExperience: coach.years_experience,
      pgaCertificationId: coach.pga_certification_id,
      image: coach.image,
      isVerified: coach.is_verified,
      latitude: coach.latitude,
      longitude: coach.longitude,
      approvalStatus: coach.approval_status,
      approvedAt: coach.approved_at,
      approvedBy: coach.approved_by,
      googleReviewsUrl: coach.google_reviews_url,
      googleRating: coach.google_rating,
      googleReviewCount: coach.google_review_count,
      lastGoogleSync: coach.last_google_sync,
      specialties: coach.coach_specialties?.map((s: any) => s.specialty) || [],
      tools: coach.coach_tools?.map((t: any) => t.tool) || [],
      certifications: coach.coach_certifications?.map((c: any) => c.certification) || [],
      videos: coach.coach_videos || [],
      responseTime: coach.response_time,
      availability: coach.availability,
      reviewCount: coach.review_count,
      createdAt: coach.created_at,
    };
  }

  // ------------------ Students ------------------
  async getStudent(id: string): Promise<Student | undefined> {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .single();
    return error ? undefined : (data as Student);
  }

  async getStudentByUserId(userId: string): Promise<Student | undefined> {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) return undefined;
    return data as Student;
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const { data, error } = await supabase
      .from('students')
      .insert(student)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateStudent(id: string, updates: Partial<InsertStudent>): Promise<Student> {
    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteStudent(studentId: string, adminId: string): Promise<void> {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId);
    if (error) throw error;
    await this.logAdminAction(adminId, 'delete_student', 'student', studentId);
  }

  // ------------------ Bookings ------------------
  async getBookingsByStudent(studentId: string) {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('student_id', studentId)
      .order('date', { ascending: false }); // Most recent first
    if (error) throw error;
    return data;
  }
  
  async getBooking(id: string): Promise<Booking | undefined> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();
    return error ? undefined : (data as Booking);
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const { data, error } = await supabase
      .from('bookings')
      .insert(booking)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateBooking(id: string, updates: Partial<Booking>): Promise<Booking> {
    const { data, error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // ------------------ Reviews ------------------
  async createReview(review: InsertReview): Promise<Review> {
    const { data, error } = await supabase
      .from('reviews')
      .insert(review)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getReviewsByCoach(coachId: string): Promise<Review[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false });
    return error ? [] : (data as Review[]);
  }

  // ------------------ Admin ------------------
  async logAdminAction(adminId: string, action: string, targetType: string, targetId?: string, details?: string): Promise<void> {
    const { error } = await supabase
      .from('admin_actions')
      .insert({ admin_id: adminId, action, target_type: targetType, target_id: targetId, details });
    if (error) throw error;
  }

  async getAdminActions(): Promise<any[]> {
    const { data, error } = await supabase
      .from('admin_actions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getPendingCoaches(): Promise<any[]> {
    const { data, error } = await supabase
      .from('coaches')
      .select('*')
      .eq('approval_status', 'pending');
    if (error) throw error;
    return (data || []).map((coach: any) => ({
      id: coach.id,
      name: coach.name,
      email: coach.email,
      bio: coach.bio,
      location: coach.location,
      pricePerHour: coach.price_per_hour,
      yearsExperience: coach.years_experience,
      image: coach.image,
      createdAt: coach.created_at,
      approvalStatus: coach.approval_status,
      userId: coach.user_id,
    }));
  }

  // ------------------ Messaging ------------------

  // Use Supabase relational selects now that FK constraints exist.
  // Returns conversations with joined coach and student user records and the messages array.
  async getConversations(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id,
        coach_id,
        student_id,
        created_at,
        coach:coach_id (id, name, email),
        student:student_id (id, name, email),
        messages:messages (
          id,
          conversation_id,
          sender_id,
          content,
          created_at,
          sender:sender_id (id, name, email)
        )
      `)
      .or(`coach_id.eq.${userId},student_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // For convenience, map to include last_message and last_message_time (derived)
    const conversations = (data || []).map((c: any) => {
      const lastMessage = Array.isArray(c.messages) && c.messages.length > 0
        ? c.messages.reduce((latest: any, m: any) => !latest || new Date(m.created_at) > new Date(latest.created_at) ? m : latest, null)
        : null;
      return {
        id: c.id,
        coach_id: c.coach_id,
        coach: c.coach || null,
        student_id: c.student_id,
        student: c.student || null,
        created_at: c.created_at,
        last_message: lastMessage ? lastMessage.content : null,
        last_message_time: lastMessage ? lastMessage.created_at : null,
        raw_messages: c.messages || []
      };
    });

    return conversations;
  }

  // Get all messages for a conversation (with sender info)
  async getMessagesForConversation(conversationId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        sender_id,
        content,
        created_at,
        sender:sender_id (id, name, email)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  async sendMessage(message: InsertMessage): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert(message)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getMessagesWithUser(userId1: string, userId2: string): Promise<Message[]> {
    // Note: This function assumes messages table has sender_id and receiver_id.
    // If you use conversation-based messages (no receiver_id), prefer getMessagesForConversation.
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
      .order('created_at', { ascending: true });
    return error ? [] : (data as Message[]);
  }

  async getUnreadMessagesCount(userId: string): Promise<number> {
    // If you have receiver_id and is_read: adapt. If using conversation model, this may need rework.
    const { count, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('is_read', false);
    if (error) throw error;
    return count ?? 0;
  }

  // ------------------ Coach Specialties ------------------
  async createCoachSpecialty(coachId: string, specialty: string): Promise<void> {
    const { error } = await supabase
      .from('coach_specialties')
      .insert({ id: uuidv4(), coach_id: coachId, specialty });
    if (error) throw error;
  }

  // ------------------ Coach Tools ------------------
  async createCoachTool(coachId: string, tool: string): Promise<void> {
    const { error } = await supabase
      .from('coach_tools')
      .insert({ id: uuidv4(), coach_id: coachId, tool });
    if (error) throw error;
  }

  // ------------------ Coach Certifications ------------------
  async createCoachCertification(coachId: string, certification: string): Promise<void> {
    const { error } = await supabase
      .from('coach_certifications')
      .insert({ id: uuidv4(), coach_id: coachId, certification });
    if (error) throw error;
  }

  // ------------------ Coach Videos ------------------
  async createCoachVideo(coachId: string, video: any): Promise<void> {
    const { error } = await supabase
      .from('coach_videos')
      .insert({ id: uuidv4(), coach_id: coachId, ...video });
    if (error) throw error;
  }
}

export const storage = new DatabaseStorage();