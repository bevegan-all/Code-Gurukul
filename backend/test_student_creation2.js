require('dotenv').config();
const { sequelize, User, StudentProfile, Class, Subject, StudentSubject } = require('./models/postgres');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

async function testCreateStudent() {
  const t = await sequelize.transaction();
  try {
    const classToJoin = await Class.findOne({ transaction: t });
    if (!classToJoin) throw new Error("No class found");
    
    const defaultPassword = 'Student@123';
    const password_hash = 'dummy_hash';
    const email = 'test_student_' + Date.now() + '@example.com';
    const roll_no = 'ROLL_' + Date.now();

    console.log('1. Creating User...');
    const student = await User.create({ 
      name: 'Test Student', email, phone: null, password_hash, role: 'student', is_blind: false 
    }, { transaction: t });
    
    console.log('User created with ID:', student.id);

    console.log('2. Creating StudentProfile...');
    await StudentProfile.create({
      user_id: student.id,
      class_id: classToJoin.id,
      roll_no: roll_no,
      parent_email: 'parent@example.com',
      parent_phone: null,
      minor_subject_id: null,
      lab_id: null,
      minor_lab_id: null
    }, { transaction: t });

    console.log('3. Assigning Subjects...');
    if (classToJoin.course_id) {
      const majorSubjects = await Subject.findAll({ 
        where: { 
          course_id: classToJoin.course_id, 
          type: { [Op.or]: ['major', 'vsc'] } 
        }, 
        transaction: t 
      });
      console.log(`Found ${majorSubjects.length} subjects to assign.`);
      for (const sub of majorSubjects) {
        console.log(`Assigning subject ${sub.id} to student ${student.id}`);
        await StudentSubject.create({ student_id: student.id, subject_id: sub.id }, { transaction: t });
      }
    }

    await t.commit();
    console.log('SUCCESS! Student and subjects created.');
  } catch (err) {
    await t.rollback();
    console.error('ERROR:', err.message);
    if (err.parent || err.original) {
        console.error('Details:', err.parent || err.original);
    }
  } finally {
    console.log('Done script.');
  }
}

testCreateStudent().then(() => {
  setTimeout(() => process.exit(), 1000);
});
