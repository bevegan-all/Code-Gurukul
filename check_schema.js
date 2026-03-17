require('dotenv').config({ path: './backend/.env' });
const { sequelize } = require('./backend/models/postgres');

async function checkSchema() {
  try {
    const [results] = await sequelize.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Users'");
    console.log(JSON.stringify(results, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
checkSchema();
