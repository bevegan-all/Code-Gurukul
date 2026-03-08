require('dotenv').config();
const { sequelize } = require('./models/postgres');
const fs = require('fs');

async function test() {
  try {
    const res = await sequelize.query(`
      SELECT q.id, q.title, q.time_limit_minutes, q.created_at, 
             q.subject_id,
             (CASE WHEN sqs.quiz_id IS NOT NULL THEN true ELSE false END) as is_attempted,
             sqs.total_marks
      FROM "Quizzes" q
      LEFT JOIN (
        SELECT DISTINCT ON (quiz_id) quiz_id, total_marks 
        FROM "StudentQuizSubmissions" 
        WHERE student_id = 9
        ORDER BY quiz_id, submitted_at DESC
      ) sqs ON sqs.quiz_id = q.id
    `, { type: sequelize.QueryTypes.SELECT });
    fs.writeFileSync('test_db_out.txt', JSON.stringify(res, null, 2));
  } catch(e) {
    fs.writeFileSync('test_db_out.txt', e.message);
  }
  process.exit(0);
}

test();
