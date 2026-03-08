require('dotenv').config();
const { sequelize, Quiz, QuizQuestion, QuizOption } = require('./models/postgres');

async function test() {
  try {
    await sequelize.authenticate();
    const quiz = await Quiz.findOne({
      order: [['id', 'DESC']],
      include: [
        {
          model: QuizQuestion,
          include: [{ model: QuizOption }]
        }
      ]
    });
    console.log(JSON.stringify(quiz, null, 2));
  } catch(e) { console.error(e) }
}
test().then(() => process.exit());
