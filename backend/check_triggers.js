require('dotenv').config();
const { sequelize } = require('./models/postgres');

async function checkTriggers() {
  try {
    const [results] = await sequelize.query(`
      SELECT trigger_name, event_object_table 
      FROM information_schema.triggers;
    `);
    console.log(results);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkTriggers();
