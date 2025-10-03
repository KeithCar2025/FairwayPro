import { google } from 'googleapis';
import { pool } from '../db.js';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

function getOAuth2Client(tokens) {
  const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  if (tokens) oAuth2Client.setCredentials(tokens);
  return oAuth2Client;
}

export function getGoogleAuthUrl() {
  const oAuth2Client = getOAuth2Client();
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
}

export async function handleGoogleCallback(code, coachId) {
  try {
    const oAuth2Client = getOAuth2Client();
    const { tokens } = await oAuth2Client.getToken(code);

    if (!tokens.refresh_token) {
      // Get existing refresh token if Google doesn't send a new one
      const existing = await pool.query(
        'SELECT google_refresh_token FROM coach_calendar_settings WHERE coach_id = $1',
        [coachId]
      );
      if (existing.rows.length && existing.rows[0].google_refresh_token) {
        tokens.refresh_token = existing.rows[0].google_refresh_token;
      }
    }

    const calendarId = 'primary';
    await pool.query(
      `
      INSERT INTO coach_calendar_settings (id, coach_id, google_calendar_id, google_refresh_token, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, NOW())
      ON CONFLICT (coach_id) DO UPDATE
        SET google_calendar_id = $2,
            google_refresh_token = $3,
            last_synced_at = NOW()
      `,
      [coachId, calendarId, tokens.refresh_token]
    );

    return tokens;
  } catch (err) {
    console.error('Error in handleGoogleCallback:', err);
    throw err;
  }
}

async function getCalendarSettings(coachId) {
  const res = await pool.query(
    `SELECT * FROM coach_calendar_settings WHERE coach_id = $1 AND is_enabled = true`,
    [coachId]
  );
  if (!res.rows.length || !res.rows[0].google_refresh_token) {
    throw new Error('Coach has not connected Google Calendar.');
  }
  return res.rows[0];
}

export async function fetchGoogleEvents(coachId) {
  try {
    const settings = await getCalendarSettings(coachId);
    const oAuth2Client = getOAuth2Client({ refresh_token: settings.google_refresh_token });

    // Refresh access token if needed
    const token = await oAuth2Client.getAccessToken();
    if (!token) throw new Error('Failed to obtain access token for Google Calendar');

    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    const { data } = await calendar.events.list({
      calendarId: settings.google_calendar_id || 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    });

    await pool.query(
      `UPDATE coach_calendar_settings SET last_synced_at = NOW() WHERE coach_id = $1`,
      [coachId]
    );

    return data.items;
  } catch (err) {
    console.error('Error in fetchGoogleEvents:', err);
    throw err;
  }
}

export async function createGoogleEvent(coachId, { summary, description, start, end }) {
  try {
    const settings = await getCalendarSettings(coachId);
    const oAuth2Client = getOAuth2Client({ refresh_token: settings.google_refresh_token });

    // Refresh access token if needed
    const token = await oAuth2Client.getAccessToken();
    if (!token) throw new Error('Failed to obtain access token for Google Calendar');

    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    const { data } = await calendar.events.insert({
      calendarId: settings.google_calendar_id || 'primary',
      requestBody: {
        summary,
        description,
        start: { dateTime: start },
        end: { dateTime: end },
      },
    });

    await pool.query(
      `UPDATE coach_calendar_settings SET last_synced_at = NOW() WHERE coach_id = $1`,
      [coachId]
    );

    return data;
  } catch (err) {
    console.error('Error in createGoogleEvent:', err);
    throw err;
  }
}
