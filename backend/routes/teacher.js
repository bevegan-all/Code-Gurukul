const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roleGuard');
const { sequelize, Subject, Class, User, LabAssignment, AssignmentSet, AssignmentQuestion, Quiz, QuizQuestion, QuizOption, TeacherSubject, Lab, LabSlot, MinorLab, MinorLabSlot, StudentProfile, Attendance, Holiday } = require('../models/postgres');
const { Note, IdleAlert, StudentSession, StudentReport } = require('../models/mongo');
const { sendStudentReport } = require('../services/reportService');
const emailService = require('../services/emailService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'labbooks');
const excelTmpDir = path.join(__dirname, '..', 'tmp', 'excel');
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir, { recursive: true }); }
if (!fs.existsSync(excelTmpDir)) { fs.mkdirSync(excelTmpDir, { recursive: true }); }

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadDir); },
  filename: function (req, file, cb) { cb(null, 'labbook-' + Date.now() + path.extname(file.originalname)); }
});

const excelUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, excelTmpDir),
    filename: (req, file, cb) => cb(null, 'attendance-' + Date.now() + path.extname(file.originalname))
  }),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls') cb(null, true);
    else cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false);
  }
});
const upload = multer({ storage: storage });

router.use(auth, requireRole('teacher'));

// @route   GET /api/teacher/notifications
router.get('/notifications', async (req, res) => {
  try {
    const teacherId = req.user.id;
    const notifications = [];

    // Recent lab assignments created by them or for their subjects
    const assigns = await LabAssignment.findAll({
      where: { teacher_id: teacherId },
      order: [['created_at', 'DESC']],
      limit: 5,
      include: [{ model: Subject, attributes: ['name'] }]
    });
    assigns.forEach(a => notifications.push({
      id: `assgn-${a.id}`,
      type: 'assignment',
      title: `Assignment: ${a.title}`,
      subject: a.Subject?.name,
      created_at: a.createdAt || a.dataValues.created_at
    }));

    // Recent quizzes 
    const quizzes = await Quiz.findAll({
      where: { teacher_id: teacherId },
      order: [['created_at', 'DESC']],
      limit: 5,
      include: [{ model: Subject, attributes: ['name'] }]
    });
    quizzes.forEach(q => notifications.push({
      id: `quiz-${q.id}`,
      type: 'quiz',
      title: `Quiz: ${q.title}`,
      subject: q.Subject?.name,
      created_at: q.createdAt || q.dataValues.created_at
    }));

    // Notes (from MongoDB)
    const teacherSubjectsRaw = await TeacherSubject.findAll({ where: { teacher_id: teacherId } });
    const classIds = teacherSubjectsRaw.map(ts => ts.class_id).filter(Boolean);
    const subjectIds = teacherSubjectsRaw.map(ts => ts.subject_id).filter(Boolean);

    // Notes created by them OR in their subjects
    const notes = await Note.find({
      $or: [
        { uploader_id: teacherId },
        { subject_id: { $in: subjectIds } }
      ]
    }).sort({ upload_date: -1 }).limit(5);

    notes.forEach(n => notifications.push({
      id: `note-${n._id}`,
      type: 'note',
      title: `Note: ${n.title}`,
      subject: 'Materials',
      created_at: n.upload_date
    }));

    // Sort all combined descending
    notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(notifications.slice(0, 10)); // Top 10
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/teacher/dashboard-stats
router.get('/dashboard-stats', async (req, res) => {
  try {
    const teacherId = req.user.id;
    const countSubjects = await TeacherSubject.count({ distinct: true, col: 'subject_id', where: { teacher_id: teacherId } });
    const countClasses = await TeacherSubject.count({ distinct: true, col: 'class_id', where: { teacher_id: teacherId, type: 'major' } });

    const result = await sequelize.query(`
      SELECT COUNT(DISTINCT sp.id) as students
      FROM "TeacherSubjects" ts
      JOIN "Classes" c ON ts.class_id = c.id
      JOIN "StudentProfiles" sp ON c.id = sp.class_id
      WHERE ts.teacher_id = :teacherId
    `, { replacements: { teacherId }, type: sequelize.QueryTypes.SELECT });
    const studentsCount = result.length > 0 ? result[0].students : 0;

    const countAssignments = await LabAssignment.count({ where: { teacher_id: teacherId, status: 'published' } });

    const RawAssignments = await sequelize.query(`
      SELECT ts.id, ts.type, ts.subject_id, ts.class_id, s.name as subject_name, c.name as class_name
      FROM "TeacherSubjects" ts
      LEFT JOIN "Subjects" s ON ts.subject_id = s.id
      LEFT JOIN "Classes" c ON ts.class_id = c.id
      WHERE ts.teacher_id = :teacherId
    `, { replacements: { teacherId }, type: sequelize.QueryTypes.SELECT });

    res.json({
      subjects: countSubjects,
      classes: countClasses,
      students: parseInt(studentsCount, 10) || 0,
      activeAssignments: countAssignments,
      myClasses: RawAssignments.map(a => ({
        id: a.id,
        subject_id: a.subject_id,
        class_id: a.class_id,
        Subject: { name: a.subject_name || "Unknown", type: a.type },
        Class: { name: a.class_name || "Unknown" }
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching teacher stats' });
  }
});

// ============================================================
// TIMETABLE & CURRENT LAB
// ============================================================
router.get('/my-timetable', async (req, res) => {
  try {
    const teacherId = req.user.id;
    const majorSlots = await sequelize.query(`
      SELECT ls.day, ls.start_time, ls.end_time, 'major' as slot_type,
             l.name as lab_name, l.roll_from, l.roll_to, l.id as lab_id,
             c.name as class_name, c.id as class_id, 'Major Lab' as subject_name
      FROM "LabSlots" ls
      JOIN "Labs" l ON ls.lab_id = l.id
      JOIN "Classes" c ON l.class_id = c.id
      WHERE ls.teacher_id = :teacherId
    `, { replacements: { teacherId }, type: sequelize.QueryTypes.SELECT });

    const minorSlots = await sequelize.query(`
      SELECT mls.day, mls.start_time, mls.end_time, 'minor' as slot_type,
             ml.name as lab_name, ml.id as lab_id,
             s.name as subject_name, s.id as subject_id
      FROM "MinorLabSlots" mls
      JOIN "MinorLabs" ml ON mls.minor_lab_id = ml.id
      JOIN "Subjects" s ON ml.subject_id = s.id
      WHERE mls.teacher_id = :teacherId
    `, { replacements: { teacherId }, type: sequelize.QueryTypes.SELECT });

    res.json([...majorSlots, ...minorSlots]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/current-lab', async (req, res) => {
  try {
    const teacherId = req.user.id;
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    // HH:MM:SS format based on local time or UTC config. Assuming normal date formatting
    const nowHours = new Date().getHours().toString().padStart(2, '0');
    const nowMinutes = new Date().getMinutes().toString().padStart(2, '0');
    const currentTime = `${nowHours}:${nowMinutes}:00`;

    let slots = await sequelize.query(`
      SELECT ls.id, ls.start_time, ls.end_time, l.id as lab_id, l.name as lab_name, c.name as class_name, c.id as class_id, 
             s.name as subject_name, s.id as subject_id, ls.is_unrestricted, 'major' as type
      FROM "LabSlots" ls
      JOIN "Labs" l ON ls.lab_id = l.id
      JOIN "Classes" c ON l.class_id = c.id
      LEFT JOIN "Subjects" s ON ls.subject_id = s.id
      WHERE ls.teacher_id = :teacherId AND ls.day = :today 
        AND ls.start_time <= :currentTime AND ls.end_time >= :currentTime
    `, { replacements: { teacherId, today, currentTime }, type: sequelize.QueryTypes.SELECT });

    if (slots.length > 0) return res.json(slots[0]);

    slots = await sequelize.query(`
      SELECT mls.id, mls.start_time, mls.end_time, ml.id as lab_id, ml.name as lab_name, s.name as subject_name, s.id as subject_id, mls.is_unrestricted, 'minor' as type
      FROM "MinorLabSlots" mls
      JOIN "MinorLabs" ml ON mls.minor_lab_id = ml.id
      JOIN "Subjects" s ON ml.subject_id = s.id
      WHERE mls.teacher_id = :teacherId AND mls.day = :today 
        AND mls.start_time <= :currentTime AND mls.end_time >= :currentTime
    `, { replacements: { teacherId, today, currentTime }, type: sequelize.QueryTypes.SELECT });

    if (slots.length > 0) return res.json(slots[0]);

    res.json(null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// @route   POST /api/teacher/toggle-restriction
router.post('/toggle-restriction', async (req, res) => {
  try {
    const { slotId, type, isUnrestricted } = req.body;
    if (!slotId || !type) return res.status(400).json({ error: 'Missing slotId or type' });

    let classIds = [];

    if (type === 'major') {
      await LabSlot.update({ is_unrestricted: isUnrestricted }, { where: { id: slotId } });

      // LabSlot → Lab → class_id
      const rows = await sequelize.query(
        `SELECT DISTINCT l.class_id FROM "LabSlots" ls JOIN "Labs" l ON ls.lab_id = l.id WHERE ls.id = :slotId`,
        { replacements: { slotId }, type: sequelize.QueryTypes.SELECT }
      );
      classIds = rows.map(r => r.class_id).filter(Boolean);

    } else {
      await MinorLabSlot.update({ is_unrestricted: isUnrestricted }, { where: { id: slotId } });

      // MinorLabSlot → MinorLab → StudentProfiles → ALL distinct class_ids
      const rows = await sequelize.query(
        `SELECT DISTINCT sp.class_id
         FROM "MinorLabSlots" mls
         JOIN "MinorLabs" ml ON mls.minor_lab_id = ml.id
         JOIN "StudentProfiles" sp ON sp.minor_lab_id = ml.id
         WHERE mls.id = :slotId`,
        { replacements: { slotId }, type: sequelize.QueryTypes.SELECT }
      );
      classIds = rows.map(r => r.class_id).filter(Boolean);
    }

    // Emit to ALL relevant class rooms
    const io = req.io;
    if (io && classIds.length > 0) {
      classIds.forEach(cid => {
        console.log(`[Restriction] Emitting lab:restriction_status to class_${cid} (isUnrestricted=${isUnrestricted})`);
        io.to(`class_${cid}`).emit('lab:restriction_status', { slotId, isUnrestricted });
      });
    } else if (!io) {
      console.warn(`[Restriction] req.io is undefined! Cannot broadcast restriction toggle to students.`);
    } else if (classIds.length === 0) {
      console.warn(`[Restriction] Could not resolve any classIds for slotId=${slotId} type=${type}. Restriction not broadcast.`);
    }

    res.json({ success: true, isUnrestricted });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ============================================================
// GET /api/teacher/my-subjects — subjects from direct assignment OR lab slot assignment
// ============================================================
router.get('/my-subjects', async (req, res) => {
  try {
    const tid = req.user.id;
    // UNION of: 
    // 1. Direct assignments (TeacherSubjects)
    // 2. Lab Slot assignments (LabSlots -> Labs -> Classes -> Subjects)
    // 3. Minor Lab Slot assignments (MinorLabSlots -> MinorLabs -> Subjects)
    const rows = await sequelize.query(`
      SELECT DISTINCT s.id as subject_id, s.name as subject_name, s.type, c.id as class_id, c.name as class_name
      FROM "Subjects" s
      LEFT JOIN "Classes" c ON s.course_id = c.course_id AND s.year::text = c.year::text
      WHERE s.id IN (
        SELECT subject_id FROM "TeacherSubjects" WHERE teacher_id = :tid
        UNION
        SELECT subject_id FROM "LabSlots" WHERE teacher_id = :tid AND subject_id IS NOT NULL
        UNION
        SELECT ml.subject_id FROM "MinorLabSlots" mls JOIN "MinorLabs" ml ON mls.minor_lab_id = ml.id WHERE mls.teacher_id = :tid
      )
      -- Ensure we only match the classes the teacher is actually assigned to
      AND (
        -- If it's a direct assignment, match the specific class
        EXISTS (SELECT 1 FROM "TeacherSubjects" ts WHERE ts.teacher_id = :tid AND ts.subject_id = s.id AND (ts.class_id = c.id OR ts.class_id IS NULL))
        OR
        -- If it's a lab assignment, match the class of that lab
        EXISTS (SELECT 1 FROM "LabSlots" ls JOIN "Labs" l ON ls.lab_id = l.id WHERE ls.teacher_id = :tid AND ls.subject_id = s.id AND l.class_id = c.id)
        OR
        -- For minor subjects, they are usually linked to multiple classes, but if we have a class match in the join above, we show it
        s.type = 'minor'
      )
      ORDER BY s.type, s.name
    `, { replacements: { tid }, type: sequelize.QueryTypes.SELECT });

    // De-duplicate: A teacher might be a subject teacher AND a lab teacher for the same subject/class.
    // The query above with DISTINCT and s.id / c.id should handle most cases.
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/subject/:id/faculties', async (req, res) => {
  try {
    const { id: subjectId } = req.params;
    const { class_id } = req.query;

    // 1. Get Subject Teacher
    const subTeacher = await sequelize.query(`
      SELECT u.name FROM "TeacherSubjects" ts 
      JOIN "Users" u ON ts.teacher_id = u.id
      WHERE ts.subject_id = :sid AND (ts.class_id = :cid OR ts.class_id IS NULL) AND ts.type = 'major'
      LIMIT 1
    `, { replacements: { sid: subjectId, cid: class_id || null }, type: sequelize.QueryTypes.SELECT });

    // 2. Get Lab Teachers (Major)
    const labTeachers = await sequelize.query(`
      SELECT u.name as teacher_name, l.name as lab_name, ls.day 
      FROM "LabSlots" ls
      JOIN "Labs" l ON ls.lab_id = l.id
      JOIN "Users" u ON ls.teacher_id = u.id
      WHERE ls.subject_id = :sid AND l.class_id = :cid
    `, { replacements: { sid: subjectId, cid: class_id || null }, type: sequelize.QueryTypes.SELECT });

    // 3. Get Minor Lab Teachers (Minor)
    const minorTeachers = await sequelize.query(`
      SELECT u.name as teacher_name, ml.name as lab_name, mls.day
      FROM "MinorLabSlots" mls
      JOIN "MinorLabs" ml ON mls.minor_lab_id = ml.id
      JOIN "Users" u ON mls.teacher_id = u.id
      WHERE ml.subject_id = :sid
    `, { replacements: { sid: subjectId }, type: sequelize.QueryTypes.SELECT });

    res.json({
      subjectTeacher: subTeacher[0]?.name || 'Not assigned',
      labs: [...labTeachers, ...minorTeachers]
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/teacher/labs/:classId
router.get('/labs/:classId', async (req, res) => {
  try {
    const labs = await Lab.findAll({ where: { class_id: req.params.classId } });
    res.json(labs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/teacher/minor-labs/:subjectId
router.get('/minor-labs/:subjectId', async (req, res) => {
  try {
    const labs = await MinorLab.findAll({ where: { subject_id: req.params.subjectId } });
    res.json(labs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// GET /api/teacher/my-students   — all students in teacher's classes
// ============================================================
router.get('/my-students', async (req, res) => {
  try {
    const tid = req.user.id;
    const rows = await sequelize.query(`
      SELECT DISTINCT u.id, u.name, u.email, u.is_active,
             sp.roll_no, sc.id as class_id, sc.name as class_name, co.name as course_name,
             ms.name as minor_subject_name
      FROM "StudentProfiles" sp
      INNER JOIN "Users" u ON u.id = sp.user_id
      LEFT JOIN "Classes" sc ON sp.class_id = sc.id
      LEFT JOIN "Courses" co ON sc.course_id = co.id
      LEFT JOIN "Subjects" ms ON sp.minor_subject_id = ms.id
      WHERE (
        -- Major or VSC students (by class)
        sp.class_id IN (
          SELECT class_id FROM "TeacherSubjects" WHERE teacher_id = :tid AND (type = 'major' OR type = 'vsc')
          UNION
          SELECT l.class_id FROM "LabSlots" ls JOIN "Labs" l ON ls.lab_id = l.id WHERE ls.teacher_id = :tid
        )
        OR
        -- Minor students (by subject)
        sp.minor_subject_id IN (
          SELECT subject_id FROM "TeacherSubjects" WHERE teacher_id = :tid AND type = 'minor'
          UNION
          SELECT ml.subject_id FROM "MinorLabSlots" mls JOIN "MinorLabs" ml ON mls.minor_lab_id = ml.id WHERE mls.teacher_id = :tid
        )
      )
      ORDER BY sc.name, u.name
    `, { replacements: { tid }, type: sequelize.QueryTypes.SELECT });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/teacher/my-students-by-subject/:subjectId
router.get('/my-students-by-subject/:subjectId', async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { lab_id } = req.query;
    const tid = req.user.id;

    // Determine type and access
    const sub = await Subject.findByPk(subjectId);
    if (!sub) return res.status(404).json({ error: 'Subject not found' });

    let rows;
    if (sub.type === 'major' || sub.type === 'vsc') {
      // Find classes for this subject where teacher has access (Direct or Lab Slot)
      const classes = await sequelize.query(`
        SELECT class_id FROM "TeacherSubjects" WHERE teacher_id = :tid AND subject_id = :sid
        UNION
        SELECT l.class_id FROM "LabSlots" ls JOIN "Labs" l ON ls.lab_id = l.id WHERE ls.teacher_id = :tid AND ls.subject_id = :sid
      `, { replacements: { tid, sid: subjectId }, type: sequelize.QueryTypes.SELECT });

      if (classes.length === 0) return res.json([]);
      const classIds = classes.map(c => c.class_id);

      let q = `
        SELECT u.id, u.name, u.email, u.is_active,
               sp.roll_no, c.id as class_id, c.name as class_name, sp.lab_id
        FROM "StudentProfiles" sp
        JOIN "Users" u ON u.id = sp.user_id
        JOIN "Classes" c ON c.id = sp.class_id
        WHERE sp.class_id IN (:cids) AND u.role = 'student'
      `;
      const replacements = { cids: classIds };
      if (lab_id) { q += " AND sp.lab_id = :lid"; replacements.lid = lab_id; }
      q += " ORDER BY u.name";
      rows = await sequelize.query(q, { replacements, type: sequelize.QueryTypes.SELECT });
    } else {
      // Minor
      let q = `
        SELECT u.id, u.name, u.email, u.is_active,
               sp.roll_no, c.id as class_id, c.name as class_name, sp.minor_lab_id
        FROM "StudentProfiles" sp
        JOIN "Users" u ON u.id = sp.user_id
        JOIN "Classes" c ON c.id = sp.class_id
        WHERE sp.minor_subject_id = :sid AND u.role = 'student'
      `;
      const replacements = { sid: subjectId };
      if (lab_id) { q += " AND sp.minor_lab_id = :lid"; replacements.lid = lab_id; }
      q += " ORDER BY u.name";
      rows = await sequelize.query(q, { replacements, type: sequelize.QueryTypes.SELECT });
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ============================================================
// GET /api/teacher/assignments   — list teacher's assignments
// ============================================================
router.get('/assignments', async (req, res) => {
  try {
    const tid = req.user.id;
    // Using Sequelize models for better reliability
    const assignments = await LabAssignment.findAll({
      include: [
        { model: Subject, attributes: ['name'] },
        { model: Class, attributes: ['name'] }
      ],
      order: [['created_at', 'DESC']]
    });

    // Determine subjects teacher has access to
    const accessSubjects = await sequelize.query(`
      SELECT subject_id FROM "TeacherSubjects" WHERE teacher_id = :tid
      UNION
      SELECT subject_id FROM "LabSlots" WHERE teacher_id = :tid AND subject_id IS NOT NULL
      UNION
      SELECT ml.subject_id FROM "MinorLabSlots" mls JOIN "MinorLabs" ml ON mls.minor_lab_id = ml.id WHERE mls.teacher_id = :tid
    `, { replacements: { tid }, type: sequelize.QueryTypes.SELECT });
    const subjectIds = accessSubjects.map(s => s.subject_id);

    const rows = assignments.filter(a =>
      a.teacher_id === tid || subjectIds.includes(a.subject_id)
    ).map(a => {
      const plain = a.get({ plain: true });
      return {
        ...plain,
        subject_name: plain.Subject?.name,
        class_name: plain.Class?.name
      };
    });

    console.log(`[Teacher Debug] Assignments fetched (model): ${rows.length} for TID ${tid}`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   POST /api/teacher/assignments
router.post('/assignments', async (req, res) => {
  try {
    const { subject_id, class_id, title, description, compiler_required, time_limit_minutes, status, sets, target_labs } = req.body;
    const assignment = await LabAssignment.create({
      teacher_id: req.user.id, subject_id, class_id: class_id || null, title, description,
      compiler_required, time_limit_minutes: time_limit_minutes || null, status: status || 'draft',
      target_labs: target_labs || null
    });
    if (sets && Array.isArray(sets)) {
      for (const set of sets) {
        const newSet = await AssignmentSet.create({ assignment_id: assignment.id, set_name: set.name });
        if (set.questions && Array.isArray(set.questions)) {
          await AssignmentQuestion.bulkCreate(set.questions.map((q, idx) => ({
            set_id: newSet.id,
            question_text: q.question_text,
            expected_code: q.expected_code,
            order_index: idx + 1,
            expected_output: q.expected_output || null,
            max_marks: q.max_marks || 10
          })));
        }
      }
    }
    res.json({ msg: 'Assignment created successfully', assignmentId: assignment.id });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.get('/assignments/:id', async (req, res) => {
  try {
    const assignment = await LabAssignment.findByPk(req.params.id, {
      include: [{
        model: AssignmentSet,
        include: [{ model: AssignmentQuestion, order: [['order_index', 'ASC']] }]
      }]
    });
    res.json(assignment);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/assignments/:id', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { title, description, compiler_required, time_limit_minutes, status, target_labs, sets } = req.body;

    await LabAssignment.update({
      title, description, compiler_required, time_limit_minutes, status, target_labs
    }, { where: { id }, transaction: t });

    if (sets && Array.isArray(sets)) {
      for (const set of sets) {
        let setId = set.id;
        if (setId) {
          await AssignmentSet.update({ set_name: set.name }, { where: { id: setId }, transaction: t });
        } else {
          const newSet = await AssignmentSet.create({ assignment_id: id, set_name: set.name }, { transaction: t });
          setId = newSet.id;
        }

        if (set.questions && Array.isArray(set.questions)) {
          // Identify existing question IDs to catch deletions
          const existingQs = await AssignmentQuestion.findAll({ where: { set_id: setId }, transaction: t });
          const existingQIds = existingQs.map(q => q.id);
          const incomingQIds = set.questions.map(q => q.id).filter(id => !!id);

          // Delete questions not in incoming list
          const toDelete = existingQIds.filter(id => !incomingQIds.includes(id));
          if (toDelete.length > 0) {
            await AssignmentQuestion.destroy({ where: { id: toDelete }, transaction: t });
          }

          // Update or Create
          for (let i = 0; i < set.questions.length; i++) {
            const q = set.questions[i];
            const qData = {
              question_text: q.question_text,
              expected_code: q.expected_code,
              order_index: i + 1,
              expected_output: q.expected_output || null,
              max_marks: q.max_marks || 10
            };
            if (q.id) {
              await AssignmentQuestion.update(qData, { where: { id: q.id }, transaction: t });
            } else {
              await AssignmentQuestion.create({ ...qData, set_id: setId }, { transaction: t });
            }
          }
        }
      }
    }

    await t.commit();
    res.json({ msg: 'Assignment updated successfully' });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
});

router.delete('/assignments/:id', async (req, res) => {
  try {
    await LabAssignment.destroy({ where: { id: req.params.id } });
    res.json({ msg: 'Assignment deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// GET /api/teacher/quizzes   — list teacher's quizzes
// ============================================================
router.get('/quizzes', async (req, res) => {
  try {
    const tid = req.user.id;
    const quizzes = await Quiz.findAll({
      include: [
        { model: Subject, attributes: ['name'] },
        { model: Class, attributes: ['name'] },
        { model: QuizQuestion, attributes: ['id'] }
      ],
      order: [['created_at', 'DESC']]
    });

    const accessSubjects = await sequelize.query(`
      SELECT subject_id FROM "TeacherSubjects" WHERE teacher_id = :tid
      UNION
      SELECT subject_id FROM "LabSlots" WHERE teacher_id = :tid AND subject_id IS NOT NULL
      UNION
      SELECT ml.subject_id FROM "MinorLabSlots" mls JOIN "MinorLabs" ml ON mls.minor_lab_id = ml.id WHERE mls.teacher_id = :tid
    `, { replacements: { tid }, type: sequelize.QueryTypes.SELECT });
    const subjectIds = accessSubjects.map(s => s.subject_id);

    const rows = quizzes.filter(q =>
      q.teacher_id === tid || subjectIds.includes(q.subject_id)
    ).map(q => {
      const plain = q.get({ plain: true });
      return {
        ...plain,
        subject_name: plain.Subject?.name,
        class_name: plain.Class?.name,
        questions_count: plain.QuizQuestions?.length || 0
      };
    });

    console.log(`[Teacher Debug] Quizzes fetched (model): ${rows.length} for TID ${tid}`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   POST /api/teacher/quizzes
router.post('/quizzes', async (req, res) => {
  try {
    const { subject_id, class_id, title, time_limit_minutes, status, questions, target_labs } = req.body;
    const quiz = await Quiz.create({
      teacher_id: req.user.id, subject_id, class_id: class_id || null, title,
      time_limit_minutes: time_limit_minutes || null, status: status || 'draft',
      target_labs: target_labs || null, total_marks: (questions?.length || 0)
    });
    if (questions && Array.isArray(questions)) {
      for (let idx = 0; idx < questions.length; idx++) {
        const q = questions[idx];
        const newQ = await QuizQuestion.create({ quiz_id: quiz.id, question_text: q.question_text, question_type: q.question_type || 'single', order_index: idx + 1 });
        if (q.options && Array.isArray(q.options)) {
          await QuizOption.bulkCreate(q.options.map(o => ({ question_id: newQ.id, option_text: o.option_text, is_correct: o.is_correct })));
        }
      }
    }
    res.json({ msg: 'Quiz created successfully', quizId: quiz.id });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/quizzes/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findByPk(req.params.id, {
      include: [{
        model: QuizQuestion,
        include: [{ model: QuizOption }]
      }]
    });
    res.json(quiz);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/quizzes/:id', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { title, time_limit_minutes, status, target_labs, questions } = req.body;

    await Quiz.update({
      title, time_limit_minutes, status, target_labs,
      total_marks: (questions?.length || 0)
    }, { where: { id }, transaction: t });

    if (questions && Array.isArray(questions)) {
      const existingQs = await QuizQuestion.findAll({ where: { quiz_id: id }, transaction: t });
      const existingQIds = existingQs.map(q => q.id);
      const incomingQIds = questions.map(q => q.id).filter(id => !!id);

      // Deletions
      const toDeleteQs = existingQIds.filter(id => !incomingQIds.includes(id));
      if (toDeleteQs.length > 0) {
        await QuizQuestion.destroy({ where: { id: toDeleteQs }, transaction: t });
      }

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const qData = {
          question_text: q.question_text,
          question_type: q.question_type || 'single',
          order_index: i + 1
        };

        let qId = q.id;
        if (qId) {
          await QuizQuestion.update(qData, { where: { id: qId }, transaction: t });
        } else {
          const newQ = await QuizQuestion.create({ ...qData, quiz_id: id }, { transaction: t });
          qId = newQ.id;
        }

        if (q.options && Array.isArray(q.options)) {
          const existingOpts = await QuizOption.findAll({ where: { question_id: qId }, transaction: t });
          const existingOptIds = existingOpts.map(o => o.id);
          const incomingOptIds = q.options.map(o => o.id).filter(id => !!id);

          // Delete options
          const toDeleteOpts = existingOptIds.filter(id => !incomingOptIds.includes(id));
          if (toDeleteOpts.length > 0) {
            await QuizOption.destroy({ where: { id: toDeleteOpts }, transaction: t });
          }

          for (const opt of q.options) {
            const optData = { option_text: opt.option_text, is_correct: opt.is_correct };
            if (opt.id) {
              await QuizOption.update(optData, { where: { id: opt.id }, transaction: t });
            } else {
              await QuizOption.create({ ...optData, question_id: qId }, { transaction: t });
            }
          }
        }
      }
    }

    await t.commit();
    res.json({ msg: 'Quiz updated successfully' });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
});

router.delete('/quizzes/:id', async (req, res) => {
  try {
    await Quiz.destroy({ where: { id: req.params.id } });
    res.json({ msg: 'Quiz deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// GET /api/teacher/notes   — list teacher's notes (MongoDB)
// ============================================================
router.get('/notes', async (req, res) => {
  try {
    const tid = req.user.id;
    const subIds = await sequelize.query(`
        SELECT subject_id FROM "TeacherSubjects" WHERE teacher_id = :tid
        UNION
        SELECT subject_id FROM "LabSlots" WHERE teacher_id = :tid AND subject_id IS NOT NULL
        UNION
        SELECT ml.subject_id FROM "MinorLabSlots" mls JOIN "MinorLabs" ml ON mls.minor_lab_id = ml.id WHERE mls.teacher_id = :tid
    `, { replacements: { tid }, type: sequelize.QueryTypes.SELECT });

    const ids = subIds.map(r => r.subject_id);
    const notes = await Note.find({
      $or: [
        { teacher_id: tid },
        { subject_id: { $in: ids } }
      ]
    }).sort({ createdAt: -1 });
    console.log(`[Teacher Debug] Notes fetched for TID ${tid}: ${notes.length}`);
    res.json(notes);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/notes/upload-labbook', upload.single('pdf'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const fileUrl = `/uploads/labbooks/${req.file.filename}`;
    res.json({ url: fileUrl });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/notes', async (req, res) => {
  try {
    const { subject_id, class_id, title, content_html, status, target_labs, is_lab_book, lab_book_pdf_url } = req.body;
    const note = await Note.create({
      teacher_id: req.user.id, subject_id, class_id: class_id || null,
      title, content_html, status: status || 'draft',
      target_labs: target_labs || null, is_lab_book: !!is_lab_book, lab_book_pdf_url: lab_book_pdf_url || null
    });
    res.json({ msg: 'Notes saved successfully', noteId: note._id });
  } catch (err) {
    res.status(500).json({ error: 'Server error from MongoDB' });
  }
});

router.put('/notes/:id', async (req, res) => {
  try {
    await Note.findByIdAndUpdate(req.params.id, { title: req.body.title, content_html: req.body.content_html, status: req.body.status });
    res.json({ msg: 'Note updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/notes/:id', async (req, res) => {
  try {
    await Note.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Note deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// @route   GET /api/teacher/monitor/:classId
router.get('/monitor/:classId', async (req, res) => {
  try {
    const idleAlerts = await IdleAlert.find({ teacher_id: req.user.id }).sort({ detected_at: -1 }).limit(20);
    res.json({ idleAlerts });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
// ================= ATTENDANCE =================

// Get unique dates/labs for attendance (includes holiday info)
router.get('/attendance/:subjectId/dates', async (req, res) => {
  try {
    const { subjectId } = req.params;

    // attendance dates
    const dates = await sequelize.query(`
      SELECT DISTINCT a.date, a.lab_id, a.minor_lab_id,
             COALESCE(l.name, ml.name, 'No Lab') as lab_name
      FROM "Attendances" a
      LEFT JOIN "Labs" l ON a.lab_id = l.id
      LEFT JOIN "MinorLabs" ml ON a.minor_lab_id = ml.id
      WHERE a.subject_id = :subjectId
      ORDER BY a.date DESC
    `, { replacements: { subjectId }, type: sequelize.QueryTypes.SELECT });

    // holiday dates
    const holidays = await sequelize.query(`
      SELECT h.date, h.lab_id, h.minor_lab_id, h.reason,
             COALESCE(l.name, ml.name, 'No Lab') as lab_name
      FROM "Holidays" h
      LEFT JOIN "Labs" l ON h.lab_id = l.id
      LEFT JOIN "MinorLabs" ml ON h.minor_lab_id = ml.id
      WHERE h.subject_id = :subjectId
      ORDER BY h.date DESC
    `, { replacements: { subjectId }, type: sequelize.QueryTypes.SELECT });

    // merge: mark holiday dates
    const holidayKeys = new Set(holidays.map(h => `${h.date}_${h.lab_id || h.minor_lab_id || 'none'}`));
    const allDates = dates.map(d => ({
      ...d,
      is_holiday: holidayKeys.has(`${d.date}_${d.lab_id || d.minor_lab_id || 'none'}`)
    }));

    // Add holiday-only dates (no attendance taken)
    holidays.forEach(h => {
      const key = `${h.date}_${h.lab_id || h.minor_lab_id || 'none'}`;
      if (!dates.some(d => `${d.date}_${d.lab_id || d.minor_lab_id || 'none'}` === key)) {
        allDates.push({ ...h, is_holiday: true, holiday_reason: h.reason });
      }
    });

    // Sort by date asc
    allDates.sort((a, b) => new Date(a.date) - new Date(b.date));
    res.json(allDates);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get detailed attendance for a specific date and lab
router.get('/attendance/:subjectId/lab/:labId/date/:date', async (req, res) => {
  try {
    const { subjectId, labId, date } = req.params;
    let labFilter = '';
    const replacements = { subjectId, date };

    if (labId !== 'null' && labId !== '0') {
      labFilter = 'AND (a.lab_id = :labId OR a.minor_lab_id = :labId)';
      replacements.labId = labId;
    }

    const records = await sequelize.query(`
      SELECT a.id as attendance_id, a.status, sp.roll_no, u.name, u.id as student_id
      FROM "Attendances" a
      JOIN "Users" u ON a.student_id = u.id
      JOIN "StudentProfiles" sp ON u.id = sp.user_id
      WHERE a.subject_id = :subjectId AND a.date = :date ${labFilter}
      ORDER BY sp.roll_no ASC
    `, { replacements, type: sequelize.QueryTypes.SELECT });
    res.json(records);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Toggle a specific attendance record
router.put('/attendance/:id', async (req, res) => {
  try {
    const att = await Attendance.findByPk(req.params.id);
    if (!att) return res.status(404).json({ error: 'Record not found' });
    att.status = att.status === 'present' ? 'absent' : 'present';
    await att.save();
    res.json({ success: true, newStatus: att.status });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Take attendance (manually or auto) for a lab session
router.post('/attendance/take', async (req, res) => {
  try {
    const { subjectId, labId, isMinor, date, students } = req.body; // students: [{ id: userId, present: true/false }]
    const teacherId = req.user.id;

    // Check if attendance already exists, if so delete to override
    const whereClause = { subject_id: subjectId, date };
    if (labId && labId !== '0') {
      if (isMinor) whereClause.minor_lab_id = labId;
      else whereClause.lab_id = labId;
    }
    await Attendance.destroy({ where: whereClause });

    // Bulk insert new
    const records = students.map(s => ({
      student_id: s.id,
      teacher_id: teacherId,
      subject_id: subjectId,
      lab_id: (!isMinor && labId && labId !== '0') ? labId : null,
      minor_lab_id: (isMinor && labId && labId !== '0') ? labId : null,
      date,
      status: s.present ? 'present' : 'absent'
    }));
    await Attendance.bulkCreate(records);

    res.json({ success: true });
  } catch (err) {
    console.error("ATTENDANCE ROUTE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// Toggle holiday for a subject/lab/date
router.post('/attendance/holiday', async (req, res) => {
  try {
    const { subjectId, labId, isMinor, date, reason } = req.body;
    const where = { subject_id: subjectId, date };
    if (labId && labId !== '0' && labId !== 'null') {
      if (isMinor) where.minor_lab_id = labId;
      else where.lab_id = labId;
    }
    const existing = await Holiday.findOne({ where });
    if (existing) {
      await existing.destroy();
      res.json({ success: true, is_holiday: false });
    } else {
      await Holiday.create({ ...where, reason: reason || 'Holiday' });

      // Auto-create attendance as 'absent' if none exists, so the date persists in the history list even if holiday is removed
      const attCount = await Attendance.count({ where });
      if (attCount === 0) {
        let students = [];
        const subject = await Subject.findByPk(subjectId);
        if (subject) {
          if (subject.type === 'minor') {
            const actualLid = (labId && labId !== '0' && labId !== 'null') ? labId : null;
            students = await sequelize.query(`
              SELECT user_id FROM "StudentProfiles" 
              WHERE (:lid IS NOT NULL AND minor_lab_id = :lid) 
                 OR user_id IN (SELECT student_id FROM "StudentSubjects" WHERE subject_id = :sid)
            `, { replacements: { lid: actualLid, sid: subjectId }, type: sequelize.QueryTypes.SELECT });
          } else {
            if (labId && labId !== '0' && labId !== 'null') {
              students = await sequelize.query(`SELECT user_id FROM "StudentProfiles" WHERE lab_id = :lid`, { replacements: { lid: labId }, type: sequelize.QueryTypes.SELECT });
            } else {
              students = await sequelize.query(`
                SELECT sp.user_id FROM "StudentProfiles" sp
                JOIN "TeacherSubjects" ts ON ts.class_id = sp.class_id
                WHERE ts.teacher_id = :tid AND ts.subject_id = :sid
              `, { replacements: { tid: req.user.id, sid: subjectId }, type: sequelize.QueryTypes.SELECT });
            }
          }
        }

        if (students.length > 0) {
          const teacherId = req.user.id;
          const records = students.map(s => ({
            student_id: s.user_id,
            teacher_id: teacherId,
            subject_id: subjectId,
            lab_id: (!isMinor && labId && labId !== '0' && labId !== 'null') ? labId : null,
            minor_lab_id: (isMinor && labId && labId !== '0' && labId !== 'null') ? labId : null,
            date,
            status: 'absent'
          }));
          await Attendance.bulkCreate(records);
        }
      }
      res.json({ success: true, is_holiday: true });
    }
  } catch (err) {
    console.error("HOLIDAY ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/teacher/attendance/excel/export (Export current attendance to Excel)
router.get('/attendance/excel/export', async (req, res) => {
  try {
    const { subjectId, labId, isMinor } = req.query;
    if (!subjectId) return res.status(400).json({ error: 'Subject ID required' });

    let labFilter = '';
    const replacements = { subjectId };
    if (labId && labId !== '0' && labId !== 'null') {
      labFilter = isMinor === 'true' ? 'AND a.minor_lab_id = :labId' : 'AND a.lab_id = :labId';
      replacements.labId = labId;
    }

    const [subject] = await sequelize.query(`SELECT name FROM "Subjects" WHERE id = :subjectId`, { replacements: { subjectId }, type: sequelize.QueryTypes.SELECT });
    const teacherName = req.user.name || (await User.findByPk(req.user.id))?.name || 'Instructor';

    let labName = 'Theory';
    if (labId && labId !== '0' && labId !== 'null') {
      const [lab] = isMinor === 'true'
        ? await sequelize.query(`SELECT name FROM "MinorLabs" WHERE id = :labId`, { replacements: { labId }, type: sequelize.QueryTypes.SELECT })
        : await sequelize.query(`SELECT name FROM "Labs" WHERE id = :labId`, { replacements: { labId }, type: sequelize.QueryTypes.SELECT });
      labName = lab?.name || 'Lab';
    }

    const records = await sequelize.query(`
      SELECT sp.roll_no as "Roll No", u.name as "Student Name", a.date as "Date", a.status as "Status"
      FROM "Attendances" a
      JOIN "Users" u ON a.student_id = u.id
      JOIN "StudentProfiles" sp ON u.id = sp.user_id
      WHERE a.subject_id = :subjectId ${labFilter}
      ORDER BY a.date DESC, sp.roll_no ASC
    `, { replacements, type: sequelize.QueryTypes.SELECT });

    // Prepare metadata rows
    const metadata = [
      ["Teacher Name:", teacherName],
      ["Lab / Slot:", labName],
      ["Subject:", subject?.name || 'N/A'],
      ["Subject ID:", subjectId], // Hidden validation ID
      ["Lab ID:", labId || '0'], // Hidden validation ID
      [], // Empty row before content
    ];

    let ws;
    if (!records.length) {
      const students = await sequelize.query(`
        SELECT sp.roll_no as "Roll No", u.name as "Student Name", '' as "Date", 'present' as "Status"
        FROM "StudentProfiles" sp
        JOIN "Users" u ON sp.user_id = u.id
        WHERE (:lid IS NOT NULL AND (sp.minor_lab_id = :lid OR sp.lab_id = :lid))
           OR (:lid IS NULL AND sp.class_id IN (SELECT class_id FROM "TeacherSubjects" WHERE teacher_id = :tid AND subject_id = :sid))
        ORDER BY sp.roll_no ASC
      `, { replacements: { tid: req.user.id, sid: subjectId, lid: (labId && labId !== '0' && labId !== 'null') ? labId : null }, type: sequelize.QueryTypes.SELECT });
      ws = XLSX.utils.aoa_to_sheet(metadata);
      XLSX.utils.sheet_add_json(ws, students, { origin: "A7" });
    } else {
      ws = XLSX.utils.aoa_to_sheet(metadata);
      XLSX.utils.sheet_add_json(ws, records, { origin: "A7" });
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_export_${Date.now()}.xlsx`);
    res.send(buf);
  } catch (err) {
    console.error("EXPORT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/teacher/attendance/excel/import (Import attendance from Excel)
router.post('/attendance/excel/import', excelUpload.single('file'), async (req, res) => {
  try {
    const { subjectId, labId, isMinor } = req.body;
    if (!req.file) return res.status(400).json({ error: 'Excel file is required' });
    if (!subjectId) return res.status(400).json({ error: 'Subject ID is required' });

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Extract metadata for validation
    const fileSubjectId = sheet['B4']?.v?.toString();
    const fileLabId = sheet['B5']?.v?.toString();

    // Validation Check: Does the file correspond to the current selection?
    if (fileSubjectId && fileSubjectId !== subjectId.toString()) {
      return res.status(400).json({ error: `Subject Mismatch. This file is for Subject ID ${fileSubjectId}, but you are uploading for ${subjectId}.` });
    }
    if (fileLabId && fileLabId !== (labId || '0').toString()) {
      return res.status(400).json({ error: `Lab Mismatch. This file is for Lab ID ${fileLabId}, but you are uploading for ${labId}.` });
    }

    // Convert to JSON starting from row 7 (header in row 7)
    const data = XLSX.utils.sheet_to_json(sheet, { range: 6 });

    if (!data.length) return res.status(400).json({ error: 'Sheet is empty' });

    // Validate content headers
    const firstRow = data[0];
    if (!firstRow['Roll No'] || !firstRow['Date'] || !firstRow['Status']) {
      return res.status(400).json({ error: 'Invalid format. Required columns in row 7: Roll No, Date, Status' });
    }

    const teacherId = req.user.id;
    let successCount = 0;

    for (const row of data) {
      const rollNo = row['Roll No'];
      let date = row['Date'];
      const statusValue = row['Status']?.toString().toLowerCase().trim();
      const status = statusValue === 'present' ? 'present' : 'absent';

      if (typeof date === 'number') {
        date = new Date((date - (25567 + 1)) * 86400 * 1000).toISOString().split('T')[0];
      } else if (date) {
        try {
          const d = new Date(date);
          if (isNaN(d.getTime())) continue;
          date = d.toISOString().split('T')[0];
        } catch (e) { continue; }
      }

      if (!rollNo || !date) continue;

      const student = await StudentProfile.findOne({ where: { roll_no: rollNo.toString() } });
      if (!student) continue;

      // Robust Theory/Lab separation
      const where = {
        student_id: student.user_id,
        subject_id: subjectId,
        date: date,
        lab_id: (isMinor !== 'true' && labId && labId !== '0' && labId !== 'null') ? labId : null,
        minor_lab_id: (isMinor === 'true' && labId && labId !== '0' && labId !== 'null') ? labId : null
      };

      const [att, created] = await Attendance.findOrCreate({
        where,
        defaults: { ...where, teacher_id: teacherId, status }
      });

      if (!created) {
        att.status = status;
        await att.save();
      }
      successCount++;
    }

    fs.unlinkSync(req.file.path);
    res.json({ success: true, imported: successCount, message: `Successfully updated attendance for ${successCount} records.` });
  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

// GET student attendance history (for student report modal)
router.get('/students/:id/attendance', async (req, res) => {
  try {
    const teacherId = req.user.id;
    const studentId = req.params.id;

    // Find user_id
    const userRows = await sequelize.query(`
      SELECT u.id FROM "Users" u
      LEFT JOIN "StudentProfiles" sp ON sp.user_id = u.id
      WHERE u.id::text = :sid OR sp.id::text = :sid
      LIMIT 1
    `, { replacements: { sid: studentId }, type: sequelize.QueryTypes.SELECT });
    if (!userRows.length) return res.status(404).json({ error: 'Student not found' });
    const userId = userRows[0].id;

    // Teacher's subjects
    const subjectRows = await sequelize.query(`
      SELECT DISTINCT subject_id FROM "TeacherSubjects" WHERE teacher_id = :teacherId AND subject_id IS NOT NULL
      UNION
      SELECT DISTINCT subject_id FROM "LabSlots" WHERE teacher_id = :teacherId AND subject_id IS NOT NULL
      UNION
      SELECT DISTINCT ml.subject_id FROM "MinorLabSlots" mls JOIN "MinorLabs" ml ON mls.minor_lab_id = ml.id WHERE mls.teacher_id = :teacherId
    `, { replacements: { teacherId }, type: sequelize.QueryTypes.SELECT });
    const subjectIds = subjectRows.map(r => r.subject_id);
    if (!subjectIds.length) return res.json({ records: [], total: 0, present: 0, absent: 0, percentage: 0 });

    const records = await sequelize.query(`
      SELECT a.id, a.date, a.status,
             s.name as subject_name,
             COALESCE(l.name, ml.name, 'Theory') as lab_name
      FROM "Attendances" a
      JOIN "Subjects" s ON s.id = a.subject_id
      LEFT JOIN "Labs" l ON a.lab_id = l.id
      LEFT JOIN "MinorLabs" ml ON a.minor_lab_id = ml.id
      WHERE a.student_id = :userId AND a.subject_id IN (:subjectIds)
      ORDER BY a.date DESC
    `, { replacements: { userId, subjectIds }, type: sequelize.QueryTypes.SELECT });

    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    res.json({ records, total, present, absent: total - present, percentage: total ? Math.round((present / total) * 100) : 0 });
  } catch (err) {
    console.error("STUDENT ATT ERR:", err);
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /api/teacher/students/:id/history

router.get('/students/:id/history', async (req, res) => {
  try {
    const studentId = req.params.id; // User ID
    const teacherId = req.user.id;

    // To respect "only for their lab and subject", get the teacher's subjects
    const teacherSubjectsRaw = await TeacherSubject.findAll({ where: { teacher_id: teacherId } });
    const subjectIds = teacherSubjectsRaw.map(ts => ts.subject_id).filter(Boolean);

    if (subjectIds.length === 0) {
      return res.json({ profile: {}, assignments: [], quizzes: [] });
    }

    // Get Profile snippet
    const profileRows = await sequelize.query(`
      SELECT u.id as user_id, u.name, sp.roll_no, c.name as class_name
      FROM "Users" u
      LEFT JOIN "StudentProfiles" sp ON u.id = sp.user_id
      LEFT JOIN "Classes" c ON sp.class_id = c.id
      WHERE u.id::text = :studentId OR sp.id::text = :studentId
      LIMIT 1
    `, { replacements: { studentId }, type: sequelize.QueryTypes.SELECT });

    if (!profileRows.length) return res.status(404).json({ error: 'Student not found' });
    const profile = profileRows[0];
    const userId = profile.user_id;

    // Get only logic related to the teacher's subjects
    const assignments = await sequelize.query(`
      SELECT a.id, a.title as name, a.compiler_required, sas.ai_marks as score, q.max_marks as max_score, sas.submitted_at
      FROM "LabAssignments" a
      JOIN "AssignmentSets" s ON s.assignment_id = a.id
      JOIN "AssignmentQuestions" q ON q.set_id = s.id
      JOIN "StudentAssignmentSubmissions" sas ON sas.question_id = q.id AND sas.student_id = :userId
      WHERE a.subject_id IN (:subjectIds)
      ORDER BY sas.submitted_at DESC
      LIMIT 10
    `, { replacements: { userId, subjectIds }, type: sequelize.QueryTypes.SELECT });

    const quizzes = await sequelize.query(`
      SELECT q.id, q.title as name, sqs.total_marks as score, q.total_marks as max_score, sqs.submitted_at
      FROM "Quizzes" q
      JOIN "StudentQuizSubmissions" sqs ON sqs.quiz_id = q.id AND sqs.student_id = :userId
      WHERE q.subject_id IN (:subjectIds)
      ORDER BY sqs.submitted_at DESC
      LIMIT 10
    `, { replacements: { userId, subjectIds }, type: sequelize.QueryTypes.SELECT });

    // 4. Get Attendance History
    const attendance = await sequelize.query(`
      SELECT a.id, a.date, a.status,
             s.name as subject_name,
             COALESCE(l.name, ml.name, 'Theory') as lab_name
      FROM "Attendances" a
      JOIN "Subjects" s ON s.id = a.subject_id
      LEFT JOIN "Labs" l ON a.lab_id = l.id
      LEFT JOIN "MinorLabs" ml ON a.minor_lab_id = ml.id
      WHERE a.student_id = :userId AND a.subject_id IN (:subjectIds)
      ORDER BY a.date DESC
      LIMIT 10
    `, { replacements: { userId, subjectIds }, type: sequelize.QueryTypes.SELECT });

    res.json({ profile, assignments, quizzes, attendance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching student history' });
  }
});
// @route   GET /api/teacher/students/:id/full-details
router.get('/students/:id/full-details', async (req, res) => {
  try {
    const studentId = req.params.id;
    const teacherId = req.user.id;

    // 1. Get Profile
    const profileRows = await sequelize.query(`
      SELECT sp.id as profile_id, u.id as user_id, u.name, u.email, u.is_active, 
             sp.roll_no, c.name as class_name, sp.parent_email, co.name as course_name
      FROM "StudentProfiles" sp
      JOIN "Users" u ON sp.user_id = u.id
      LEFT JOIN "Classes" c ON sp.class_id = c.id
      LEFT JOIN "Courses" co ON c.course_id = co.id
      WHERE sp.id::text = :studentId OR u.id::text = :studentId
      LIMIT 1
    `, { replacements: { studentId }, type: sequelize.QueryTypes.SELECT });

    if (!profileRows.length) return res.status(404).json({ error: 'Student not found' });
    const profile = profileRows[0];
    const userId = profile.user_id;

    // 2. Get All Assignment Scores
    const assignments = await sequelize.query(`
      SELECT a.id, a.title, a.compiler_required, a.subject_id,
             COALESCE(SUM(sub.earned_marks), 0) as total_score,
             COALESCE(SUM(sub.max_marks), 0) as max_score,
             MAX(sub.last_submitted) as last_submitted
      FROM "LabAssignments" a
      LEFT JOIN "AssignmentSets" asets ON asets.assignment_id = a.id
      LEFT JOIN (
        SELECT aq.set_id, aq.id as question_id, aq.max_marks,
               COALESCE(sub_inner.earned_marks, 0) as earned_marks,
               sub_inner.last_submitted
        FROM "AssignmentQuestions" aq
        LEFT JOIN (
           SELECT question_id, ai_marks as earned_marks, submitted_at as last_submitted,
                  ROW_NUMBER() OVER(PARTITION BY student_id, question_id ORDER BY submitted_at DESC) as rn
           FROM "StudentAssignmentSubmissions"
           WHERE student_id = :userId
        ) sub_inner ON aq.id = sub_inner.question_id AND sub_inner.rn = 1
      ) sub ON sub.set_id = asets.id
      WHERE a.class_id = (SELECT class_id FROM "StudentProfiles" WHERE user_id = :userId)
         OR EXISTS (
           SELECT 1 FROM "StudentSubjects" ss 
           WHERE ss.student_id = :userId AND ss.subject_id = a.subject_id
         )
      GROUP BY a.id, a.title, a.compiler_required, a.subject_id
      ORDER BY a.created_at DESC
    `, { replacements: { userId }, type: sequelize.QueryTypes.SELECT });

    // 3. Get All Quiz Scores
    const quizzes = await sequelize.query(`
      SELECT q.id, q.title, q.total_marks as max_marks, q.subject_id,
             COALESCE(sub.earned_marks, 0) as score,
             sub.submitted_at
      FROM "Quizzes" q
      LEFT JOIN (
        SELECT sqs.quiz_id, sqs.total_marks as earned_marks, sqs.submitted_at,
               ROW_NUMBER() OVER(PARTITION BY student_id, quiz_id ORDER BY submitted_at DESC) as rn
        FROM "StudentQuizSubmissions" sqs
        WHERE sqs.student_id = :userId
      ) sub ON sub.quiz_id = q.id AND sub.rn = 1
      WHERE q.class_id = (SELECT class_id FROM "StudentProfiles" WHERE user_id = :userId)
         OR EXISTS (
           SELECT 1 FROM "StudentSubjects" ss 
           WHERE ss.student_id = :userId AND ss.subject_id = q.subject_id
         )
      ORDER BY q.created_at DESC
    `, { replacements: { userId }, type: sequelize.QueryTypes.SELECT });

    // 4. Get Teacher's Subjects for filtering Attendance
    const subjectRows = await sequelize.query(`
      SELECT DISTINCT subject_id FROM "TeacherSubjects" WHERE teacher_id = :teacherId AND subject_id IS NOT NULL
      UNION
      SELECT DISTINCT subject_id FROM "LabSlots" WHERE teacher_id = :teacherId AND subject_id IS NOT NULL
      UNION
      SELECT DISTINCT ml.subject_id FROM "MinorLabSlots" mls JOIN "MinorLabs" ml ON mls.minor_lab_id = ml.id WHERE mls.teacher_id = :teacherId
    `, { replacements: { teacherId }, type: sequelize.QueryTypes.SELECT });
    const subjectIds = subjectRows.map(r => r.subject_id);

    // 5. Get Attendance History
    let attendance = [];
    if (subjectIds.length > 0) {
      attendance = await sequelize.query(`
        SELECT a.id, a.date, a.status,
               s.name as subject_name,
               COALESCE(l.name, ml.name, 'Theory') as lab_name
        FROM "Attendances" a
        JOIN "Subjects" s ON s.id = a.subject_id
        LEFT JOIN "Labs" l ON a.lab_id = l.id
        LEFT JOIN "MinorLabs" ml ON a.minor_lab_id = ml.id
        WHERE a.student_id = :userId AND a.subject_id IN (:subjectIds)
        ORDER BY a.date DESC
        LIMIT 20
      `, { replacements: { userId, subjectIds }, type: sequelize.QueryTypes.SELECT });
    }

    // 6. Aggregate Attendance Stats
    const summaryStats = (subjectIds.length > 0) ? await sequelize.query(`
      SELECT s.name as subject_name, 
             COALESCE(l.name, ml.name, 'Theory') as lab_name,
             COUNT(*) as total,
             SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present
      FROM "Attendances" a
      JOIN "Subjects" s ON s.id = a.subject_id
      LEFT JOIN "Labs" l ON a.lab_id = l.id
      LEFT JOIN "MinorLabs" ml ON a.minor_lab_id = ml.id
      WHERE a.student_id = :userId AND a.subject_id IN (:subjectIds)
      GROUP BY s.name, l.name, ml.name
    `, { replacements: { userId, subjectIds }, type: sequelize.QueryTypes.SELECT }) : [];

    const totalAtt = attendance.length;
    const presentAtt = attendance.filter(r => r.status === 'present').length;

    // 7. Aggregate Academic Stats (Now using Accuracy)
    const academicStats = (subjectIds.length > 0) ? await sequelize.query(`
      SELECT s.id as subject_id, s.name as subject_name,
             (
               SELECT CASE WHEN SUM(sub.max_marks) > 0 THEN (SUM(sub.earned_marks)::float / SUM(sub.max_marks)) * 100 ELSE 0 END
               FROM (
                 SELECT aq.id, MAX(aq.max_marks) as max_marks, COALESCE(MAX(sas.ai_marks), 0) as earned_marks
                 FROM "LabAssignments" la
                 JOIN "AssignmentSets" aset ON la.id = aset.assignment_id
                 JOIN "AssignmentQuestions" aq ON aset.id = aq.set_id
                 LEFT JOIN "StudentAssignmentSubmissions" sas ON aq.id = sas.question_id AND sas.student_id = :userId
                 WHERE la.subject_id = s.id
                 GROUP BY aq.id
               ) sub
             ) as assignment_accuracy,
             (
               SELECT CASE WHEN SUM(sub.max_marks) > 0 THEN (SUM(sub.earned_marks)::float / SUM(sub.max_marks)) * 100 ELSE 0 END
               FROM (
                 SELECT q.id, MAX(q.total_marks) as max_marks, COALESCE(MAX(sqs.total_marks), 0) as earned_marks
                 FROM "Quizzes" q
                 LEFT JOIN "StudentQuizSubmissions" sqs ON q.id = sqs.quiz_id AND sqs.student_id = :userId
                 WHERE q.subject_id = s.id
                 GROUP BY q.id
               ) sub
             ) as quiz_accuracy
      FROM "Subjects" s
      WHERE s.id IN (:subjectIds)
    `, { replacements: { userId, subjectIds }, type: sequelize.QueryTypes.SELECT }) : [];

    // Calculate Overall Summary Stats
    let totalAssignmentMax = 0;
    let totalAssignmentEarned = 0;
    assignments.forEach(a => {
      totalAssignmentMax += Number(a.max_score || 0);
      totalAssignmentEarned += Number(a.total_score || 0);
    });

    let totalQuizMax = 0;
    let totalQuizEarned = 0;
    quizzes.forEach(q => {
      totalQuizMax += Number(q.max_marks || 0);
      totalQuizEarned += Number(q.score || 0);
    });

    const totalMax = totalAssignmentMax + totalQuizMax;
    const totalEarned = totalAssignmentEarned + totalQuizEarned;

    const overallAccuracy = totalMax > 0 ? Math.min(100.0, (totalEarned * 100.0 / totalMax)) : 0;
    const avgAssignment = totalAssignmentMax > 0 ? Math.min(100.0, (totalAssignmentEarned * 100.0 / totalAssignmentMax)) : 0;
    const avgQuiz = totalQuizMax > 0 ? Math.min(100.0, (totalQuizEarned * 100.0 / totalQuizMax)) : 0;

    const stats = {
      overallAccuracy: overallAccuracy.toFixed(1),
      avgAssignment: avgAssignment.toFixed(1),
      avgQuiz: avgQuiz.toFixed(1),
      totalSessions: totalAtt,
      presentSessions: presentAtt,
      attPercentage: totalAtt ? Math.round((presentAtt / totalAtt) * 100) : 0,
      summaryStats,
      academicStats
    };

    res.json({ profile, assignments, quizzes, attendance, stats });
  } catch (err) {
    console.error("Full details error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/teacher/send-student-report
router.post('/send-student-report', async (req, res) => {
  try {
    const { student_id, parent_email, studentData } = req.body;
    const teacherId = req.user.id;

    // Fetch Teacher Name
    const teacherRows = await sequelize.query(`SELECT name FROM "Users" WHERE id = :teacherId`, { replacements: { teacherId }, type: sequelize.QueryTypes.SELECT });
    const teacherName = teacherRows.length ? teacherRows[0].name : 'Instructor';

    // Fetch Academic Stats (Subject-wise)
    const academicStats = await sequelize.query(`
      SELECT s.id as subject_id, s.name as subject_name,
             (
                SELECT LEAST(100.0, CASE WHEN SUM(sub.max_marks) > 0 THEN (SUM(sub.earned_marks)::float / SUM(sub.max_marks)) * 100 ELSE 0 END)
                FROM (
                  SELECT aq.id, MAX(aq.max_marks) as max_marks, COALESCE(MAX(sas.ai_marks), 0) as earned_marks
                  FROM "LabAssignments" la
                  JOIN "AssignmentSets" aset ON la.id = aset.assignment_id
                  JOIN "AssignmentQuestions" aq ON aset.id = aq.set_id
                  LEFT JOIN "StudentAssignmentSubmissions" sas ON aq.id = sas.question_id AND sas.student_id = :student_id
                  WHERE la.subject_id = s.id
                  GROUP BY aq.id
                ) sub
             ) as assignment_accuracy,
             (
                SELECT LEAST(100.0, CASE WHEN SUM(sub.max_marks) > 0 THEN (SUM(sub.earned_marks)::float / SUM(sub.max_marks)) * 100 ELSE 0 END)
                FROM (
                  SELECT q.id, MAX(q.total_marks) as max_marks, COALESCE(MAX(sqs.total_marks), 0) as earned_marks
                  FROM "Quizzes" q
                  LEFT JOIN (
                    SELECT quiz_id, total_marks,
                           ROW_NUMBER() OVER(PARTITION BY student_id, quiz_id ORDER BY submitted_at DESC) as rn
                    FROM "StudentQuizSubmissions"
                    WHERE student_id = :student_id
                  ) sqs ON q.id = sqs.quiz_id AND sqs.rn = 1
                  WHERE q.subject_id = s.id
                  GROUP BY q.id
                ) sub
             ) as quiz_accuracy
      FROM "Subjects" s
      JOIN "TeacherSubjects" ts ON ts.subject_id = s.id
      WHERE ts.teacher_id = :teacherId
    `, { replacements: { student_id, teacherId }, type: sequelize.QueryTypes.SELECT });

    // Fetch Attendance Stats (Subject-wise)
    const attendanceStats = await sequelize.query(`
      SELECT s.name as subject_name, 
             COALESCE(l.name, ml.name, 'Theory') as lab_name,
             COUNT(*) as total,
             SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present
      FROM "Attendances" a
      JOIN "Subjects" s ON s.id = a.subject_id
      LEFT JOIN "Labs" l ON a.lab_id = l.id
      LEFT JOIN "MinorLabs" ml ON a.minor_lab_id = ml.id
      WHERE a.student_id = :student_id
      GROUP BY s.name, l.name, ml.name
    `, { replacements: { student_id }, type: sequelize.QueryTypes.SELECT });

    const result = await sendStudentReport(student_id, parent_email, studentData, academicStats, attendanceStats, teacherName);

    await StudentReport.create({
      student_id,
      report_html: `PDF Sent to ${parent_email}`,
      pdf_path: result.reportPath,
      ai_summary_paragraph: result.summary
    });

    res.json({ msg: 'Report sent successfully', summary: result.summary });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ================= LEADERBOARD =================
router.get('/leaderboard', async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { taskType = 'both', sortBy = 'accuracy', classId, subjectId } = req.query;

    const isGlobal = req.query.isGlobal === 'true';
    let whereClause = "";
    const replacements = { teacherId, taskType, sortBy };

    if (classId && classId !== 'N/A' && classId !== 'null') {
      whereClause += ' AND cl."id" = :classId';
      replacements.classId = classId;
    } else if (!isGlobal) {
      // Students from classes assigned to this teacher
      whereClause += ' AND cl."id" IN (SELECT "class_id" FROM "TeacherSubjects" WHERE "teacher_id" = :teacherId)';
    }

    let labSubFilter = "";
    let quizSubFilter = "";
    if (subjectId) {
      labSubFilter = ' AND la."subject_id" = :subjectId';
      quizSubFilter = ' AND qz."subject_id" = :subjectId';
      replacements.subjectId = subjectId;
    }

    const leaderboardData = await sequelize.query(`
      SELECT 
        u."id" as "student_id", u."name" as "student_name", u."profile_image",
        u."email" as "student_email", md5(lower(trim(u."email"))) as "gravatar_hash",
        sp."roll_no", cl."name" as "class_name",

        -- Standardized Score
        CASE 
          WHEN :taskType = 'lab' THEN COALESCE(l."lab_score", 0)
          WHEN :taskType = 'quiz' THEN COALESCE(q."quiz_score", 0)
          ELSE COALESCE(l."lab_score", 0) + COALESCE(q."quiz_score", 0)
        END as "total_score",

        -- Standardized Accuracy Calculation
        CASE 
          WHEN :taskType = 'lab' THEN 
            CASE 
              WHEN COALESCE(l."lab_max", 0) > 0 THEN LEAST(100.0, (COALESCE(l."lab_score", 0) * 100.0 / l."lab_max"))
              ELSE 0 
            END
          WHEN :taskType = 'quiz' THEN 
            CASE 
              WHEN COALESCE(q."quiz_max", 0) > 0 THEN LEAST(100.0, (COALESCE(q."quiz_score", 0) * 100.0 / q."quiz_max"))
              ELSE 0 
            END
          ELSE
            CASE 
              WHEN (COALESCE(l."lab_max", 0) + COALESCE(q."quiz_max", 0)) > 0 
                   THEN LEAST(100.0, ((COALESCE(l."lab_score", 0) + COALESCE(q."quiz_score", 0)) * 100.0 / (COALESCE(l."lab_max", 0) + COALESCE(q."quiz_max", 0))))
              ELSE 0 
            END
        END as "accuracy"

      FROM "Users" u
      JOIN "StudentProfiles" sp ON u."id" = sp."user_id"
      JOIN "Classes" cl ON cl."id" = sp."class_id"
      
      -- Subquery for Labs
      LEFT JOIN (
        SELECT sub."student_id", COALESCE(SUM(sub."ai_marks"), 0) as "lab_score", COALESCE(SUM(sub."max_marks"), 0) as "lab_max" FROM (
          SELECT sas."student_id", sas."ai_marks", aq."max_marks",
                 ROW_NUMBER() OVER(PARTITION BY sas."student_id", sas."question_id" ORDER BY sas."submitted_at" DESC) as rn
          FROM "StudentAssignmentSubmissions" sas
          JOIN "AssignmentQuestions" aq ON sas."question_id" = aq."id"
          JOIN "AssignmentSets" asets ON aq."set_id" = asets."id"
          JOIN "LabAssignments" la ON asets."assignment_id" = la."id"
          JOIN "StudentProfiles" sp_inner ON sas."student_id" = sp_inner."user_id"
          WHERE 1=1 ${labSubFilter}
          AND (la.target_labs IS NULL OR la.target_labs = '[]' 
               OR la.target_labs @> jsonb_build_array(sp_inner.lab_id)
               OR la.target_labs @> jsonb_build_array(CAST(sp_inner.lab_id AS TEXT))
               OR la.target_labs @> jsonb_build_array(sp_inner.minor_lab_id)
               OR la.target_labs @> jsonb_build_array(CAST(sp_inner.minor_lab_id AS TEXT))
               OR la.target_labs ? CAST(sp_inner.lab_id AS TEXT)
               OR la.target_labs ? CAST(sp_inner.minor_lab_id AS TEXT))
        ) sub WHERE rn = 1
        GROUP BY sub."student_id"
      ) l ON l."student_id" = u."id"
      
      -- Subquery for Quizzes
      LEFT JOIN (
        SELECT sub."student_id", COALESCE(SUM(sub."quiz_marks"), 0) as "quiz_score", COALESCE(SUM(sub."quiz_max"), 0) as "quiz_max" FROM (
          SELECT sqs."student_id", sqs."total_marks" as "quiz_marks", qz."total_marks" as "quiz_max",
                 ROW_NUMBER() OVER(PARTITION BY sqs."student_id", sqs."quiz_id" ORDER BY sqs."submitted_at" DESC) as rn
          FROM "StudentQuizSubmissions" sqs
          JOIN "Quizzes" qz ON sqs."quiz_id" = qz."id"
          JOIN "StudentProfiles" sp_inner ON sqs."student_id" = sp_inner."user_id"
          WHERE 1=1 ${quizSubFilter}
          AND (qz.target_labs IS NULL OR qz.target_labs = '[]' 
               OR qz.target_labs @> jsonb_build_array(sp_inner.lab_id)
               OR qz.target_labs @> jsonb_build_array(CAST(sp_inner.lab_id AS TEXT))
               OR qz.target_labs @> jsonb_build_array(sp_inner.minor_lab_id)
               OR qz.target_labs @> jsonb_build_array(CAST(sp_inner.minor_lab_id AS TEXT))
               OR qz.target_labs ? CAST(sp_inner.lab_id AS TEXT)
               OR qz.target_labs ? CAST(sp_inner.minor_lab_id AS TEXT))
        ) sub WHERE rn = 1
        GROUP BY sub."student_id"
      ) q ON q."student_id" = u."id"

      WHERE u."role" = 'student' AND u."is_active" = true ${whereClause}
      ORDER BY 
        CASE WHEN :sortBy = 'accuracy' THEN 
          CASE 
            WHEN :taskType = 'lab' THEN 
              CASE WHEN COALESCE(l."lab_max", 0) > 0 THEN (COALESCE(l."lab_score", 0) * 100.0 / l."lab_max") ELSE 0 END
            WHEN :taskType = 'quiz' THEN 
              CASE WHEN COALESCE(q."quiz_max", 0) > 0 THEN (COALESCE(q."quiz_score", 0) * 100.0 / q."quiz_max") ELSE 0 END
            ELSE
              CASE WHEN (COALESCE(l."lab_max", 0) + COALESCE(q."quiz_max", 0)) > 0 
                   THEN ((COALESCE(l."lab_score", 0) + COALESCE(q."quiz_score", 0)) * 100.0 / (COALESCE(l."lab_max", 0) + COALESCE(q."quiz_max", 0)))
                   ELSE 0 END
          END
        ELSE
          CASE 
            WHEN :taskType = 'lab' THEN COALESCE(l."lab_score", 0)
            WHEN :taskType = 'quiz' THEN COALESCE(q."quiz_score", 0)
            ELSE COALESCE(l."lab_score", 0) + COALESCE(q."quiz_score", 0)
          END
        END DESC,
        u."name" ASC
      LIMIT 100
    `, { replacements, type: sequelize.QueryTypes.SELECT });
    res.json({ students: leaderboardData });

  } catch (err) {
    console.error('[Leaderboard] Error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard', detail: err.message });
  }
});

module.exports = router;
