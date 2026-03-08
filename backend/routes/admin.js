const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roleGuard');
const { Department, Course, Class, Subject, User, TeacherSubject, StudentProfile, StudentSubject, sequelize } = require('../models/postgres');
const bcrypt = require('bcryptjs');
const emailService = require('../services/emailService');

router.use(auth);
router.use(requireRole('admin'));

// ================= DASHBOARD STATS =================
router.get('/dashboard-stats', async (req, res) => {
  try {
    const teachers = await User.count({ where: { role: 'teacher' } });
    const students = await User.count({ where: { role: 'student' } });
    const courses = await Course.count();
    const departments = await Department.count();

    // Fetch data for the chart (Students by Course) using raw SQL for safety
    const coursesData = await sequelize.query(`
      SELECT c.name, COUNT(sp.id) as students
      FROM "Courses" c
      LEFT JOIN "Classes" cl ON c.id = cl.course_id
      LEFT JOIN "StudentProfiles" sp ON cl.id = sp.class_id
      GROUP BY c.id, c.name
      ORDER BY students DESC
    `, { type: sequelize.QueryTypes.SELECT });

    // Format chart data: Course Name -> Number of Students
    const chartData = coursesData.map(row => ({
      name: row.name,
      students: parseInt(row.students, 10) || 0
    }));

    res.json({
      teachers,
      students,
      courses,
      departments,
      chartData
    });

  } catch (err) {
    console.error('GET /dashboard-stats error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================= DEPARTMENTS =================
router.get('/departments', async (req, res) => {
  try {
    const departments = await Department.findAll({ include: [{ model: User, as: 'Creator', attributes: ['name'] }] });
    res.json(departments);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/departments', async (req, res) => {
  try {
    const dept = await Department.create({ name: req.body.name, created_by: req.user.id });
    res.json(dept);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/departments/:id', async (req, res) => {
  try {
    await Department.update({ name: req.body.name }, { where: { id: req.params.id } });
    res.json({ msg: 'Department updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/departments/:id', async (req, res) => {
  try {
    await Department.destroy({ where: { id: req.params.id } });
    res.json({ msg: 'Department deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ================= COURSES =================
router.get('/courses', async (req, res) => {
  try {
    const courses = await Course.findAll({ include: [Department] });
    res.json(courses);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/courses', async (req, res) => {
  try {
    const course = await Course.create({ name: req.body.name, department_id: req.body.department_id });
    res.json(course);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/courses/:id', async (req, res) => {
  try {
    await Course.update({ name: req.body.name, department_id: req.body.department_id }, { where: { id: req.params.id } });
    res.json({ msg: 'Course updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/courses/:id', async (req, res) => {
  try {
    await Course.destroy({ where: { id: req.params.id } });
    res.json({ msg: 'Course deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ================= CLASSES =================
router.get('/classes', async (req, res) => {
  try {
    const classes = await Class.findAll({ include: [{ model: Course, include: [Department] }] });
    res.json(classes);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/classes', async (req, res) => {
  try {
    const cls = await Class.create({ name: req.body.name, course_id: req.body.course_id });
    res.json(cls);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/classes/:id', async (req, res) => {
  try {
    await Class.update({ name: req.body.name, course_id: req.body.course_id }, { where: { id: req.params.id } });
    res.json({ msg: 'Class updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/classes/:id', async (req, res) => {
  try {
    await Class.destroy({ where: { id: req.params.id } });
    res.json({ msg: 'Class deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ================= SUBJECTS =================
router.get('/subjects', async (req, res) => {
  try {
    const subjects = await Subject.findAll({ include: [Course] });
    res.json(subjects);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/subjects', async (req, res) => {
  try {
    const sub = await Subject.create({ 
      name: req.body.name, 
      type: req.body.type, 
      course_id: req.body.type === 'minor' ? null : req.body.course_id 
    });
    res.json(sub);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/subjects/:id', async (req, res) => {
  try {
    await Subject.update({ 
      name: req.body.name, type: req.body.type,
      course_id: req.body.type === 'minor' ? null : req.body.course_id 
    }, { where: { id: req.params.id } });
    res.json({ msg: 'Subject updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/subjects/:id', async (req, res) => {
  try {
    await Subject.destroy({ where: { id: req.params.id } });
    res.json({ msg: 'Subject deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ================= TEACHERS =================
router.get('/teachers', async (req, res) => {
  try {
    // First get all teachers
    const teachers = await User.findAll({
      where: { role: 'teacher' },
      attributes: { exclude: ['password_hash'] },
      raw: true
    });

    // Then get their subject assignments separately
    const [assignments] = await sequelize.query(`
      SELECT ts.teacher_id, ts.subject_id, ts.class_id, ts.type,
             s.name AS subject_name,
             cl.name AS class_name
      FROM "TeacherSubjects" ts
      LEFT JOIN "Subjects" s ON ts.subject_id = s.id
      LEFT JOIN "Classes" cl ON ts.class_id = cl.id
    `);

    // Attach assignments to teachers
    const result = teachers.map(t => ({
      ...t,
      TeacherSubjects: assignments.filter(a => a.teacher_id === t.id).map(a => ({
        type: a.type,
        subject_id: a.subject_id,
        class_id: a.class_id,
        Subject: { name: a.subject_name },
        Class: a.class_id ? { name: a.class_name } : null
      }))
    }));

    res.json(result);
  } catch (err) {
    console.error('GET /teachers error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/teachers', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name, email, phone, major_assignments, minor_subject_id } = req.body;
    // major_assignments = [{ subject_id, class_id }, ...]
    
    const defaultPassword = 'Teacher@123';
    const password_hash = await bcrypt.hash(defaultPassword, 10);
    const teacher = await User.create({ name, email, phone: phone || null, password_hash, role: 'teacher' }, { transaction: t });

    if (major_assignments && major_assignments.length > 0) {
      for (const asgn of major_assignments) {
        await TeacherSubject.create({
          teacher_id: teacher.id, subject_id: asgn.subject_id, class_id: asgn.class_id, type: 'major'
        }, { transaction: t });
      }
    }
    if (minor_subject_id) {
      await TeacherSubject.create({
        teacher_id: teacher.id, subject_id: minor_subject_id, class_id: null, type: 'minor'
      }, { transaction: t });
    }

    await t.commit();

    // Non-blocking welcome email
    emailService.sendWelcomeEmail(email, name, 'teacher', defaultPassword)
      .catch(err => console.error('Teacher welcome email failed:', err.message));

    res.json(teacher);
  } catch (err) { 
    await t.rollback();
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    res.status(500).json({ error: err.message }); 
  }
});

router.put('/teachers/:id', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name, phone, is_active, major_assignments, minor_subject_id } = req.body;
    await User.update({ name, phone, is_active }, { where: { id: req.params.id, role: 'teacher' }, transaction: t });

    if (major_assignments !== undefined || minor_subject_id !== undefined) {
      await TeacherSubject.destroy({ where: { teacher_id: req.params.id }, transaction: t });
      if (major_assignments && major_assignments.length > 0) {
        for (const asgn of major_assignments) {
          await TeacherSubject.create({
            teacher_id: req.params.id, subject_id: asgn.subject_id, class_id: asgn.class_id, type: 'major'
          }, { transaction: t });
        }
      }
      if (minor_subject_id) {
        await TeacherSubject.create({
          teacher_id: req.params.id, subject_id: minor_subject_id, class_id: null, type: 'minor'
        }, { transaction: t });
      }
    }

    await t.commit();
    res.json({ msg: 'Teacher updated' });
  } catch (err) { await t.rollback(); res.status(500).json({ error: err.message }); }
});

router.delete('/teachers/:id', async (req, res) => {
  try {
    await User.destroy({ where: { id: req.params.id, role: 'teacher' } });
    res.json({ msg: 'Teacher deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ================= STUDENTS =================
router.get('/students', async (req, res) => {
  try {
    // Base students
    const students = await User.findAll({
      where: { role: 'student' },
      attributes: { exclude: ['password_hash'] },
      raw: true
    });

    // Fetch profiles with class and minor subject in one raw query
    const [profiles] = await sequelize.query(`
      SELECT sp.user_id, sp.roll_no, sp.parent_email, sp.class_id, sp.minor_subject_id,
             cl.name AS class_name,
             co.name AS course_name,
             ms.name AS minor_subject_name
      FROM "StudentProfiles" sp
      LEFT JOIN "Classes" cl ON sp.class_id = cl.id
      LEFT JOIN "Courses" co ON cl.course_id = co.id
      LEFT JOIN "Subjects" ms ON sp.minor_subject_id = ms.id
    `);

    const result = students.map(s => {
      const profile = profiles.find(p => p.user_id === s.id);
      return {
        ...s,
        StudentProfile: profile ? {
          roll_no: profile.roll_no,
          parent_email: profile.parent_email,
          class_id: profile.class_id,
          minor_subject_id: profile.minor_subject_id,
          Class: profile.class_id ? { name: profile.class_name, Course: { name: profile.course_name } } : null,
          MinorSubject: profile.minor_subject_id ? { name: profile.minor_subject_name } : null
        } : null
      };
    });

    res.json(result);
  } catch (err) {
    console.error('GET /students error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/students', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name, email, phone, is_blind, roll_no, parent_email, class_id, minor_subject_id } = req.body;
    
    const defaultPassword = 'Student@123';
    const password_hash = await bcrypt.hash(defaultPassword, 10);

    const student = await User.create({ 
      name, email, phone: phone || null, password_hash, role: 'student', is_blind: is_blind || false 
    }, { transaction: t });

    await StudentProfile.create({
      user_id: student.id,
      class_id: class_id || null,
      roll_no: roll_no || null,
      parent_email: parent_email || null,
      minor_subject_id: minor_subject_id || null
    }, { transaction: t });

    await t.commit();

    // Non-blocking welcome email with roll number
    emailService.sendWelcomeEmail(email, name, 'student', defaultPassword, roll_no || null)
      .catch(err => console.error('Student welcome email failed:', err.message));

    res.json(student);
  } catch (err) { 
    await t.rollback();
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'User with this email or roll number already exists' });
    }
    res.status(500).json({ error: err.message }); 
  }
});

router.put('/students/:id', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name, phone, is_active, is_blind, roll_no, parent_email, class_id, minor_subject_id } = req.body;
    await User.update({ name, phone, is_active, is_blind }, { where: { id: req.params.id, role: 'student' }, transaction: t });
    await StudentProfile.update({ roll_no, parent_email, class_id, minor_subject_id }, { where: { user_id: req.params.id }, transaction: t });
    await t.commit();
    res.json({ msg: 'Student updated' });
  } catch (err) { await t.rollback(); res.status(500).json({ error: err.message }); }
});

router.delete('/students/:id', async (req, res) => {
  try {
    await User.destroy({ where: { id: req.params.id, role: 'student' } });
    res.json({ msg: 'Student deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ================= LEADERBOARD =================
router.get('/leaderboard', async (req, res) => {
  try {
    const [rows] = await sequelize.query(`
      SELECT
        u.id,
        u.name,
        sp.roll_no,
        cl.name                                            AS class_name,
        COUNT(DISTINCT sas.id)                             AS assignment_count,
        COALESCE(AVG(sas.ai_marks), 0)                     AS avg_assignment_marks,
        COUNT(DISTINCT sqs.id)                             AS quiz_count,
        COALESCE(AVG(sqs.total_marks), 0)                  AS avg_quiz_marks,
        COALESCE(AVG(sas.ai_marks), 0) * 50.0 / 10
          + COALESCE(AVG(sqs.total_marks), 0) * 50.0 / 100 AS total_score
      FROM "Users" u
      JOIN "StudentProfiles" sp ON sp.user_id = u.id
      LEFT JOIN "Classes" cl    ON cl.id = sp.class_id
      LEFT JOIN "StudentAssignmentSubmissions" sas ON sas.student_id = u.id
      LEFT JOIN "StudentQuizSubmissions" sqs        ON sqs.student_id = u.id
      WHERE u.role = 'student' AND u.is_active = true
      GROUP BY u.id, u.name, sp.roll_no, cl.name
      ORDER BY total_score DESC
    `, { type: sequelize.QueryTypes.SELECT });
    res.json({ students: rows });
  } catch (err) {
    console.error('Admin leaderboard error:', err.message);
    res.status(500).json({ error: 'Failed to fetch leaderboard', detail: err.message });
  }
});

module.exports = router;
