require('dotenv').config();
const { connectDBs } = require('../config/db');
const { sequelize, User, StudentProfile, Class, Course, Subject, TeacherSubject, LabAssignment } = require('../models/postgres');
const { Note } = require('../models/mongo');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'seed_log.txt');
const log = (msg) => {
  const line = typeof msg === 'object' ? JSON.stringify(msg) : String(msg);
  fs.appendFileSync(logFile, line + '\n');
};

// Clear log
fs.writeFileSync(logFile, '=== Seed Script Started ===\n');

async function seedData() {
  try {
    await connectDBs();
    await sequelize.authenticate();
    log('DB connected.');

    // 1. Find the student
    const student = await User.findOne({ where: { role: 'student' }, order: [['id', 'DESC']] });
    if (!student) { log('ERROR: No student user found!'); return; }
    log('Student: id=' + student.id + ' name=' + student.name + ' email=' + student.email);

    // 2. Find or create Course
    let [course] = await Course.findOrCreate({
      where: { name: 'Computer Science' },
      defaults: { name: 'Computer Science' }
    });
    log('Course: id=' + course.id + ' name=' + course.name);

    // 3. Find or create Class
    let [cls] = await Class.findOrCreate({
      where: { name: 'B.Tech CS Year 1', course_id: course.id },
      defaults: { name: 'B.Tech CS Year 1', course_id: course.id, year: 'FY', division: 'A' }
    });
    log('Class: id=' + cls.id + ' name=' + cls.name);

    // 4. Find or create StudentProfile linked to this class
    let profile = await StudentProfile.findOne({ where: { user_id: student.id } });
    if (!profile) {
      profile = await StudentProfile.create({
        user_id: student.id,
        class_id: cls.id,
        roll_no: 'CS001'
      });
      log('Created new profile with class_id: ' + cls.id);
    } else {
      if (profile.class_id !== cls.id) {
        profile.class_id = cls.id;
        await profile.save();
        log('Updated profile class_id to: ' + cls.id);
      } else {
        log('Profile already has class_id: ' + profile.class_id);
      }
    }

    // 5. Find teacher
    const teacher = await User.findOne({ where: { role: 'teacher' } });
    if (!teacher) { log('ERROR: No teacher user found!'); return; }
    log('Teacher: id=' + teacher.id + ' name=' + teacher.name);

    // 6. Find or create Subjects (must have type: major)
    const subjectNames = ['Data Structures', 'Algorithms', 'Web Development'];
    const subjects = [];
    for (const sName of subjectNames) {
      let [sub] = await Subject.findOrCreate({
        where: { name: sName },
        defaults: { name: sName, type: 'major' }
      });
      // Ensure type is set
      if (!sub.type) {
        sub.type = 'major';
        await sub.save();
      }
      subjects.push(sub);
      log('Subject: id=' + sub.id + ' name=' + sub.name + ' type=' + sub.type);
    }

    // 7. Link teacher to subjects for this class via TeacherSubjects
    for (const sub of subjects) {
      await TeacherSubject.findOrCreate({
        where: {
          teacher_id: teacher.id,
          subject_id: sub.id,
          class_id: cls.id,
          type: 'major'
        },
        defaults: {
          teacher_id: teacher.id,
          subject_id: sub.id,
          class_id: cls.id,
          type: 'major'
        }
      });
      log('TeacherSubject linked: teacher ' + teacher.id + ' -> subject ' + sub.name + ' -> class ' + cls.id);
    }

    // 8. Create published LabAssignments
    for (const sub of subjects) {
      await LabAssignment.findOrCreate({
        where: { title: 'Lab: ' + sub.name, class_id: cls.id, subject_id: sub.id },
        defaults: {
          teacher_id: teacher.id,
          class_id: cls.id,
          subject_id: sub.id,
          title: 'Lab: ' + sub.name,
          description: 'Complete the coding exercises for ' + sub.name,
          time_limit_minutes: 60,
          compiler_required: 'Python',
          status: 'published'
        }
      });
      log('Assignment created for: ' + sub.name);
    }

    // 9. Clean up old Notes and Create new published Notes in MongoDB
    await Note.deleteMany({});
    log('Deleted all old notes from MongoDB.');

    for (const sub of subjects) {
      const existing = await Note.findOne({ title: 'Notes: ' + sub.name, class_id: cls.id });
      if (!existing) {
        let content = '';
        if (sub.name === 'Data Structures') {
           content = '<h2>Data Structures Overview</h2><p>Welcome to the <strong>Data Structures</strong> course.</p><h3>Key Topics</h3><ul><li>Arrays and Strings</li><li>Linked Lists</li><li>Trees and Graphs</li></ul><p>Example of an array declaration:</p><pre><code>int[] numbers = {1, 2, 3, 4, 5};</code></pre><p><span style="color: rgb(230, 0, 0);">Important:</span> Make sure to carefully study pointers and memory management.</p>';
        } else if (sub.name === 'Algorithms') {
           content = '<h2>Introduction to Algorithms</h2><p>Here we will discuss time and space complexity.</p><h3>Big O Notation</h3><ol><li>O(1) - Constant time</li><li>O(n) - Linear time</li><li>O(n^2) - Quadratic time</li></ol><p><strong style="background-color: rgb(255, 255, 0);">Note:</strong> Review the common sorting algorithms before the next lab session!</p>';
        } else {
           content = `<h2>${sub.name}</h2><p>Welcome to the study material for <strong>${sub.name}</strong>.</p><blockquote><p>Consistency is the key to mastering this subject.</p></blockquote><p>Please refer to the course syllabus for more detailed information.</p>`;
        }

        await Note.create({
          teacher_id: teacher.id,
          class_id: cls.id,
          subject_id: sub.id,
          title: 'Notes: ' + sub.name,
          content_html: content,
          status: 'published'
        });
        log('Note created for: ' + sub.name);
      } else {
        log('Note already exists for: ' + sub.name);
      }
    }

    // 10. Verify
    log('');
    log('=== Verification ===');
    const tsCount = await TeacherSubject.count({ where: { class_id: cls.id } });
    log('TeacherSubjects for class ' + cls.id + ': ' + tsCount);

    const labCount = await LabAssignment.count({ where: { class_id: cls.id, status: 'published' } });
    log('Published assignments for class ' + cls.id + ': ' + labCount);

    const noteCount = await Note.countDocuments({ class_id: cls.id, status: 'published' });
    log('Published notes for class ' + cls.id + ': ' + noteCount);

    const majorCountQuery = await sequelize.query(
      "SELECT COUNT(DISTINCT subject_id) as count FROM \"TeacherSubjects\" WHERE class_id = " + cls.id + " AND type = 'major'",
      { type: sequelize.QueryTypes.SELECT }
    );
    log('Dashboard subject count: ' + majorCountQuery[0].count);

    log('');
    log('=== SEED COMPLETE ===');
  } catch (err) {
    log('SEED ERROR: ' + err.message);
    log(err.stack);
  } finally {
    process.exit(0);
  }
}

seedData();
