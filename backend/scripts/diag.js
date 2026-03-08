require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.PG_DATABASE,
  process.env.PG_USER,
  process.env.PG_PASSWORD,
  { host: process.env.PG_HOST, port: process.env.PG_PORT, dialect: 'postgres', logging: false }
);

async function main() {
  await sequelize.authenticate();
  
  // List all tables
  const [tables] = await sequelize.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`);
  console.log('Tables:', tables.map(t => t.tablename).join(', '));
  
  // Count users by role
  const [roles] = await sequelize.query(`SELECT role, COUNT(*) as cnt FROM "Users" GROUP BY role`);
  console.log('User counts:', JSON.stringify(roles));
  
  // Show teachers
  const [teachers] = await sequelize.query(`SELECT id, name, email FROM "Users" WHERE role='teacher'`);
  console.log('Teachers:', JSON.stringify(teachers));
  
  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
