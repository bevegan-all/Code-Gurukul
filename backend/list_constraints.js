require('dotenv').config();
const { sequelize } = require('./models/postgres');

async function listAllConstraints() {
  try {
    const [results] = await sequelize.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints 
      WHERE table_name = 'StudentSubjects';
    `);
    console.log('CONSTRAINTS:', results.map(r => r.constraint_name).join(' | '));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

listAllConstraints();
