const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || require('fs').readFileSync('.env', 'utf8').match(/DATABASE_URL=(.*)/)[1].trim(),
});

async function seed() {
  console.log("🌱 Seeding full NAVA OTP catalog & services...");

  // 1. Countries
  const countryRes = await pool.query(`
    INSERT INTO countries (name, code, dial_code, flag_emoji, is_active)
    VALUES 
      ('Nigeria', 'NG', '+234', '🇳🇬', true),
      ('United States', 'US', '+1', '🇺🇸', true),
      ('United Kingdom', 'GB', '+44', '🇬🇧', true),
      ('Canada', 'CA', '+1', '🇨🇦', true),
      ('Ghana', 'GH', '+233', '🇬🇭', true),
      ('Kenya', 'KE', '+254', '🇰🇪', true)
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
    RETURNING id, code;
  `);

  const ngId = countryRes.rows.find(c => c.code === 'NG').id;
  const usId = countryRes.rows.find(c => c.code === 'US').id;

  // 2. Services
  const servicesData = [
    { name: 'Amazon', slug: 'amazon', icon: '🛒', category: 'Shopping' },
    { name: 'Badoo', slug: 'badoo', icon: '❤️', category: 'Dating' },
    { name: 'Bumble', slug: 'bumble', icon: '🐝', category: 'Dating' },
    { name: 'Cash App', slug: 'cashapp', icon: '💵', category: 'Finance' },
    { name: 'Coffee Meets Bagel', slug: 'coffeemeetsbagel', icon: '☕', category: 'Dating' },
    { name: 'Discord', slug: 'discord', icon: '👾', category: 'Social' },
    { name: 'Facebook', slug: 'facebook', icon: '📘', category: 'Social' },
    { name: 'Gmail / Google', slug: 'google', icon: '🔍', category: 'Email' },
    { name: 'Grindr', slug: 'grindr', icon: '🟡', category: 'Dating' },
    { name: 'HER', slug: 'her', icon: '🌈', category: 'Dating' },
    { name: 'WhatsApp', slug: 'whatsapp', icon: '💬', category: 'Messaging' },
    { name: 'Telegram', slug: 'telegram', icon: '✈️', category: 'Messaging' },
    { name: 'TikTok', slug: 'tiktok', icon: '🎵', category: 'Social' },
    { name: 'Netflix', slug: 'netflix', icon: '🎬', category: 'Entertainment' },
    { name: 'PayPal', slug: 'paypal', icon: '💳', category: 'Finance' },
  ];

  for (const s of servicesData) {
    const sRes = await pool.query(`
      INSERT INTO services (name, slug, icon, category, is_active)
      VALUES ($1, $2, $3, $4, true)
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `, [s.name, s.slug, s.icon, s.category]);

    const serviceId = sRes.rows[0].id;

    // Price mapping
    let price = '0.40';
    if (s.name === 'Cash App') price = '1.25';
    if (s.name === 'Bumble') price = '0.80';
    if (s.name === 'Badoo') price = '0.70';
    if (s.name === 'Discord') price = '0.25';
    if (s.name === 'Facebook') price = '0.30';

    await pool.query(`
      INSERT INTO offers (service_id, country_id, price, is_active)
      VALUES ($1, $2, $3, true)
      ON CONFLICT DO NOTHING;
    `, [serviceId, ngId, price]);

    await pool.query(`
      INSERT INTO offers (service_id, country_id, price, is_active)
      VALUES ($1, $2, $3, true)
      ON CONFLICT DO NOTHING;
    `, [serviceId, usId, (parseFloat(price) + 0.20).toFixed(2)]);
  }

  // Set wallet balance
  await pool.query(`UPDATE wallets SET balance = '2.00';`);

  console.log("✅ Seeded services and pricing catalog successfully!");
  await pool.end();
}

seed().catch(err => { console.error(err); process.exit(1); });