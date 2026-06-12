const { Client } = require('pg');

const databaseUrl = 'postgresql://neondb_owner:npg_Ur0dTkXAzS4L@ep-blue-cherry-aoxkbgzl.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function check() {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to database successfully!");

    // Check existing tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public';
    `);
    console.log("Tables in DB:", tablesRes.rows.map(r => r.table_name));

    // Check admin_config table
    const configRes = await client.query("SELECT * FROM admin_config;");
    console.log("Admin config rows:", configRes.rows);

    // Check managers table
    const managersRes = await client.query("SELECT id, login, \"fullName\" FROM managers;");
    console.log("Managers:", managersRes.rows);

  } catch (err) {
    console.error("Database error:", err);
  } finally {
    await client.end();
  }
}

check();
