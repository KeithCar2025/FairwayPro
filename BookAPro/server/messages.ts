import express from "express";
import { isAuthenticated } from "./middleware/auth";
// Correct relative path to routes.ts
import { storage } from "./storage"; // Adjust if storage is in a different folder

const messagesRouter = express.Router();

messagesRouter.get("/unread-count", isAuthenticated, async (req, res) => {
  try {
    const count = await storage.getUnreadMessagesCount(req.session.userId);
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch unread messages" });
  }
});

messagesRouter.get("/conversations", isAuthenticated, async (req, res) => {
  try {
    const conversations = await storage.getConversations(req.session.userId);
    res.json({ conversations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

messagesRouter.post("/send", isAuthenticated, async (req, res) => {
  try {
    const senderId = req.session.userId;
    const { receiverId, content, bookingId } = req.body;

    if (!receiverId || !content?.trim())
      return res.status(400).json({ error: "Receiver ID and message content required" });

    const receiver = await storage.getUser(receiverId);
    if (!receiver) return res.status(404).json({ error: "Receiver not found" });

    const message = await storage.sendMessage({
      senderId,
      receiverId,
      content: content.trim(),
      bookingId: bookingId || null,
    });
    res.json({ message });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default messagesRouter;
