require('dotenv').config();
const { User, TeacherSubject, Subject, Class } = require('./models/postgres');

async function debug() {
  try {
    const teachers = await User.findAll({ where: { role: 'teacher' }});
    console.log("Teachers in DB:");
    teachers.forEach(t => console.log(`ID: ${t.id}, Name: ${t.name}, Email: ${t.email}`));

    const assignments = await TeacherSubject.findAll({
      include: [
        { model: Subject, attributes: ['name'] },
        { model: Class, attributes: ['name'] }
      ]
    });
    console.log("\nAssigned Subjects in DB:");
    assignments.forEach(a => console.log(`Teacher ID: ${a.teacher_id}, Subject: ${a.Subject?.name}, Class: ${a.Class?.name}, Level: ${a.level}`));
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
debug();
