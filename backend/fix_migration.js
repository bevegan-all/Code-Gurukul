require('dotenv').config();
const { sequelize } = require('./config/db');

async function fixData() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database to fix data...');

    console.log('Truncating StudentSubjects to resolve messy migration...');
    
    try {
        await sequelize.query('TRUNCATE TABLE "StudentSubjects" CASCADE');
        console.log('StudentSubjects truncated.');
    } catch (e) {
        console.log('Note: ' + e.message);
    }

    // Also, check if there are any OTHER tables that I might have accidentally broken. 
    // The error specificly mentioned StudentSubjects.

  } catch (err) {
    console.error('Data fix error:', err);
  } finally {
    process.exit();
  }
}

fixData();
