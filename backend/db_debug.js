const { sequelize } = require('./models/postgres');

async function main() {
  try {
    await sequelize.authenticate();

    // Check all users with student role
    const students = await sequelize.query("SELECT id, name, email FROM \"Users\" WHERE role = 'student' LIMIT 5", { type: 'SELECT' });
    process.stdout.write('Students: ' + JSON.stringify(students) + '\n');

    // All student profiles
    const profiles = await sequelize.query('SELECT * FROM "StudentProfiles" LIMIT 5', { type: 'SELECT' });
    process.stdout.write('Profiles: ' + JSON.stringify(profiles) + '\n');

    // All published lab assignments
    const assignments = await sequelize.query("SELECT id, title, class_id, subject_id, status FROM \"LabAssignments\" WHERE status = 'published'", { type: 'SELECT' });
    process.stdout.write('Published Assignments: ' + JSON.stringify(assignments) + '\n');

    // TeacherSubjects table
    const ts = await sequelize.query('SELECT * FROM "TeacherSubjects" LIMIT 10', { type: 'SELECT' });
    process.stdout.write('TeacherSubjects: ' + JSON.stringify(ts) + '\n');

  } catch(e) {
    process.stdout.write('ERROR: ' + e.message + '\n');
  }
  process.exit(0);
}

main();
