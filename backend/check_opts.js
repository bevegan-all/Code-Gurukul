require('dotenv').config();
const { sequelize, Quiz, QuizQuestion, QuizOption } = require('./models/postgres');

async function checkOptions() {
  await sequelize.authenticate();
  
  const q = await Quiz.findOne({
    order: [['id', 'DESC']],
    include: [
      {
        model: QuizQuestion,
        include: [{ model: QuizOption }]
      }
    ]
  });
  
  console.log(JSON.stringify(q, null, 2));
  process.exit();
}

checkOptions();
