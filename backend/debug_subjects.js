require('dotenv').config();
const { sequelize } = require('./config/db');

async function test() {
  try {
    // Find Anita Sharma's ID
    const users = await sequelize.query("SELECT id, name FROM \"Users\" WHERE name LIKE '%Anita%'", { type: sequelize.QueryTypes.SELECT });
    console.log('Teacher:', users);
    if (!users[0]) { console.log('No teacher found'); return; }
    const tid = users[0].id;

    // Test the full query with casts
    const rows = await sequelize.query(`
      SELECT DISTINCT s.id as subject_id, s.name as subject_name, s.type, c.id as class_id, c.name as class_name
      FROM "Subjects" s
      LEFT JOIN "Classes" c ON s.course_id = c.course_id AND s.year::text = c.year::text
      WHERE s.id IN (
        SELECT subject_id FROM "TeacherSubjects" WHERE teacher_id = ${tid}
        UNION
        SELECT subject_id FROM "LabSlots" WHERE teacher_id = ${tid} AND subject_id IS NOT NULL
        UNION
        SELECT ml.subject_id FROM "MinorLabSlots" mls JOIN "MinorLabs" ml ON mls.minor_lab_id = ml.id WHERE mls.teacher_id = ${tid}
      )
      AND (
        EXISTS (SELECT 1 FROM "TeacherSubjects" ts WHERE ts.teacher_id = ${tid} AND ts.subject_id = s.id AND (ts.class_id = c.id OR ts.class_id IS NULL))
        OR
        EXISTS (SELECT 1 FROM "LabSlots" ls JOIN "Labs" l ON ls.lab_id = l.id WHERE ls.teacher_id = ${tid} AND ls.subject_id = s.id AND l.class_id = c.id)
        OR
        s.type = 'minor'
      )
      ORDER BY s.type, s.name
    `, { type: sequelize.QueryTypes.SELECT });
    console.log('Subjects result:', JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    process.exit();
  }
}

test();
