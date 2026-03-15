const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { sequelize } = require('../models/postgres');

// Any authenticated user can view the leaderboard
router.use(auth);

// GET /api/leaderboard  — all students ranked by lab + quiz scores
router.get('/', async (req, res) => {
  try {
    const { taskType = 'both', sortBy = 'accuracy' } = req.query;
    const replacements = { taskType, sortBy };

    const leaderboardData = await sequelize.query(`
      SELECT 
        u."id" as "student_id", 
        u."name" as "student_name",
        sp."roll_no",
        cl."name" as "class_name",
        co."name" as "course_name",
        d."name" as "department_name",
        CASE 
          WHEN :taskType = 'lab' THEN COALESCE(l."lab_score", 0)
          WHEN :taskType = 'quiz' THEN COALESCE(q."quiz_score", 0)
          ELSE COALESCE(l."lab_score", 0) + COALESCE(q."quiz_score", 0)
        END as "total_score",
        CASE
          WHEN :taskType = 'lab' THEN 
            CASE WHEN COALESCE(l."lab_max", 0) > 0 THEN (COALESCE(l."lab_score", 0)::float / l."lab_max") * 100 ELSE 0 END
          WHEN :taskType = 'quiz' THEN 
            CASE WHEN COALESCE(q."quiz_max", 0) > 0 THEN (COALESCE(q."quiz_score", 0)::float / q."quiz_max") * 100 ELSE 0 END
          ELSE
            CASE WHEN (COALESCE(l."lab_max", 0) + COALESCE(q."quiz_max", 0)) > 0 
                 THEN ((COALESCE(l."lab_score", 0) + COALESCE(q."quiz_score", 0))::float / (COALESCE(l."lab_max", 0) + COALESCE(q."quiz_max", 0))) * 100 
                 ELSE 0 END
        END as "accuracy"
      FROM "Users" u
      JOIN "StudentProfiles" sp ON u."id" = sp."user_id"
      LEFT JOIN "Classes" cl ON cl."id" = sp."class_id"
      LEFT JOIN "Courses" co ON co."id" = cl."course_id"
      LEFT JOIN "Departments" d ON d."id" = co."department_id"
      LEFT JOIN (
        SELECT sub."student_id", SUM(sub."ai_marks") as "lab_score", SUM(sub."max_marks") as "lab_max" FROM (
          SELECT sas."student_id", sas."ai_marks", aq."max_marks",
                 ROW_NUMBER() OVER(PARTITION BY sas."student_id", sas."question_id" ORDER BY sas."submitted_at" DESC) as rn
          FROM "StudentAssignmentSubmissions" sas
          JOIN "AssignmentQuestions" aq ON sas."question_id" = aq."id"
        ) sub WHERE rn = 1
        GROUP BY sub."student_id"
      ) l ON l."student_id" = u."id"
      LEFT JOIN (
        SELECT sub."student_id", SUM(sub."total_marks") as "quiz_score", SUM(sub."max_marks") as "quiz_max" FROM (
          SELECT sqs."student_id", sqs."total_marks", qz."total_marks" as "max_marks",
                 ROW_NUMBER() OVER(PARTITION BY sqs."student_id", sqs."quiz_id" ORDER BY sqs."submitted_at" DESC) as rn
          FROM "StudentQuizSubmissions" sqs
          JOIN "Quizzes" qz ON sqs."quiz_id" = qz."id"
        ) sub WHERE rn = 1
        GROUP BY sub."student_id"
      ) q ON q."student_id" = u."id"
      WHERE u."role" = 'student' AND u."is_active" = true
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

    res.json(leaderboardData);
  } catch (err) {
    console.error('Leaderboard error:', err.message);
    res.status(500).json({ error: 'Failed to fetch leaderboard', detail: err.message });
  }
});

module.exports = router;
