require('dotenv').config();
const {sequelize, Quiz, LabAssignment} = require('./models/postgres'); const fs = require('fs');

sequelize.authenticate().then(async () => {
    const qs = await Quiz.findAll();
    const ls = await LabAssignment.findAll();
    const out = "Quizzes:\n" + qs.map(q=>q.title).join('\n') + "\nLabs:\n" + ls.map(l=>l.title).join('\n');
    fs.writeFileSync('out_titles2.txt', out);
    process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
