const { sequelize } = require('./models/postgres');

async function fix() {
  try {
    console.log('Checking StudentSubjects foreign key constraints...');

    // List all FK constraints on StudentSubjects
    const [constraints] = await sequelize.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'StudentSubjects'
        AND constraint_type = 'FOREIGN KEY';
    `);
    console.log('Current FK constraints:', constraints.map(c => c.constraint_name));

    // Drop the bad stale fkey1 if it exists
    const hasFkey1 = constraints.some(c => c.constraint_name === 'StudentSubjects_student_id_fkey1');
    if (hasFkey1) {
      console.log('Dropping stale constraint StudentSubjects_student_id_fkey1...');
      await sequelize.query('ALTER TABLE "StudentSubjects" DROP CONSTRAINT IF EXISTS "StudentSubjects_student_id_fkey1"');
      console.log('Done! Stale constraint removed.');
    } else {
      console.log('Constraint StudentSubjects_student_id_fkey1 does not exist. Nothing to do.');
    }

    // Verify remaining constraints
    const [remaining] = await sequelize.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'StudentSubjects'
        AND constraint_type = 'FOREIGN KEY';
    `);
    console.log('Remaining FK constraints:', remaining.map(c => c.constraint_name));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

fix();
