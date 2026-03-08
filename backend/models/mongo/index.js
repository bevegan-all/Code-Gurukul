const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// 1. Notes Collection
const notesSchema = new Schema({
  teacher_id: { type: Number, required: true },
  subject_id: { type: Number, required: true },
  class_id: { type: Number, default: null },
  title: { type: String, required: true },
  content_html: { type: String, required: true },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// 2. Chatbot Sessions
const chatbotSessionSchema = new Schema({
  student_id: { type: Number, required: true },
  session_type: { type: String, enum: ['assignment', 'quiz', 'free', 'practice', 'free_sandbox', 'lab_coding'], required: true },
  reference_id: { type: Number }, // Quiz ID, Assignment Question ID, etc.
  messages: [{
    role: { type: String, enum: ['user', 'model'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// 3. Student Reports
const studentReportSchema = new Schema({
  student_id: { type: Number, required: true },
  report_html: { type: String, required: true },
  pdf_path: { type: String, required: true },
  ai_summary_paragraph: { type: String }
}, { timestamps: { createdAt: 'generated_at', updatedAt: false } });

// 4. Notifications
const notificationSchema = new Schema({
  user_id: { type: Number, required: true },
  type: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// 5. Idle Alerts
const idleAlertSchema = new Schema({
  teacher_id: { type: Number, required: true },
  student_id: { type: Number, required: true },
  resolved_at: { type: Date }
}, { timestamps: { createdAt: 'detected_at', updatedAt: false } });

module.exports = {
  Note: mongoose.model('Note', notesSchema),
  ChatbotSession: mongoose.model('ChatbotSession', chatbotSessionSchema),
  StudentReport: mongoose.model('StudentReport', studentReportSchema),
  Notification: mongoose.model('Notification', notificationSchema),
  IdleAlert: mongoose.model('IdleAlert', idleAlertSchema)
};
