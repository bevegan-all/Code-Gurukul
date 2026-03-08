const fs = require('fs');
let out = "Starting script\n";
require('dotenv').config();
out += "Loaded dotenv\n";
const { sequelize, Quiz, QuizQuestion, QuizOption } = require('./models/postgres');

async function test() {
  try {
    out += "Authenticating DB...\n";
    await sequelize.authenticate();
    out += "DB authenticated. Fetching quiz...\n";
    
    // We can also just count
    const qs = await QuizOption.count();
    out += "Total QuizOptions in DB: " + qs + "\n";
    
    const quiz = await Quiz.findOne({
      order: [['id', 'DESC']],
      include: [
        {
          model: QuizQuestion,
          include: [{ model: QuizOption }]
        }
      ]
    });
    out += "Quiz fetched: " + (quiz ? quiz.title : 'None') + "\n";
    if (quiz) {
      out += JSON.stringify(quiz.QuizQuestions, null, 2) + "\n";
    }
  } catch(e) { 
    out += "ERROR -> " + e.stack + "\n";
  }
  fs.writeFileSync('out3.txt', out);
}
test().then(() => { process.exit(); });
