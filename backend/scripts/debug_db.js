const fs = require('fs');
const path = require('path');
const logFile = path.join(__dirname, 'debug_log.txt');

try {
  fs.writeFileSync(logFile, 'Step 1: Script started\n');

  require('dotenv').config();
  fs.appendFileSync(logFile, 'Step 2: dotenv loaded\n');
  fs.appendFileSync(logFile, 'PG_DATABASE: ' + process.env.PG_DATABASE + '\n');
  fs.appendFileSync(logFile, 'MONGO_URI: ' + process.env.MONGO_URI + '\n');

  const { sequelize } = require('../config/db');
  fs.appendFileSync(logFile, 'Step 3: config/db loaded\n');

  const { User, StudentProfile, Class, Course, Subject, TeacherSubject, LabAssignment } = require('../models/postgres');
  fs.appendFileSync(logFile, 'Step 4: models loaded\n');

  async function run() {
    try {
      await sequelize.authenticate();
      fs.appendFileSync(logFile, 'Step 5: PG connected\n');

      const users = await User.findAll({ attributes: ['id', 'name', 'role'] });
      fs.appendFileSync(logFile, 'Step 6: Users found: ' + users.length + '\n');
      for (const u of users) {
        fs.appendFileSync(logFile, '  - id=' + u.id + ' name=' + u.name + ' role=' + u.role + '\n');
      }

      const profiles = await StudentProfile.findAll();
      fs.appendFileSync(logFile, 'Step 7: Profiles found: ' + profiles.length + '\n');
      for (const p of profiles) {
        fs.appendFileSync(logFile, '  - id=' + p.id + ' user_id=' + p.user_id + ' class_id=' + p.class_id + '\n');
      }

      const classes = await Class.findAll();
      fs.appendFileSync(logFile, 'Step 8: Classes found: ' + classes.length + '\n');
      for (const c of classes) {
        fs.appendFileSync(logFile, '  - id=' + c.id + ' name=' + c.name + ' course_id=' + c.course_id + '\n');
      }

      const subjects = await Subject.findAll();
      fs.appendFileSync(logFile, 'Step 9: Subjects found: ' + subjects.length + '\n');
      for (const s of subjects) {
        fs.appendFileSync(logFile, '  - id=' + s.id + ' name=' + s.name + ' type=' + s.type + '\n');
      }

      const ts = await TeacherSubject.findAll();
      fs.appendFileSync(logFile, 'Step 10: TeacherSubjects found: ' + ts.length + '\n');
      for (const t of ts) {
        fs.appendFileSync(logFile, '  - teacher_id=' + t.teacher_id + ' subject_id=' + t.subject_id + ' class_id=' + t.class_id + ' type=' + t.type + '\n');
      }

      const assignments = await LabAssignment.findAll();
      fs.appendFileSync(logFile, 'Step 11: Assignments found: ' + assignments.length + '\n');
      for (const a of assignments) {
        fs.appendFileSync(logFile, '  - id=' + a.id + ' title=' + a.title + ' class_id=' + a.class_id + ' status=' + a.status + '\n');
      }

      fs.appendFileSync(logFile, '\n=== DEBUG COMPLETE ===\n');
    } catch (err) {
      fs.appendFileSync(logFile, 'ERROR in run: ' + err.message + '\n' + err.stack + '\n');
    }
    process.exit(0);
  }

  run();
} catch (err) {
  fs.appendFileSync(logFile, 'TOP-LEVEL ERROR: ' + err.message + '\n' + err.stack + '\n');
  process.exit(1);
}
