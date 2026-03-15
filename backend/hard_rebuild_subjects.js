require('dotenv').config();
const { sequelize } = require('./models/postgres');

async function hardRebuild() {
  try {
    console.log('Nuking StudentSubjects and rebuilding with explicit DDL...');
    
    await sequelize.query('DROP TABLE IF EXISTS "StudentSubjects" CASCADE');
    
    await sequelize.query(`
      CREATE TABLE "StudentSubjects" (
        "id" SERIAL PRIMARY KEY,
        "student_id" INTEGER NOT NULL,
        "subject_id" INTEGER NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT "StudentSubjects_student_id_fkey" FOREIGN KEY (student_id) REFERENCES "Users"(id) ON DELETE CASCADE,
        CONSTRAINT "StudentSubjects_subject_id_fkey" FOREIGN KEY (subject_id) REFERENCES "Subjects"(id) ON DELETE CASCADE
      );
    `);
    
    console.log('Table StudentSubjects hard-rebuilt.');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

hardRebuild();
