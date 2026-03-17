require('dotenv').config({ path: './.env' });
const { Attendance, sequelize } = require('./models/postgres');

async function test() {
  try {
    const records = [{
      student_id: 1, teacher_id: 1, subject_id: 1,
      lab_id: null, minor_lab_id: null, date: '2026-03-17', status: 'present'
    }];
    await Attendance.bulkCreate(records);
    console.log("SUCCESS");
  } catch (e) {
    console.log("FAILED:", e.message);
  } finally {
    process.exit();
  }
}
test();
