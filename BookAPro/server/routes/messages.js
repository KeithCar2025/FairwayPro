import express from "express";
import { pool } from "../db.js";
import { storage } from "../storage.js";
import { isAuthenticated } from "../middleware/auth.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// --- 1️⃣ Get or create a conversation between a coach and a student ---
router.post("/conversation", isAuthenticated, async (req, res) => {
  try {
    const { coachId, studentId } = req.body; // studentId is students.id (not users.id)
    if (!coachId || !studentId) {
      return res.status(400).json({ error: "coachId and studentId are required" });
    }

    // Resolve students.user_id from students.id
    const stuRes = await pool.query(`SELECT user_id FROM students WHERE id = $1`, [studentId]);
    if (stuRes.rowCount === 0) return res.status(404).json({ error: "Student not found" });
    const studentUserId = stuRes.rows[0].user_id;

    // Check for existing conversation (coach_id and student_id are user ids)
    const existing = await pool.query(
      `SELECT id, coach_id, student_id, created_at
       FROM conversations
       WHERE coach_id = $1 AND student_id = $2
       LIMIT 1`,
      [coachId, studentUserId]
    );

    if (existing.rowCount > 0) {
      const r = existing.rows[0];
      return res.json({
        id: r.id,
        coachId: r.coach_id,
        studentId: r.student_id,
        createdAt: r.created_at,
      });
    }

    // Create new conversation
    const insert = await pool.query(
      `INSERT INTO conversations (coach_id, student_id)
       VALUES ($1, $2)
       RETURNING id, coach_id, student_id, created_at`,
      [coachId, studentUserId]
    );

    const conv = insert.rows[0];
    res.status(201).json({
      id: conv.id,
      coachId: conv.coach_id,
      studentId: conv.student_id,
      createdAt: conv.created_at,
    });
  } catch (err) {
    console.error("Error creating conversation:", err);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

// --- 2️⃣ Send a message ---
router.post("/message", isAuthenticated, async (req, res) => {
  try {
    const { conversationId, content } = req.body;
    const senderId = req.session.userId;

    if (!conversationId || !content?.trim()) {
      return res.status(400).json({ error: "conversationId and content are required" });
    }

    // Optional: verify the sender is part of the conversation
    const convCheck = await pool.query(
      `SELECT id FROM conversations WHERE id = $1 AND (coach_id = $2 OR student_id = $2)`,
      [conversationId, senderId]
    );
    if (convCheck.rowCount === 0) {
      return res.status(403).json({ error: "Not a participant of the conversation" });
    }

    // Use storage.sendMessage (works with supabase)
    const msg = await storage.sendMessage({
      conversation_id: conversationId,
      sender_id: senderId,
      content: content.trim(),
    });

    res.status(201).json({
      id: msg.id,
      conversationId: msg.conversation_id,
      senderId: msg.sender_id,
      content: msg.content,
      createdAt: msg.created_at,
    });
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// --- 3️⃣ Fetch messages for a conversation ---
router.get("/messages/:conversationId", isAuthenticated, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.session.userId;

    // Verify user is a participant
    const conv = await pool.query(
      `SELECT id FROM conversations WHERE id = $1 AND (coach_id = $2 OR student_id = $2)`,
      [conversationId, userId]
    );
    if (conv.rowCount === 0) return res.status(403).json({ error: "Not authorized to view messages" });

    // Use storage helper to fetch messages with sender info
    const messages = await storage.getMessagesForConversation(conversationId);
    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// --- 4️⃣ Get conversations for inbox with latest message ---
router.get("/conversations", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const result = await pool.query(`
      SELECT
        c.id,
        c.coach_id,
        coach_profile.name AS coach_name,
        coach_user.email AS coach_email,
        c.student_id,
        student_profile.name AS student_name,
        student_user.email AS student_email,
        c.created_at,
        m.content AS last_message,
        m.created_at AS last_message_time
      FROM conversations c
      JOIN users coach_user ON coach_user.id = c.coach_id
      LEFT JOIN coaches coach_profile ON coach_profile.user_id = c.coach_id
      JOIN users student_user ON student_user.id = c.student_id
      LEFT JOIN students student_profile ON student_profile.user_id = c.student_id
      LEFT JOIN LATERAL (
        SELECT content, created_at
        FROM messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) m ON TRUE
      WHERE c.coach_id = $1 OR c.student_id = $1
      ORDER BY m.created_at DESC NULLS LAST, c.created_at DESC;
    `, [userId]);

    res.json({ conversations: result.rows });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

export default router;