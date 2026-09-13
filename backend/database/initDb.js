const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

async function runPostgresMigration() {
  const isSeed = process.argv.includes('--seed');
  console.log(`🚀 Connecting to PostgreSQL to run ${isSeed ? 'Schema + Seed' : 'Schema'}...`);

  const pgConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        user: process.env.PGUSER || 'postgres',
        host: process.env.PGHOST || 'localhost',
        database: process.env.PGDATABASE || 'lend_and_borrow',
        password: process.env.PGPASSWORD || 'postgres',
        port: parseInt(process.env.PGPORT || '5432', 10),
      };

  const pool = new Pool(pgConfig);

  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected.');

    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    console.log('⏳ Executing schema.sql...');
    await client.query(schemaSql);
    console.log('✅ schema.sql executed successfully.');

    if (isSeed) {
      const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf-8');
      console.log('⏳ Executing seed.sql...');
      await client.query(seedSql);
      console.log('✅ seed.sql executed successfully.');
    }

    client.release();
    await pool.end();
    console.log('🎉 PostgreSQL database setup completed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.log('\nTip: Ensure PostgreSQL is running on port 5432 and database exists:');
    console.log('CREATE DATABASE lend_and_borrow;');
    await pool.end();
    process.exit(1);
  }
}

runPostgresMigration();
