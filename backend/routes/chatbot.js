const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const geminiService = require('../services/geminiService');
const { ChatbotSession } = require('../models/mongo');

router.use(auth);

// @route   POST /api/chatbot/message
// @desc    Send a message to the Gemini chatbot within context
router.post('/message', async (req, res) => {
  try {
    const { session_type, reference_id, message, session_id } = req.body;
    
    // Create or append to a mongo session
    let session;
    if (session_id) {
       session = await ChatbotSession.findById(session_id);
    } 
    
    if (!session) {
       session = new ChatbotSession({
         student_id: req.user.id,
         session_type,
         reference_id,
         messages: [{ role: 'user', content: message }]
       });
    } else {
       session.messages.push({ role: 'user', content: message });
    }

    // Prepare prompt
    const contextPrompt = `
      You are an AI coding tutor in CodeGurukul. 
      Student is currently in mode: ${session_type}. 
      Student asks: ${message}
      
      Respond helpfully but DO NOT provide direct answers to assignments.
    `;
    
    const reply = await geminiService.generateText(contextPrompt);
    
    session.messages.push({ role: 'model', content: reply });
    await session.save();

    res.json({ reply, session_id: session._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Chatbot error', msg: err.message });
  }
});

// @route   GET /api/chatbot/history/:sessionId
// @desc    Get session history
router.get('/history/:sessionId', async (req, res) => {
  try {
    const session = await ChatbotSession.findById(req.params.sessionId);
    if (!session || session.student_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(session.messages);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
