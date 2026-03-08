require('dotenv').config();
const { sequelize, User, Class, Subject, Quiz, QuizQuestion, QuizOption, TeacherSubject } = require('./models/postgres');

async function addMongoQuiz() {
  await sequelize.authenticate();
  
  const teacher = await User.findOne({ where: { role: 'teacher' } });
  const classObj = await Class.findOne({ where: { name: 'B.Tech CS Year 1' } });
  const subject = await Subject.findOne({ where: { name: 'Database Technology' } });

  const quiz = await Quiz.create({
    title: "MongoDB Advanced Concepts",
    time_limit_minutes: 20,
    status: 'published',
    teacher_id: teacher.id,
    subject_id: subject.id,
    class_id: classObj.id
  });

  const generateQ = async (text, type, idx, options) => {
    const q = await QuizQuestion.create({
      quiz_id: quiz.id,
      question_text: text,
      question_type: type,
      order_index: idx
    });
    for (const opt of options) {
      await QuizOption.create({
        question_id: q.id,
        option_text: opt.text,
        is_correct: opt.isCorrect
      });
    }
  };

  await generateQ("Which command is used to insert a document in MongoDB?", "single", 1, [
    { text: "db.collection.insert()", isCorrect: true },
    { text: "db.collection.add()", isCorrect: false },
    { text: "db.collection.create()", isCorrect: false }
  ]);

  await generateQ("In MongoDB, what is the default _id field type?", "single", 2, [
    { text: "String", isCorrect: false },
    { text: "ObjectId", isCorrect: true },
    { text: "Number", isCorrect: false }
  ]);

  await generateQ("Which method is used to filter documents in MongoDB?", "single", 3, [
    { text: "db.collection.filter()", isCorrect: false },
    { text: "db.collection.find()", isCorrect: true },
    { text: "db.collection.search()", isCorrect: false }
  ]);

  console.log("MongoDB Quiz added! ID:", quiz.id);
  process.exit(0);
}
addMongoQuiz().catch(console.error);
