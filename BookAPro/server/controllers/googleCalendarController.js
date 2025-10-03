import {
  getGoogleAuthUrl,
  handleGoogleCallback,
  fetchGoogleEvents,
  createGoogleEvent,
} from '../services/googleCalendarService.js';
import { pool } from '../db.js';

// Redirects coach to Google OAuth consent screen
export const authRedirect = (req, res) => {
  const url = getGoogleAuthUrl();
  res.redirect(url);
};

// Handles OAuth callback from Google
export const oauthCallback = async (req, res) => {
  try {
    const { code } = req.query;
    const userId = req.user.id;

    // Ensure coach exists
    const coachRes = await pool.query('SELECT id FROM coaches WHERE user_id = $1', [userId]);
    if (!coachRes.rows.length) {
      return res.status(400).send('You must complete your coach profile before connecting Google Calendar.');
    }
    const coachId = coachRes.rows[0].id;

    await handleGoogleCallback(code, coachId);
    res.redirect('/profile?google_sync=success');
  } catch (err) {
    console.error("OAuth Callback Error:", err);
    res.status(500).send('Google OAuth failed');
  }
};

// Fetch events from Google Calendar for a coach
export const getEvents = async (req, res) => {
  try {
    const userId = req.user.id;
    const coachRes = await pool.query('SELECT id FROM coaches WHERE user_id = $1', [userId]);
    if (!coachRes.rows.length) {
      return res.status(400).send('No coach profile found.');
    }
    const coachId = coachRes.rows[0].id;

    const events = await fetchGoogleEvents(coachId);
    res.json(events);
  } catch (err) {
    console.error('Get Events Error:', err);
    res.status(500).json({ error: 'Failed to fetch Google Calendar events' });
  }
};

// Create an event in Google Calendar when a lesson is booked
export const createEvent = async (req, res) => {
  try {
    const userId = req.user.id;
    const coachRes = await pool.query('SELECT id FROM coaches WHERE user_id = $1', [userId]);
    if (!coachRes.rows.length) {
      return res.status(400).send('No coach profile found.');
    }
    const coachId = coachRes.rows[0].id;

    const { summary, description, start, end } = req.body;
    if (!summary || !description || !start || !end) {
      return res.status(400).json({
        error: 'Missing required fields: summary, description, start, end',
        received: req.body,
      });
    }

    // ✅ Call service function, which should handle tokens and Google API call
    const event = await createGoogleEvent(coachId, {
      summary,
      description,
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
    });

    res.json(event);
  } catch (err) {
    console.error('Create Event Error:', err);
    res.status(500).json({
      error: 'Failed to create Google Calendar event',
      details: err.message,
    });
  }
};