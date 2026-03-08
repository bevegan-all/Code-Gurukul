const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roleGuard');
const { sequelize, Subject, Class, User, LabAssignment, AssignmentSet, AssignmentQuestion, Quiz, QuizQuestion, QuizOption, TeacherSubject } = require('../models/postgres');
const { Note, IdleAlert } = require('../models/mongo');

router.use(auth, requireRole('teacher'));

// @route   GET /api/teacher/dashboard-stats
// @desc    Get dashboard statistics specific to the logged-in teacher
router.get('/dashboard-stats', async (req, res) => {
  try {
    const teacherId = req.user.id;

    // Count distinct subjects assigned
    const countSubjects = await TeacherSubject.count({
      distinct: true,
      col: 'subject_id',
      where: { teacher_id: teacherId }
    });

    // Count distinct classes assigned (where type is major, because minor doesn't have class usually)
    const countClasses = await TeacherSubject.count({
      distinct: true,
      col: 'class_id',
      where: { teacher_id: teacherId, type: 'major' }
    });

    // Get assigned students through classes securely using raw query
    const result = await sequelize.query(`
      SELECT COUNT(DISTINCT sp.id) as students
      FROM "TeacherSubjects" ts
      JOIN "Classes" c ON ts.class_id = c.id
      JOIN "StudentProfiles" sp ON c.id = sp.class_id
      WHERE ts.teacher_id = :teacherId
    `, {
      replacements: { teacherId },
      type: sequelize.QueryTypes.SELECT
    });
    const studentsCount = result.length > 0 ? result[0].students : 0;

    // Get Active lab assignments created by teacher
    const countAssignments = await LabAssignment.count({
      where: { teacher_id: teacherId, status: 'published' }
    });

    // Get recent activity/classes for chart or list
    const RawAssignments = await sequelize.query(`
      SELECT ts.id, ts.type, s.name as subject_name, c.name as class_name
      FROM "TeacherSubjects" ts
      LEFT JOIN "Subjects" s ON ts.subject_id = s.id
      LEFT JOIN "Classes" c ON ts.class_id = c.id
      WHERE ts.teacher_id = :teacherId
      LIMIT 5
    `, {
      replacements: { teacherId },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      subjects: countSubjects,
      classes: countClasses,
      students: parseInt(studentsCount, 10) || 0,
      activeAssignments: countAssignments,
      myClasses: RawAssignments.map(a => ({
        id: a.id,
        Subject: { name: a.subject_name || "Unknown", type: a.type },
        Class: { name: a.class_name || "N/A" }
      }))
    });
  } catch (err) {
    console.error('GET /teacher/dashboard-stats error:', err.message);
    res.status(500).json({ error: 'Server error fetching teacher stats' });
  }
});

// ============================================================
// GET /api/teacher/my-subjects   — subjects assigned to teacher
// ============================================================
router.get('/my-subjects', async (req, res) => {
  try {
    const rows = await sequelize.query(`
      SELECT ts.id, ts.type, s.id as subject_id, s.name as subject_name, c.id as class_id, c.name as class_name
      FROM "TeacherSubjects" ts
      LEFT JOIN "Subjects" s ON ts.subject_id = s.id
      LEFT JOIN "Classes" c ON ts.class_id = c.id
      WHERE ts.teacher_id = :tid
      ORDER BY ts.type, s.name
    `, { replacements: { tid: req.user.id }, type: sequelize.QueryTypes.SELECT });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/teacher/my-students   — all students in teacher's classes
// ============================================================
router.get('/my-students', async (req, res) => {
  try {
    const rows = await sequelize.query(`
      SELECT DISTINCT u.id, u.name, u.email, u.is_active,
             sp.roll_no, sc.id as class_id, sc.name as class_name, co.name as course_name,
             ms.name as minor_subject_name
      FROM "TeacherSubjects" ts
      INNER JOIN "StudentProfiles" sp ON (
        (ts.type = 'major' AND ts.class_id = sp.class_id)
        OR
        (ts.type = 'minor' AND sp.minor_subject_id = ts.subject_id)
      )
      INNER JOIN "Users" u ON u.id = sp.user_id
      LEFT JOIN "Classes" sc ON sp.class_id = sc.id
      LEFT JOIN "Courses" co ON sc.course_id = co.id
      LEFT JOIN "Subjects" ms ON sp.minor_subject_id = ms.id
      WHERE ts.teacher_id = :tid
      ORDER BY sc.name, u.name
    `, { replacements: { tid: req.user.id }, type: sequelize.QueryTypes.SELECT });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/teacher/my-students-by-subject/:subjectId
// Returns students for a specific subject (major → by class, minor → by minor_subject_id)
router.get('/my-students-by-subject/:subjectId', async (req, res) => {
  try {
    const { subjectId } = req.params;
    // First find what type this subject is for this teacher
    const [tsRow] = await sequelize.query(`
      SELECT ts.type, ts.class_id FROM "TeacherSubjects" ts
      WHERE ts.teacher_id = :tid AND ts.subject_id = :sid
      LIMIT 1
    `, { replacements: { tid: req.user.id, sid: subjectId }, type: sequelize.QueryTypes.SELECT });

    if (!tsRow) return res.json([]);

    let rows;
    if (tsRow.type === 'major') {
      rows = await sequelize.query(`
        SELECT u.id, u.name, u.email, u.is_active,
               sp.roll_no, c.id as class_id, c.name as class_name
        FROM "StudentProfiles" sp
        JOIN "Users" u ON u.id = sp.user_id
        JOIN "Classes" c ON c.id = sp.class_id
        WHERE sp.class_id = :cid AND u.role = 'student'
        ORDER BY u.name
      `, { replacements: { cid: tsRow.class_id }, type: sequelize.QueryTypes.SELECT });
    } else {
      // minor — students who have this subject as their minor_subject_id
      rows = await sequelize.query(`
        SELECT u.id, u.name, u.email, u.is_active,
               sp.roll_no, c.id as class_id, c.name as class_name
        FROM "StudentProfiles" sp
        JOIN "Users" u ON u.id = sp.user_id
        JOIN "Classes" c ON c.id = sp.class_id
        WHERE sp.minor_subject_id = :sid AND u.role = 'student'
        ORDER BY u.name
      `, { replacements: { sid: subjectId }, type: sequelize.QueryTypes.SELECT });
    }
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ============================================================
// GET /api/teacher/assignments   — list teacher's assignments
// ============================================================
router.get('/assignments', async (req, res) => {
  try {
    const rows = await sequelize.query(`
      SELECT la.id, la.title, la.description, la.compiler_required, la.time_limit_minutes, la.status, la.created_at,
             la.subject_id, la.class_id, s.name as subject_name, c.name as class_name
      FROM "LabAssignments" la
      LEFT JOIN "Subjects" s ON la.subject_id = s.id
      LEFT JOIN "Classes" c ON la.class_id = c.id
      WHERE la.teacher_id = :tid
      ORDER BY la.created_at DESC
    `, { replacements: { tid: req.user.id }, type: sequelize.QueryTypes.SELECT });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// @route   POST /api/teacher/assignments
router.post('/assignments', async (req, res) => {
  try {
    const { subject_id, class_id, title, description, compiler_required, time_limit_minutes, status, sets } = req.body;
    const assignment = await LabAssignment.create({
      teacher_id: req.user.id, subject_id, class_id: class_id || null, title, description,
      compiler_required, time_limit_minutes: time_limit_minutes || null, status: status || 'draft'
    });
    if (sets && Array.isArray(sets)) {
      for (const set of sets) {
        const newSet = await AssignmentSet.create({ assignment_id: assignment.id, set_name: set.name });
        if (set.questions && Array.isArray(set.questions)) {
          await AssignmentQuestion.bulkCreate(set.questions.map((q, idx) => ({
            set_id: newSet.id, question_text: q.question_text, expected_code: q.expected_code, order_index: idx + 1
          })));
        }
      }
    }
    res.json({ msg: 'Assignment created successfully', assignmentId: assignment.id });
  } catch (err) {
    console.error('Assignment Creation Error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// PUT /api/teacher/assignments/:id — update status (draft/published)
router.put('/assignments/:id', async (req, res) => {
  try {
    await LabAssignment.update({ status: req.body.status }, { where: { id: req.params.id, teacher_id: req.user.id } });
    res.json({ msg: 'Assignment updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/teacher/assignments/:id
router.delete('/assignments/:id', async (req, res) => {
  try {
    await LabAssignment.destroy({ where: { id: req.params.id, teacher_id: req.user.id } });
    res.json({ msg: 'Assignment deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// GET /api/teacher/quizzes   — list teacher's quizzes
// ============================================================
router.get('/quizzes', async (req, res) => {
  try {
    const rows = await sequelize.query(`
      SELECT q.id, q.title, q.time_limit_minutes, q.status, q.created_at,
             q.subject_id, q.class_id, s.name as subject_name, c.name as class_name,
             COUNT(qq.id) as questions_count
      FROM "Quizzes" q
      LEFT JOIN "Subjects" s ON q.subject_id = s.id
      LEFT JOIN "Classes" c ON q.class_id = c.id
      LEFT JOIN "QuizQuestions" qq ON qq.quiz_id = q.id
      WHERE q.teacher_id = :tid
      GROUP BY q.id, s.name, c.name
      ORDER BY q.created_at DESC
    `, { replacements: { tid: req.user.id }, type: sequelize.QueryTypes.SELECT });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// @route   POST /api/teacher/quizzes
router.post('/quizzes', async (req, res) => {
  try {
    const { subject_id, class_id, title, time_limit_minutes, status, questions } = req.body;
    const quiz = await Quiz.create({
      teacher_id: req.user.id, subject_id, class_id: class_id || null, title,
      time_limit_minutes: time_limit_minutes || null, status: status || 'draft'
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
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/teacher/quizzes/:id
router.put('/quizzes/:id', async (req, res) => {
  try {
    await Quiz.update({ status: req.body.status }, { where: { id: req.params.id, teacher_id: req.user.id } });
    res.json({ msg: 'Quiz updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/teacher/quizzes/:id
router.delete('/quizzes/:id', async (req, res) => {
  try {
    await Quiz.destroy({ where: { id: req.params.id, teacher_id: req.user.id } });
    res.json({ msg: 'Quiz deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// GET /api/teacher/notes   — list teacher's notes (MongoDB)
// ============================================================
router.get('/notes', async (req, res) => {
  try {
    const notes = await Note.find({ teacher_id: req.user.id }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// @route   POST /api/teacher/notes
router.post('/notes', async (req, res) => {
  try {
    const { subject_id, class_id, title, content_html, status } = req.body;
    const note = await Note.create({
      teacher_id: req.user.id, subject_id, class_id: class_id || null,
      title, content_html, status: status || 'draft'
    });
    res.json({ msg: 'Notes saved successfully', noteId: note._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error from MongoDB' });
  }
});

// PUT /api/teacher/notes/:id
router.put('/notes/:id', async (req, res) => {
  try {
    await Note.findByIdAndUpdate(req.params.id, { title: req.body.title, content_html: req.body.content_html, status: req.body.status });
    res.json({ msg: 'Note updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/teacher/notes/:id
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
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/teacher/send-parent-email
router.post('/send-parent-email', async (req, res) => {
  try {
    const { parent_email, subject, message } = req.body;
    const emailService = require('../services/emailService');
    await emailService.sendEmail(parent_email, subject, message);
    res.json({ msg: 'Email sent to parent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/teacher/students/:id/history
router.get('/students/:id/history', async (req, res) => {
  try {
    const studentId = req.params.id;
    
    const profile = await sequelize.query(`
      SELECT sp.id, u.id as user_id, u.name, u.email, sp.roll_no, c.name as class_name
      FROM "StudentProfiles" sp
      JOIN "Users" u ON sp.user_id = u.id
      LEFT JOIN "Classes" c ON sp.class_id = c.id
      WHERE sp.id = :studentId
    `, { replacements: { studentId }, type: sequelize.QueryTypes.SELECT });

    if (!profile.length) return res.status(404).json({ error: 'Student not found' });

    // Recent Lab Assignments
    const assignments = await sequelize.query(`
      SELECT sas.ai_marks, sas.submitted_at, aq.question_text, a.id as assignment_id
      FROM "StudentAssignmentSubmissions" sas
      JOIN "AssignmentQuestions" aq ON sas.question_id = aq.id
      JOIN "AssignmentSets" s ON aq.set_id = s.id
      JOIN "LabAssignments" a ON s.assignment_id = a.id
      WHERE sas.student_id = :userId
      ORDER BY sas.submitted_at DESC
      LIMIT 10
    `, { replacements: { userId: profile[0].user_id }, type: sequelize.QueryTypes.SELECT });

    // Recent Quizzes
    const quizzes = await sequelize.query(`
      SELECT sqs.total_marks, sqs.submitted_at, q.title, q.id as quiz_id
      FROM "StudentQuizSubmissions" sqs
      JOIN "Quizzes" q ON sqs.quiz_id = q.id
      WHERE sqs.student_id = :userId
      ORDER BY sqs.submitted_at DESC
      LIMIT 10
    `, { replacements: { userId: profile[0].user_id }, type: sequelize.QueryTypes.SELECT });

    res.json({
      profile: profile[0],
      assignments,
      quizzes
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching student history' });
  }
});

// ================= LEADERBOARD =================
router.get('/leaderboard', async (req, res) => {
  try {
    const teacherId = req.user.id;
    const [rows] = await sequelize.query(`
      SELECT
        u.id,
        u.name,
        sp.roll_no,
        cl.name                                          AS class_name,
        COUNT(DISTINCT sas.id)                           AS assignment_count,
        COALESCE(AVG(sas.ai_marks), 0)                   AS avg_assignment_marks,
        COUNT(DISTINCT sqs.id)                           AS quiz_count,
        COALESCE(AVG(sqs.total_marks), 0)                AS avg_quiz_marks,
        COALESCE(AVG(sas.ai_marks), 0) * 50.0 / 10
          + COALESCE(AVG(sqs.total_marks), 0) * 50.0 / 100 AS total_score
      FROM "Users" u
      JOIN "StudentProfiles" sp ON sp.user_id = u.id
      JOIN "Classes" cl          ON cl.id = sp.class_id
      JOIN "TeacherSubjects" ts  ON ts.class_id = cl.id
                                AND ts.teacher_id = :teacherId
                                AND ts.type = 'major'
      LEFT JOIN "StudentAssignmentSubmissions" sas ON sas.student_id = u.id
      LEFT JOIN "StudentQuizSubmissions" sqs         ON sqs.student_id = u.id
      WHERE u.role = 'student' AND u.is_active = true
      GROUP BY u.id, u.name, sp.roll_no, cl.name
      ORDER BY total_score DESC
    `, { replacements: { teacherId }, type: sequelize.QueryTypes.SELECT });

    res.json({ students: rows });
  } catch (err) {
    console.error('Leaderboard error:', err.message);
    res.status(500).json({ error: 'Failed to fetch leaderboard', detail: err.message });
  }
});

module.exports = router;
