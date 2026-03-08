const fs = require('fs');
let out = "";
require('dotenv').config();
const { sequelize, Quiz, QuizQuestion, QuizOption } = require('./models/postgres');

async function test() {
  try {
    await sequelize.authenticate();
    const quiz = await Quiz.findOne({
      where: {
        id: 4,
        status: 'published'
      },
      include: [
        {
          model: QuizQuestion,
          include: [{ model: QuizOption, attributes: ['id', 'option_text'] }] // don't send is_correct
        }
      ]
    });
    out += JSON.stringify(quiz, null, 2) + "\n";
  } catch(e) { 
    out += "ERROR -> " + e.stack + "\n";
  }
  fs.writeFileSync('out_html_quiz2.txt', out);
}
test().then(() => { process.exit(); });
