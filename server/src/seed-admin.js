require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcrypt');
const db = require('./db');

async function seed() {
  const email = 'admin@marketplace.com';
  const password = 'admin1234';
  const display_name = 'Admin';

  const hash = await bcrypt.hash(password, 10);

  await db.query(
    `INSERT INTO users (email, display_name, password_hash, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO UPDATE SET role = 'admin', password_hash = $3`,
    [email, display_name, hash]
  );

  console.log('✅ Admin seeded:');
  console.log('   Email:   ', email);
  console.log('   Password:', password);
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
