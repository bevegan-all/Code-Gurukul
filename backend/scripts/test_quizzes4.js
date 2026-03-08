require('dotenv').config({ path: '../.env' });
const { sequelize, User, StudentProfile } = require('../models/postgres');

async function test() {
  try {
    await sequelize.authenticate();
    
    const profile = await StudentProfile.findOne({ where: { roll_no: 'se33' } }) || await StudentProfile.findOne();
    
    const rows = await sequelize.query(`
        SELECT q.id, q.title, q.time_limit_minutes, q.created_at, 
               q.subject_id, q.class_id, q.status, s.name as subject_name, u.name as teacher_name
        FROM "Quizzes" q
        JOIN "Subjects" s ON q.subject_id = s.id
        JOIN "Users" u ON q.teacher_id = u.id
        ORDER BY q.created_at DESC
      `, {
        type: sequelize.QueryTypes.SELECT
      });
      
    console.log('Class ID:', profile.class_id, 'Minor Sub ID:', profile.minor_subject_id);
    console.log('Quizzes in DB:', JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  }
}

test().then(() => process.exit(0));
