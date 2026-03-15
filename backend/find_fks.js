require('dotenv').config();
const { sequelize } = require('./models/postgres');

async function findConstraintAnywhere() {
  try {
    const [results] = await sequelize.query(`
      SELECT 
          tc.table_name, 
          tc.constraint_name,
          ccu.table_name AS foreign_table_name
      FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_name LIKE '%student_id%' AND tc.constraint_type = 'FOREIGN KEY';
    `);
    
    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

findConstraintAnywhere();
