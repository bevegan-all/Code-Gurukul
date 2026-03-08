const fs = require('fs');
require('dotenv').config();
const { sequelize } = require('./models/postgres');

sequelize.authenticate().then(async () => {
    const rows = await sequelize.query(`
      SELECT q.id, q.title, q.time_limit_minutes, q.created_at, 
             q.subject_id, s.name as subject_name, u.name as teacher_name
      FROM "Quizzes" q
      JOIN "Subjects" s ON q.subject_id = s.id
      JOIN "Users" u ON q.teacher_id = u.id
      WHERE q.status = 'published'
      ORDER BY q.created_at DESC
    `, {
      type: sequelize.QueryTypes.SELECT
    });
  const res = JSON.stringify(rows, null, 2);
  fs.writeFileSync('quizzes_query_out.txt', res);
  process.exit();
});
