require('dotenv').config();
const { sequelize } = require('./models/postgres');

async function findPointingToProfiles() {
  try {
    const [results] = await sequelize.query(`
      SELECT 
          tc.table_name, 
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name
      FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
      WHERE ccu.table_name = 'StudentProfiles';
    `);
    
    const fs = require('fs');
    fs.writeFileSync('profile_refs.json', JSON.stringify(results, null, 2));
    console.log('Saved to profile_refs.json');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

findPointingToProfiles();
