const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const geminiService = require('../services/geminiService');
const { PracticeQuestion, PracticeSubmission, User } = require('../models/postgres');

router.use(auth);

// @route   GET /api/practice/languages
// @desc    Get all distinct languages available for practice
router.get('/languages', async (req, res) => {
  try {
    const questions = await PracticeQuestion.findAll({
      attributes: ['language'],
      group: ['language']
    });
    res.json(questions.map(q => q.language));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/practice/questions
// @desc    Get questions by language and difficulty
router.get('/questions', async (req, res) => {
  try {
    const { language, difficulty } = req.query;
    
    let whereClause = {};
    if (language) whereClause.language = language;
    if (difficulty) whereClause.difficulty = difficulty;

    const questions = await PracticeQuestion.findAll({ where: whereClause });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/practice/submit
// @desc    Submit a practice question solution and get AI graded
router.post('/submit', async (req, res) => {
  try {
    const { practice_question_id, code } = req.body;
    
    const question = await PracticeQuestion.findByPk(practice_question_id);
    if (!question) return res.status(404).json({ error: 'Question not found' });

    // Call Gemini to grade code logic instead of just running it
    const aiResult = await geminiService.gradeAssignment(
      question.expected_output_notes || "A typical exact logic solution for this problem",
      code
    );

    const submission = await PracticeSubmission.create({
      student_id: req.user.id,
      practice_question_id,
      submitted_code: code,
      ai_marks: aiResult.marks
    });

    res.json({
      success: true,
      marks: aiResult.marks,
      reason: aiResult.reason,
      submissionId: submission.id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during submission' });
  }
});

module.exports = router;
