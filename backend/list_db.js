require('dotenv').config();
const { sequelize } = require('./config/db');

async function listTables() {
  try {
    const tables = await sequelize.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'", { type: sequelize.QueryTypes.SELECT });
    console.log('Tables:', tables.map(t => t.table_name));
    
    const columns = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name='LabSlots'", { type: sequelize.QueryTypes.SELECT });
    console.log('Columns in LabSlots:', columns.map(c => c.column_name));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

listTables();
