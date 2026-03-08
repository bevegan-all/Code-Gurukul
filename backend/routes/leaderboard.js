const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { sequelize } = require('../models/postgres');

// Any authenticated user can view the leaderboard
router.use(auth);

// GET /api/leaderboard  — all students ranked by lab + quiz scores
router.get('/', async (req, res) => {
  try {
    const rows = await sequelize.query(`
      SELECT
        u.id AS student_id,
        u.name AS student_name,
        sp.roll_no,
        cl.name AS class_name,
        COALESCE(l.lab_score, 0) + COALESCE(q.quiz_score, 0) AS total_score,
        COALESCE(l.lab_score, 0)  AS lab_score,
        COALESCE(q.quiz_score, 0) AS quiz_score
      FROM "StudentProfiles" sp
      JOIN "Users" u ON sp.user_id = u.id AND u.role = 'student' AND u.is_active = true
      LEFT JOIN "Classes" cl ON cl.id = sp.class_id
      LEFT JOIN (
        SELECT student_id, SUM(ai_marks) AS lab_score FROM (
          SELECT student_id, ai_marks,
                 ROW_NUMBER() OVER(PARTITION BY student_id, question_id ORDER BY submitted_at DESC) AS rn
          FROM "StudentAssignmentSubmissions"
        ) latest WHERE rn = 1
        GROUP BY student_id
      ) l ON l.student_id = u.id
      LEFT JOIN (
        SELECT student_id, SUM(total_marks) AS quiz_score FROM (
          SELECT student_id, total_marks,
                 ROW_NUMBER() OVER(PARTITION BY student_id, quiz_id ORDER BY submitted_at DESC) AS rn
          FROM "StudentQuizSubmissions"
        ) latest WHERE rn = 1
        GROUP BY student_id
      ) q ON q.student_id = u.id
      ORDER BY total_score DESC, u.name ASC
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(rows);
  } catch (err) {
    console.error('Leaderboard error:', err.message);
    res.status(500).json({ error: 'Failed to fetch leaderboard', detail: err.message });
  }
});

module.exports = router;
