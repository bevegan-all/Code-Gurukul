require('dotenv').config();
const { sequelize } = require('./config/db');

async function addSubjectIdColumn() {
  try {
    console.log('Attempting to add "subject_id" column to "LabSlots"...');
    await sequelize.query('ALTER TABLE "LabSlots" ADD COLUMN IF NOT EXISTS "subject_id" INTEGER');
    
    // Also check for teacher_id just in case
    await sequelize.query('ALTER TABLE "LabSlots" ADD COLUMN IF NOT EXISTS "teacher_id" INTEGER');
    
    console.log('Successfully updated LabSlots table.');
  } catch (err) {
    console.error('Error updating LabSlots:', err.message);
  } finally {
    process.exit();
  }
}

addSubjectIdColumn();
