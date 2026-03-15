const { sequelize } = require('./config/db');
async function run() {
  try {
    await sequelize.query('DROP TABLE IF EXISTS "Labs" CASCADE;');
    await sequelize.query('DROP TABLE IF EXISTS "LabSlots" CASCADE;');
    await sequelize.query('DROP TABLE IF EXISTS "MinorLabs" CASCADE;');
    await sequelize.query('DROP TABLE IF EXISTS "MinorLabSlots" CASCADE;');
    console.log('Tables dropped successfully.');
  } catch(e) { console.error(e); }
  process.exit(0);
}
run();
