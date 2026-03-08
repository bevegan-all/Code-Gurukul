require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sequelize } = require('../config/db');

async function main() {
  try {
    await sequelize.authenticate();
    const [rows] = await sequelize.query("SELECT id, name, email, role FROM \"Users\" WHERE role IN ('teacher', 'student') ORDER BY role, id");
    console.log('Found', rows.length, 'users:');
    rows.forEach(r => console.log(`  [${r.role}] ${r.name} — ${r.email}`));
    
    const [all] = await sequelize.query("SELECT role, COUNT(*) as cnt FROM \"Users\" GROUP BY role");
    console.log('\nAll roles:', JSON.stringify(all));
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
main();
