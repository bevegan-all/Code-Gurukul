require('dotenv').config();
const { sequelize, User, StudentProfile, Class, Subject, StudentSubject } = require('./models/postgres');
const { Op } = require('sequelize');

async function debugStudent() {
  const t = await sequelize.transaction();
  try {
    console.log('Transaction started.');
    const cls = await Class.findOne({ transaction: t });
    
    // Hardcoded dummy values
    const dt = Date.now();
    const email = 'debug' + dt + '@test.com';
    const roll = 'DGB' + dt;
    
    console.log('Creating User...');
    const user = await User.create({
        name: 'Debug',
        email: email,
        password_hash: '123',
        role: 'student'
    }, { transaction: t });
    
    console.log('User created:', user.id);
    
    console.log('Creating Profile...');
    await StudentProfile.create({
        user_id: user.id,
        class_id: cls.id,
        roll_no: roll
    }, { transaction: t });
    
    console.log('Profile created.');
    
    const majorSubjects = await Subject.findAll({ 
       where: { course_id: cls.course_id, type: { [Op.or]: ['major', 'vsc'] } }, 
       transaction: t 
    });
    console.log('Subjects found:', majorSubjects.map(s => s.id));
    
    for (const sub of majorSubjects) {
       console.log('Creating StudentSubject for subject:', sub.id);
       await StudentSubject.create({ student_id: user.id, subject_id: sub.id }, { transaction: t });
       console.log('Created.');
    }
    
    console.log('Committing...');
    await t.commit();
    console.log('Complete!');
  } catch (e) {
    if (t) await t.rollback();
    console.log('--- ERROR CATCHED ---');
    console.log(e.name);
    console.log(e.message);
    if (e.original) console.log(e.original.message);
  }
}

debugStudent();
