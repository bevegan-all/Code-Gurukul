require('dotenv').config();
const { sequelize, User } = require('./models/postgres');

async function testDelete() {
    const fs = require('fs');
    const logStream = fs.createWriteStream('test_delete_output.txt');
    sequelize.options.logging = msg => logStream.write(msg + '\n');


  try {
     const student = await User.findOne({ where: { role: 'student' } });
     if (!student) {
         console.log("Not found.");
     } else {
         console.log("Deleting student:", student.id);
         await User.destroy({ where: { id: student.id, role: 'student' } });
         console.log("Deleted");
     }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

testDelete();
