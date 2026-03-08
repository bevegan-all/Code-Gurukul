const { connectDBs } = require('./config/db');
const { sequelize, User, StudentProfile } = require('./models/postgres');

async function test() {
  await connectDBs();
  
  const profile = await StudentProfile.findOne({ where: { user_id: 9 } });
  
  const rows = await sequelize.query(`
      SELECT q.id, q.title, q.time_limit_minutes, q.created_at, 
             q.subject_id, s.name as subject_name, u.name as teacher_name
      FROM "Quizzes" q
      JOIN "Subjects" s ON q.subject_id = s.id
      JOIN "Users" u ON q.teacher_id = u.id
      WHERE q.status = 'published' AND (
        q.class_id = :cid OR q.subject_id = :msid
      )
      ORDER BY q.created_at DESC
    `, {
      replacements: { cid: profile.class_id, msid: profile.minor_subject_id || 0 },
      type: sequelize.QueryTypes.SELECT
    });
    
  console.log('Quizzes:', rows);
  process.exit(0);
}

test();
