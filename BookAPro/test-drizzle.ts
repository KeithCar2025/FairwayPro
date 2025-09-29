import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import dotenv from 'dotenv';
import { users } from '@shared/schema';

dotenv.config();

async function testConnection() {
  const pool = new Pool({
    host: process.env.PG_HOST,
    port: Number(process.env.PG_PORT || 5432),
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
  });

  const db = drizzle(pool);

  try {
    const result = await db.select().from(users).limit(1);
    console.log('Connection successful! Sample user:', result);
  } catch (err) {
    console.error('Postgres connection failed:', err);
  } finally {
    await pool.end();
  }
}

testConnection();
