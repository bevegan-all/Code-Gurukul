require('dotenv').config();
const { sequelize } = require('./models/postgres');
const fs = require('fs');
sequelize.authenticate().then(async () => {
  const qs = await sequelize.query('SELECT * FROM "Subjects"', {type: sequelize.QueryTypes.SELECT});
  fs.writeFileSync('subjects.txt', JSON.stringify(qs, null, 2));
  process.exit();
}).catch(console.error);
