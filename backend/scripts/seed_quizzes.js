require('dotenv').config();
const { connectDBs } = require('../config/db');
const { sequelize, User, Class, Subject, Quiz, QuizQuestion, QuizOption } = require('../models/postgres');

async function seedQuizzes() {
  try {
    await connectDBs();
    await sequelize.authenticate();
    console.log('PostgreSQL connected');

    // Get the teacher
    const teacher = await User.findOne({ where: { role: 'teacher' } });
    if (!teacher) {
      console.log('No teacher found');
      return;
    }

    // Get the default class (B.Tech CS Year 1, id: 2 based on previous seed)
    const classObj = await Class.findOne({ where: { name: 'B.Tech CS Year 1' } }) || await Class.findOne();
    if (!classObj) {
      console.log('No class found');
      return;
    }

    // Get subjects for this course/class 
    const subjects = await Subject.findAll({ where: { course_id: classObj.course_id } });
    if (subjects.length === 0) {
      console.log('No subjects found');
      return;
    }

    console.log(`Creating quizzes by Teacher ID: ${teacher.id} for Class ID: ${classObj.id}`);

    // Create 4-5 Quizzes
    const quizzesToCreate = [
      {
        title: "Introduction to HTML/CSS Basics",
        timeLimit: 15,
        subjectIdx: 0,
        questions: [
          {
            text: "Which HTML tag is used for the largest heading?",
            type: "single",
            options: [
              { text: "<h6>", isCorrect: false },
              { text: "<heading>", isCorrect: false },
              { text: "<h1>", isCorrect: true },
              { text: "<head>", isCorrect: false }
            ]
          },
          {
            text: "What does CSS stand for?",
            type: "single",
            options: [
              { text: "Computer Style Sheets", isCorrect: false },
              { text: "Cascading Style Sheets", isCorrect: true },
              { text: "Creative Style System", isCorrect: false }
            ]
          }
        ]
      },
      {
        title: "JavaScript Fundamentals MCQ",
        timeLimit: 20,
        subjectIdx: 0, // Fallback safely if array is small
        questions: [
          {
            text: "Which keyword is used to declare a constant in JavaScript?",
            type: "single",
            options: [
              { text: "var", isCorrect: false },
              { text: "let", isCorrect: false },
              { text: "constant", isCorrect: false },
              { text: "const", isCorrect: true }
            ]
          },
          {
            text: "How do you write 'Hello World' in an alert box?",
            type: "single",
            options: [
              { text: "msgBox('Hello World');", isCorrect: false },
              { text: "alertBox('Hello World');", isCorrect: false },
              { text: "alert('Hello World');", isCorrect: true },
              { text: "msg('Hello World');", isCorrect: false }
            ]
          }
        ]
      },
      {
        title: "Database Querying and SQL",
        timeLimit: 25,
        subjectIdx: 1 % subjects.length,
        questions: [
          {
            text: "Which SQL statement is used to extract data from a database?",
            type: "single",
            options: [
              { text: "EXTRACT", isCorrect: false },
              { text: "SELECT", isCorrect: true },
              { text: "OPEN", isCorrect: false },
              { text: "GET", isCorrect: false }
            ]
          },
          {
            text: "Which SQL clause is used to filter records?",
            type: "single",
            options: [
              { text: "WHERE", isCorrect: true },
              { text: "FILTER", isCorrect: false },
              { text: "HAVING", isCorrect: false },
              { text: "ORDER BY", isCorrect: false }
            ]
          }
        ]
      },
      {
        title: "Data Structures & Algorithms - Arrays",
        timeLimit: 30,
        subjectIdx: 2 % subjects.length,
        questions: [
          {
            text: "What is the time complexity of accessing an element in an array by index?",
            type: "single",
            options: [
              { text: "O(n)", isCorrect: false },
              { text: "O(log n)", isCorrect: false },
              { text: "O(n^2)", isCorrect: false },
              { text: "O(1)", isCorrect: true }
            ]
          },
          {
            text: "Which data structure uses LIFO?",
            type: "single",
            options: [
              { text: "Queue", isCorrect: false },
              { text: "Stack", isCorrect: true },
              { text: "Linked List", isCorrect: false },
              { text: "Tree", isCorrect: false }
            ]
          }
        ]
      },
      {
        title: "Mid-Term Review Quiz",
        timeLimit: 45,
        subjectIdx: 0,
        questions: [
          {
            text: "A completely balanced binary search tree has a height of:",
            type: "single",
            options: [
              { text: "O(1)", isCorrect: false },
              { text: "O(n)", isCorrect: false },
              { text: "O(log n)", isCorrect: true },
              { text: "O(n log n)", isCorrect: false }
            ]
          }
        ]
      }
    ];

    for (const quizData of quizzesToCreate) {
      const subject = subjects[quizData.subjectIdx];

      const quiz = await Quiz.create({
        title: quizData.title,
        time_limit_minutes: quizData.timeLimit,
        status: 'published',
        teacher_id: teacher.id,
        subject_id: subject.id,
        class_id: classObj.id
      });
      console.log(`Created quiz: ${quiz.title}`);

      let orderIdx = 1;
      for (const questionData of quizData.questions) {
        const question = await QuizQuestion.create({
          quiz_id: quiz.id,
          question_text: questionData.text,
          question_type: questionData.type,
          order_index: orderIdx++
        });

        for (const optData of questionData.options) {
          await QuizOption.create({
            question_id: question.id,
            option_text: optData.text,
            is_correct: optData.isCorrect
          });
        }
      }
    }

    console.log('Quizzes seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding quizzes:', error);
    process.exit(1);
  }
}

seedQuizzes();
