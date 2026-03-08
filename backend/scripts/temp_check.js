require('dotenv').config();
const { connectDBs } = require('./config/db');
const { sequelize, User, StudentProfile, Class, Course, Subject, TeacherSubject, LabAssignment } = require('./models/postgres');

async function check() {
  try {
    await connectDBs();
    await sequelize.authenticate();
    
    const omkar = await User.findOne({ where: { role: 'student' }, order: [['id', 'DESC']] });
    console.log('Omkar:', omkar.toJSON());
    
    const profile = await StudentProfile.findOne({ where: { user_id: omkar.id } });
    console.log('Profile:', profile ? profile.toJSON() : 'null');
    
    if (profile && profile.class_id) {
      const assignments = await LabAssignment.findAll({ where: { class_id: profile.class_id } });
      console.log('Found ' + assignments.length + ' assignments for class ' + profile.class_id);
      
      const ts = await TeacherSubject.findAll({ where: { class_id: profile.class_id } });
      console.log('Found ' + ts.length + ' teacher_subjects for class ' + profile.class_id);

      const subjectsQuery = await sequelize.query(
        "SELECT s.id as subject_id, s.name as subject_name, ts.type, u.name as teacher_name FROM \"TeacherSubjects\" ts JOIN \"Subjects\" s ON ts.subject_id = s.id JOIN \"Users\" u ON ts.teacher_id = u.id WHERE (ts.class_id = :cid AND ts.type = 'major') OR (ts.subject_id = :msid AND ts.type = 'minor')",
        { replacements: { cid: profile.class_id, msid: profile.minor_subject_id || 0 }, type: sequelize.QueryTypes.SELECT }
      );
      console.log('Subjects:', subjectsQuery.length);
    }
  } catch (err) { console.error('Error', err); }
}

check().catch(console.error).finally(()=>process.exit(0));
