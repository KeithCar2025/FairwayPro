import express from "express";
import { pool } from "../db.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// Get or create a conversation between a coach and a student
router.post("/conversation", isAuthenticated, async (req, res) => {
  try {
    const { coachId, studentId } = req.body;

    // Optional: override studentId with session user
    const userId = req.session.userId;
    const finalStudentId = studentId || userId;

    if (!coachId || !finalStudentId) {
      return res.status(400).json({ error: "coachId and studentId are required" });
    }

    // Check if conversation already exists
    const { rows } = await pool.query(
      `SELECT * FROM conversations WHERE coach_id = $1 AND student_id = $2`,
      [coachId, finalStudentId]
    );

    if (rows[0]) return res.json(rows[0]);

    // Create new conversation
    const insert = await pool.query(
      `INSERT INTO conversations (coach_id, student_id)
       VALUES ($1, $2)
       RETURNING *`,
      [coachId, finalStudentId]
    );

    res.json(insert.rows[0]);
  } catch (err) {
    console.error("Error creating conversation:", err);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

// Send message
router.post("/message", isAuthenticated, async (req, res) => {
  try {
    const { conversationId, content } = req.body;
    const senderId = req.session.userId; // get from session

    if (!conversationId || !content?.trim()) {
      return res.status(400).json({ error: "conversationId and content are required" });
    }

    const insert = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [conversationId, senderId, content.trim()]
    );

    res.json(insert.rows[0]);
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Fetch messages for a conversation
router.get("/messages/:conversationId", isAuthenticated, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { rows } = await pool.query(
      `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [conversationId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

export default router;
