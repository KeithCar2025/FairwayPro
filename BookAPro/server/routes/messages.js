import express from "express";
import { pool } from "../db.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// --- 1️⃣ Get or create a conversation between a coach and a student ---
router.post("/conversation", isAuthenticated, async (req, res) => {
  try {
    const { coachId, studentId } = req.body;
    const userId = req.session.userId;
    const finalStudentId = studentId || userId;

    if (!coachId || !finalStudentId) {
      return res.status(400).json({ error: "coachId and studentId are required" });
    }

    // Check if conversation already exists
    const { rows } = await pool.query(
      `SELECT id, coach_id, student_id, created_at 
       FROM conversations 
       WHERE coach_id = $1 AND student_id = $2`,
      [coachId, finalStudentId]
    );

    if (rows[0]) {
      return res.json({
        id: rows[0].id,
        coachId: rows[0].coach_id,
        studentId: rows[0].student_id,
        createdAt: rows[0].created_at,
      });
    }

    // Create new conversation
    const insert = await pool.query(
      `INSERT INTO conversations (coach_id, student_id)
       VALUES ($1, $2)
       RETURNING id, coach_id, student_id, created_at`,
      [coachId, finalStudentId]
    );

    const conv = insert.rows[0];
    res.json({
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

    const insert = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, conversation_id, sender_id, content, created_at`,
      [conversationId, senderId, content.trim()]
    );

    const msg = insert.rows[0];

    res.json({
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
    const { rows } = await pool.query(
      `SELECT id, conversation_id, sender_id, content, created_at 
       FROM messages 
       WHERE conversation_id = $1 
       ORDER BY created_at ASC`,
      [conversationId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

export default router;
