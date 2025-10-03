import express from 'express';
import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';
import session from 'express-session';
import { pool } from '../db.js'; // adjust path if your db.js is elsewhere
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();



// Passport serialization/deserialization
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    console.log("Deserializing user with id:", id);
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (!rows[0]) {
      // Clear session and cookie if user not found
      // Cannot clear session directly here, but can signal to downstream middleware
      console.error("No user found for deserializeUser, id:", id);
      return done(null, false); // This will set req.user = false
    }
    return done(null, rows[0]);
  } catch (err) {
    console.error("DB error in deserializeUser:", err);
    done(err, null);
  }
});

// GoogleStrategy with explicit user creation before calling done
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/google/callback",
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;

    // 1. Try to find user by email
    let { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    let user = rows[0];

    // 2. If not found, create user (awaited before calling done)
if (!user) {
  const insert = await pool.query(
    `INSERT INTO users (id, email, role, auth_provider, created_at) 
     VALUES (gen_random_uuid(), $1, 'student', 'google', NOW()) 
     RETURNING *`,
    [email]
  );
  user = insert.rows[0];
}

    // 3. Ensure student profile exists for this user
    let studentRows = await pool.query('SELECT * FROM students WHERE user_id = $1', [user.id]);
    if (studentRows.rowCount === 0) {
      await pool.query(
        'INSERT INTO students (id, user_id, name, phone, skill_level, preferences) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          uuidv4(),                 // id
          user.id,                  // user_id
          profile.displayName || "",// name
          "",                       // phone
          "",                       // skill_level
          ""                        // preferences
        ]
      );
    }

    // 4. Only now call done with a guaranteed existing user
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: true }),
  (req, res) => {
    req.session.userId = req.user.id;
    req.session.save(() => {
      res.redirect('/');
    });
  }
);

// Middleware to clear session/cookie if user not found after deserialization
router.use((req, res, next) => {
  if (req.isAuthenticated && !req.isAuthenticated()) {
    if (req.session) req.session.destroy(() => {});
    res.clearCookie('connect.sid');
  }
  next();
});

export default router;