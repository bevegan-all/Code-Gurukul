const fs = require('fs');
const path = require('path');
const logFile = path.join(__dirname, 'verify_log.txt');
const log = (msg) => fs.appendFileSync(logFile, msg + '\n');
fs.writeFileSync(logFile, '=== Verification ===\n');

require('dotenv').config();
const { connectDBs } = require('../config/db');
const { sequelize, User, StudentProfile, Class, Course, Subject, TeacherSubject, LabAssignment } = require('../models/postgres');
const { Note } = require('../models/mongo');

async function verify() {
  try {
    await connectDBs();
    await sequelize.authenticate();
    
    // Mimic dashboard route exactly
    const student = await User.findOne({ where: { role: 'student' }, order: [['id', 'DESC']] });
    log('Student: id=' + student.id + ' name=' + student.name);
    
    const profile = await StudentProfile.findOne({
      where: { user_id: student.id },
      include: [
        { model: Class, include: [Course] },
        { model: Subject, as: 'MinorSubject' }
      ]
    });
    
    if (!profile) { log('NO PROFILE FOUND!'); process.exit(1); }
    
    log('Profile class_id: ' + profile.class_id);
    log('Class: ' + (profile.Class ? profile.Class.name : 'NULL'));
    log('Course: ' + (profile.Class?.Course ? profile.Class.Course.name : 'NULL'));
    log('Minor: ' + (profile.MinorSubject ? profile.MinorSubject.name : 'NULL'));
    
    const classId = parseInt(profile.class_id, 10);
    log('classId (parsed): ' + classId);
    
    // Run exact queries from dashboard
    const majorCountQuery = await sequelize.query(
      'SELECT COUNT(DISTINCT subject_id) as count FROM "TeacherSubjects" WHERE class_id = ' + classId + " AND type = 'major'",
      { type: sequelize.QueryTypes.SELECT }
    );
    log('Major subjects: ' + majorCountQuery[0].count);
    
    const assignmentQuery = await sequelize.query(
      "SELECT COUNT(*) as count FROM \"LabAssignments\" WHERE status = 'published' AND class_id = " + classId,
      { type: sequelize.QueryTypes.SELECT }
    );
    log('Published assignments: ' + assignmentQuery[0].count);
    
    const noteCount = await Note.countDocuments({ status: 'published', class_id: classId });
    log('Published notes: ' + noteCount);
    
    // Also try matching class_id as string (MongoDB stores it as Number)
    const noteCountStr = await Note.countDocuments({ status: 'published', class_id: String(classId) });
    log('Published notes (string match): ' + noteCountStr);
    
    // List actual notes
    const notes = await Note.find({ status: 'published' });
    log('All published notes: ' + notes.length);
    for (const n of notes) {
      log('  note: title=' + n.title + ' class_id=' + n.class_id + ' (type=' + typeof n.class_id + ')');
    }
    
    log('\n=== DONE ===');
  } catch (err) {
    log('ERROR: ' + err.message + '\n' + err.stack);
  }
  process.exit(0);
}

verify();
