const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const emailService = require('./emailService');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY_1 || process.env.GEMINI_KEY || 'fake_key');

async function generateAIReportSummary(studentData, academicStats, attendanceStats) {
  try {
    const academicSummary = academicStats.map(a => `${a.subject_name}: Assignments ${Number(a.assignment_accuracy || 0).toFixed(1)}% Accuracy, Quizzes ${Number(a.quiz_accuracy || 0).toFixed(1)}% Accuracy`).join('; ');
    const attendanceSummary = attendanceStats.map(a => `${a.subject_name}: ${a.present}/${a.total}`).join(', ');
    
    const prompt = `
      You are an expert academic evaluator for MIT ACSC College. 
      Analyze the student's performance across different subjects and write a concise evaluation (max 10 lines).
      
      Student Name: ${studentData.name}
      Academic Scores: ${academicSummary}
      Attendance Record: ${attendanceSummary}
      
      Please:
      1. Summarize their current academic standing.
      2. Identify strengths or weaknesses.
      3. Provide specific suggestions for improvement.
      
      Guidelines:
      - Be encouraging but professional.
      - Keep it under 10 lines.
      - Do NOT use markdown formatting (like ** or #). Just plain text.
    `;
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.error("AI Report Generation Error:", err);
    return "The student is showing consistent participation. We recommend continuing focus on practical labs to further improve overall performance.";
  }
}

async function sendStudentReport(studentId, parentEmail, studentData, academicStats, attendanceStats, teacherName) {
  // Generate AI Summary
  const summary = await generateAIReportSummary(studentData, academicStats, attendanceStats);

  // Generate PDF
  const doc = new PDFDocument({ margin: 50 });
  const reportPath = path.join(__dirname, '..', 'reports', `Report_${studentId}_${Date.now()}.pdf`);
  
  // Ensure dir exists
  if (!fs.existsSync(path.join(__dirname, '..', 'reports'))) {
    fs.mkdirSync(path.join(__dirname, '..', 'reports'));
  }

  const writeStream = fs.createWriteStream(reportPath);
  doc.pipe(writeStream);

  const logoPath = path.join(__dirname, '..', 'public', 'mit_acsc_logo.png');
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, (doc.page.width - 400) / 2, 40, { width: 400 });
    doc.moveDown(6); 
  } else {
    doc.fontSize(20).fillColor('#8b1832').text('MIT Arts, Commerce and Science College', { align: 'center' });
    doc.moveDown(3);
  }

  doc.fontSize(18).fillColor('#8b1832').font('Helvetica-Bold').text('Student Performance Report', { align: 'center' });
  doc.moveDown(2);

  const startX = 50;
  let currentY = doc.y;

  doc.rect(startX, currentY, 512, 80).fillOpacity(0.05).fillAndStroke('#8b1832', '#8b1832');
  doc.fillOpacity(1);
  doc.fillColor('#000000');
  
  doc.fontSize(11).font('Helvetica-Bold').text('Student Name:', startX + 20, currentY + 20);
  doc.font('Helvetica').text(studentData.name, startX + 110, currentY + 20);
  
  doc.font('Helvetica-Bold').text('Roll No:', startX + 280, currentY + 20);
  doc.font('Helvetica').text(studentData.roll_no || 'N/A', startX + 350, currentY + 20);

  doc.font('Helvetica-Bold').text('Class:', startX + 20, currentY + 50);
  doc.font('Helvetica').text(studentData.class_name || 'N/A', startX + 110, currentY + 50);

  doc.font('Helvetica-Bold').text('Teacher:', startX + 280, currentY + 50);
  doc.font('Helvetica').text(teacherName || 'Instructor', startX + 350, currentY + 50);
  
  doc.moveDown(3);
  currentY = doc.y;

  // Academic Performance Table
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#8b1832').text('Academic Performance', startX, currentY);
  doc.moveDown(1);
  currentY = doc.y;

  doc.rect(startX, currentY, 512, 25).fill('#8b1832');
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11);
  doc.text('Subject Name', startX + 20, currentY + 7);
  doc.text('Assignments', startX + 250, currentY + 7);
  doc.text('Quizzes', startX + 380, currentY + 7);

  academicStats.forEach((stat) => {
    currentY += 25;
    doc.rect(startX, currentY, 512, 25).stroke('#e5e7eb');
    doc.fillColor('#374151').font('Helvetica').fontSize(10);
    doc.text(stat.subject_name, startX + 20, currentY + 8);
    doc.text(`${Number(stat.assignment_accuracy || 0).toFixed(1)}%`, startX + 250, currentY + 8);
    doc.text(`${Number(stat.quiz_accuracy || 0).toFixed(1)}%`, startX + 380, currentY + 8);
  });

  doc.moveDown(3);
  currentY = doc.y;

  // Attendance Statistics Table
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#8b1832').text('Attendance Statistics', startX, currentY);
  doc.moveDown(1);
  currentY = doc.y;

  doc.rect(startX, currentY, 512, 25).fill('#8b1832');
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11);
  doc.text('Subject & Mode', startX + 20, currentY + 7);
  doc.text('Present / Total', startX + 330, currentY + 7);
  doc.text('Percentage', startX + 430, currentY + 7);

  attendanceStats.forEach((att) => {
    currentY += 25;
    doc.rect(startX, currentY, 512, 25).stroke('#e5e7eb');
    doc.fillColor('#374151').font('Helvetica').fontSize(10);
    doc.text(`${att.subject_name} (${att.lab_name})`, startX + 20, currentY + 8);
    doc.text(`${att.present} / ${att.total}`, startX + 330, currentY + 8);
    const perc = Math.round((att.present / (att.total || 1)) * 100);
    doc.text(`${perc}%`, startX + 430, currentY + 8);
  });

  doc.moveDown(4);
  currentY = doc.y;

  doc.fontSize(14).font('Helvetica-Bold').fillColor('#8b1832').text('AI Evaluator Feedback', startX, currentY);
  doc.moveDown(1);
  currentY = doc.y;
  
  doc.rect(startX, currentY, 512, 120).fillOpacity(0.05).fillAndStroke('#8b1832', '#8b1832');
  doc.fillOpacity(1);
  doc.fillColor('#000000').fontSize(11).font('Helvetica');
  doc.text(summary, startX + 20, currentY + 20, {
    width: 470,
    align: 'justify',
    lineGap: 4
  });

  doc.end();

  // Wait for the PDF to finish writing
  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });

  // Send Email
  await emailService.sendEmail(
    parentEmail,
    `Student Report: ${studentData.name}`,
    `<p>Dear Parent,</p><p>Please find attached the performance report for <b>${studentData.name}</b> generated by CodeGurukul AI.</p><p>Best Regards,<br/>CodeGurukul Team</p>`,
    [
      {
        filename: 'Student_Report.pdf',
        path: reportPath
      }
    ]
  );

  return { summary, reportPath };
}

module.exports = {
  sendStudentReport
};
