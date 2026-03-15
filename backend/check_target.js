require('dotenv').config();
const { sequelize } = require('./models/postgres');

async function checkTarget() {
  try {
    const [results] = await sequelize.query(`
      SELECT 
          ccu.table_name AS foreign_table_name
      FROM 
          information_schema.constraint_column_usage AS ccu
      WHERE ccu.constraint_name = 'StudentSubjects_student_id_fkey';
    `);
    console.log('TARGET:', results[0].foreign_table_name);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkTarget();
