const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roleGuard');
const { Department, Course, Class, Subject, User, TeacherSubject, StudentProfile, StudentSubject, Lab, LabSlot, MinorLab, MinorLabSlot, sequelize } = require('../models/postgres');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const emailService = require('../services/emailService');
const XLSX = require('xlsx');
const multer = require('multer');
const fs = require('fs');

const upload = multer({ dest: 'uploads/temp/' });

router.use(auth);
router.use(requireRole('admin'));

// ================= DASHBOARD STATS =================
router.get('/dashboard-stats', async (req, res) => {
  try {
    const teachers = await User.count({ where: { role: 'teacher' } });
    const students = await User.count({ where: { role: 'student' } });
    const courses = await Course.count();
    const departments = await Department.count();

    const coursesData = await sequelize.query(`
      SELECT c.name, COUNT(sp.id) as students
      FROM "Courses" c
      LEFT JOIN "Classes" cl ON c.id = cl.course_id
      LEFT JOIN "StudentProfiles" sp ON cl.id = sp.class_id
      GROUP BY c.id, c.name
      ORDER BY students DESC
    `, { type: sequelize.QueryTypes.SELECT });

    const chartData = coursesData.map(row => ({
      name: row.name,
      students: parseInt(row.students, 10) || 0
    }));

    const recentActivityRaw = await sequelize.query(`
      SELECT u.id, u.name, u.created_at, d.name as department_name, cl.name as class_name
      FROM "Users" u
      LEFT JOIN "StudentProfiles" sp ON u.id = sp.user_id
      LEFT JOIN "Classes" cl ON sp.class_id = cl.id
      LEFT JOIN "Courses" co ON cl.course_id = co.id
      LEFT JOIN "Departments" d ON co.department_id = d.id
      WHERE u.role = 'student'
      ORDER BY u.created_at DESC
      LIMIT 10
    `, { type: sequelize.QueryTypes.SELECT });

    res.json({ teachers, students, courses, departments, chartData, recentActivity: recentActivityRaw });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= RECENT ACTIVITY (NOTIFICATIONS) =================
router.get('/recent-activity', async (req, res) => {
  try {
    const recentActivityRaw = await sequelize.query(`
      SELECT u.id, u.name, u.created_at, d.name as department_name, cl.name as class_name
      FROM "Users" u
      LEFT JOIN "StudentProfiles" sp ON u.id = sp.user_id
      LEFT JOIN "Classes" cl ON sp.class_id = cl.id
      LEFT JOIN "Courses" co ON cl.course_id = co.id
      LEFT JOIN "Departments" d ON co.department_id = d.id
      WHERE u.role = 'student'
      ORDER BY u.created_at DESC
      LIMIT 10
    `, { type: sequelize.QueryTypes.SELECT });
    res.json(recentActivityRaw);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= SETTINGS =================
router.put('/settings', async (req, res) => {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Update basic info
    if (name) user.name = name;

    // Password Update Logic
    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ error: 'Incorrect current password' });
      }
      user.password_hash = await bcrypt.hash(newPassword, 10);
    }
    
    await user.save();
    
    // Optionally return the updated user object to overwrite localStorage
    res.json({
      msg: 'Settings updated successfully',
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
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
    const { year, course_id, division, roll_no_prefix } = req.body;
    const course = await Course.findByPk(course_id);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    
    const name = `${year} ${course.name} ${division}`;
    const cls = await Class.create({ name, year, course_id, division, roll_no_prefix: roll_no_prefix || null });
    res.json(cls);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/classes/:id', async (req, res) => {
  try {
    const { year, course_id, division, roll_no_prefix } = req.body;
    const course = await Course.findByPk(course_id);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const name = `${year} ${course.name} ${division}`;
    await Class.update({ name, year, course_id, division, roll_no_prefix: roll_no_prefix || null }, { where: { id: req.params.id } });
    res.json({ msg: 'Class updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/classes/:id', async (req, res) => {
  try {
    await Class.destroy({ where: { id: req.params.id } });
    res.json({ msg: 'Class deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- LABS FOR CLASSES ---
router.get('/classes/:id/labs', async (req, res) => {
  try {
    const labs = await Lab.findAll({ where: { class_id: req.params.id } });
    res.json(labs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/classes/:id/labs', async (req, res) => {
  try {
    const count = await Lab.count({ where: { class_id: req.params.id } });
    if (count >= 5) return res.status(400).json({ error: 'Maximum 5 labs allowed per class' });
    
    const { name, roll_from, roll_to } = req.body;
    const lab = await Lab.create({ class_id: req.params.id, name, roll_from, roll_to });
    res.json(lab);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/labs/:id', async (req, res) => {
  try {
    const { name, roll_from, roll_to } = req.body;
    await Lab.update({ name, roll_from, roll_to }, { where: { id: req.params.id } });
    res.json({ msg: 'Lab updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/labs/:id', async (req, res) => {
  try {
    await Lab.destroy({ where: { id: req.params.id } });
    res.json({ msg: 'Lab deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- LAB SLOTS ---
router.get('/labs/:id/slots', async (req, res) => {
  try {
    const slots = await LabSlot.findAll({ 
      where: { lab_id: req.params.id },
      include: [
        { model: User, attributes: ['id', 'name'] },
        { model: Subject, attributes: ['id', 'name'] }
      ]
    });
    res.json(slots);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/labs/:id/slots', async (req, res) => {
  try {
    const { day, start_time, end_time, teacher_id, subject_id } = req.body;
    console.log('SAVING SLOT:', { day, start_time, end_time, teacher_id, subject_id });
    const slot = await LabSlot.create({ 
      lab_id: req.params.id, 
      day, start_time, end_time, 
      teacher_id: teacher_id ? parseInt(teacher_id) : null, 
      subject_id: subject_id ? parseInt(subject_id) : null 
    });
    
    // Auto-assign teacher to subject for this lab's class (non-blocking)
    if (teacher_id && subject_id) {
      try {
        const lab = await Lab.findByPk(req.params.id);
        if (lab) {
          const sub = await Subject.findByPk(subject_id);
          const assignType = (sub && ['major','minor','vsc'].includes(sub.type)) ? sub.type : 'major';
          await TeacherSubject.findOrCreate({
            where: { teacher_id: parseInt(teacher_id), subject_id: parseInt(subject_id), class_id: lab.class_id, type: assignType }
          });
        }
      } catch (assignErr) {
        console.error('Warning: Could not auto-assign teacher to subject:', assignErr.message);
      }
    }

    res.json(slot);
  } catch (err) {
    console.error('ERROR SAVING SLOT:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/lab-slots/:id', async (req, res) => {
  try {
    const { day, start_time, end_time, teacher_id, subject_id } = req.body;
    console.log('UPDATING SLOT:', { day, start_time, end_time, teacher_id, subject_id });
    await LabSlot.update({ 
      day, start_time, end_time, 
      teacher_id: teacher_id ? parseInt(teacher_id) : null, 
      subject_id: subject_id ? parseInt(subject_id) : null 
    }, { where: { id: req.params.id } });
    
    // Auto-assign teacher to subject for this lab's class (non-blocking)
    if (teacher_id && subject_id) {
      try {
        const slot = await LabSlot.findByPk(req.params.id);
        if (slot) {
          const lab = await Lab.findByPk(slot.lab_id);
          if (lab) {
             const sub = await Subject.findByPk(subject_id);
             const assignType = (sub && ['major','minor','vsc'].includes(sub.type)) ? sub.type : 'major';
             await TeacherSubject.findOrCreate({
               where: { teacher_id: parseInt(teacher_id), subject_id: parseInt(subject_id), class_id: lab.class_id, type: assignType }
             });
          }
        }
      } catch (assignErr) {
        console.error('Warning: Could not auto-assign teacher to subject:', assignErr.message);
      }
    }

    res.json({ msg: 'Slot updated' });
  } catch (err) {
    console.error('ERROR UPDATING SLOT:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/lab-slots/:id', async (req, res) => {
  try {
    await LabSlot.destroy({ where: { id: req.params.id } });
    res.json({ msg: 'Slot deleted' });
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
      year: req.body.year || 'FY',
      department_id: req.body.type === 'minor' ? null : req.body.department_id,
      course_id: req.body.type === 'minor' ? null : req.body.course_id 
    });
    res.json(sub);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/subjects/:id', async (req, res) => {
  try {
    await Subject.update({ 
      name: req.body.name, 
      type: req.body.type,
      year: req.body.year || 'FY',
      department_id: req.body.type === 'minor' ? null : req.body.department_id,
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

// --- MINOR LABS ---
router.get('/subjects/:id/minor-labs', async (req, res) => {
  try {
    const labs = await MinorLab.findAll({ where: { subject_id: req.params.id } });
    res.json(labs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/subjects/:id/minor-labs', async (req, res) => {
  try {
    const { name } = req.body;
    const lab = await MinorLab.create({ subject_id: req.params.id, name });
    res.json(lab);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/minor-labs/:id', async (req, res) => {
  try {
    await MinorLab.update({ name: req.body.name }, { where: { id: req.params.id } });
    res.json({ msg: 'Minor lab updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/minor-labs/:id', async (req, res) => {
  try {
    await MinorLab.destroy({ where: { id: req.params.id } });
    res.json({ msg: 'Minor lab deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- MINOR LAB SLOTS ---
router.get('/minor-labs/:id/slots', async (req, res) => {
  try {
    const slots = await MinorLabSlot.findAll({ 
      where: { minor_lab_id: req.params.id },
      include: [{ model: User, attributes: ['id', 'name'] }]
    });
    res.json(slots);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/minor-labs/:id/slots', async (req, res) => {
  try {
    const { day, start_time, end_time, teacher_id } = req.body;
    const slot = await MinorLabSlot.create({ minor_lab_id: req.params.id, day, start_time, end_time, teacher_id });
    
    if (teacher_id) {
      const minorLab = await MinorLab.findByPk(req.params.id);
      if (minorLab) {
        await TeacherSubject.findOrCreate({
          where: { teacher_id, subject_id: minorLab.subject_id, class_id: null, type: 'minor' }
        });
      }
    }

    res.json(slot);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/minor-lab-slots/:id', async (req, res) => {
  try {
    const { day, start_time, end_time, teacher_id } = req.body;
    await MinorLabSlot.update({ day, start_time, end_time, teacher_id }, { where: { id: req.params.id } });
    
    if (teacher_id) {
      const slot = await MinorLabSlot.findByPk(req.params.id);
      if (slot) {
        const minorLab = await MinorLab.findByPk(slot.minor_lab_id);
        if (minorLab) {
          await TeacherSubject.findOrCreate({
            where: { teacher_id, subject_id: minorLab.subject_id, class_id: null, type: 'minor' }
          });
        }
      }
    }

    res.json({ msg: 'Slot updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/minor-lab-slots/:id', async (req, res) => {
  try {
    await MinorLabSlot.destroy({ where: { id: req.params.id } });
    res.json({ msg: 'Slot deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ================= TEACHERS =================
router.get('/teachers', async (req, res) => {
  try {
    const teachers = await User.findAll({
      where: { role: 'teacher' },
      attributes: { exclude: ['password_hash'] },
      raw: true
    });

    const [assignments] = await sequelize.query(`
      SELECT ts.teacher_id, ts.subject_id, ts.class_id, ts.type,
             s.name AS subject_name,
             cl.name AS class_name
      FROM "TeacherSubjects" ts
      LEFT JOIN "Subjects" s ON ts.subject_id = s.id
      LEFT JOIN "Classes" cl ON ts.class_id = cl.id
    `);

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
    res.status(500).json({ error: err.message });
  }
});

router.post('/teachers', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name, email, phone, major_assignments, minor_subject_id, department_id } = req.body;
    
    const defaultPassword = 'Teacher@123';
    const password_hash = await bcrypt.hash(defaultPassword, 10);
    const teacher = await User.create({ 
      name, email, phone: phone || null, password_hash, role: 'teacher', department_id: department_id || null 
    }, { transaction: t });

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
    const { name, phone, is_active, major_assignments, minor_subject_id, department_id } = req.body;
    await User.update({ name, phone, is_active, department_id: department_id || null }, { where: { id: req.params.id, role: 'teacher' }, transaction: t });

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
    const students = await User.findAll({
      where: { role: 'student' },
      attributes: { exclude: ['password_hash'] },
      raw: true
    });

    const [profiles] = await sequelize.query(`
      SELECT sp.user_id, sp.roll_no, sp.parent_email, sp.parent_phone, sp.class_id, sp.minor_subject_id, sp.lab_id, sp.minor_lab_id,
             cl.name AS class_name,
             co.name AS course_name,
             ms.name AS minor_subject_name,
             l.name AS lab_name,
             ml.name AS minor_lab_name
      FROM "StudentProfiles" sp
      LEFT JOIN "Classes" cl ON sp.class_id = cl.id
      LEFT JOIN "Courses" co ON cl.course_id = co.id
      LEFT JOIN "Subjects" ms ON sp.minor_subject_id = ms.id
      LEFT JOIN "Labs" l ON sp.lab_id = l.id
      LEFT JOIN "MinorLabs" ml ON sp.minor_lab_id = ml.id
    `);

    const result = students.map(s => {
      const profile = profiles.find(p => p.user_id === s.id);
      return {
        ...s,
        StudentProfile: profile ? {
          roll_no: profile.roll_no,
          parent_email: profile.parent_email,
          parent_phone: profile.parent_phone,
          class_id: profile.class_id,
          minor_subject_id: profile.minor_subject_id,
          lab_id: profile.lab_id,
          minor_lab_id: profile.minor_lab_id,
          Class: profile.class_id ? { name: profile.class_name, Course: { name: profile.course_name } } : null,
          MinorSubject: profile.minor_subject_id ? { name: profile.minor_subject_name } : null,
          Lab: profile.lab_id ? { name: profile.lab_name } : null,
          MinorLab: profile.minor_lab_id ? { name: profile.minor_lab_name } : null
        } : null
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/students', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name, email, phone, is_blind, roll_no, parent_email, parent_phone, class_id, minor_subject_id, lab_id, minor_lab_id } = req.body;
    const defaultPassword = 'student123';
    const password_hash = await bcrypt.hash(defaultPassword, 10);

    const student = await User.create({ 
      name, email, phone: phone || null, password_hash, role: 'student', is_blind: is_blind || false 
    }, { transaction: t });

    await StudentProfile.create({
      user_id: student.id,
      class_id: class_id || null,
      roll_no: roll_no || null,
      parent_email: parent_email || null,
      parent_phone: parent_phone || null,
      minor_subject_id: minor_subject_id || null,
      lab_id: lab_id || null,
      minor_lab_id: minor_lab_id || null
    }, { transaction: t });

    if (class_id) {
      const cls = await Class.findByPk(class_id, { transaction: t });
      if (cls && cls.course_id) {
        const majorSubjects = await Subject.findAll({ 
          where: { 
            course_id: cls.course_id, 
            type: { [Op.or]: ['major', 'vsc'] } 
          }, 
          transaction: t 
        });
        for (const sub of majorSubjects) {
          await StudentSubject.create({ student_id: student.id, subject_id: sub.id }, { transaction: t });
        }
      }
    }

    if (minor_subject_id) {
      await StudentSubject.findOrCreate({
        where: { student_id: student.id, subject_id: minor_subject_id },
        transaction: t
      });
    }

    await t.commit();

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
    const { name, phone, is_active, is_blind, roll_no, parent_email, parent_phone, class_id, minor_subject_id, lab_id, minor_lab_id } = req.body;
    await User.update({ name, phone, is_active, is_blind }, { where: { id: req.params.id, role: 'student' }, transaction: t });
    
    // Check old profile to know if class changed
    const oldSp = await StudentProfile.findOne({ where: { user_id: req.params.id }, transaction: t });
    
    await StudentProfile.update({ 
      roll_no, parent_email, parent_phone, class_id, minor_subject_id, lab_id, minor_lab_id 
    }, { where: { user_id: req.params.id }, transaction: t });
    
    // Re-assign subjects if class or minor subject changed
    if ((class_id && oldSp && oldSp.class_id !== class_id) || (minor_subject_id && oldSp && oldSp.minor_subject_id !== minor_subject_id)) {
      // Clear old subjects
      await StudentSubject.destroy({ where: { student_id: req.params.id }, transaction: t });
      
      // Re-assign Major subjects
      const currentClassId = class_id || (oldSp ? oldSp.class_id : null);
      if (currentClassId) {
        const cls = await Class.findByPk(currentClassId, { transaction: t });
        if (cls && cls.course_id) {
          const majorSubjects = await Subject.findAll({ 
            where: { 
              course_id: cls.course_id, 
              type: { [Op.or]: ['major', 'vsc'] } 
            }, 
            transaction: t 
          });
          for (const sub of majorSubjects) {
            await StudentSubject.create({ student_id: req.params.id, subject_id: sub.id }, { transaction: t });
          }
        }
      }

      // Re-assign Minor subject
      const currentMinorSubId = minor_subject_id || (oldSp ? oldSp.minor_subject_id : null);
      if (currentMinorSubId) {
        await StudentSubject.findOrCreate({
          where: { student_id: req.params.id, subject_id: currentMinorSubId },
          transaction: t
        });
      }
    }

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

// GET /api/admin/students/export
router.get('/students/export', async (req, res) => {
  try {
    const studentsData = await sequelize.query(`
      SELECT sp.roll_no as "Roll No", u.name as "Full Name", u.email as "Email", u.phone as "Phone",
             cl.name as "Class", l.name as "Major Lab",
             ms.name as "Minor Subject", ml.name as "Minor Lab",
             sp.parent_email as "Parent Email", sp.parent_phone as "Parent Phone",
             CASE WHEN u.is_blind THEN 'Yes' ELSE 'No' END as "Adaptive Mode"
      FROM "Users" u
      JOIN "StudentProfiles" sp ON u.id = sp.user_id
      LEFT JOIN "Classes" cl ON sp.class_id = cl.id
      LEFT JOIN "Labs" l ON sp.lab_id = l.id
      LEFT JOIN "Subjects" ms ON sp.minor_subject_id = ms.id
      LEFT JOIN "MinorLabs" ml ON sp.minor_lab_id = ml.id
      WHERE u.role = 'student'
      ORDER BY cl.name, sp.roll_no ASC
    `, { type: sequelize.QueryTypes.SELECT });

    const ws = XLSX.utils.json_to_sheet(studentsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=students_export_${Date.now()}.xlsx`);
    res.send(buf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/students/import
router.post('/students/import', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Excel file is required' });
  
  const t = await sequelize.transaction();
  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    let successCount = 0;
    const skipped = [];
    const errors = [];

    for (const [idx, row] of data.entries()) {
      const rollNo = row['Roll No']?.toString().trim();
      const fullName = row['Full Name']?.toString().trim();
      const email = row['Email']?.toString().trim();
      const phone = row['Phone']?.toString().trim();
      const className = row['Class']?.toString().trim();
      const labName = row['Major Lab']?.toString().trim();
      const minorSubName = row['Minor Subject']?.toString().trim();
      const minorLabName = row['Minor Lab']?.toString().trim();
      const parentEmail = row['Parent Email']?.toString().trim();
      const parentPhone = row['Parent Phone']?.toString().trim();
      const adaptive = row['Adaptive Mode']?.toString().toLowerCase() === 'yes';

      if (!rollNo || !fullName || !email) {
        errors.push({ row: idx + 2, error: 'Missing Roll No, Name, or Email' });
        continue;
      }

      // Check existence by roll no
      const existingRoll = await StudentProfile.findOne({ where: { roll_no: rollNo }, transaction: t });
      if (existingRoll) {
        skipped.push({ row: idx + 2, name: fullName, email, roll_no: rollNo, reason: 'Roll number already exists' });
        continue;
      }

      // Check existence by email (User table)
      const existingEmail = await User.findOne({ where: { email }, transaction: t });
      if (existingEmail) {
        skipped.push({ row: idx + 2, name: fullName, email, roll_no: rollNo, reason: 'Email already exists' });
        continue;
      }

      // Resolve Class
      let resolvedClassId = null;
      if (className) {
        const cls = await Class.findOne({ where: { name: className }, transaction: t });
        if (!cls) {
          errors.push({ row: idx + 2, error: `Class "${className}" not found` });
          continue;
        }
        resolvedClassId = cls.id;
      }

      // Resolve Major Lab
      let resolvedLabId = null;
      if (labName && resolvedClassId) {
        const lab = await Lab.findOne({ where: { name: labName, class_id: resolvedClassId }, transaction: t });
        if (!lab) {
          errors.push({ row: idx + 2, error: `Lab "${labName}" not found in class "${className}"` });
          continue;
        }
        resolvedLabId = lab.id;
      }

      // Resolve Minor Subject
      let resolvedMinorSubId = null;
      if (minorSubName) {
        const sub = await Subject.findOne({ where: { name: minorSubName, type: 'minor' }, transaction: t });
        if (!sub) {
          errors.push({ row: idx + 2, error: `Minor Subject "${minorSubName}" not found` });
          continue;
        }
        resolvedMinorSubId = sub.id;
      }

      // Resolve Minor Lab
      let resolvedMinorLabId = null;
      if (minorLabName && resolvedMinorSubId) {
        const ml = await MinorLab.findOne({ where: { name: minorLabName, subject_id: resolvedMinorSubId }, transaction: t });
        if (!ml) {
          errors.push({ row: idx + 2, error: `Minor Lab "${minorLabName}" not found for subject "${minorSubName}"` });
          continue;
        }
        resolvedMinorLabId = ml.id;
      }

      // Create User
      const defaultPassword = 'student123';
      const password_hash = await bcrypt.hash(defaultPassword, 10);
      const student = await User.create({ 
        name: fullName, email, phone: phone || null, password_hash, role: 'student', is_blind: adaptive 
      }, { transaction: t });

      // Create Profile
      await StudentProfile.create({
        user_id: student.id,
        class_id: resolvedClassId,
        roll_no: rollNo,
        parent_email: parentEmail || null,
        parent_phone: parentPhone || null,
        minor_subject_id: resolvedMinorSubId,
        lab_id: resolvedLabId,
        minor_lab_id: resolvedMinorLabId
      }, { transaction: t });

      // Assign Major Subjects
      if (resolvedClassId) {
        const cls = await Class.findByPk(resolvedClassId, { transaction: t });
        if (cls && cls.course_id) {
          const majorSubjects = await Subject.findAll({ 
            where: { course_id: cls.course_id, type: { [Op.or]: ['major', 'vsc'] } }, 
            transaction: t 
          });
          for (const sub of majorSubjects) {
            await StudentSubject.create({ student_id: student.id, subject_id: sub.id }, { transaction: t });
          }
        }
      }

      // Assign Minor Subject record
      if (resolvedMinorSubId) {
        await StudentSubject.create({ student_id: student.id, subject_id: resolvedMinorSubId }, { transaction: t });
      }

      successCount++;
    }

    await t.commit();
    fs.unlinkSync(req.file.path);
    res.json({ success: true, imported: successCount, skipped, errors });
  } catch (err) {
    await t.rollback();
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

// ================= LEADERBOARD =================
router.get('/leaderboard-filters', async (req, res) => {
  try {
    const departments = await Department.findAll({ attributes: ['id', 'name'], order: [['name', 'ASC']] });
    const courses = await Course.findAll({ attributes: ['id', 'name', 'department_id'], order: [['name', 'ASC']] });
    const classes = await Class.findAll({ attributes: ['id', 'name', 'course_id'], order: [['name', 'ASC']] });
    res.json({ departments, courses, classes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const { taskType = 'both', sortBy = 'accuracy', departmentId, courseId, classId } = req.query;
    const replacements = { taskType, sortBy };

    let whereClause = "";
    if (classId) {
      whereClause += ' AND cl."id" = :classId';
      replacements.classId = classId;
    } else if (courseId) {
      whereClause += ' AND cr."id" = :courseId';
      replacements.courseId = courseId;
    } else if (departmentId) {
      whereClause += ' AND d."id" = :deptId';
      replacements.deptId = departmentId;
    }

    const leaderboardData = await sequelize.query(`
      SELECT 
        u."id" as "student_id", 
        u."name" as "student_name",
        u."profile_image" as "profile_image",
        u."email" as "student_email",
        md5(lower(trim(u."email"))) as "gravatar_hash",
        sp."roll_no",
        cl."name" as "class_name",
        CASE 
          WHEN :taskType = 'lab' THEN COALESCE(l."lab_score", 0)
          WHEN :taskType = 'quiz' THEN COALESCE(q."quiz_score", 0)
          ELSE COALESCE(l."lab_score", 0) + COALESCE(q."quiz_score", 0)
        END as "total_score",
        LEAST(CASE
          WHEN :taskType = 'lab' THEN 
            CASE WHEN COALESCE(l."lab_max", 0) > 0 THEN (COALESCE(l."lab_score", 0)::float / l."lab_max") * 100 ELSE 0 END
          WHEN :taskType = 'quiz' THEN 
            CASE WHEN COALESCE(q."quiz_max", 0) > 0 THEN (COALESCE(q."quiz_score", 0)::float / q."quiz_max") * 100 ELSE 0 END
          ELSE
            CASE WHEN (COALESCE(l."lab_max", 0) + COALESCE(q."quiz_max", 0)) > 0 
                 THEN ((COALESCE(l."lab_score", 0) + COALESCE(q."quiz_score", 0))::float / (COALESCE(l."lab_max", 0) + COALESCE(q."quiz_max", 0))) * 100 
                 ELSE 0 END
        END, 100) as "accuracy"
      FROM "Users" u
      JOIN "StudentProfiles" sp ON u."id" = sp."user_id"
      LEFT JOIN "Classes" cl ON cl."id" = sp."class_id"
      LEFT JOIN "Courses" cr ON cl."course_id" = cr."id"
      LEFT JOIN "Departments" d ON cr."department_id" = d."id"
      LEFT JOIN (
        SELECT sub."student_id", SUM(sub."ai_marks") as "lab_score", SUM(sub."max_marks") as "lab_max" FROM (
          SELECT sas."student_id", sas."ai_marks", aq."max_marks",
                 ROW_NUMBER() OVER(PARTITION BY sas."student_id", sas."question_id" ORDER BY sas."submitted_at" DESC) as rn
          FROM "StudentAssignmentSubmissions" sas
          JOIN "AssignmentQuestions" aq ON sas."question_id" = aq."id"
          JOIN "AssignmentSets" asets ON aq."set_id" = asets."id"
          JOIN "LabAssignments" la ON asets."assignment_id" = la."id"
          WHERE 1=1
        ) sub WHERE rn = 1
        GROUP BY sub."student_id"
      ) l ON l."student_id" = u."id"
      LEFT JOIN (
        SELECT sub."student_id", SUM(sub."total_marks") as "quiz_score", SUM(sub."max_marks") as "quiz_max" FROM (
          SELECT sqs."student_id", sqs."total_marks", qz."total_marks" as "max_marks",
                 ROW_NUMBER() OVER(PARTITION BY sqs."student_id", sqs."quiz_id" ORDER BY sqs."submitted_at" DESC) as rn
          FROM "StudentQuizSubmissions" sqs
          JOIN "Quizzes" qz ON sqs."quiz_id" = qz."id"
          WHERE 1=1
        ) sub WHERE rn = 1
        GROUP BY sub."student_id"
      ) q ON q."student_id" = u."id"
      WHERE u."role" = 'student' AND u."is_active" = true ${whereClause}
      ORDER BY 
        CASE WHEN :sortBy = 'accuracy' THEN 
           (CASE
            WHEN :taskType = 'lab' THEN 
              CASE WHEN COALESCE(l."lab_max", 0) > 0 THEN (COALESCE(l."lab_score", 0)::float / l."lab_max") * 100 ELSE 0 END
            WHEN :taskType = 'quiz' THEN 
              CASE WHEN COALESCE(q."quiz_max", 0) > 0 THEN (COALESCE(q."quiz_score", 0)::float / q."quiz_max") * 100 ELSE 0 END
            ELSE
              CASE WHEN (COALESCE(l."lab_max", 0) + COALESCE(q."quiz_max", 0)) > 0 
                   THEN ((COALESCE(l."lab_score", 0) + COALESCE(q."quiz_score", 0))::float / (COALESCE(l."lab_max", 0) + COALESCE(q."quiz_max", 0))) * 100 
                   ELSE 0 END
          END)
        ELSE
          (CASE 
            WHEN :taskType = 'lab' THEN COALESCE(l."lab_score", 0)
            WHEN :taskType = 'quiz' THEN COALESCE(q."quiz_score", 0)
            ELSE COALESCE(l."lab_score", 0) + COALESCE(q."quiz_score", 0)
          END)
        END DESC, 
        u."name" ASC
      LIMIT 100
    `, { replacements, type: sequelize.QueryTypes.SELECT });

    res.json({ students: leaderboardData });
  } catch (err) {
    console.error('[Admin Leaderboard] Error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard', detail: err.message });
  }
});

module.exports = router;
