require('dotenv').config();
const { sequelize } = require('./models/postgres');

async function findRefs() {
  try {
    const [results] = await sequelize.query(`
      SELECT 
          tc.table_name, 
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
      FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
      WHERE ccu.table_name = 'StudentProfiles' AND tc.table_name != 'StudentProfiles';
    `);
    
    console.log(results);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

findRefs();
