const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5433,
  user: 'postgres',
  password: 'QTUnd1Y@&h@&hd3',
  database: 'postgres', // or 'iotee'
});

async function check() {
  try {
    await client.connect();
    console.log('✅ Direct PG connection successful!');
    const res = await client.query('SELECT user_id, email FROM users LIMIT 1;');
    console.log('User found:', res.rows);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  } finally {
    await client.end();
  }
}

check();