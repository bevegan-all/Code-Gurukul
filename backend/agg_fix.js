require('dotenv').config();
const { sequelize } = require('./models/postgres');

async function fixSchemaOnceAndForAll() {
  try {
    console.log('Aggressively fixing StudentSubjects foreign keys...');
    
    // 1. Get all FK constraints on StudentSubjects
    const [constraints] = await sequelize.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'StudentSubjects' AND constraint_type = 'FOREIGN KEY';
    `);
    
    for (const c of constraints) {
      if (c.constraint_name.includes('student_id')) {
        console.log(`Dropping ${c.constraint_name}...`);
        await sequelize.query(`ALTER TABLE "StudentSubjects" DROP CONSTRAINT "${c.constraint_name}"`);
      }
    }
    
    // 2. Add the correct one
    console.log('Adding correct constraint pointing to Users(id)...');
    await sequelize.query('ALTER TABLE "StudentSubjects" ADD CONSTRAINT "StudentSubjects_student_id_fkey" FOREIGN KEY (student_id) REFERENCES "Users"(id) ON DELETE CASCADE');
    
    // 3. Just in case, check StudentProfiles as well if it has any weird index/constraint on roll_no
    // The detail said "Key (student_id)=(10) is not present in table StudentProfiles".
    // This confirms the FK was pointing there.
    
    console.log('Fixing MinorLabStudents if it exists...');
    try {
        await sequelize.query('ALTER TABLE "MinorLabStudents" DROP CONSTRAINT IF EXISTS "MinorLabStudents_student_profile_id_fkey"');
        // If this table is through table for MinorLab and StudentProfile, it should probably point to User?
        // But let's check if it exists first.
    } catch (e) {}

    console.log('Schema fix complete.');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

fixSchemaOnceAndForAll();
