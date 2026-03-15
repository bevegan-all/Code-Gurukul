require('dotenv').config();
const { sequelize } = require('./models/postgres');

async function checkConstraints() {
  try {
    const [results] = await sequelize.query(`
      SELECT 
          tc.constraint_name, 
          tc.table_name, 
          kcu.column_name, 
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name 
      FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'StudentSubjects';
    `);
    
    for (const r of results) {
      console.log('--- CONSTRAINT ---');
      console.log('Name:', r.constraint_name);
      console.log('Table:', r.table_name);
      console.log('Column:', r.column_name);
      console.log('Foreign Table:', r.foreign_table_name);
      console.log('Foreign Column:', r.foreign_column_name);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkConstraints();
