require('dotenv').config();
const { sequelize, Quiz } = require('./models/postgres');
const fs = require('fs');

sequelize.authenticate().then(async () => {
  const qs = await Quiz.findAll();
  const data = qs.map(q => ({id: q.id, title: q.title, subject: q.subject_id}));
  fs.writeFileSync('all_quizzes_check.txt', JSON.stringify(data, null, 2));
  process.exit(0);
}).catch(console.error);
