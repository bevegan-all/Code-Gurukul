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
    let contextPrompt = `You are an AI coding tutor in CodeGurukul named Code Guru.\nStudent is currently in mode: ${session_type}.\n`;
    
    if (session_type === 'lab_coding') {
      contextPrompt += `This is a strict LAB ASSIGNMENT environment. 
      CRITICAL RULE: DO NOT provide direct code answers or complete solutions to the problem under any circumstances.
      Instead, provide hints, explain concepts, ask guiding questions, and help the student debug their existing code.
      If the student asks for the code, explicitly refuse and remind them they must solve it themselves.\n`;
    } else {
      contextPrompt += `This is a FREE PRACTICE environment (Free Sandbox).
      You MAY provide complete code examples, direct answers, and full solutions if the student asks for them.\n`;
    }

    contextPrompt += `\nStudent asks: ${message}`;
    
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
