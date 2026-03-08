require('dotenv').config();
const { sequelize, Quiz } = require('./models/postgres');
const fs = require('fs');

sequelize.authenticate().then(async () => {
  const qs = await Quiz.findAll({ where: { title: 'MongoDB Advanced Concepts' } });
  fs.writeFileSync('mongo_check.txt', 'Mongo quizzes count: ' + qs.length + '\n');
  process.exit();
}).catch(console.error);
