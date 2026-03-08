const fs = require('fs');
require('dotenv').config();
const { sequelize, Quiz } = require('./models/postgres');

sequelize.authenticate().then(async () => {
  const quizzes = await Quiz.findAll();
  const res = JSON.stringify(quizzes.map(q => ({id: q.id, title: q.title})), null, 2);
  fs.writeFileSync('quizzes_list.txt', res);
  process.exit();
});
