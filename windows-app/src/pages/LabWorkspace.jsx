import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Send, Terminal, Cpu, ChevronLeft, Bot, X, Smile, Meh, Frown, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { io } from 'socket.io-client';
import confetti from 'canvas-confetti';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { SOCKET_URL } from '../config';
import api from '../api';

export default function LabWorkspace() {
  const { id } = useParams(); // Assignment ID
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [activeSetIndex, setActiveSetIndex] = useState(0);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  
  const [code, setCode] = useState('// Write your code here...\n');
  const [language, setLanguage] = useState('Python');
  const [terminalOutput, setTerminalOutput] = useState('');
  const [terminalInput, setTerminalInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiFeedback, setAiFeedback] = useState(null);
  const [showAiModal, setShowAiModal] = useState(false);

  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll chat and Ctrl+G Keyboard Shortcut listener
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle chat on Ctrl+G
      if (e.ctrlKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setIsChatOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    fetchAssignmentDetails();

    // Establish Socket.io connection for realtime terminal streaming
    socketRef.current = io(SOCKET_URL, { transports: ['websocket'], extraHeaders: { 'ngrok-skip-browser-warning': 'true' } });
    socketRef.current.on('connect', () => console.log('Terminal socket connected'));
    
    socketRef.current.on('code:output', (data) => {
      setTerminalOutput(prev => prev + data.data);
    });
    
    socketRef.current.on('code:done', (data) => {
      setTerminalOutput(prev => prev + `\n[Process exited with code ${data.exitCode}]`);
      setIsRunning(false);
    });

    return () => {
      socketRef.current.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchAssignmentDetails = async () => {
    try {
      const res = await api.get(`/student/assignments/${id}`);
      setAssignment(res.data);
      // Determine default language if possible
      if (res.data.compiler_required && res.data.languages) {
        // e.g., if strictly Python
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load assignment details');
      navigate('/app/assignments');
    }
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setTerminalOutput('');
    setTerminalInput('');
    setAiFeedback(null);
    try {
      await api.post('/compiler/run', 
        { 
          code, 
          language, 
          socketId: socketRef.current.id // For streaming
        }
      );
      // Output is streamed via socket, so we don't need to capture response data here
    } catch (err) {
      setTerminalOutput(`[Error]: ${err.response?.data?.error || err.message}`);
      setIsRunning(false);
    }
  };

  const handleTerminalInputSubmit = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!isRunning || !socketRef.current) return;
      
      const val = terminalInput;
      socketRef.current.emit('code:input', { input: val });
      setTerminalOutput(prev => prev + val + '\n');
      setTerminalInput('');
    }
  };

  const handleSubmitCode = async () => {
    if (!assignment || !assignment.sets[activeSetIndex]?.questions[activeQuestionIndex]) return;
    
    const questionId = assignment.sets[activeSetIndex].questions[activeQuestionIndex].id;
    setIsSubmitting(true);
    setAiFeedback(null);
    setShowAiModal(true);

    try {
      const res = await api.post('/student/assignments/submit', {
        assignment_id: parseInt(id),
        question_id: questionId,
        submitted_code: code
      });

      setAiFeedback(res.data);
      
      if (res.data.marks >= 8) {
        triggerConfetti();
      }
    } catch (err) {
      console.error(err);
      setAiFeedback({ error: 'Failed to submit code for grading.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = chatInput.trim();
    // Optimistic UI update
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
       // We package the user's current code together so Gemini has context
       const promptWithContext = `Current Code:\n\`\`\`${language}\n${code}\n\`\`\`\n\nStudent asks: ${userMessage}`;
       
       const res = await api.post('/chatbot/message', {
         session_type: 'lab_coding',
         reference_id: assignment.id, // Or question ID context
         message: promptWithContext,
         session_id: sessionId
       });
       
       // Remember session ID to continue discussion
       setSessionId(res.data.session_id);
       setChatMessages(prev => [...prev, { role: 'model', content: res.data.reply }]);
    } catch (err) {
       console.error(err);
       setChatMessages(prev => [...prev, { role: 'model', content: 'Sorry, I am having trouble connecting to the CodeGurukul AI servers right now.' }]);
    } finally {
       setIsChatLoading(false);
    }
  };

  const triggerConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#2E86C1', '#AED6F1', '#ffffff']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#2E86C1', '#AED6F1', '#ffffff']
      });

      if (Date.now() < end) requestAnimationFrame(frame);
    }());
  };

  if (!assignment) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading Workspace...</div>;

  const currentSet = assignment.sets[activeSetIndex];
  const currentQuestion = currentSet?.questions[activeQuestionIndex];

  return (
    <div className="h-screen w-screen bg-slate-900 flex flex-col overflow-hidden">
      
      {/* Header */}
      <header className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 shrink-0 text-white shadow-md z-10 w-full pr-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/app/assignments')}
            className="p-1.5 hover:bg-slate-700 rounded-md transition-colors"
            title="Back to Dashboard"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="font-bold text-sm tracking-wide">{assignment.title}</h1>
            <p className="text-[10px] text-slate-400 font-mono">LAB ENVIRONMENT</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
            <select 
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs font-mono font-medium focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="Python">Python</option>
              <option value="Java">Java</option>
              <option value="C++">C++</option>
              <option value="C">C</option>
              <option value="Node.js">Node.js</option>
            </select>
            
            <button 
              onClick={handleRunCode}
              disabled={isRunning}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-1.5 rounded-md text-xs tracking-wide font-bold transition-colors flex items-center gap-2"
            >
              {isRunning ? <div className="w-3 h-3 border-2 border-slate-400 border-t-white rounded-full animate-spin"/> : <Play size={14} fill="currentColor" />}
              RUN CODE
            </button>
            
            <button 
              onClick={handleSubmitCode}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-md text-xs tracking-wide font-bold transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20"
            >
              {isSubmitting ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Send size={14} />}
              SUBMIT (AI GRADE)
            </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Side: Questions */}
        <div className="w-[350px] lg:w-[450px] bg-slate-800/50 border-r border-slate-700 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-white font-bold text-lg mb-2">Questions</h2>
            
            {/* Set Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
              {assignment.sets.map((set, idx) => (
                <button
                  key={set.id}
                  onClick={() => { setActiveSetIndex(idx); setActiveQuestionIndex(0); }}
                  className={`px-3 py-1 text-xs font-bold rounded-full whitespace-nowrap transition-colors border ${
                    activeSetIndex === idx 
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' 
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {set.set_name}
                </button>
              ))}
            </div>

            {/* Question Selector */}
            <div className="flex flex-wrap gap-2">
              {currentSet?.questions?.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setActiveQuestionIndex(idx)}
                  className={`w-8 h-8 rounded-md text-xs font-bold transition-all border flex items-center justify-center ${
                    activeQuestionIndex === idx 
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20' 
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 text-slate-300">
            {currentQuestion ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                   <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-50">Q{activeQuestionIndex + 1}</div>
                   <h3 className="font-bold text-lg text-white">Problem Statement</h3>
                </div>
                <div className="prose prose-invert prose-sm">
                  {currentQuestion.question_text.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                </div>

                {/* AI Feedback Box - Renders after submission */}
                {aiFeedback && (
                  <div className={`mt-8 p-4 rounded-lg border ${aiFeedback.error ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                    <div className="flex items-center gap-2 font-bold mb-2">
                      <Cpu size={18} className={aiFeedback.error ? 'text-red-400' : 'text-emerald-400'} /> 
                      <span className={aiFeedback.error ? 'text-red-100' : 'text-emerald-100'}>Gemini AI Evaluation</span>
                    </div>
                    {aiFeedback.error ? (
                      <p className="text-sm text-red-300">{aiFeedback.error}</p>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-2 mb-2">
                           <span className="text-3xl font-black text-emerald-400">{aiFeedback.marks}</span>
                           <span className="text-emerald-500 font-bold">/ 10 Points</span>
                        </div>
                        <p className="text-sm text-emerald-100 leading-relaxed bg-emerald-950/50 p-3 rounded">{aiFeedback.reason}</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-500 text-center mt-10">No questions available in this set.</p>
            )}
          </div>
          
          {/* Chatbot Toggle Button */}
          <div className="p-4 border-t border-slate-700">
             <button 
                onClick={() => setIsChatOpen(!isChatOpen)}
                className="w-full bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
             >
               <Bot size={18} /> Ask Gemini Guru {isChatOpen ? '(Open)' : '(Ctrl+G)'}
             </button>
          </div>
        </div>

        {/* Right Side: Code Editor & Terminal */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 relative">
            <Editor
              height="100%"
              theme="vs-dark"
              language={language.toLowerCase() === 'node.js' ? 'javascript' : language.toLowerCase()}
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 15,
                padding: { top: 16 },
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                roundedSelection: false,
                scrollBeyondLastLine: false,
                mouseWheelZoom: true,
              }}
            />
          </div>

          <div className="h-64 bg-[#1e1e1e] border-t border-slate-700 flex flex-col shrink-0">
            <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex justify-between items-center text-xs">
              <span className="text-slate-400 font-mono font-bold flex items-center gap-2">
                <Terminal size={14} /> Output Console (Interactive)
              </span>
              <button onClick={() => setTerminalOutput('')} className="text-slate-500 hover:text-slate-300 hover:underline">Clear</button>
            </div>
            <div className="flex-1 overflow-auto p-4 font-mono text-sm bg-[#1e1e1e]">
              <div className="text-emerald-400 whitespace-pre-wrap pb-2">
                {terminalOutput || <span className="text-slate-600 italic">Code execution output will appear here...</span>}
              </div>
              {isRunning && (
                <div className="flex items-center gap-2 text-emerald-400 mt-1">
                  <span>&gt;</span>
                  <input
                    type="text"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    onKeyDown={handleTerminalInputSubmit}
                    autoFocus
                    className="flex-1 bg-transparent border-none outline-none text-emerald-400 font-mono text-sm focus:ring-0 p-0"
                    placeholder="Type input and press Enter..."
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating/Sliding Chatbot Overlay Panel */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div 
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="absolute top-0 right-0 h-full w-[400px] bg-slate-800 border-l border-slate-700 shadow-2xl flex flex-col z-40"
            >
              <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-indigo-900/40">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Bot className="text-indigo-400" /> Gemini Guru
                </h3>
                <button 
                  onClick={() => setIsChatOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                  title="Close AI Chat (Ctrl+G)"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                 {chatMessages.length === 0 && (
                   <div className="text-center text-slate-500 mt-10">
                     <Bot size={48} className="mx-auto mb-2 opacity-20" />
                     <p className="font-bold">Ask me anything about your code!</p>
                     <p className="text-xs mt-1">(Hint: I will automatically look at your current code)</p>
                   </div>
                 )}
                 {chatMessages.map((msg, idx) => (
                   <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[85%] rounded-xl px-4 py-2 text-sm whitespace-pre-wrap ${
                       msg.role === 'user' 
                         ? 'bg-blue-600 text-white rounded-br-none' 
                         : 'bg-slate-700 text-slate-200 rounded-bl-none prose prose-sm prose-invert'
                     }`}>
                       {msg.content}
                     </div>
                   </div>
                 ))}
                 
                 {isChatLoading && (
                   <div className="flex justify-start">
                     <div className="bg-slate-700 text-slate-400 px-4 py-2 rounded-xl rounded-bl-none text-sm flex gap-1 items-center">
                       <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></div>
                       <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-75"></div>
                       <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-150"></div>
                     </div>
                   </div>
                 )}
                 <div ref={messagesEndRef} className="h-1" />
              </div>
              
              <div className="p-4 border-t border-slate-700 bg-slate-800">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                  className="flex gap-2"
                >
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask Gemini for help..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button 
                    type="submit" 
                    disabled={isChatLoading || !chatInput.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Evaluation Modal */}
        <AnimatePresence>
          {showAiModal && (
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
            >
               <div className="bg-slate-800 border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl p-6 flex flex-col items-center text-center relative overflow-hidden">
                  <button onClick={() => setShowAiModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
                    <X size={20}/>
                  </button>
                  
                  {isSubmitting ? (
                    <div className="py-8 flex flex-col items-center">
                       <Loader2 size={48} className="text-blue-500 animate-spin mb-4" />
                       <h3 className="text-xl font-bold text-white mb-2">AI Grading in Progress</h3>
                       <p className="text-slate-400 text-sm">Our Gemini AI is analyzing your code, checking edge cases, and calculating your score...</p>
                    </div>
                  ) : aiFeedback ? (
                    <div className="py-4 w-full flex flex-col items-center animate-in zoom-in duration-500">
                       {!aiFeedback.error && Number(aiFeedback.marks) >= 8 && <Smile size={64} className="text-emerald-400 mb-4 animate-bounce" />}
                       {!aiFeedback.error && Number(aiFeedback.marks) >= 4 && Number(aiFeedback.marks) < 8 && <Meh size={64} className="text-yellow-400 mb-4" />}
                       {!aiFeedback.error && Number(aiFeedback.marks) < 4 && <Frown size={64} className="text-red-400 mb-4" />}
                       {aiFeedback.error && <XCircle size={64} className="text-red-500 mb-4" />}
                       
                       <h3 className="text-2xl font-black text-white mb-1">
                          {aiFeedback.error ? "Evaluation Failed" : "Score: " + aiFeedback.marks + " / 10"}
                       </h3>
                       <p className={`text-sm mb-6 ${aiFeedback.error ? 'text-red-400' : 'text-slate-300'}`}>
                          {aiFeedback.error || "Evaluation Complete! Feedback recorded in your progress."}
                       </p>
                       <button onClick={() => setShowAiModal(false)} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-lg transition-colors">
                         Continue Learning
                       </button>
                    </div>
                  ) : null}
               </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
