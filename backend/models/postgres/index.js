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
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
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
  name: { type: DataTypes.STRING, allowNull: false }
}, { timestamps: true, createdAt: 'created_at', updatedAt: false });

// --- 5. Subjects ---
const Subject = sequelize.define('Subject', {
  name: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.ENUM('major', 'minor'), allowNull: false }
}, { timestamps: true, createdAt: 'created_at', updatedAt: false });

// --- 6. TeacherSubjects ---
const TeacherSubject = sequelize.define('TeacherSubject', {
  teacher_id: { type: DataTypes.INTEGER, allowNull: false },
  subject_id: { type: DataTypes.INTEGER, allowNull: false },
  class_id:   { type: DataTypes.INTEGER, allowNull: true },  // null for minor subjects
  type: { type: DataTypes.ENUM('major', 'minor'), allowNull: false }
}, { timestamps: true, createdAt: 'created_at', updatedAt: false });

// --- 7. StudentProfiles (Extension of User) ---
const StudentProfile = sequelize.define('StudentProfile', {
  roll_no: { type: DataTypes.STRING, allowNull: true, unique: true },
  parent_email: { type: DataTypes.STRING, allowNull: true }
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
  status: { type: DataTypes.ENUM('draft', 'published'), defaultValue: 'draft' }
}, { timestamps: true, createdAt: 'created_at', updatedAt: false });

// --- 10. AssignmentSets ---
const AssignmentSet = sequelize.define('AssignmentSet', {
  set_name: { type: DataTypes.STRING, allowNull: false }
}, { timestamps: true, createdAt: 'created_at', updatedAt: false });

// --- 11. AssignmentQuestions ---
const AssignmentQuestion = sequelize.define('AssignmentQuestion', {
  question_text: { type: DataTypes.TEXT, allowNull: false },
  expected_code: { type: DataTypes.TEXT, allowNull: false },
  order_index: { type: DataTypes.INTEGER, allowNull: false }
}, { timestamps: false });

// --- 12. Quizzes ---
const Quiz = sequelize.define('Quiz', {
  title: { type: DataTypes.STRING, allowNull: false },
  time_limit_minutes: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.ENUM('draft', 'published'), defaultValue: 'draft' }
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
  action_type: { type: DataTypes.STRING, allowNull: false },
  metadata_json: { type: DataTypes.JSONB }
}, { timestamps: true, createdAt: 'timestamp', updatedAt: false });


// ================== RELATIONSHIPS ==================

// Admin -> Departments/Practice Questions
Department.belongsTo(User, { as: 'Creator', foreignKey: 'created_by' });
PracticeQuestion.belongsTo(User, { as: 'Creator', foreignKey: 'created_by' });

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

// Student Profile System
User.hasOne(StudentProfile, { foreignKey: 'user_id', onDelete: 'CASCADE' });
StudentProfile.belongsTo(User, { foreignKey: 'user_id' });

StudentProfile.belongsTo(Class, { foreignKey: 'class_id' });
Class.hasMany(StudentProfile, { foreignKey: 'class_id' });

StudentProfile.belongsTo(Subject, { as: 'MinorSubject', foreignKey: 'minor_subject_id' });

StudentProfile.hasMany(StudentSubject, { foreignKey: 'student_id' });
StudentSubject.belongsTo(StudentProfile, { foreignKey: 'student_id' });
Subject.hasMany(StudentSubject, { foreignKey: 'subject_id' });
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
User.hasMany(StudentAssignmentSubmission, { foreignKey: 'student_id' });
StudentAssignmentSubmission.belongsTo(User, { foreignKey: 'student_id' });

AssignmentQuestion.hasMany(StudentAssignmentSubmission, { foreignKey: 'question_id' });
StudentAssignmentSubmission.belongsTo(AssignmentQuestion, { foreignKey: 'question_id' });

User.hasMany(StudentQuizSubmission, { foreignKey: 'student_id' });
StudentQuizSubmission.belongsTo(User, { foreignKey: 'student_id' });

Quiz.hasMany(StudentQuizSubmission, { foreignKey: 'quiz_id' });
StudentQuizSubmission.belongsTo(Quiz, { foreignKey: 'quiz_id' });

// Practice Submissions
User.hasMany(PracticeSubmission, { foreignKey: 'student_id' });
PracticeSubmission.belongsTo(User, { foreignKey: 'student_id' });

PracticeQuestion.hasMany(PracticeSubmission, { foreignKey: 'practice_question_id' });
PracticeSubmission.belongsTo(PracticeQuestion, { foreignKey: 'practice_question_id' });

// Leaderboard
User.hasMany(LeaderboardEntry, { foreignKey: 'student_id' });
LeaderboardEntry.belongsTo(User, { foreignKey: 'student_id' });

Subject.hasMany(LeaderboardEntry, { foreignKey: 'subject_id' });
LeaderboardEntry.belongsTo(Subject, { foreignKey: 'subject_id' });

LabAssignment.hasMany(LeaderboardEntry, { foreignKey: 'assignment_id' });
LeaderboardEntry.belongsTo(LabAssignment, { foreignKey: 'assignment_id' });

Quiz.hasMany(LeaderboardEntry, { foreignKey: 'quiz_id' });
LeaderboardEntry.belongsTo(Quiz, { foreignKey: 'quiz_id' });

// Activity Logs
User.hasMany(ActivityLog, { foreignKey: 'student_id' });
ActivityLog.belongsTo(User, { foreignKey: 'student_id' });

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
  ActivityLog
};
