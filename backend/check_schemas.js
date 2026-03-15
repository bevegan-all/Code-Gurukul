require('dotenv').config();
const { sequelize } = require('./models/postgres');

async function checkSchemas() {
  try {
    const [results] = await sequelize.query(`
      SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'StudentSubjects';
    `);
    console.log(results);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkSchemas();
