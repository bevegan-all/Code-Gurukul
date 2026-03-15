require('dotenv').config();
const { sequelize } = require('./models/postgres');

async function checkColumns() {
  try {
    const [results] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Users';
    `);
    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkColumns();
