const PDFDocument = require('pdfkit');
const fs = require('fs');

async function testPdf() {
    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream('test_report.pdf');
    doc.pipe(writeStream);
    const summary = "Test summary evaluating student performance based on their previous marks. The student needs to participate more actively in assignments. Quizzes are well managed and the student demonstrates a clear understanding of the principles.";
    const studentData = { name: "John Doe", roll_no: "SE123", class_name: "SE-B" };
    const assignmentData = { avg_marks: 8.5 };
    const quizData = { avg_marks: 9.0 };

    const logoPath = './mit_acsc_logo.png';
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
  
  doc.fontSize(12).font('Helvetica-Bold').text('Student Name:', startX + 20, currentY + 20);
  doc.font('Helvetica').text(studentData.name, startX + 120, currentY + 20);
  
  doc.font('Helvetica-Bold').text('Roll No:', startX + 280, currentY + 20);
  doc.font('Helvetica').text(studentData.roll_no || 'N/A', startX + 350, currentY + 20);

  doc.font('Helvetica-Bold').text('Class:', startX + 20, currentY + 50);
  doc.font('Helvetica').text(studentData.class_name || 'N/A', startX + 120, currentY + 50);
  
  doc.moveDown(3);
  currentY = doc.y;

  doc.fontSize(14).font('Helvetica-Bold').fillColor('#8b1832').text('Academic Performance', startX, currentY);
  doc.moveDown(1);
  currentY = doc.y;

  doc.rect(startX, currentY, 512, 25).fill('#8b1832');
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(12);
  doc.text('Assessment Type', startX + 20, currentY + 7);
  doc.text('Average Score', startX + 300, currentY + 7);

  doc.rect(startX, currentY + 25, 512, 25).stroke('#e5e7eb');
  doc.fillColor('#374151').font('Helvetica').fontSize(12);
  doc.text('Assignments', startX + 20, currentY + 32);
  doc.text(`${Number(assignmentData.avg_marks || 0).toFixed(2)} / 10`, startX + 300, currentY + 32);

  doc.rect(startX, currentY + 50, 512, 25).stroke('#e5e7eb');
  doc.fillColor('#374151').font('Helvetica').fontSize(12);
  doc.text('Quizzes', startX + 20, currentY + 57);
  doc.text(`${Number(quizData.avg_marks || 0).toFixed(2)} / 10`, startX + 300, currentY + 57);

  doc.moveDown(5);
  currentY = doc.y;

  doc.fontSize(14).font('Helvetica-Bold').fillColor('#8b1832').text('AI Evaluator Feedback', startX, currentY);
  doc.moveDown(1);
  currentY = doc.y;
  
  const aiBoxHeight = 120;
  doc.rect(startX, currentY, 512, aiBoxHeight).fillOpacity(0.05).fillAndStroke('#3b82f6', '#93c5fd');
  doc.fillOpacity(1);
  doc.fillColor('#1e3a8a').fontSize(12).font('Helvetica');
  doc.text(summary, startX + 20, currentY + 20, {
    width: 470,
    align: 'justify',
    lineGap: 4
  });

  doc.end();
  console.log("PDF finished");
}
testPdf();
