const { Department, Course, Class, Subject } = require('./backend/models/postgres');
const { sequelize } = require('./backend/config/db');

async function check() {
  try {
    await sequelize.authenticate();
    const depts = await Department.count();
    const courses = await Course.count();
    const classes = await Class.count();
    const subjects = await Subject.count();
    console.log({ depts, courses, classes, subjects });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
