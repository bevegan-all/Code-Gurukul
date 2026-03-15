require('dotenv').config();
const { sequelize } = require('./models/postgres');

async function testQuery() {
    const [results] = await sequelize.query(`
      SELECT constraint_name, constraint_type, update_rule, delete_rule
      FROM information_schema.table_constraints
      LEFT JOIN information_schema.referential_constraints USING (constraint_name)
      WHERE table_name = 'StudentSubjects';
    `);
    console.log(JSON.stringify(results, null, 2));
    process.exit();
}

testQuery();
