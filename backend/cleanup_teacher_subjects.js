/**
 * Cleanup script: Remove TeacherSubject records that were auto-created
 * by lab slot assignments. These are now tracked exclusively in LabSlots/MinorLabSlots.
 *
 * A TeacherSubject record is "lab-originated" if:
 * - The teacher is assigned to a LabSlot for the same subject+class, AND
 *   the teacher has NO direct subject-teacher assignment to that subject+class
 *   (i.e., it wasn't set via Manage Teachers).
 *
 * Strategy: We keep ALL TeacherSubjects that were set via Manage Teachers.
 * The safest way is: only delete TeacherSubject rows where the teacher has a
 * LabSlot or MinorLabSlot assignment for that subject, AND does NOT have the
 * subject listed in the admin's intended assignments.
 * 
 * Since we can't easily distinguish them, we'll print a report first.
 * For TeacherSubjects where type='vsc': these should always be removed
 * since VSC has no subject teacher.
 */
const { sequelize, TeacherSubject, LabSlot, MinorLabSlot, MinorLab, Lab } = require('./models/postgres');

async function cleanup() {
  try {
    console.log('=== TeacherSubject Cleanup ===\n');

    // 1. Remove all VSC TeacherSubjects (VSC has no subject teacher)
    const vscDeleted = await TeacherSubject.destroy({ where: { type: 'vsc' } });
    console.log(`Removed ${vscDeleted} VSC TeacherSubject record(s). VSC is lab-only.`);

    // 2. Find TeacherSubjects that were created by lab slot auto-assignment
    // These are Major/Minor TS where the SAME teacher+subject+class combo exists in LabSlots
    const [labOriginatedMajor] = await sequelize.query(`
      SELECT ts.id, ts.teacher_id, ts.subject_id, ts.class_id, ts.type
      FROM "TeacherSubjects" ts
      WHERE ts.type = 'major'
        AND EXISTS (
          SELECT 1 FROM "LabSlots" ls
          JOIN "Labs" l ON ls.lab_id = l.id
          WHERE ls.teacher_id = ts.teacher_id
            AND ls.subject_id = ts.subject_id
            AND l.class_id = ts.class_id
        )
    `);
    console.log(`\nFound ${labOriginatedMajor.length} major TeacherSubject(s) that also have a LabSlot assignment:`);
    labOriginatedMajor.forEach(r => console.log(`  - TS id=${r.id} teacher=${r.teacher_id} subject=${r.subject_id} class=${r.class_id}`));

    const [labOriginatedMinor] = await sequelize.query(`
      SELECT ts.id, ts.teacher_id, ts.subject_id, ts.class_id, ts.type
      FROM "TeacherSubjects" ts
      WHERE ts.type = 'minor'
        AND EXISTS (
          SELECT 1 FROM "MinorLabSlots" mls
          JOIN "MinorLabs" ml ON mls.minor_lab_id = ml.id
          WHERE mls.teacher_id = ts.teacher_id
            AND ml.subject_id = ts.subject_id
        )
    `);
    console.log(`\nFound ${labOriginatedMinor.length} minor TeacherSubject(s) that also have a MinorLabSlot assignment:`);
    labOriginatedMinor.forEach(r => console.log(`  - TS id=${r.id} teacher=${r.teacher_id} subject=${r.subject_id}`));

    console.log('\n=== Summary ===');
    console.log('VSC records deleted:', vscDeleted);
    console.log('Major records that overlap with lab slots (NOT auto-deleted, review manually):', labOriginatedMajor.length);
    console.log('Minor records that overlap with lab slots (NOT auto-deleted, review manually):', labOriginatedMinor.length);
    console.log('\nNote: Overlapping records above may be INTENTIONAL (same teacher assigned both as subject teacher AND lab instructor).');
    console.log('From now on, lab slot saves will NOT auto-create TeacherSubject records.');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

cleanup();
