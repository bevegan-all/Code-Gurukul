require('dotenv').config();
const { sequelize } = require('./models/postgres');

async function fixSchema() {
  try {
    console.log('Dropping and recreating StudentSubjects foreign key...');
    
    // 1. Drop the constraint if it exists
    await sequelize.query('ALTER TABLE "StudentSubjects" DROP CONSTRAINT IF EXISTS "StudentSubjects_student_id_fkey"');
    
    // 2. Add it back pointing to Users(id)
    await sequelize.query('ALTER TABLE "StudentSubjects" ADD CONSTRAINT "StudentSubjects_student_id_fkey" FOREIGN KEY (student_id) REFERENCES "Users"(id) ON DELETE CASCADE');
    
    console.log('Constraint fixed.');
  } catch (err) {
    console.error('Error fixing schema:', err.message);
  } finally {
    process.exit();
  }
}

fixSchema();
