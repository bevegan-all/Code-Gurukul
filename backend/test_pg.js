require('dotenv').config();
const { Sequelize } = require('sequelize');

async function test() {
  try {
    const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/codegurukul', {
      dialect: 'postgres',
      logging: false,
    });
    
    await sequelize.authenticate();
    console.log('Connected to pg');
    
    const [quizzes] = await sequelize.query(`SELECT * FROM "Quizzes"`);
    console.log('Total quizzes:', quizzes.length);
    console.log(quizzes);
  } catch(e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}
test();
