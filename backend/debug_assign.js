const { sequelize } = require('./models/postgres');

async function debug() {
  try {
    await sequelize.authenticate();
    console.log('Connected!');

    // Check assignment 5
    const a = await sequelize.query('SELECT id, title, class_id, subject_id, teacher_id, status FROM "LabAssignments" WHERE id = 5', { type: 'SELECT' });
    console.log('Assignment 5:', JSON.stringify(a, null, 2));

    // Check student profile
    const u = await sequelize.query("SELECT id, name, email FROM \"Users\" WHERE email = '5454317@mitacsc.edu.in'", { type: 'SELECT' });
    console.log('User:', JSON.stringify(u, null, 2));

    if (u.length) {
      const sp = await sequelize.query('SELECT * FROM "StudentProfiles" WHERE user_id = ' + u[0].id, { type: 'SELECT' });
      console.log('StudentProfile:', JSON.stringify(sp, null, 2));

      if (sp.length) {
        const cid = sp[0].class_id;
        const ts = await sequelize.query('SELECT * FROM "TeacherSubjects" WHERE class_id = ' + cid, { type: 'SELECT' });
        console.log('TeacherSubjects for class', cid, ':', JSON.stringify(ts, null, 2));

        const allA = await sequelize.query("SELECT id, title, class_id, subject_id, status FROM \"LabAssignments\" WHERE status = 'published'", { type: 'SELECT' });
        console.log('All published assignments:', JSON.stringify(allA, null, 2));
      }
    }
  } catch(e) {
    console.error('ERROR:', e.message);
  }
  process.exit(0);
}

debug();
