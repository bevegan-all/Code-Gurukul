require('dotenv').config();
const { sequelize } = require('./models/postgres');

async function cleanConstraints() {
  try {
    const [results] = await sequelize.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'StudentSubjects' AND constraint_type = 'FOREIGN KEY';
    `);
    
    console.log('Found constraints:', results.map(r => r.constraint_name));
    
    for (const r of results) {
      if (r.constraint_name.includes('student_id')) {
        console.log(`Dropping ${r.constraint_name}...`);
        await sequelize.query(`ALTER TABLE "StudentSubjects" DROP CONSTRAINT "${r.constraint_name}"`);
      }
    }
    
    console.log('Adding fresh constraint pointing to Users(id)...');
    await sequelize.query('ALTER TABLE "StudentSubjects" ADD CONSTRAINT "StudentSubjects_student_id_fkey" FOREIGN KEY (student_id) REFERENCES "Users"(id) ON DELETE CASCADE');
    
    console.log('Done.');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

cleanConstraints();
