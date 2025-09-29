import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
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
  getAdminActions(): Promise<any[]>; // <-- Added here

  sendMessage(message: InsertMessage): Promise<Message>;
  getMessagesWithUser(userId1: string, userId2: string): Promise<Message[]>;

  createCoachSpecialty(coachId: string, specialty: string): Promise<void>;
  createCoachTool(coachId: string, tool: string): Promise<void>;
  createCoachCertification(coachId: string, certification: string): Promise<void>;
  createCoachVideo(coachId: string, video: any): Promise<void>;
    approveCoach(coachId: string, adminId: string): Promise<Coach>;
  rejectCoach(coachId: string, adminId: string): Promise<Coach>;
  getApprovedCoaches(): Promise<Coach[]>;
}

export class DatabaseStorage implements IStorage {

async getApprovedCoaches(): Promise<Coach[]> {
  const { data, error } = await supabase
    .from('coaches')
    .select('*')
    .eq('approval_status', 'approved');

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
    specialties: coach.specialties || [],
    tools: coach.tools || [],
    certifications: coach.certifications || [],
    videos: coach.videos || [],
    responseTime: coach.response_time || 'Unknown',
    availability: coach.availability || 'Available soon',
    reviewCount: coach.review_count || 0,
  }));
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
      })
      .select()
      .single();

    if (error) throw error;
    return data as User;
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
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
    .from('students')
    .select('*')
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

  // ------------------ Students ------------------
  async getStudent(id: string): Promise<Student | undefined> {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .single();
    return error ? undefined : (data as Student);
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
      .eq('coachId', coachId)
      .order('createdAt', { ascending: false });
    return error ? [] : (data as Review[]);
  }

  // ------------------ Admin ------------------
  async logAdminAction(adminId: string, action: string, targetType: string, targetId?: string, details?: string): Promise<void> {
    const { error } = await supabase
      .from('admin_actions')
      .insert({ adminId, action, targetType, targetId, details });
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
  return (data || []).map(coach => ({
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
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(senderId.eq.${userId1},receiverId.eq.${userId2}),and(senderId.eq.${userId2},receiverId.eq.${userId1})`)
      .order('createdAt', { ascending: true });
    return error ? [] : (data as Message[]);
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