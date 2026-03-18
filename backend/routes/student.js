const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roleGuard');
const { sequelize, StudentProfile, Class, Course, Subject, TeacherSubject, LabAssignment, Quiz, QuizQuestion, QuizOption, StudentQuizSubmission, LabSlot, MinorLabSlot, Department } = require('../models/postgres');
const { Note, StudentSession } = require('../models/mongo');

// All student routes protected by auth and 'student' role
router.use(auth, requireRole('student'));

// ==========================================
// NOTIFICATIONS / RECENT ACTIVITY
// ==========================================
router.get('/recent-activity', async (req, res) => {
  try {
    const studentId = req.user.id;
    
    // 1. Fetch Lab Assignment Submissions (Group by assignment to show unique labs)
    const assignments = await sequelize.query(`
      SELECT DISTINCT ON (la.id) 'assignment' as type, la.title, sas.submitted_at as created_at, s.name as subject_name, sas.id as id
      FROM "StudentAssignmentSubmissions" sas
      JOIN "AssignmentQuestions" aq ON sas.question_id = aq.id
      JOIN "AssignmentSets" aset ON aq.set_id = aset.id
      JOIN "LabAssignments" la ON aset.assignment_id = la.id
      JOIN "Subjects" s ON la.subject_id = s.id
      WHERE sas.student_id = :sid
      ORDER BY la.id, sas.submitted_at DESC
      LIMIT 5
    `, { replacements: { sid: studentId }, type: sequelize.QueryTypes.SELECT });

    // 2. Fetch Quiz Submissions
    const quizzes = await sequelize.query(`
      SELECT 'quiz' as type, q.title, sqs.submitted_at as created_at, s.name as subject_name, sqs.id as id
      FROM "StudentQuizSubmissions" sqs
      JOIN "Quizzes" q ON sqs.quiz_id = q.id
      JOIN "Subjects" s ON q.subject_id = s.id
      WHERE sqs.student_id = :sid
      ORDER BY sqs.submitted_at DESC
      LIMIT 5
    `, { replacements: { sid: studentId }, type: sequelize.QueryTypes.SELECT });

    // Combine and sort
    const allActivity = [...assignments, ...quizzes]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);

    // Map to a consistent format for the notification dropdown
    const formatted = allActivity.map(act => ({
      id: act.id,
      title: act.type === 'assignment' ? `Solved Lab: ${act.title}` : `Finished Quiz: ${act.title}`,
      subject: act.subject_name,
      created_at: act.created_at,
      type: act.type
    }));

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// SESSION TRACKING
// ==========================================
router.post('/login-session', async (req, res) => {
  try {
    const session = await StudentSession.create({
      student_id: req.user.id,
      login_time: new Date()
    });
    res.json({ sessionId: session._id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/logout-session', async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (sessionId) {
      const session = await StudentSession.findById(sessionId);
      if (session) {
        session.logout_time = new Date();
        session.session_duration_minutes = Math.round((session.logout_time - session.login_time) / 60000);
        await session.save();
      }
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// TIMETABLE
// ==========================================
router.get('/my-timetable', async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ where: { user_id: req.user.id } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    let majorSlots = [];
    if (profile.lab_id) {
       majorSlots = await sequelize.query(`
        SELECT ls.day, ls.start_time, ls.end_time, 'major' as slot_type,
               l.name as lab_name, c.name as class_name, 'Major Lab' as subject_name
        FROM "LabSlots" ls
        JOIN "Labs" l ON ls.lab_id = l.id
        JOIN "Classes" c ON l.class_id = c.id
        WHERE ls.lab_id = :lid
      `, { replacements: { lid: profile.lab_id }, type: sequelize.QueryTypes.SELECT });
    }

    let minorSlots = [];
    if (profile.minor_lab_id) {
      minorSlots = await sequelize.query(`
        SELECT mls.day, mls.start_time, mls.end_time, 'minor' as slot_type,
               ml.name as lab_name, s.name as subject_name
        FROM "MinorLabSlots" mls
        JOIN "MinorLabs" ml ON mls.minor_lab_id = ml.id
        JOIN "Subjects" s ON ml.subject_id = s.id
        WHERE mls.minor_lab_id = :mid
      `, { replacements: { mid: profile.minor_lab_id }, type: sequelize.QueryTypes.SELECT });
    }

    res.json([...majorSlots, ...minorSlots]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// GET /api/student/current-lab
// ==========================================
router.get('/current-lab', async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ where: { user_id: req.user.id } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    const nowHours = new Date().getHours().toString().padStart(2, '0');
    const nowMinutes = new Date().getMinutes().toString().padStart(2, '0');
    const currentTime = `${nowHours}:${nowMinutes}:00`;

    let slots = [];
    
    if (profile.lab_id) {
      slots = await sequelize.query(`
        SELECT ls.is_unrestricted
        FROM "LabSlots" ls
        WHERE ls.lab_id = :lid AND ls.day = :today 
          AND ls.start_time <= :currentTime AND ls.end_time >= :currentTime
      `, { replacements: { lid: profile.lab_id, today, currentTime }, type: sequelize.QueryTypes.SELECT });
      
      if (slots.length > 0) return res.json({ is_unrestricted: slots[0].is_unrestricted });
    }

    if (profile.minor_lab_id) {
      slots = await sequelize.query(`
        SELECT mls.is_unrestricted
        FROM "MinorLabSlots" mls
        WHERE mls.minor_lab_id = :mid AND mls.day = :today 
          AND mls.start_time <= :currentTime AND mls.end_time >= :currentTime
      `, { replacements: { mid: profile.minor_lab_id, today, currentTime }, type: sequelize.QueryTypes.SELECT });
      
      if (slots.length > 0) return res.json({ is_unrestricted: slots[0].is_unrestricted });
    }

    res.json({ is_unrestricted: false });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

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

    // Find major & VSC subjects
    const majorCountQuery = await sequelize.query(`
      SELECT COUNT(DISTINCT subject_id) as count 
      FROM "TeacherSubjects" 
      WHERE class_id = :cid AND (type = 'major' OR type = 'vsc')
    `, { replacements: { cid: classId }, type: sequelize.QueryTypes.SELECT });
    const majorCount = parseInt(majorCountQuery[0].count, 10);
    console.log('[Dashboard] Major subject count:', majorCount);

    // Minor subjects (if exists)
    const totalSubjects = minorSubjectId ? majorCount + 1 : majorCount;

    // 1. Get all published assignments and quizzes targeted to this student
    const [allAssignments, activeQuizzesQuery] = await Promise.all([
      sequelize.query(`
        SELECT la.id, la.target_labs, aq.id as question_id, sas.id as submission_id
        FROM "LabAssignments" la
        JOIN "AssignmentSets" aset ON la.id = aset.assignment_id
        JOIN "AssignmentQuestions" aq ON aset.id = aq.set_id
        LEFT JOIN "StudentAssignmentSubmissions" sas ON aq.id = sas.question_id AND sas.student_id = :sid
        WHERE la.status = 'published' AND (la.class_id = :cid OR la.subject_id = :msid OR EXISTS (
          SELECT 1 FROM "TeacherSubjects" ts WHERE ts.subject_id = la.subject_id AND ts.class_id = :cid AND ts.type = 'vsc'
        ))
      `, { replacements: { cid: classId, msid: minorSubjectId, sid: req.user.id }, type: sequelize.QueryTypes.SELECT }),
      sequelize.query(`
        SELECT q.id, q.target_labs, q.total_marks as max_marks, sqs.id as submission_id, sqs.total_marks as earned_marks
        FROM "Quizzes" q
        LEFT JOIN "StudentQuizSubmissions" sqs ON q.id = sqs.quiz_id AND sqs.student_id = :sid
        WHERE q.status = 'published' AND (q.class_id = :cid OR q.subject_id = :msid OR EXISTS (
          SELECT 1 FROM "TeacherSubjects" ts WHERE ts.subject_id = q.subject_id AND ts.class_id = :cid AND ts.type = 'vsc'
        ))
      `, { replacements: { cid: classId, msid: minorSubjectId, sid: req.user.id }, type: sequelize.QueryTypes.SELECT })
    ]);

    // Track active assignments (incomplete ones)
    const assignmentMap = {};
    allAssignments.forEach(row => {
      let targeted = true;
      if (row.target_labs && Array.isArray(row.target_labs) && row.target_labs.length > 0) {
        const labs = row.target_labs.map(String);
        targeted = labs.includes(String(profile.lab_id)) || labs.includes(String(profile.minor_lab_id));
      }

      if (targeted) {
        if (!assignmentMap[row.id]) assignmentMap[row.id] = { total: 0, submitted: 0 };
        assignmentMap[row.id].total++;
        if (row.submission_id) assignmentMap[row.id].submitted++;
      }
    });
    const activeAssignments = Object.values(assignmentMap).filter(a => a.submitted < a.total).length;
    console.log('[Dashboard] Accurate Active Assignments:', activeAssignments);

    // 2. Note Count
    let notes = await Note.find({
      status: 'published',
      $or: [
        { class_id: classId },
        { subject_id: minorSubjectId }
      ]
    });

    const filteredNotes = notes.filter(n => {
      if (!n.target_labs || n.target_labs.length === 0) return true;
      return n.target_labs.includes(profile.lab_id) || n.target_labs.includes(profile.minor_lab_id);
    });
    const noteCount = filteredNotes.length;
    console.log('[Dashboard] Accurate Note Count:', noteCount);

    // 3. Quiz Count (Not yet attempted)
    // activeQuizzesQuery is already fetched in Step 1

    let quizCount = 0;
    activeQuizzesQuery.forEach(q => {
      let targeted = true;
      if (q.target_labs && Array.isArray(q.target_labs) && q.target_labs.length > 0) {
        const labs = q.target_labs.map(String);
        targeted = labs.includes(String(profile.lab_id)) || labs.includes(String(profile.minor_lab_id));
      }
      if (targeted && !q.submission_id) {
        quizCount++;
      }
    });

    console.log('[Dashboard] Accurate Quiz Count:', quizCount);

    // 4. Calculate Overall Accuracy (Definitive JS-level math with 100% cap)
    const [labStatsQuery, quizStatsQuery] = await Promise.all([
      sequelize.query(`
        SELECT SUM(sub.ai_marks) as earned, SUM(sub.max_marks) as total FROM (
          SELECT sas.ai_marks, aq.max_marks,
                 ROW_NUMBER() OVER(PARTITION BY sas.student_id, sas.question_id ORDER BY sas.submitted_at DESC) as rn
          FROM "StudentAssignmentSubmissions" sas
          JOIN "AssignmentQuestions" aq ON sas.question_id = aq.id
          JOIN "AssignmentSets" asets ON aq.set_id = asets."id"
          JOIN "LabAssignments" la ON asets.assignment_id = la."id"
          WHERE sas.student_id = :sid
            AND (la.target_labs IS NULL OR la.target_labs = '[]' 
                 OR la.target_labs @> jsonb_build_array(:lid)
                 OR la.target_labs @> jsonb_build_array(CAST(:lid AS TEXT))
                 OR la.target_labs @> jsonb_build_array(:mlid)
                 OR la.target_labs @> jsonb_build_array(CAST(:mlid AS TEXT))
                 OR la.target_labs ? CAST(:lid AS TEXT)
                 OR la.target_labs ? CAST(:mlid AS TEXT))
        ) sub WHERE rn = 1
      `, { replacements: { sid: req.user.id, lid: profile.lab_id, mlid: profile.minor_lab_id || 0 }, type: sequelize.QueryTypes.SELECT }),
      sequelize.query(`
        SELECT SUM(sub.quiz_marks) as earned, SUM(sub.quiz_max) as total FROM (
          SELECT sqs.total_marks as quiz_marks, qz.total_marks as quiz_max,
                 ROW_NUMBER() OVER(PARTITION BY sqs.student_id, sqs.quiz_id ORDER BY sqs.submitted_at DESC) as rn
          FROM "StudentQuizSubmissions" sqs
          JOIN "Quizzes" qz ON sqs.quiz_id = qz."id"
          WHERE sqs.student_id = :sid
            AND (qz.target_labs IS NULL OR qz.target_labs = '[]' 
                 OR qz.target_labs @> jsonb_build_array(:lid)
                 OR qz.target_labs @> jsonb_build_array(CAST(:lid AS TEXT))
                 OR qz.target_labs @> jsonb_build_array(:mlid)
                 OR qz.target_labs @> jsonb_build_array(CAST(:mlid AS TEXT))
                 OR qz.target_labs ? CAST(:lid AS TEXT)
                 OR qz.target_labs ? CAST(:mlid AS TEXT))
        ) sub WHERE rn = 1
      `, { replacements: { sid: req.user.id, lid: profile.lab_id, mlid: profile.minor_lab_id || 0 }, type: sequelize.QueryTypes.SELECT })
    ]);

    const labEarned = parseFloat(labStatsQuery[0]?.earned || 0);
    const labTotal = parseFloat(labStatsQuery[0]?.total || 0);
    const quizEarned = parseFloat(quizStatsQuery[0]?.earned || 0);
    const quizTotal = parseFloat(quizStatsQuery[0]?.total || 0);

    const totalEarned = labEarned + quizEarned;
    const totalPossible = labTotal + quizTotal;
    const finalAccuracy = totalPossible > 0 ? Math.min(100.0, (totalEarned * 100.0 / totalPossible)) : 0;
    const avgAssignment = labTotal > 0 ? Math.min(100.0, (labEarned * 100.0 / labTotal)) : 0;
    const avgQuiz = quizTotal > 0 ? Math.min(100.0, (quizEarned * 100.0 / quizTotal)) : 0;

    const result = {
      name: req.user.name,
      roll_no: profile.roll_no,
      class_name: profile.Class?.name,
      course_name: profile.Class?.Course?.name,
      minor_subject_name: profile.MinorSubject?.name,
      stats: {
        totalSubjects,
        activeAssignments,
        publishedNotes: noteCount,
        activeQuizzes: quizCount,
        overallAccuracy: parseFloat(finalAccuracy.toFixed(1)),
        avgAssignment: parseFloat(avgAssignment.toFixed(1)),
        avgQuiz: parseFloat(avgQuiz.toFixed(1))
      }
    };
    
    console.log(`[Dashboard] Final Accuracy: ${finalAccuracy}% (Earned: ${totalEarned}, Total: ${totalPossible})`);
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
      SELECT DISTINCT ON (s.id) 
             s.id as subject_id, s.name as subject_name, ts.type, u.name as teacher_name
      FROM "TeacherSubjects" ts
      JOIN "Subjects" s ON ts.subject_id = s.id
      JOIN "Users" u ON ts.teacher_id = u.id
      LEFT JOIN "LabSlots" ls ON ls.subject_id = s.id AND ls.lab_id = :lid AND ls.teacher_id = ts.teacher_id
      WHERE (ts.class_id = :cid AND (ts.type = 'major' OR ts.type = 'vsc'))
         OR (ts.subject_id = :msid AND ts.type = 'minor')
      ORDER BY s.id, (CASE WHEN ls.id IS NOT NULL THEN 0 ELSE 1 END), ts.created_at DESC
    `, {
      replacements: {
        cid: profile.class_id,
        msid: profile.minor_subject_id || 0,
        lid: profile.lab_id || 0
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
    const subjectId = parseInt(req.params.id, 10);
    if (isNaN(subjectId)) return res.status(400).json({ error: 'Invalid Subject ID' });
    
    const profile = await StudentProfile.findOne({ where: { user_id: req.user.id } });
    if (!profile) return res.status(404).json({ error: 'Student profile not found' });

    // Get Subject Info (Prioritize teacher assigned to student's lab slot)
    const subjectQuery = await sequelize.query(`
        SELECT DISTINCT ON (s.id)
               s.id, s.name, ts.type, u.name as teacher_name
        FROM "TeacherSubjects" ts
        JOIN "Subjects" s ON ts.subject_id = s.id
        JOIN "Users" u ON ts.teacher_id = u.id
        LEFT JOIN "LabSlots" ls ON ls.subject_id = s.id AND ls.lab_id = :lid AND ls.teacher_id = ts.teacher_id
        WHERE s.id = :sid AND (
          (ts.class_id = :cid AND (ts.type = 'major' OR ts.type = 'vsc')) OR
          (ts.subject_id = :msid AND ts.type = 'minor')
        )
        ORDER BY s.id, (CASE WHEN ls.id IS NOT NULL THEN 0 ELSE 1 END), ts.created_at DESC
      `, {
      replacements: { 
        sid: subjectId, 
        cid: profile.class_id, 
        msid: profile.minor_subject_id || 0,
        lid: profile.lab_id || 0
      },
      type: sequelize.QueryTypes.SELECT
    });

    if (!subjectQuery.length) return res.status(404).json({ error: 'Subject not found or access denied' });

    const subject = subjectQuery[0];
    const cid = profile.class_id;
    const uid = req.user.id;
    const msid = profile.minor_subject_id || 0;

    console.log(`[SubjectDetail] Fetching content for Subject:${subjectId}, Student:${uid}, Class:${cid}, Lab:${profile.lab_id}`);

    // Get published assignments
    let assignments = await sequelize.query(`
        SELECT la.id, la.title, la.description, la.time_limit_minutes, la.compiler_required, la.created_at, la.target_labs,
               (SELECT COUNT(s.id) > 0 
                FROM "StudentAssignmentSubmissions" s 
                JOIN "AssignmentQuestions" q ON s.question_id = q.id
                JOIN "AssignmentSets" ast ON q.set_id = ast.id
                WHERE ast.assignment_id = la.id AND s.student_id = :uid) as is_submitted,
               (SELECT SUM(s.ai_marks) 
                FROM "StudentAssignmentSubmissions" s 
                JOIN "AssignmentQuestions" q ON s.question_id = q.id
                JOIN "AssignmentSets" ast ON q.set_id = ast.id
                WHERE ast.assignment_id = la.id AND s.student_id = :uid) as ai_marks
        FROM "LabAssignments" la
        WHERE la.subject_id = :sid AND la.status = 'published' AND (la.class_id = :cid OR la.class_id IS NULL OR la.subject_id = :msid)
        ORDER BY la.created_at DESC
      `, { 
        replacements: { sid: subjectId, uid, cid, msid }, 
        type: sequelize.QueryTypes.SELECT 
      });

    console.log(`[SubjectDetail] Found ${assignments.length} assignments before lab filtering`);

    assignments = assignments.filter(a => {
      if (!a.target_labs || !Array.isArray(a.target_labs) || a.target_labs.length === 0) return true;
      const labs = a.target_labs.map(String);
      return labs.includes(String(profile.lab_id)) || labs.includes(String(profile.minor_lab_id));
    });

    // Get published notes
    let notes = await Note.find({ subject_id: subjectId, status: 'published' }).sort({ createdAt: -1 });
    
    notes = notes.filter(n => {
      if (!n.target_labs || n.target_labs.length === 0) return true;
      return n.target_labs.includes(String(profile.lab_id)) || n.target_labs.includes(String(profile.minor_lab_id));
    });

    // Get published quizzes
    let quizzes = await sequelize.query(`
        SELECT q.id, q.title, q.time_limit_minutes, q.status, q.created_at, q.target_labs,
               (CASE WHEN sqs.quiz_id IS NOT NULL THEN true ELSE false END) as is_attempted,
               sqs.total_marks
        FROM "Quizzes" q
        LEFT JOIN (
          SELECT DISTINCT ON (quiz_id) quiz_id, total_marks 
          FROM "StudentQuizSubmissions" 
          WHERE student_id = :uid 
          ORDER BY quiz_id, submitted_at DESC
        ) sqs ON sqs.quiz_id = q.id
        WHERE q.subject_id = :sid AND q.status = 'published' AND (q.class_id = :cid OR q.class_id IS NULL OR q.subject_id = :msid)
        ORDER BY q.created_at DESC
      `, { 
        replacements: { sid: subjectId, uid, cid, msid }, 
        type: sequelize.QueryTypes.SELECT 
      });

    console.log(`[SubjectDetail] Found ${quizzes.length} quizzes before lab filtering`);

    quizzes = quizzes.filter(q => {
      if (!q.target_labs || !Array.isArray(q.target_labs) || q.target_labs.length === 0) return true;
      const labs = q.target_labs.map(String);
      return labs.includes(String(profile.lab_id)) || labs.includes(String(profile.minor_lab_id));
    });

    res.json({
      ...subject,
      assignments,
      notes,
      quizzes
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
      SELECT la.id, la.title, la.description, la.time_limit_minutes, la.compiler_required, la.created_at, la.target_labs,
             la.subject_id, s.name as subject_name, u.name as teacher_name
      FROM "LabAssignments" la
      JOIN "Subjects" s ON la.subject_id = s.id
      JOIN "Users" u ON la.teacher_id = u.id
      WHERE la.status = 'published' AND (
        la.class_id = :cid OR la.subject_id = :msid OR EXISTS (
          SELECT 1 FROM "TeacherSubjects" ts WHERE ts.subject_id = la.subject_id AND ts.class_id = :cid AND ts.type = 'vsc'
        )
      )
      ORDER BY la.created_at DESC
    `, {
      replacements: { cid: profile.class_id, msid: profile.minor_subject_id || 0 },
      type: sequelize.QueryTypes.SELECT
    });

    const filtered = rows.filter(row => {
      if (!row.target_labs || row.target_labs.length === 0) return true;
      return row.target_labs.includes(String(profile.lab_id)) || row.target_labs.includes(String(profile.minor_lab_id));
    });

    res.json(filtered);
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

    // For notes, we need to check if the subject is a VSC for this class
    const vscSubjects = await sequelize.query(`
      SELECT subject_id FROM "TeacherSubjects" WHERE class_id = :cid AND type = 'vsc'
    `, { replacements: { cid: profile.class_id }, type: sequelize.QueryTypes.SELECT });
    const vscSubjectIds = vscSubjects.map(v => v.subject_id);

    let notes = await Note.find({
      status: 'published',
      $or: [
        { class_id: profile.class_id },
        { subject_id: profile.minor_subject_id || 0 },
        { subject_id: { $in: vscSubjectIds } }
      ]
    }).sort({ createdAt: -1 });

    notes = notes.filter(n => {
      if (!n.target_labs || n.target_labs.length === 0) return true;
      return n.target_labs.includes(String(profile.lab_id)) || n.target_labs.includes(String(profile.minor_lab_id));
    });

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
      SELECT q.id, q.title, q.time_limit_minutes, q.created_at, q.target_labs,
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

    const filtered = rows.filter(row => {
      if (!row.target_labs || row.target_labs.length === 0) return true;
      return row.target_labs.includes(String(profile.lab_id)) || row.target_labs.includes(String(profile.minor_lab_id));
    });

    res.json(filtered);
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

    if (quiz.target_labs && quiz.target_labs.length > 0) {
      if (!quiz.target_labs.includes(String(profile.lab_id)) && !quiz.target_labs.includes(String(profile.minor_lab_id))) {
        return res.status(403).json({ error: 'Access denied: Quiz not targeted to your lab batch.' });
      }
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

    const totalMarks = correctCount; // 1 mark per question
    const percentage = (correctCount / totalQuestions) * 100;

    await StudentQuizSubmission.create({
      student_id: req.user.id,
      quiz_id: quizId,
      answers_json: answers,
      total_marks: totalMarks
    });

    res.json({ 
      message: 'Quiz submitted successfully', 
      score: totalMarks, 
      percentage,
      correctCount, 
      totalQuestions 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// GET /api/student/leaderboard-filters
// ==========================================
router.get('/leaderboard-filters', async (req, res) => {
  try {
    const studentId = req.user.id;
    console.log('[Leaderboard-Filters] Fetching metadata for user:', studentId);
    
    // 1. Get student profile & class info first to know their scope
    const profile = await StudentProfile.findOne({ 
      where: { user_id: studentId },
      include: [{ 
        model: Class, 
        attributes: ['id', 'name', 'course_id', 'year'] 
      }]
    }).catch(() => null);

    if (!profile) return res.status(404).json({ error: 'Student profile not found' });

    // 2. Fetch basic metadata
    const [departments, courses, classes] = await Promise.all([
      Department.findAll({ attributes: ['id', 'name'], raw: true }).catch(() => []),
      Course.findAll({ attributes: ['id', 'name', 'department_id'], raw: true }).catch(() => []),
      Class.findAll({ attributes: ['id', 'name', 'course_id'], raw: true }).catch(() => [])
    ]);

    // 3. SECURE SUBJECTS: Only show subjects matching student's Class Year/Course OR their Minor Subject
    const studentYear = profile.Class?.year;
    const studentCourseId = profile.Class?.course_id;
    const studentMinorId = profile.minor_subject_id;

    let subjects = [];
    if (studentYear && studentCourseId) {
      subjects = await sequelize.query(`
        SELECT id, name FROM "Subjects"
        WHERE ("course_id" = :courseId AND "year" = :year)
           OR "id" = :minorId
        ORDER BY name ASC
      `, {
        replacements: { 
          courseId: studentCourseId, 
          year: studentYear,
          minorId: studentMinorId || 0
        },
        type: sequelize.QueryTypes.SELECT
      });
    } else {
      // Fallback: If no class assigned, show nothing or only minor
      subjects = await Subject.findAll({ 
        where: { id: studentMinorId || 0 }, 
        attributes: ['id', 'name'], 
        raw: true 
      });
    }

    const studentClass = profile.Class ? { id: profile.Class.id, name: profile.Class.name } : null;

    console.log(`[Leaderboard-Filters] Success: ${departments.length} depts, ${courses.length} courses, ${subjects.length} relevant subjects`);

    res.json({ 
      departments, 
      courses, 
      classes, 
      subjects,
      studentClass
    });
  } catch (err) {
    console.error('[LeaderboardFilters] Fatal Error:', err);
    res.json({ departments: [], courses: [], classes: [], subjects: [], studentClass: null });
  }
});

// ==========================================
// GET /api/student/leaderboard
// ==========================================
router.get('/leaderboard', async (req, res) => {
  try {
    const { departmentId, courseId, classId, subjectId, isGlobal, taskType = 'both', sortBy = 'accuracy' } = req.query;
    const profile = await StudentProfile.findOne({ where: { user_id: req.user.id } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    let whereClause = "";
    const replacements = { 
      taskType, 
      sortBy 
    };

    if (classId === 'default') {
      whereClause += ' AND sp."class_id" = :myClassId';
      replacements.myClassId = profile.class_id;
    } else if (classId) {
      whereClause += ' AND sp."class_id" = :classId';
      replacements.classId = classId;
    } else if (courseId) {
      whereClause += ' AND c."course_id" = :courseId';
      replacements.courseId = courseId;
    } else if (departmentId) {
      whereClause += ' AND cr."department_id" = :deptId';
      replacements.deptId = departmentId;
    } else if (isGlobal !== 'true') {
      whereClause += ' AND sp."class_id" = :myClassId';
      replacements.myClassId = profile.class_id;
    }

    let assignmentFilter = "";
    let quizFilter = "";
    if (subjectId) {
      assignmentFilter = ' AND la."subject_id" = :subjectId';
      quizFilter = ' AND qz."subject_id" = :subjectId';
      replacements.subjectId = subjectId;
    }

    const leaderboardData = await sequelize.query(`
      SELECT 
        u."id" as "student_id", 
        u."name" as "student_name",
        u."profile_image" as "profile_image",
        u."email" as "student_email",
        md5(lower(trim(u."email"))) as "gravatar_hash",
        COALESCE(l."lab_score", 0) as "lab_score",
        COALESCE(q."quiz_score", 0) as "quiz_score",
        COALESCE(l."lab_max", 0) as "lab_max",
        COALESCE(q."quiz_max", 0) as "quiz_max",
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
      LEFT JOIN "Classes" c ON sp."class_id" = c."id"
      LEFT JOIN "Courses" cr ON c."course_id" = cr."id"
      
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
          WHERE 1=1 ${assignmentFilter}
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
          WHERE 1=1 ${quizFilter}
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

      WHERE u."role" = 'student' ${whereClause}
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
    `, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    res.json(leaderboardData);
  } catch (err) {
    console.error('[Leaderboard] Error:', err);
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
      if (!fallbackRows.length) return res.status(404).json({ error: 'Assignment not found' });
      assignment = fallbackRows[0];
    } else {
      assignment = rows[0];
    }

    if (assignment.target_labs && assignment.target_labs.length > 0) {
      if (!assignment.target_labs.includes(String(profile.lab_id)) && !assignment.target_labs.includes(String(profile.minor_lab_id))) {
        return res.status(403).json({ error: 'Access denied: Assignment not targeted to your lab batch.' });
      }
    }

    // Fetch sets
    const setRows = await sequelize.query(`
      SELECT s.id as set_id, s.set_name as set_title
      FROM "AssignmentSets" s
      WHERE s.assignment_id = :aid
      ORDER BY s.id ASC
    `, { replacements: { aid: assignment.id }, type: sequelize.QueryTypes.SELECT });

    // Fetch all questions for those sets with submission info
    const qs = await sequelize.query(`
      SELECT 
        q.id, q.set_id, q.question_text, q.order_index,
        s.ai_marks, s.submitted_at, s.submitted_code,
        CASE 
          WHEN s.id IS NOT NULL AND s.ai_marks IS NOT NULL THEN q.expected_code 
          ELSE NULL 
        END as expected_code,
        CASE WHEN s.id IS NOT NULL THEN true ELSE false END as is_submitted
      FROM "AssignmentQuestions" q
      LEFT JOIN "StudentAssignmentSubmissions" s ON q.id = s.question_id AND s.student_id = :sid
      WHERE q.set_id IN (:setIds)
      ORDER BY q.set_id ASC, q.order_index ASC
    `, {
      replacements: { 
        setIds: setRows.length ? setRows.map(s => s.set_id) : [0],
        sid: req.user.id
      },
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

    if (note.target_labs && note.target_labs.length > 0) {
      if (!note.target_labs.includes(String(profile.lab_id)) && !note.target_labs.includes(String(profile.minor_lab_id))) {
        return res.status(403).json({ error: 'Access denied: Note not targeted to your lab batch.' });
      }
    }

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
      SELECT q.expected_code, q.expected_output, q.question_text, a.subject_id
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

    const { expected_code, expected_output, subject_id, question_text } = questionRows[0];

    // Check if previous submission exists for rate limiting and "no marks for resubmission" policy
    const existingSubs = await sequelize.query(`
      SELECT id, ai_marks, submitted_at, submitted_code as last_code FROM "StudentAssignmentSubmissions" 
      WHERE student_id = :sid AND question_id = :qid
    `, {
      replacements: { sid: req.user.id, qid: question_id },
      type: sequelize.QueryTypes.SELECT
    });

    if (existingSubs.length) {
      return res.status(400).json({ error: 'This question has already been submitted for AI grading. Use the Terminal to test your code for practice.' });
    }

    // Call Gemini to grade the code
    const geminiService = require('../services/geminiService');
    const aiResult = await geminiService.gradeAssignment(expected_code, submitted_code);

    let ai_marks = parseFloat(aiResult.marks) || 0;

    // Chatbot functionality penalty implementation
    if (chatbot_usage_count >= 5) {
      ai_marks = 0; // Frozen/0 marks cap
    } else if (chatbot_usage_count >= 4) {
      ai_marks -= 2;
    } else if (chatbot_usage_count >= 2) {
      ai_marks -= 1;
    }

    // Blind student leniency
    if (req.user.is_blind) {
      if (ai_marks >= 7) ai_marks = 10;
    }

    // Ensure marks are within 0 to 10 bounds
    ai_marks = Math.min(Math.max(ai_marks, 0), 10);

    // Save or update submission
    if (existingSubs.length) {
      // RESUBMISSION POLICY: Only first submission marks will be counted.
      // All subsequent submissions are for practice and do NOT update the final score.
      const final_marks = existingSubs[0].ai_marks; 

      await sequelize.query(`
        UPDATE "StudentAssignmentSubmissions" 
        SET submitted_code = :code, 
            chatbot_usage_count = chatbot_usage_count + :chatbots,
            time_taken_seconds = time_taken_seconds + :time,
            submitted_at = NOW()
        WHERE id = :subid
      `, {
        replacements: { 
          code: submitted_code, 
          chatbots: chatbot_usage_count, 
          time: time_taken_seconds, 
          subid: existingSubs[0].id 
        }
      });
      
      // We set ai_marks to the original score to ensure consistency across the app
      ai_marks = final_marks;
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
      percentage: percentage.toFixed(1),
      expected_output: expected_output,
      expected_code: expected_code,
      is_resubmission: !!existingSubs.length
    });

  } catch (err) {
    console.error('Assignment submission error:', err);
    res.status(500).json({ error: 'Server error during submission', detail: err.message });
  }
});

// ==========================================
// ATTENDANCE STATISTICS
// ==========================================
router.get('/attendance', async (req, res) => {
  try {
    const studentId = req.user.id;
    const profile = await StudentProfile.findOne({ where: { user_id: studentId } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    // Get all unique subjects student is enrolled in
    const subjects = await sequelize.query(`
      SELECT DISTINCT ON (s.id) s.id, s.name, ts.type
      FROM "TeacherSubjects" ts
      JOIN "Subjects" s ON ts.subject_id = s.id
      WHERE (ts.class_id = :cid AND (ts.type = 'major' OR ts.type = 'vsc'))
         OR (ts.subject_id = :msid AND ts.type = 'minor')
      ORDER BY s.id
    `, {
      replacements: { cid: profile.class_id, msid: profile.minor_subject_id || 0 },
      type: sequelize.QueryTypes.SELECT
    });

    const stats = [];
    for (const sub of subjects) {
      const attendance = await sequelize.query(`
        SELECT 
          COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
          COUNT(*) as total
        FROM "Attendances"
        WHERE student_id = :sid AND subject_id = :subid
      `, {
        replacements: { sid: studentId, subid: sub.id },
        type: sequelize.QueryTypes.SELECT
      });

      stats.push({
        subject_id: sub.id,
        subject_name: sub.name,
        type: sub.type,
        present: parseInt(attendance[0].present, 10),
        total: parseInt(attendance[0].total, 10)
      });
    }

    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/attendance/:subjectId', async (req, res) => {
  try {
    const studentId = req.user.id;
    const subjectId = req.params.subjectId;

    const records = await sequelize.query(`
      SELECT a.date, a.status, u.name as teacher_name, 
             l.name as lab_name, ml.name as minor_lab_name
      FROM "Attendances" a
      LEFT JOIN "Users" u ON a.teacher_id = u.id
      LEFT JOIN "Labs" l ON a.lab_id = l.id
      LEFT JOIN "MinorLabs" ml ON a.minor_lab_id = ml.id
      WHERE a.student_id = :sid AND a.subject_id = :subid
      ORDER BY a.date DESC
    `, {
      replacements: { sid: studentId, subid: subjectId },
      type: sequelize.QueryTypes.SELECT
    });

    res.json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
