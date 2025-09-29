import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: 'postgresql://KeithCar2025:Easytr1p27.2025@jpnahkafypjpehpmruch.supabase.co:5432/postgres'
});

async function test() {
  try {
    await client.connect();
    console.log('✅ Connected to the database successfully');
    await client.end();
  } catch (err) {
    console.error('❌ Database connection failed:', err);
  }
}

test();
