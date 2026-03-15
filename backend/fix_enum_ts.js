require('dotenv').config();
const { sequelize } = require('./config/db');

async function fixEnum() {
  try {
    console.log('Attempting to add "vsc" to enum_TeacherSubjects_type...');
    await sequelize.query('ALTER TYPE "enum_TeacherSubjects_type" ADD VALUE IF NOT EXISTS \'vsc\'');
    console.log('Successfully updated enum Type.');
  } catch (err) {
    if (err.message.includes('already exists')) {
        console.log('Value "vsc" already exists.');
    } else {
        console.error('Error updating enum:', err.message);
    }
  } finally {
    process.exit();
  }
}

fixEnum();
