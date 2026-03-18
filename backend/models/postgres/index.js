const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

// --- 1. Users ---
const User = sequelize.define('User', {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  phone: { type: DataTypes.STRING, allowNull: true },
  password_hash: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('admin', 'teacher', 'student'), allowNull: false },
  is_blind: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  profile_image: { type: DataTypes.STRING, allowNull: true },
  department_id: { type: DataTypes.INTEGER, allowNull: true }
}, { timestamps: true, createdAt: 'created_at', updatedAt: false });

// --- 2. Departments ---
const Department = sequelize.define('Department', {
  name: { type: DataTypes.STRING, allowNull: false, unique: true }
}, { timestamps: true, createdAt: 'created_at', updatedAt: false });

// --- 3. Courses ---
const Course = sequelize.define('Course', {
  name: { type: DataTypes.STRING, allowNull: false }
}, { timestamps: true, createdAt: 'created_at', updatedAt: false });

// --- 4. Classes ---
const Class = sequelize.define('Class', {
  name: { type: DataTypes.STRING, allowNull: false },
  year: { type: DataTypes.ENUM('FY', 'SY', 'TY', 'LY'), allowNull: false },
  division: { type: DataTypes.STRING, allowNull: false },
  roll_no_prefix: { type: DataTypes.STRING, allowNull: true }
}, { timestamps: true, createdAt: 'created_at', updatedAt: false });

// --- 4a. Labs ---
const Lab = sequelize.define('Lab', {
  name: { type: DataTypes.STRING, allowNull: false },
  roll_from: { type: DataTypes.STRING, allowNull: false },
  roll_to: { type: DataTypes.STRING, allowNull: false }
}, { timestamps: true, createdAt: 'created_at', updatedAt: false });

// --- 4b. LabSlots ---
const LabSlot = sequelize.define('LabSlot', {
  day: { type: DataTypes.ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'), allowNull: false },
  start_time: { type: DataTypes.TIME, allowNull: false },
  end_time: { type: DataTypes.TIME, allowNull: false },
  lab_id: { type: DataTypes.INTEGER, allowNull: false },
  teacher_id: { type: DataTypes.INTEGER, allowNull: true },
  subject_id: { type: DataTypes.INTEGER, allowNull: true },
  is_unrestricted: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { timestamps: false });

// --- 5. Subjects ---
const Subject = sequelize.define('Subject', {
  name: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.ENUM('major', 'minor', 'vsc'), allowNull: false },
  year: { type: DataTypes.ENUM('FY', 'SY', 'TY', 'LY'), allowNull: false, defaultValue: 'FY' }
}, { timestamps: true, createdAt: 'created_at', updatedAt: false });

// --- 5a. MinorLabs ---
const MinorLab = sequelize.define('MinorLab', {
  name: { type: DataTypes.STRING, allowNull: false }
}, { timestamps: true, createdAt: 'created_at', updatedAt: false });

// --- 5b. MinorLabSlots ---
const MinorLabSlot = sequelize.define('MinorLabSlot', {
  day: { type: DataTypes.ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'), allowNull: false },
  start_time: { type: DataTypes.TIME, allowNull: false },
  end_time: { type: DataTypes.TIME, allowNull: false },
  is_unrestricted: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { timestamps: false });

// --- 6. TeacherSubjects ---
const TeacherSubject = sequelize.define('TeacherSubject', {
  teacher_id: { type: DataTypes.INTEGER, allowNull: false },
  subject_id: { type: DataTypes.INTEGER, allowNull: false },
  class_id: { type: DataTypes.INTEGER, allowNull: true },  // null for minor subjects
  type: { type: DataTypes.ENUM('major', 'minor', 'vsc'), allowNull: false }
}, { timestamps: true, createdAt: 'created_at', updatedAt: false });

// --- 7. StudentProfiles (Extension of User) ---
const StudentProfile = sequelize.define('StudentProfile', {
  user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  class_id: { type: DataTypes.INTEGER, allowNull: true },
  roll_no: { type: DataTypes.STRING, allowNull: true, unique: true },
  parent_email: { type: DataTypes.STRING, allowNull: true },
  parent_phone: { type: DataTypes.STRING, allowNull: true },
  minor_subject_id: { type: DataTypes.INTEGER, allowNull: true },
  lab_id: { type: DataTypes.INTEGER, allowNull: true },
  minor_lab_id: { type: DataTypes.INTEGER, allowNull: true }
}, { timestamps: true, createdAt: 'created_at', updatedAt: false });

// --- 8. StudentSubjects ---
const StudentSubject = sequelize.define('StudentSubject', {
}, { timestamps: true, createdAt: 'created_at', updatedAt: false });

// --- 9. LabAssignments ---
const LabAssignment = sequelize.define('LabAssignment', {
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  compiler_required: { type: DataTypes.STRING, allowNull: false },
  time_limit_minutes: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.ENUM('draft', 'published'), defaultValue: 'draft' },
  target_labs: { type: DataTypes.JSONB, allowNull: true, defaultValue: null }
}, { timestamps: true, createdAt: 'created_at', updatedAt: false });

// --- 10. AssignmentSets ---
const AssignmentSet = sequelize.define('AssignmentSet', {
  set_name: { type: DataTypes.STRING, allowNull: false }
}, { timestamps: true, createdAt: 'created_at', updatedAt: false });

// --- 11. AssignmentQuestions ---
const AssignmentQuestion = sequelize.define('AssignmentQuestion', {
  question_text: { type: DataTypes.TEXT, allowNull: false },
  expected_code: { type: DataTypes.TEXT, allowNull: false },
  order_index: { type: DataTypes.INTEGER, allowNull: false },
  expected_output: { type: DataTypes.TEXT, allowNull: true },
  max_marks: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 }
}, { timestamps: false });

// --- 12. Quizzes ---
const Quiz = sequelize.define('Quiz', {
  title: { type: DataTypes.STRING, allowNull: false },
  time_limit_minutes: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.ENUM('draft', 'published'), defaultValue: 'draft' },
  total_marks: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
  target_labs: { type: DataTypes.JSONB, allowNull: true, defaultValue: null }
}, { timestamps: true, createdAt: 'created_at', updatedAt: false });

// --- 13. QuizQuestions ---
const QuizQuestion = sequelize.define('QuizQuestion', {
  question_text: { type: DataTypes.TEXT, allowNull: false },
  question_type: { type: DataTypes.ENUM('single', 'multiple'), allowNull: false },
  order_index: { type: DataTypes.INTEGER, allowNull: false }
}, { timestamps: false });

// --- 14. QuizOptions ---
const QuizOption = sequelize.define('QuizOption', {
  option_text: { type: DataTypes.STRING, allowNull: false },
  is_correct: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { timestamps: false });

// --- 15. StudentAssignmentSubmissions ---
const StudentAssignmentSubmission = sequelize.define('StudentAssignmentSubmission', {
  submitted_code: { type: DataTypes.TEXT, allowNull: false },
  ai_marks: { type: DataTypes.DECIMAL(5, 2) },
  chatbot_usage_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  time_taken_seconds: { type: DataTypes.INTEGER },
  teacher_answer_viewed: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { timestamps: true, createdAt: 'submitted_at', updatedAt: false });

// --- 16. StudentQuizSubmissions ---
const StudentQuizSubmission = sequelize.define('StudentQuizSubmission', {
  answers_json: { type: DataTypes.JSONB, allowNull: false },
  total_marks: { type: DataTypes.DECIMAL(5, 2), allowNull: false }
}, { timestamps: true, createdAt: 'submitted_at', updatedAt: false });

// --- 17. LeaderboardEntries ---
const LeaderboardEntry = sequelize.define('LeaderboardEntry', {
  marks: { type: DataTypes.DECIMAL(7, 2), defaultValue: 0 },
  percentage: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  rank: { type: DataTypes.INTEGER }
}, { timestamps: true, createdAt: false, updatedAt: 'updated_at' });

// --- 18. PracticeQuestions ---
const PracticeQuestion = sequelize.define('PracticeQuestion', {
  language: { type: DataTypes.STRING, allowNull: false },
  difficulty: { type: DataTypes.ENUM('easy', 'medium', 'hard'), allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  question_text: { type: DataTypes.TEXT, allowNull: false },
  expected_output_notes: { type: DataTypes.TEXT }
}, { timestamps: true, createdAt: 'created_at', updatedAt: false });

// --- 19. PracticeSubmissions ---
const PracticeSubmission = sequelize.define('PracticeSubmission', {
  submitted_code: { type: DataTypes.TEXT, allowNull: false },
  ai_marks: { type: DataTypes.DECIMAL(5, 2) }
}, { timestamps: true, createdAt: 'submitted_at', updatedAt: false });

// --- 20. OTPRequests ---
const OTPRequest = sequelize.define('OTPRequest', {
  otp_code: { type: DataTypes.STRING, allowNull: false },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  used: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { timestamps: false });

// --- 21. ActivityLogs ---
const ActivityLog = sequelize.define('ActivityLog', {
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  action_type: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  metadata_json: { type: DataTypes.JSONB }
}, { timestamps: true, createdAt: 'timestamp', updatedAt: false });

// --- 22. Attendance ---
const Attendance = sequelize.define('Attendance', {
  date: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.ENUM('present', 'absent'), allowNull: false, defaultValue: 'absent' },
  lab_id: { type: DataTypes.INTEGER, allowNull: true },
  minor_lab_id: { type: DataTypes.INTEGER, allowNull: true },
  subject_id: { type: DataTypes.INTEGER, allowNull: false }
}, { timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

// --- 23. Holiday ---
const Holiday = sequelize.define('Holiday', {
  date: { type: DataTypes.DATEONLY, allowNull: false },
  subject_id: { type: DataTypes.INTEGER, allowNull: false },
  lab_id: { type: DataTypes.INTEGER, allowNull: true },
  minor_lab_id: { type: DataTypes.INTEGER, allowNull: true },
  reason: { type: DataTypes.STRING, allowNull: true, defaultValue: 'Holiday' }
}, { timestamps: true, createdAt: 'created_at', updatedAt: false });

// ================== RELATIONSHIPS ==================

// Admin -> Departments/Practice Questions
Department.belongsTo(User, { as: 'Creator', foreignKey: 'created_by' });
PracticeQuestion.belongsTo(User, { as: 'Creator', foreignKey: 'created_by' });

// Attendance Relationships
User.hasMany(Attendance, { foreignKey: 'student_id', onDelete: 'CASCADE' });
Attendance.belongsTo(User, { foreignKey: 'student_id' });

User.hasMany(Attendance, { as: 'MarkedAttendances', foreignKey: 'teacher_id', onDelete: 'SET NULL' });
Attendance.belongsTo(User, { as: 'Teacher', foreignKey: 'teacher_id' });

Subject.hasMany(Attendance, { foreignKey: 'subject_id', onDelete: 'CASCADE' });
Attendance.belongsTo(Subject, { foreignKey: 'subject_id' });

// Departments <-> Courses
Department.hasMany(Course, { foreignKey: 'department_id', onDelete: 'CASCADE' });
Course.belongsTo(Department, { foreignKey: 'department_id' });

// Courses <-> Classes
Course.hasMany(Class, { foreignKey: 'course_id', onDelete: 'CASCADE' });
Class.belongsTo(Course, { foreignKey: 'course_id' });

// Courses <-> Subjects (Major)
Course.hasMany(Subject, { foreignKey: 'course_id', onDelete: 'CASCADE' });
Subject.belongsTo(Course, { foreignKey: 'course_id' });

// User <-> OTP
User.hasMany(OTPRequest, { foreignKey: 'user_id', onDelete: 'CASCADE' });
OTPRequest.belongsTo(User, { foreignKey: 'user_id' });

// User <-> StudentProfile (Extension of User)
User.hasOne(StudentProfile, { foreignKey: 'user_id', onDelete: 'CASCADE' });
StudentProfile.belongsTo(User, { foreignKey: 'user_id' });

StudentProfile.belongsTo(Class, { foreignKey: 'class_id' });
Class.hasMany(StudentProfile, { foreignKey: 'class_id' });

StudentProfile.belongsTo(Subject, { as: 'MinorSubject', foreignKey: 'minor_subject_id' });

// StudentSubject (Enrolled subjects) now points to User instead of Profile
User.hasMany(StudentSubject, { foreignKey: 'student_id', onDelete: 'CASCADE' });
StudentSubject.belongsTo(User, { foreignKey: 'student_id' });
Subject.hasMany(StudentSubject, { foreignKey: 'subject_id', onDelete: 'CASCADE' });
StudentSubject.belongsTo(Subject, { foreignKey: 'subject_id' });

// Teacher Assignments (TeacherSubjects)
User.hasMany(TeacherSubject, { foreignKey: 'teacher_id', onDelete: 'CASCADE' });
TeacherSubject.belongsTo(User, { foreignKey: 'teacher_id' });

Subject.hasMany(TeacherSubject, { foreignKey: 'subject_id', onDelete: 'CASCADE' });
TeacherSubject.belongsTo(Subject, { foreignKey: 'subject_id' });

Class.hasMany(TeacherSubject, { foreignKey: 'class_id', onDelete: 'CASCADE' });
TeacherSubject.belongsTo(Class, { foreignKey: 'class_id' });

// Lab Assignments
User.hasMany(LabAssignment, { foreignKey: 'teacher_id' });
LabAssignment.belongsTo(User, { foreignKey: 'teacher_id' });

Subject.hasMany(LabAssignment, { foreignKey: 'subject_id' });
LabAssignment.belongsTo(Subject, { foreignKey: 'subject_id' });

Class.hasMany(LabAssignment, { foreignKey: 'class_id' });
LabAssignment.belongsTo(Class, { foreignKey: 'class_id' });

LabAssignment.hasMany(AssignmentSet, { foreignKey: 'assignment_id', onDelete: 'CASCADE' });
AssignmentSet.belongsTo(LabAssignment, { foreignKey: 'assignment_id' });

AssignmentSet.hasMany(AssignmentQuestion, { foreignKey: 'set_id', onDelete: 'CASCADE' });
AssignmentQuestion.belongsTo(AssignmentSet, { foreignKey: 'set_id' });

// Quizzes
User.hasMany(Quiz, { foreignKey: 'teacher_id' });
Quiz.belongsTo(User, { foreignKey: 'teacher_id' });

Subject.hasMany(Quiz, { foreignKey: 'subject_id' });
Quiz.belongsTo(Subject, { foreignKey: 'subject_id' });

Class.hasMany(Quiz, { foreignKey: 'class_id' });
Quiz.belongsTo(Class, { foreignKey: 'class_id' });

Quiz.hasMany(QuizQuestion, { foreignKey: 'quiz_id', onDelete: 'CASCADE' });
QuizQuestion.belongsTo(Quiz, { foreignKey: 'quiz_id' });

QuizQuestion.hasMany(QuizOption, { foreignKey: 'question_id', onDelete: 'CASCADE' });
QuizOption.belongsTo(QuizQuestion, { foreignKey: 'question_id' });

// Submissions
User.hasMany(StudentAssignmentSubmission, { foreignKey: 'student_id', onDelete: 'CASCADE' });
StudentAssignmentSubmission.belongsTo(User, { foreignKey: 'student_id' });

AssignmentQuestion.hasMany(StudentAssignmentSubmission, { foreignKey: 'question_id' });
StudentAssignmentSubmission.belongsTo(AssignmentQuestion, { foreignKey: 'question_id' });

User.hasMany(StudentQuizSubmission, { foreignKey: 'student_id', onDelete: 'CASCADE' });
StudentQuizSubmission.belongsTo(User, { foreignKey: 'student_id' });

Quiz.hasMany(StudentQuizSubmission, { foreignKey: 'quiz_id' });
StudentQuizSubmission.belongsTo(Quiz, { foreignKey: 'quiz_id' });

// Practice Submissions
User.hasMany(PracticeSubmission, { foreignKey: 'student_id', onDelete: 'CASCADE' });
PracticeSubmission.belongsTo(User, { foreignKey: 'student_id' });

PracticeQuestion.hasMany(PracticeSubmission, { foreignKey: 'practice_question_id' });
PracticeSubmission.belongsTo(PracticeQuestion, { foreignKey: 'practice_question_id' });

// Leaderboard
User.hasMany(LeaderboardEntry, { foreignKey: 'student_id', onDelete: 'CASCADE' });
LeaderboardEntry.belongsTo(User, { foreignKey: 'student_id' });

Subject.hasMany(LeaderboardEntry, { foreignKey: 'subject_id' });
LeaderboardEntry.belongsTo(Subject, { foreignKey: 'subject_id' });

LabAssignment.hasMany(LeaderboardEntry, { foreignKey: 'assignment_id' });
LeaderboardEntry.belongsTo(LabAssignment, { foreignKey: 'assignment_id' });

Quiz.hasMany(LeaderboardEntry, { foreignKey: 'quiz_id' });
LeaderboardEntry.belongsTo(Quiz, { foreignKey: 'quiz_id' });

// Activity Logs
User.hasMany(ActivityLog, { foreignKey: 'user_id', onDelete: 'CASCADE' });
ActivityLog.belongsTo(User, { foreignKey: 'user_id' });

// ================== NEW PHASE 1 RELATIONSHIPS ==================

// Department <-> User (teacher department)
Department.hasMany(User, { foreignKey: 'department_id', as: 'Teachers' });
User.belongsTo(Department, { foreignKey: 'department_id', as: 'Department' });

// Class <-> Lab (max 5 labs per class)
Class.hasMany(Lab, { foreignKey: 'class_id', onDelete: 'CASCADE' });
Lab.belongsTo(Class, { foreignKey: 'class_id' });

// Lab <-> LabSlot (timetable entries)
Lab.hasMany(LabSlot, { foreignKey: 'lab_id', onDelete: 'CASCADE' });
LabSlot.belongsTo(Lab, { foreignKey: 'lab_id' });

// LabSlot <-> User (teacher assigned to slot)
User.hasMany(LabSlot, { foreignKey: 'teacher_id' });
LabSlot.belongsTo(User, { foreignKey: 'teacher_id' });

// LabSlot <-> Subject (major subject for the lab)
Subject.hasMany(LabSlot, { foreignKey: 'subject_id' });
LabSlot.belongsTo(Subject, { foreignKey: 'subject_id' });

// Subject <-> MinorLab (minor subject labs)
Subject.hasMany(MinorLab, { foreignKey: 'subject_id', onDelete: 'CASCADE' });
MinorLab.belongsTo(Subject, { foreignKey: 'subject_id' });

// MinorLab <-> MinorLabSlot
MinorLab.hasMany(MinorLabSlot, { foreignKey: 'minor_lab_id', onDelete: 'CASCADE' });
MinorLabSlot.belongsTo(MinorLab, { foreignKey: 'minor_lab_id' });

// MinorLabSlot <-> User (teacher)
User.hasMany(MinorLabSlot, { foreignKey: 'teacher_id' });
MinorLabSlot.belongsTo(User, { foreignKey: 'teacher_id' });

// StudentProfile <-> Lab
Lab.hasMany(StudentProfile, { foreignKey: 'lab_id' });
StudentProfile.belongsTo(Lab, { foreignKey: 'lab_id' });

// StudentProfile <-> MinorLab
MinorLab.hasMany(StudentProfile, { foreignKey: 'minor_lab_id' });
StudentProfile.belongsTo(MinorLab, { foreignKey: 'minor_lab_id' });

// Subject <-> Department (for subject filtering by dept)
Department.hasMany(Subject, { foreignKey: 'department_id' });
Subject.belongsTo(Department, { foreignKey: 'department_id' });

module.exports = {
  sequelize,
  User,
  Department,
  Course,
  Class,
  Subject,
  TeacherSubject,
  StudentProfile,
  StudentSubject,
  LabAssignment,
  AssignmentSet,
  AssignmentQuestion,
  Quiz,
  QuizQuestion,
  QuizOption,
  StudentAssignmentSubmission,
  StudentQuizSubmission,
  LeaderboardEntry,
  PracticeQuestion,
  PracticeSubmission,
  OTPRequest,
  ActivityLog,
  Lab,
  LabSlot,
  MinorLab,
  MinorLabSlot,
  Attendance,
  Holiday
};
