require('dotenv').config({ path: './backend/.env' });
const { Attendance, sequelize } = require('./backend/models/postgres');

async function test() {
  try {
    await sequelize.authenticate();
    const records = [{
      student_id: 1, teacher_id: 1, subject_id: 1,
      lab_id: null, minor_lab_id: null, date: '2026-03-17', status: 'present'
    }];
    await Attendance.bulkCreate(records);
    console.log("SUCCESS");
  } catch (e) {
    console.error("FAILED:", e.message);
    if (e.original) console.error("ORIGINAL:", e.original);
  } finally {
    process.exit();
  }
}
test();
