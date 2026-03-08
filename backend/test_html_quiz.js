const fs = require('fs');
let out = "";
require('dotenv').config();
const { sequelize, Quiz, QuizQuestion, QuizOption } = require('./models/postgres');

async function test() {
  try {
    await sequelize.authenticate();
    const quiz = await Quiz.findOne({
      where: { title: "Introduction to HTML/CSS Basics" },
      include: [
        {
          model: QuizQuestion,
          include: [{ model: QuizOption }]
        }
      ]
    });
    out += JSON.stringify(quiz, null, 2) + "\n";
  } catch(e) { 
    out += "ERROR -> " + e.stack + "\n";
  }
  fs.writeFileSync('out_html_quiz.txt', out);
}
test().then(() => { process.exit(); });
