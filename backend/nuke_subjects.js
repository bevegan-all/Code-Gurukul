require('dotenv').config();
const { sequelize } = require('./models/postgres');

async function nukeAndRebuild() {
  try {
    console.log('Dropping StudentSubjects table...');
    await sequelize.query('DROP TABLE IF EXISTS "StudentSubjects" CASCADE');
    
    console.log('Syncing database to recreate StudentSubjects...');
    // This will only recreate missing tables
    await sequelize.sync();
    
    console.log('Done.');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

nukeAndRebuild();
