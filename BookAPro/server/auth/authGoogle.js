import express from 'express';
import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';
import { pool } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Passport serialization/deserialization
passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (!rows[0]) {
      console.error("No user found for deserializeUser, id:", id);
      return done(null, false);
    }
    return done(null, rows[0]);
  } catch (err) {
    console.error("DB error in deserializeUser:", err);
    done(err, null);
  }
});

// Google OAuth strategy
passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback",
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;

      // Check if user exists
      let { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      let user = rows[0];

      // If not, create new student user
      if (!user) {
        const insert = await pool.query(
          `INSERT INTO users (id, email, role, auth_provider, created_at) 
           VALUES (gen_random_uuid(), $1, 'student', 'google', NOW()) 
           RETURNING *`,
          [email]
        );
        user = insert.rows[0];
      }

      // Ensure student profile exists
      const studentRows = await pool.query('SELECT * FROM students WHERE user_id = $1', [user.id]);
      if (studentRows.rowCount === 0) {
        await pool.query(
          `INSERT INTO students (id, user_id, name, phone, skill_level, preferences) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [uuidv4(), user.id, profile.displayName || "", "", "", ""]
        );
      }

      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

// --- Routes ---

// Force new session and prompt account selection on Google login
router.get('/google', (req, res, next) => {
  // Destroy current session to ensure a fresh OAuth login
  req.session?.destroy(() => {
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      prompt: 'select_account', // always show account chooser
    })(req, res, next);
  });
});

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: true }),
  (req, res) => {
    if (!req.user || !req.session) {
      return res.redirect(process.env.FRONTEND_URL + '/login');
    }

    req.session.userId = req.user.id;

    req.session.save(() =>
      res.redirect(`${process.env.FRONTEND_URL}/?googleLoggedIn=1`)
    );
  }
);

export default router;
