require('dotenv').config();
const { sequelize } = require('./models/postgres');

async function checkTableName() {
  try {
    const [results] = await sequelize.query(`
      SELECT table_name FROM information_schema.tables WHERE table_name ILIKE '%StudentSubjects%';
    `);
    console.log('Tables matching StudentSubjects:', results);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkTableName();
