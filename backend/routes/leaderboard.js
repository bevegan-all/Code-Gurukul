const express = require('express');
const router = express.Router();
const { sequelize } = require('../models/postgres');

// @route   GET /api/leaderboard
router.get('/', async (req, res) => {
  try {
    const { departmentId, courseId, classId, subjectId, taskType = 'both', sortBy = 'accuracy' } = req.query;

    let labSubFilter = '';
    let quizSubFilter = '';
    const replacements = { taskType, sortBy };

    if (departmentId) {
      labSubFilter += ' AND d.id = :departmentId';
      quizSubFilter += ' AND qz.department_id = :departmentId'; // Assuming Quizzes has department_id or join it
      replacements.departmentId = departmentId;
    }
    if (courseId) {
      labSubFilter += ' AND co.id = :courseId';
      quizSubFilter += ' AND qz.course_id = :courseId';
      replacements.courseId = courseId;
    }
    if (classId && classId !== 'default') {
      labSubFilter += ' AND la.class_id = :classId';
      quizSubFilter += ' AND qz.class_id = :classId';
      replacements.classId = classId;
    }
    if (subjectId) {
      labSubFilter += ' AND la.subject_id = :subjectId';
      quizSubFilter += ' AND qz.subject_id = :subjectId';
      replacements.subjectId = subjectId;
    }

    const query = `
      SELECT 
        u.id as student_id, u.name as student_name, sp.roll_no, u.profile_image,
        c.name as class_name, co.name as course_name, d.name as department_name,
        MD5(LOWER(TRIM(u.email))) as gravatar_hash,
        
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
      JOIN "StudentProfiles" sp ON u.id = sp.user_id
      LEFT JOIN "Classes" c ON sp.class_id = c.id
      LEFT JOIN "Courses" co ON c.course_id = co.id
      LEFT JOIN "Departments" d ON co.department_id = d.id
      
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

      WHERE u."role" = 'student' AND u."is_active" = true
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
        u.name ASC
      LIMIT 100;
    `;

    const leaderboard = await sequelize.query(query, { replacements, type: sequelize.QueryTypes.SELECT });
    res.json(leaderboard);
  } catch (err) {
    console.error("Leaderboard Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
