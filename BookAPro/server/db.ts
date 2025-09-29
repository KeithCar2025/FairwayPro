import pkg from 'pg';
const { Pool } = pkg;

import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Ensure DATABASE_URL is set in your .env
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set in .env");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2 // Set to 2 for Supabase free tier!
});

// Export a Drizzle ORM client
export const db = drizzle(pool, { schema });