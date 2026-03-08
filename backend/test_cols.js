require('dotenv').config();
const {sequelize} = require('./models/postgres');
const fs = require('fs');

sequelize.authenticate().then(async () => {
  let out = '';
  try {
    await sequelize.query(`SELECT student_id, question_id, submitted_at, ai_marks FROM "StudentAssignmentSubmissions" LIMIT 1`);
    out += 'SAS cols ok\n';
    await sequelize.query(`SELECT student_id, quiz_id, submitted_at, total_marks FROM "StudentQuizSubmissions" LIMIT 1`);
    out += 'SQS cols ok\n';
  } catch(e) { out += 'Query fail: ' + e.message; }
  fs.writeFileSync('test_cols_out.txt', out);
  process.exit(0);
});
