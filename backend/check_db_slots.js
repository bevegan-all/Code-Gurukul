require('dotenv').config();
const { sequelize } = require('./config/db');

async function checkSlots() {
  try {
    const slots = await sequelize.query(`
      SELECT ls.id, ls.day, ls.teacher_id, ls.subject_id, u.name as teacher_name, s.name as subject_name 
      FROM "LabSlots" ls 
      LEFT JOIN "Users" u ON ls.teacher_id = u.id 
      LEFT JOIN "Subjects" s ON ls.subject_id = s.id 
      ORDER BY ls.id DESC
      LIMIT 10
    `, { type: sequelize.QueryTypes.SELECT });
    console.log('Lab Slots with Details:', JSON.stringify(slots, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

checkSlots();
