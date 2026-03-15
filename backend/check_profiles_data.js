require('dotenv').config();
const { sequelize } = require('./models/postgres');

async function checkProfiles() {
  try {
    const [results] = await sequelize.query(`
      SELECT id, user_id, roll_no FROM "StudentProfiles" LIMIT 10;
    `);
    console.log(results);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkProfiles();
