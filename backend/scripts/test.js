require('dotenv').config();
const { connectDBs } = require('./config/db');
const { sequelize, User, StudentProfile, Class, Course, Subject, TeacherSubject, LabAssignment } = require('./models/postgres');

async function test() {
  await connectDBs();
  await sequelize.authenticate();
  const omkar = await User.findOne({ where: { role: 'student' }, order: [['id', 'DESC']] });
  console.log('User:', omkar ? omkar.id : 'No user');
  const profile = await StudentProfile.findOne({ where: { user_id: omkar.id } });
  console.log('Profile:', profile ? profile.class_id : 'No profile');
  const classId = profile.class_id;

  const assignments = await LabAssignment.findAll({ where: { class_id: classId } });
  console.log('Assignments mapping to student class:', assignments.length);

  const reqCount = await sequelize.query('SELECT count(*) as cx FROM "TeacherSubjects" ts WHERE ts.class_id = :cid', { replacements: { cid: classId }});
  console.log('TeacherSubject:', reqCount[0][0]);
  process.exit();
}
test();
