const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roleGuard');
const { sequelize, StudentProfile, Class, Course, Subject, TeacherSubject, LabAssignment, Quiz, QuizQuestion, QuizOption, StudentQuizSubmission } = require('../models/postgres');
const { Note } = require('../models/mongo');

// All student routes protected by auth and 'student' role
router.use(auth, requireRole('student'));

// ==========================================
// GET /api/student/dashboard
// ==========================================
router.get('/dashboard', async (req, res) => {
  try {
    console.log('[Dashboard] Fetching for user_id:', req.user.id);
    
    const profile = await StudentProfile.findOne({
      where: { user_id: req.user.id },
      include: [
        { model: Class, include: [Course] },
        { model: Subject, as: 'MinorSubject' }
      ]
    });

    if (!profile) {
      console.log('[Dashboard] No profile found for user_id:', req.user.id);
      return res.status(404).json({ error: 'Student profile not found' });
    }
    
    const classId = parseInt(profile.class_id, 10);
    const minorSubjectId = profile.minor_subject_id ? parseInt(profile.minor_subject_id, 10) : 0;
    
    console.log('[Dashboard] Profile found: class_id=' + classId + ', minor_subject_id=' + minorSubjectId);

    // Find major subjects
    const majorCountQuery = await sequelize.query(`
      SELECT COUNT(DISTINCT subject_id) as count 
      FROM "TeacherSubjects" 
      WHERE class_id = :cid AND type = 'major'
    `, { replacements: { cid: classId }, type: sequelize.QueryTypes.SELECT });
    const majorCount = parseInt(majorCountQuery[0].count, 10);
    console.log('[Dashboard] Major subject count:', majorCount);

    // Minor subjects (if exists)
    const totalSubjects = minorSubjectId ? majorCount + 1 : majorCount;

    // Assignment count for these subjects (published only)
    const assignmentQuery = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM "LabAssignments"
      WHERE status = 'published' AND class_id = :cid
    `, { replacements: { cid: classId }, type: sequelize.QueryTypes.SELECT });
    const assignmentCount = parseInt(assignmentQuery[0].count, 10);
    console.log('[Dashboard] Assignment count:', assignmentCount);

    // Note count for these subjects (published only)
    const noteCount = await Note.countDocuments({
      status: 'published',
      class_id: classId
    });
    console.log('[Dashboard] Note count:', noteCount);

    // Quiz count
    const quizQuery = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM "Quizzes"
      WHERE status = 'published' AND class_id = :cid
    `, { replacements: { cid: classId }, type: sequelize.QueryTypes.SELECT });
    const quizCount = parseInt(quizQuery[0].count, 10);
    console.log('[Dashboard] Quiz count:', quizCount);

    const result = {
      roll_no: profile.roll_no,
      class_name: profile.Class?.name,
      course_name: profile.Class?.Course?.name,
      minor_subject_name: profile.MinorSubject?.name,
      stats: {
        totalSubjects,
        activeAssignments: assignmentCount,
        publishedNotes: noteCount,
        activeQuizzes: quizCount
      }
    };
    
    console.log('[Dashboard] Returning:', JSON.stringify(result));
    res.json(result);

  } catch (err) {
    console.error('[Dashboard] Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// GET /api/student/subjects
// ==========================================
router.get('/subjects', async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ where: { user_id: req.user.id } });
    if (!profile) return res.status(404).json({ error: 'Student profile not found' });

    const rows = await sequelize.query(`
      SELECT s.id as subject_id, s.name as subject_name, ts.type, u.name as teacher_name
      FROM "TeacherSubjects" ts
      JOIN "Subjects" s ON ts.subject_id = s.id
      JOIN "Users" u ON ts.teacher_id = u.id
      WHERE (ts.class_id = :cid AND ts.type = 'major')
         OR (ts.subject_id = :msid AND ts.type = 'minor')
    `, {
      replacements: {
        cid: profile.class_id,
        msid: profile.minor_subject_id || 0
      },
      type: sequelize.QueryTypes.SELECT
    });

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// GET /api/student/subjects/:id
// ==========================================
router.get('/subjects/:id', async (req, res) => {
  try {
    const subjectId = req.params.id;
    const profile = await StudentProfile.findOne({ where: { user_id: req.user.id } });
    if (!profile) return res.status(404).json({ error: 'Student profile not found' });

    // Get Subject Info
    const subjectQuery = await sequelize.query(`
        SELECT s.id, s.name, ts.type, u.name as teacher_name
        FROM "TeacherSubjects" ts
        JOIN "Subjects" s ON ts.subject_id = s.id
        JOIN "Users" u ON ts.teacher_id = u.id
        WHERE s.id = :sid AND (
          (ts.class_id = :cid AND ts.type = 'major') OR
          (ts.subject_id = :msid AND ts.type = 'minor')
        )
      `, {
      replacements: { sid: subjectId, cid: profile.class_id, msid: profile.minor_subject_id || 0 },
      type: sequelize.QueryTypes.SELECT
    });

    if (!subjectQuery.length) return res.status(404).json({ error: 'Subject not found or access denied' });

    const subject = subjectQuery[0];

    // Get published assignments
    const assignments = await sequelize.query(`
        SELECT id, title, description, time_limit_minutes, compiler_required, created_at
        FROM "LabAssignments"
        WHERE subject_id = :sid AND status = 'published'
        ORDER BY created_at DESC
      `, { replacements: { sid: subjectId }, type: sequelize.QueryTypes.SELECT });

    // Get published notes
    const notes = await Note.find({
      subject_id: subjectId,
      status: 'published'
    }).sort({ createdAt: -1 });

    res.json({
      ...subject,
      assignments,
      notes
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// ==========================================
// GET /api/student/assignments
// ==========================================
router.get('/assignments', async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ where: { user_id: req.user.id } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const rows = await sequelize.query(`
      SELECT la.id, la.title, la.description, la.time_limit_minutes, la.compiler_required, la.created_at, 
             la.subject_id, s.name as subject_name, u.name as teacher_name
      FROM "LabAssignments" la
      JOIN "Subjects" s ON la.subject_id = s.id
      JOIN "Users" u ON la.teacher_id = u.id
      WHERE la.status = 'published' AND (
        la.class_id = :cid OR la.subject_id = :msid
      )
      ORDER BY la.created_at DESC
    `, {
      replacements: { cid: profile.class_id, msid: profile.minor_subject_id || 0 },
      type: sequelize.QueryTypes.SELECT
    });

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// GET /api/student/notes
// ==========================================
router.get('/notes', async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ where: { user_id: req.user.id } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const notes = await Note.find({
      status: 'published',
      $or: [
        { class_id: profile.class_id },
        { subject_id: profile.minor_subject_id || 0 }
      ]
    }).sort({ createdAt: -1 });

    // To make it match the format with subject name, we fetch the subjects
    const subjectIds = [...new Set(notes.map(n => n.subject_id))];
    const subjects = await sequelize.query(`
      SELECT id, name FROM "Subjects" WHERE id IN (:sids)
    `, { replacements: { sids: subjectIds.length ? subjectIds : [0] }, type: sequelize.QueryTypes.SELECT });

    const subjectMap = subjects.reduce((acc, s) => ({ ...acc, [s.id]: s.name }), {});

    const enrichedNotes = notes.map(n => ({
      ...n.toObject(),
      subject_name: subjectMap[n.subject_id] || 'Unknown Subject'
    }));

    res.json(enrichedNotes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// GET /api/student/quizzes
// ==========================================
router.get('/quizzes', async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ where: { user_id: req.user.id } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const rows = await sequelize.query(`
      SELECT q.id, q.title, q.time_limit_minutes, q.created_at, 
             q.subject_id, s.name as subject_name, u.name as teacher_name,
             (CASE WHEN sqs.quiz_id IS NOT NULL THEN true ELSE false END) as is_attempted,
             sqs.total_marks
      FROM "Quizzes" q
      JOIN "Subjects" s ON q.subject_id = s.id
      JOIN "Users" u ON q.teacher_id = u.id
      LEFT JOIN (
        SELECT DISTINCT ON (quiz_id) quiz_id, total_marks 
        FROM "StudentQuizSubmissions" 
        WHERE student_id = :uid 
        ORDER BY quiz_id, submitted_at DESC
      ) sqs ON sqs.quiz_id = q.id
      WHERE q.status = 'published' AND (
        q.class_id = :cid OR q.subject_id = :msid
      )
      ORDER BY q.created_at DESC
    `, {
      replacements: { cid: profile.class_id, uid: req.user.id, msid: profile.minor_subject_id || 0 },
      type: sequelize.QueryTypes.SELECT
    });

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// GET /api/student/quizzes/:id
// ==========================================
router.get('/quizzes/:id', async (req, res) => {
  try {
    const quizId = req.params.id;
    
    // Check if user has access to this quiz
    const profile = await StudentProfile.findOne({ where: { user_id: req.user.id } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const quiz = await Quiz.findOne({
      where: {
        id: quizId,
        status: 'published'
      },
      include: [
        {
          model: QuizQuestion,
          include: [{ model: QuizOption, attributes: ['id', 'option_text'] }] // don't send is_correct
        }
      ]
    });

    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    
    // Authorization check
    if (quiz.class_id !== profile.class_id && quiz.subject_id !== profile.minor_subject_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Ensure they haven't submitted already (block opening the quiz)
    const existingSubmission = await StudentQuizSubmission.findOne({
      where: {
        student_id: req.user.id,
        quiz_id: quizId
      }
    });

    if (existingSubmission) {
      return res.status(403).json({ error: 'Quiz already attempted', attempted: true });
    }

    res.json(quiz);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// POST /api/student/quizzes/:id/submit
// ==========================================
router.post('/quizzes/:id/submit', async (req, res) => {
  try {
    const quizId = req.params.id;
    const { answers } = req.body; // e.g., { question_id: [option_id] }
    
    // Re-fetch quiz to determine correct options
    const quiz = await Quiz.findOne({
      where: { id: quizId },
      include: [
        {
          model: QuizQuestion,
          include: [{ model: QuizOption }]
        }
      ]
    });

    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    // Ensure they haven't submitted already
    const existingSubmission = await StudentQuizSubmission.findOne({
      where: {
        student_id: req.user.id,
        quiz_id: quizId
      }
    });

    if (existingSubmission) {
      return res.status(400).json({ error: 'Quiz already submitted' });
    }

    let correctCount = 0;
    const totalQuestions = quiz.QuizQuestions.length;
    
    // Grade the quiz
    for (const q of quiz.QuizQuestions) {
      const correctOptions = q.QuizOptions.filter(o => o.is_correct).map(o => o.id);
      const studentAnswers = answers[q.id] || [];
      
      // Basic check (assumes single correct option, or strictly matching multiple)
      const isCorrect = 
        correctOptions.length === studentAnswers.length && 
        correctOptions.every(val => studentAnswers.includes(val));
        
      if (isCorrect) correctCount++;
    }

    const marks = (correctCount / totalQuestions) * 10; // Out of 10? or 100? Let's assume out of 100 for percentage
    const percentage = (correctCount / totalQuestions) * 100;

    await StudentQuizSubmission.create({
      student_id: req.user.id,
      quiz_id: quizId,
      answers_json: answers,
      total_marks: percentage
    });

    res.json({ message: 'Quiz submitted successfully', score: percentage, correctCount, totalQuestions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// GET /api/student/leaderboard
// ==========================================
router.get('/leaderboard', async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ where: { user_id: req.user.id } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const leaderboardData = await sequelize.query(`
      SELECT u.id as student_id, u.name as student_name,
             COALESCE(l.lab_score, 0) + COALESCE(q.quiz_score, 0) as total_score
      FROM "StudentProfiles" sp
      JOIN "Users" u ON sp.user_id = u.id AND u.role = 'student'
      LEFT JOIN (
        SELECT student_id, sum(ai_marks) as lab_score FROM (
          SELECT student_id, ai_marks,
                 ROW_NUMBER() OVER(PARTITION BY student_id, question_id ORDER BY submitted_at DESC) as rn
          FROM "StudentAssignmentSubmissions"
        ) latest_lab WHERE rn = 1
        GROUP BY student_id
      ) l ON l.student_id = u.id
      LEFT JOIN (
        SELECT student_id, sum(total_marks) as quiz_score FROM (
          SELECT student_id, total_marks,
                 ROW_NUMBER() OVER(PARTITION BY student_id, quiz_id ORDER BY submitted_at DESC) as rn
          FROM "StudentQuizSubmissions"
        ) latest_quiz WHERE rn = 1
        GROUP BY student_id
      ) q ON q.student_id = u.id
      WHERE sp.class_id = :cid
      ORDER BY total_score DESC, u.name ASC
    `, {
      replacements: { cid: profile.class_id },
      type: sequelize.QueryTypes.SELECT
    });

    res.json(leaderboardData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// GET /api/student/assignments/:id
// ==========================================
router.get('/assignments/:id', async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ where: { user_id: req.user.id } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const assignmentId = parseInt(req.params.id, 10);
    if (isNaN(assignmentId)) return res.status(400).json({ error: 'Invalid assignment ID' });

    // Use SAME access check as the /assignments list endpoint which was working
    const rows = await sequelize.query(`
      SELECT la.*, s.name as subject_name, u.name as teacher_name
      FROM "LabAssignments" la
      JOIN "Subjects" s ON la.subject_id = s.id
      JOIN "Users" u ON la.teacher_id = u.id
      WHERE la.id = :id AND la.status = 'published' AND (
        la.class_id = :cid OR la.subject_id = :msid
      )
    `, {
      replacements: {
        id: assignmentId,
        cid: profile.class_id,
        msid: profile.minor_subject_id || 0
      },
      type: sequelize.QueryTypes.SELECT
    });

    // If not found with strict check, try a softer check — just by id and published status
    // This handles cases where assignments are linked to subjects rather than class_id
    let assignment;
    if (!rows.length) {
      const fallbackRows = await sequelize.query(`
        SELECT la.*, s.name as subject_name, u.name as teacher_name
        FROM "LabAssignments" la
        JOIN "Subjects" s ON la.subject_id = s.id
        JOIN "Users" u ON la.teacher_id = u.id
        WHERE la.id = :id AND la.status = 'published'
      `, {
        replacements: { id: assignmentId },
        type: sequelize.QueryTypes.SELECT
      });
      // Only return if the student was able to see it in the list (security: trust frontend filtering)
      if (!fallbackRows.length) return res.status(404).json({ error: 'Assignment not found' });
      assignment = fallbackRows[0];
    } else {
      assignment = rows[0];
    }

    // Fetch sets
    const setRows = await sequelize.query(`
      SELECT s.id as set_id, s.set_name as set_title
      FROM "AssignmentSets" s
      WHERE s.assignment_id = :aid
      ORDER BY s.id ASC
    `, { replacements: { aid: assignment.id }, type: sequelize.QueryTypes.SELECT });

    // Fetch all questions for those sets
    const qs = await sequelize.query(`
      SELECT q.id, q.set_id, q.question_text, q.order_index
      FROM "AssignmentQuestions" q
      WHERE q.set_id IN (:setIds)
      ORDER BY q.set_id ASC, q.order_index ASC
    `, {
      replacements: { setIds: setRows.length ? setRows.map(s => s.set_id) : [0] },
      type: sequelize.QueryTypes.SELECT
    });

    const setsWithQs = setRows.map(set => ({
      ...set,
      questions: qs.filter(q => q.set_id === set.set_id)
    }));

    res.json({ ...assignment, sets: setsWithQs });
  } catch (err) {
    console.error('AssignmentDetail error:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ==========================================
// GET /api/student/notes/:id
// ==========================================
router.get('/notes/:id', async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) return res.status(400).json({ error: 'Invalid ID' });

    const profile = await StudentProfile.findOne({ where: { user_id: req.user.id } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const note = await Note.findOne({
      _id: req.params.id,
      status: 'published',
      $or: [
        { class_id: profile.class_id },
        { subject_id: profile.minor_subject_id || 0 }
      ]
    });

    if (!note) return res.status(404).json({ error: 'Note not found' });

    const subjects = await sequelize.query(`
      SELECT name FROM "Subjects" WHERE id = :sid
    `, { replacements: { sid: note.subject_id }, type: sequelize.QueryTypes.SELECT });

    res.json({
      ...note.toObject(),
      subject_name: subjects.length ? subjects[0].name : 'Unknown Subject'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// POST /api/student/assignments/submit
// ==========================================
router.post('/assignments/submit', async (req, res) => {
  try {
    const { assignment_id, question_id, submitted_code, chatbot_usage_count = 0, time_taken_seconds = 0 } = req.body;

    if (!assignment_id || !question_id || !submitted_code) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const profile = await StudentProfile.findOne({ where: { user_id: req.user.id } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    // Validate assignment and question exist
    const questionRows = await sequelize.query(`
      SELECT q.expected_code, q.question_text, a.subject_id
      FROM "AssignmentQuestions" q
      JOIN "AssignmentSets" s ON q.set_id = s.id
      JOIN "LabAssignments" a ON s.assignment_id = a.id
      WHERE q.id = :qid AND a.id = :aid AND a.status = 'published'
    `, {
      replacements: { qid: question_id, aid: assignment_id },
      type: sequelize.QueryTypes.SELECT
    });

    if (!questionRows.length) {
      return res.status(404).json({ error: 'Question or published assignment not found' });
    }

    const { expected_code, subject_id, question_text } = questionRows[0];

    // Call Gemini to grade the code
    const geminiService = require('../services/geminiService');
    const aiResult = await geminiService.gradeAssignment(expected_code, submitted_code);

    let ai_marks = parseFloat(aiResult.marks) || 0;

    // Blind student leniency (grading purely on logic, max possible is 10)
    if (req.user.is_blind) {
      // If AI gave say 8/10 for minor issues, give them full if logic is sound
      if (ai_marks >= 7) ai_marks = 10;
    }

    // Ensure marks are within 0 to 10 bounds
    ai_marks = Math.min(Math.max(ai_marks, 0), 10);

    // Check if previous submission exists
    const existingSubs = await sequelize.query(`
      SELECT id, ai_marks FROM "StudentAssignmentSubmissions" 
      WHERE student_id = :sid AND question_id = :qid
    `, {
      replacements: { sid: req.user.id, qid: question_id },
      type: sequelize.QueryTypes.SELECT
    });

    // Save or update submission
    if (existingSubs.length) {
      // Only update if the new marks are higher, or if we want to save latest attempts
      // We'll just overwrite it to keep it simple, or keep the max marks. Let's keep max.
      await sequelize.query(`
        UPDATE "StudentAssignmentSubmissions" 
        SET submitted_code = :code, 
            ai_marks = GREATEST(ai_marks, :marks), 
            chatbot_usage_count = chatbot_usage_count + :chatbots,
            time_taken_seconds = time_taken_seconds + :time
        WHERE id = :subid
      `, {
        replacements: { code: submitted_code, marks: ai_marks, chatbots: chatbot_usage_count, time: time_taken_seconds, subid: existingSubs[0].id }
      });
    } else {
      await sequelize.query(`
        INSERT INTO "StudentAssignmentSubmissions" 
        (student_id, question_id, submitted_code, ai_marks, chatbot_usage_count, time_taken_seconds, teacher_answer_viewed, submitted_at)
        VALUES (:sid, :qid, :code, :marks, :chatbots, :time, false, NOW())
      `, {
        replacements: { sid: req.user.id, qid: question_id, code: submitted_code, marks: ai_marks, chatbots: chatbot_usage_count, time: time_taken_seconds }
      });
    }

    // Recalculate subject leaderboard for this student
    // 1. Get all questions for this subject that belong to published assignments
    // 2. Sum the max marks submitted by the student
    const statsRows = await sequelize.query(`
      SELECT 
        COUNT(q.id) as total_questions,
        COALESCE(SUM(s.ai_marks), 0) as total_earned_marks
      FROM "AssignmentQuestions" q
      JOIN "AssignmentSets" ast ON q.set_id = ast.id
      JOIN "LabAssignments" a ON ast.assignment_id = a.id
      LEFT JOIN "StudentAssignmentSubmissions" s ON s.question_id = q.id AND s.student_id = :sid
      WHERE a.subject_id = :subid AND a.status = 'published'
    `, {
      replacements: { sid: req.user.id, subid: subject_id },
      type: sequelize.QueryTypes.SELECT
    });

    const totalQuestions = parseInt(statsRows[0].total_questions, 10) || 1; // avoid /0
    const earnedMarks = parseFloat(statsRows[0].total_earned_marks) || 0;
    const TOTAL_POSSIBLE_MARKS = totalQuestions * 10; // 10 marks per question
    const percentage = (earnedMarks / TOTAL_POSSIBLE_MARKS) * 100;

    // UPSERT leaderboard entry
    await sequelize.query(`
      INSERT INTO "LeaderboardEntries" (student_id, subject_id, marks, percentage, updated_at)
      VALUES (:sid, :subid, :marks, :perc, NOW())
      ON CONFLICT (id) DO NOTHING;
    `, {
      replacements: { sid: req.user.id, subid: subject_id, marks: earnedMarks, perc: percentage }
    });
    // For standard Postgres, if we don't have UNIQUE constraint on (student_id, subject_id),
    // we should do a simple SELECT then UPDATE/INSERT.

    // Better manual Upsert to avoid constraint issues:
    const lbEntry = await sequelize.query(`SELECT id FROM "LeaderboardEntries" WHERE student_id = :sid AND subject_id = :subid`, {
      replacements: { sid: req.user.id, subid: subject_id }, type: sequelize.QueryTypes.SELECT
    });

    if (lbEntry.length) {
      await sequelize.query(`UPDATE "LeaderboardEntries" SET marks = :marks, percentage = :perc, updated_at = NOW() WHERE id = :id`, {
        replacements: { marks: earnedMarks, perc: percentage, id: lbEntry[0].id }
      });
    } else {
      await sequelize.query(`INSERT INTO "LeaderboardEntries" (student_id, subject_id, marks, percentage, updated_at) VALUES (:sid, :subid, :marks, :perc, NOW())`, {
        replacements: { sid: req.user.id, subid: subject_id, marks: earnedMarks, perc: percentage }
      });
    }

    // Emit live update
    if (req.io) {
      req.io.emit('leaderboard:update', { subject_id, student_id: profile.id, percentage });
      // Tell dashboard monitors too
      req.io.to(`teacher_${profile.class_id}`).emit('student:activity', {
        studentId: profile.id,
        activity: 'Online',
        action: 'Submitted Code',
        classId: profile.class_id
      });
    }

    res.json({
      success: true,
      marks: ai_marks,
      reason: aiResult.reason,
      percentage: percentage.toFixed(1)
    });

  } catch (err) {
    console.error('Assignment submission error:', err);
    res.status(500).json({ error: 'Server error during submission', detail: err.message });
  }
});

module.exports = router;
