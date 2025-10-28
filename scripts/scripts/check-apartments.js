const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkApartments() {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM apartments WHERE is_available = true');
    console.log('✅ Available apartments in database:', result.rows[0].count);
    
    if (result.rows[0].count === '0') {
      console.log('\n⚠️  No apartments found! Run: npm run seed');
    } else {
      // Show a sample
      const sample = await pool.query('SELECT id, title, price_huf, district FROM apartments WHERE is_available = true LIMIT 3');
      console.log('\n📋 Sample apartments:');
      sample.rows.forEach(apt => {
        console.log(`  - ${apt.title} (District ${apt.district}): ${apt.price_huf} HUF`);
      });
    }
  } catch (error) {
    console.error('❌ Error checking apartments:', error.message);
  } finally {
    await pool.end();
  }
}

checkApartments();
