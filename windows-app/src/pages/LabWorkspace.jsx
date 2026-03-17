import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Send, Terminal, Cpu, ChevronLeft, ChevronRight, Bot, X, Smile, Meh, Frown, CheckCircle, XCircle, Loader2, Eye, Code, Sparkles, Lock } from 'lucide-react';
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
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState('');
  const [terminalInput, setTerminalInput] = useState('');
  const [graphData, setGraphData] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiFeedback, setAiFeedback] = useState(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [teacherCode, setTeacherCode] = useState('');
  const [showTeacherComparison, setShowTeacherComparison] = useState(false);

  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatbotUsageCount, setChatbotUsageCount] = useState(0);
  const [sessionId, setSessionId] = useState(null);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  // ARIA announcer for terminal: tracks the latest output chunk for NVDA
  const [terminalAnnouncement, setTerminalAnnouncement] = useState('');
  const [announcerKey, setAnnouncerKey] = useState(0);
  const prevTerminalOutputRef = useRef('');

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Announce new terminal output lines to NVDA via a dedicated live region
  useEffect(() => {
    if (!terminalOutput) return;
    const prev = prevTerminalOutputRef.current;
    if (terminalOutput !== prev) {
      // Get only the newly added text
      const newChunk = terminalOutput.startsWith(prev)
        ? terminalOutput.slice(prev.length).trim()
        : terminalOutput.trim();
      if (newChunk) {
        // Announce last 200 chars to not overwhelm NVDA
        setTerminalAnnouncement(newChunk.slice(-200));
        setAnnouncerKey(k => k + 1);
      }
      prevTerminalOutputRef.current = terminalOutput;
    }
  }, [terminalOutput]);

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

    socketRef.current.on('code:graph', (data) => {
      setGraphData(data.data);
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

  // Load submitted code/feedback when question changes
  useEffect(() => {
    if (assignment && assignment.sets[activeSetIndex]?.questions[activeQuestionIndex]) {
      const q = assignment.sets[activeSetIndex].questions[activeQuestionIndex];
      if (q.submitted_code) {
        setCode(q.submitted_code);
      } else {
        setCode('// Write your code here...\n');
      }

      // Show feedback if a graded submission exists
      if (q.is_submitted && q.ai_marks !== null && q.ai_marks !== undefined) {
        setAiFeedback({
          marks: q.ai_marks,
          reason: "Previously graded submission.",
          expected_code: q.expected_code
        });
        setTeacherCode(q.expected_code || '');
        setShowTeacherComparison(false);
      } else {
        setAiFeedback(null);
        setTeacherCode('');
        setShowTeacherComparison(false);
        setChatbotUsageCount(0);
      }
    }
  }, [activeSetIndex, activeQuestionIndex, assignment]);

  const fetchAssignmentDetails = async () => {
    try {
      const res = await api.get(`/student/assignments/${id}`);
      setAssignment(res.data);

      // Auto-set language based on teacher's requirement
      if (res.data.compiler_required) {
        const req = res.data.compiler_required.toLowerCase();
        if (req === 'python') setLanguage('Python');
        else if (req === 'java') setLanguage('Java');
        else if (req === 'cpp') setLanguage('C++');
        else if (req === 'c') setLanguage('C');
        else if (req === 'javascript') setLanguage('Node.js');
        else if (req === 'go') setLanguage('Go');
        else if (req === 'r') setLanguage('R');
        else if (req === 'postgresql') setLanguage('PostgreSQL');
        else if (req === 'mongodb') setLanguage('MongoDB');
        else if (req === 'hbase') setLanguage('HBase');
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
    setGraphData(null);
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

  const handleStop = async () => {
    if (!socketRef.current) return;
    try {
      await api.post('/compiler/stop', {
        socketId: socketRef.current.id
      });
      setIsRunning(false);
      setGraphData(null);
      setTerminalOutput(prev => prev + '\n─── Stopped by user ───');
    } catch (err) {
      console.error('Stop error:', err);
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
        submitted_code: code,
        chatbot_usage_count: chatbotUsageCount
      });

      setAiFeedback(res.data);
      if (res.data.expected_code) {
        setTeacherCode(res.data.expected_code);
      }

      // Update local assignment state so the UI knows it's submitted
      setAssignment(prev => {
        if (!prev) return prev;
        const newSets = [...prev.sets];
        const newQs = [...newSets[activeSetIndex].questions];
        newQs[activeQuestionIndex] = {
          ...newQs[activeQuestionIndex],
          is_submitted: true,
          ai_marks: res.data.marks,
          expected_code: res.data.expected_code,
          submitted_code: code
        };
        newSets[activeSetIndex] = { ...newSets[activeSetIndex], questions: newQs };
        return { ...prev, sets: newSets };
      });

      if (res.data.marks >= 8) {
        triggerConfetti();
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || 'Failed to submit code for grading.';
      setAiFeedback({ error: errMsg });
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
    setChatbotUsageCount(prev => prev + 1);

    try {
      const currentQuestion = assignment?.sets?.[activeSetIndex]?.questions?.[activeQuestionIndex]?.question_text || 'No specific question context.';
      const promptWithContext = `Current Question Context: ${currentQuestion}\n\nCurrent Code:\n\`\`\`${language}\n${code}\n\`\`\`\n\nStudent asks: ${userMessage}`;

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
            aria-label="Go back to assignments dashboard"
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <div>
            <h1 className="font-bold text-sm tracking-wide">{assignment.title}</h1>
            <p className="text-[10px] text-slate-400 font-mono">LAB ENVIRONMENT</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <label htmlFor="lab-lang-select" className="sr-only">Programming language</label>
            <select
              id="lab-lang-select"
              value={language}
              onChange={e => setLanguage(e.target.value)}
              disabled={!!assignment.compiler_required}
              aria-label={assignment.compiler_required ? `Language locked to ${language}` : 'Select programming language'}
              className={`bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs font-mono font-medium focus:ring-1 focus:ring-blue-500 outline-none ${assignment.compiler_required ? 'opacity-60 cursor-not-allowed border-blue-500/30' : ''}`}
            >
              <option value="Python">Python</option>
              <option value="Java">Java</option>
              <option value="C++">C++</option>
              <option value="C">C</option>
              <option value="Node.js">Node.js</option>
              <option value="Go">Go</option>
              <option value="R">R</option>
              <option value="PostgreSQL">PostgreSQL</option>
              <option value="MongoDB">MongoDB</option>
              <option value="HBase">HBase</option>
            </select>
            <div className="flex items-center gap-1.5 mt-1">
              {assignment.compiler_required && (
                <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-tight flex items-center gap-1">
                  <Cpu size={10} /> Locked
                </span>
              )}
              {language === 'Java' && (
                <span className="text-[9px] text-amber-500 font-bold tracking-tight">USE "public class Main"</span>
              )}
            </div>
          </div>

          {isRunning ? (
            <button
              onClick={handleStop}
              aria-label="Stop running code"
              className="bg-red-600 hover:bg-red-500 text-white px-4 py-1.5 rounded-md text-xs tracking-wide font-bold transition-colors flex items-center gap-2"
            >
              <div className="w-2.5 h-2.5 bg-white rounded-sm animate-pulse" aria-hidden="true" /> STOP
            </button>
          ) : (
            <button
              onClick={handleRunCode}
              aria-label="Run code in terminal"
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-1.5 rounded-md text-xs tracking-wide font-bold transition-colors flex items-center gap-2"
            >
              <Play size={14} fill="currentColor" aria-hidden="true" /> RUN CODE
            </button>
          )}

          <button
            onClick={handleSubmitCode}
            disabled={isSubmitting || assignment.sets[activeSetIndex]?.questions[activeQuestionIndex]?.is_submitted}
            aria-label={
              isSubmitting ? 'Submitting code for AI grading, please wait' :
                assignment.sets[activeSetIndex]?.questions[activeQuestionIndex]?.is_submitted
                  ? 'Already submitted — AI grading locked for this question'
                  : 'Submit code for AI grading'
            }
            aria-busy={isSubmitting}
            className={`px-4 py-1.5 rounded-md text-xs tracking-wide font-bold transition-colors flex items-center gap-2 shadow-lg ${assignment.sets[activeSetIndex]?.questions[activeQuestionIndex]?.is_submitted
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700 shadow-none'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
              }`}
          >
            {isSubmitting ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" /> : (
              assignment.sets[activeSetIndex]?.questions[activeQuestionIndex]?.is_submitted ? <Lock size={14} aria-hidden="true" /> : <Send size={14} aria-hidden="true" />
            )}
            {assignment.sets[activeSetIndex]?.questions[activeQuestionIndex]?.is_submitted ? 'ALREADY SUBMITTED' : 'SUBMIT (AI GRADE)'}
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
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide" role="tablist" aria-label="Assignment question sets">
              {assignment.sets.map((set, idx) => (
                <button
                  key={set.id}
                  role="tab"
                  aria-selected={activeSetIndex === idx}
                  aria-label={`${set.set_name} set${activeSetIndex === idx ? ', currently selected' : ''}`}
                  onClick={() => { setActiveSetIndex(idx); setActiveQuestionIndex(0); }}
                  className={`px-3 py-1 text-xs font-bold rounded-full whitespace-nowrap transition-colors border ${activeSetIndex === idx
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white'
                    }`}
                >
                  {set.set_name}
                </button>
              ))}
            </div>

            {/* Question Selector */}
            <div className="flex flex-wrap gap-2" role="group" aria-label="Select question">
              {currentSet?.questions?.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setActiveQuestionIndex(idx)}
                  aria-label={`Question ${idx + 1}${q.is_submitted ? ', submitted' : ', not yet submitted'}${activeQuestionIndex === idx ? ', currently active' : ''}`}
                  aria-pressed={activeQuestionIndex === idx}
                  className={`w-8 h-8 rounded-md text-xs font-bold transition-all border flex items-center justify-center ${activeQuestionIndex === idx
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
                  <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-50" aria-hidden="true">Q{activeQuestionIndex + 1}</div>
                  <h3 className="font-bold text-lg text-white">Problem Statement</h3>
                </div>
                {/* Question text — focusable + live so NVDA reads it on question change */}
                <div
                  role="region"
                  aria-label={`Question ${activeQuestionIndex + 1} problem statement`}
                  aria-live="polite"
                  aria-atomic="true"
                  tabIndex={0}
                  className="prose prose-invert prose-sm focus:outline-2 focus:outline-blue-400 focus:outline-offset-2 rounded"
                >
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
                          <span className="text-3xl font-black text-emerald-400">{parseFloat(aiFeedback.marks)}</span>
                          <span className="text-emerald-500 font-bold">/ 10 Points</span>
                        </div>
                        <p className="text-sm text-emerald-100 leading-relaxed bg-emerald-950/50 p-3 rounded">{aiFeedback.reason}</p>

                        {aiFeedback.expected_code && (
                          <button
                            onClick={() => {
                              setTeacherCode(aiFeedback.expected_code);
                              setShowTeacherComparison(true);
                              setShowAiModal(true);
                            }}
                            aria-label="View teacher's expected solution code side by side"
                            className="mt-4 w-full bg-slate-700/50 hover:bg-slate-700 border border-slate-600 text-slate-200 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/10"
                          >
                            <Eye size={16} className="text-indigo-400" aria-hidden="true" /> View Teacher Solution
                          </button>
                        )}
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
              aria-label={isChatOpen ? 'Close Code Guru chat panel' : 'Open Code Guru AI tutor chat panel'}
              aria-expanded={isChatOpen}
              aria-controls="lab-chat-panel"
              className="w-full bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Bot size={18} aria-hidden="true" /> Ask Code Guru {isChatOpen ? '(Open)' : '(Ctrl+G)'}
            </button>
          </div>
        </div>

        {/* Right Side: Code Editor & Terminal */}
        <div className="flex-1 flex flex-col min-w-0">
          {['PostgreSQL', 'MongoDB', 'HBase'].includes(language) && (
            <div className="bg-indigo-600/20 border-b border-indigo-500/30 px-4 py-2 flex items-center gap-3 shrink-0">
              <Sparkles size={16} className="text-indigo-400 shrink-0" />
              <p className="text-indigo-200 text-xs font-medium">
                <b className="text-white">Note:</b> Write your entire query block below. Commands execute sequentially in the console.
              </p>
            </div>
          )}
          {language === 'Java' && (
            <div className="bg-amber-600/15 border-b border-amber-600/30 px-4 py-1.5 flex items-center gap-2 shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse shrink-0" />
              <span className="text-amber-200 text-[10px] font-black tracking-wider flex items-center gap-1.5 uppercase">
                Notice: Use the <span className="text-white px-1.5 py-0.5 bg-amber-600/40 rounded border border-amber-400/20">Main</span> class ONLY to run code.
              </span>
            </div>
          )}
          <div className="flex-1 relative" role="region" aria-label={`Code editor. Currently writing ${language} code.`}>
            {/* Hidden screen-reader mirror of the code — Tab-navigable fallback for NVDA */}
            <textarea
              readOnly
              value={code}
              aria-label={`Current ${language} code. ${code.split('\n').length} lines. Use the editor below to type.`}
              className="sr-only"
              tabIndex={0}
            />
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
                automaticLayout: true,
                // Enable Monaco's built-in screen reader accessibility mode
                // This creates an internal textarea overlay that NVDA can read
                accessibilitySupport: 'on',
                ariaLabel: `${language} code editor. ${code.split('\n').length} lines of code.`,
              }}
            />

            {/* Graphical Output Modal */}
            <AnimatePresence>
              {graphData && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="absolute bottom-6 right-6 z-20 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
                >
                  <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex justify-between items-center text-slate-800">
                    <span className="text-xs font-bold flex items-center gap-1.5 pointer-events-none">
                      <Cpu size={14} /> Result Diagram
                    </span>
                    <button
                      onClick={() => {
                        setGraphData(null);
                        handleStop();
                      }}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="p-2 bg-white">
                    <img src={graphData} alt="Output Graph" className="w-full h-auto rounded-lg select-none" />
                  </div>
                  <div className="bg-slate-50 p-2 text-[10px] text-slate-500 italic border-t border-slate-200 flex justify-end">
                    Lab assignment output
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-64 bg-[#1e1e1e] border-t border-slate-700 flex flex-col shrink-0">
            <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex justify-between items-center text-xs">
              <span className="text-slate-400 font-mono font-bold flex items-center gap-2">
                <Terminal size={14} aria-hidden="true" /> Output Console (Interactive)
              </span>
              <button onClick={() => { setTerminalOutput(''); prevTerminalOutputRef.current = ''; }} aria-label="Clear terminal output" className="text-slate-500 hover:text-slate-300 hover:underline">Clear</button>
            </div>

            {/* ARIA live announcer — separate from the visible log so NVDA always catches new output */}
            <div
              key={announcerKey}
              role="status"
              aria-live="assertive"
              aria-atomic="true"
              className="sr-only"
            >
              {terminalAnnouncement}
            </div>

            <div
              className="flex-1 overflow-auto p-4 font-mono text-sm bg-[#1e1e1e]"
              role="log"
              aria-live="off"
              aria-label="Code execution output console"
              tabIndex={0}
            >
              <div className="text-emerald-400 whitespace-pre-wrap pb-2">
                {terminalOutput || <span className="text-slate-600 italic">Code execution output will appear here...</span>}
              </div>
              {isRunning && (
                <div className="flex items-center gap-2 text-emerald-400 mt-1">
                  <span aria-hidden="true">&gt;</span>
                  <input
                    type="text"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    onKeyDown={handleTerminalInputSubmit}
                    autoFocus
                    className="flex-1 bg-transparent border-none outline-none text-emerald-400 font-mono text-sm focus:ring-0 p-0"
                    placeholder="Type input and press Enter..."
                    aria-label="Terminal input. Type and press Enter to send to running program."
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
              id="lab-chat-panel"
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="absolute top-0 right-0 h-full w-[400px] bg-slate-800 border-l border-slate-700 shadow-2xl flex flex-col z-40"
              role="complementary"
              aria-label="Code Guru AI tutor chat"
            >
              <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-indigo-900/40">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Bot className="text-indigo-400" aria-hidden="true" /> Code Guru
                </h3>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                  title="Close AI Chat (Ctrl+G)"
                  aria-label="Close Code Guru chat panel"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>

              <div
                className="flex-1 overflow-y-auto p-4 space-y-4"
                role="log"
                aria-live="polite"
                aria-label="Code Guru chat messages"
                aria-atomic="false"
              >
                {chatMessages.length === 0 && (
                  <div className="text-center text-slate-500 mt-10">
                    <Bot size={48} className="mx-auto mb-2 opacity-20" />
                    <p className="font-bold">Ask me anything about your code!</p>
                    <p className="text-xs mt-1">(Hint: I will automatically look at your current code)</p>
                  </div>
                )}
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-xl px-4 py-2 text-sm whitespace-pre-wrap ${msg.role === 'user'
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
                    aria-label="Chat message input. Press Enter to send."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={isChatLoading || !chatInput.trim()}
                    aria-label={isChatLoading ? 'Sending message, please wait' : 'Send message to Code Guru'}
                    aria-busy={isChatLoading}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Send size={18} aria-hidden="true" />
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
              role="dialog"
              aria-modal="true"
              aria-label={showTeacherComparison ? 'Solution Comparison dialog' : 'AI Grading Feedback dialog'}
              aria-live="assertive"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className={`bg-slate-900 border border-slate-700 w-full ${showTeacherComparison ? 'max-w-6xl' : 'max-w-xl'} rounded-3xl shadow-2xl overflow-hidden flex flex-col`}
                style={{ maxHeight: '90vh' }}
              >
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center">
                      <Cpu className="text-indigo-400" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white">
                        {showTeacherComparison ? 'Solution Comparison' : 'AI Grading Feedback'}
                      </h3>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Evaluation Engine v2.0</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowAiModal(false); setShowTeacherComparison(false); }}
                    className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
                    aria-label="Close AI grading feedback dialog"
                  >
                    <X size={24} aria-hidden="true" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700">
                  {isSubmitting ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center">
                      <div className="relative mb-8">
                        <Loader2 size={80} className="text-indigo-500 animate-spin opacity-20" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Bot size={40} className="text-indigo-400 animate-pulse" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">Analyzing Your Code...</h3>
                      <p className="text-slate-400 max-w-sm">Gemini is checking logic, complexity, and educational patterns to give you the best feedback.</p>
                    </div>
                  ) : aiFeedback ? (
                    <div className="space-y-8">
                      {/* Score Section */}
                      {!showTeacherComparison && (
                        <div className="flex flex-col items-center text-center space-y-4 py-4">
                          {!aiFeedback.error && (
                            <div className="relative">
                              <div className={`w-32 h-32 rounded-full flex items-center justify-center border-4 ${Number(aiFeedback.marks) >= 8 ? 'border-emerald-500 bg-emerald-500/10' :
                                  Number(aiFeedback.marks) >= 4 ? 'border-yellow-500 bg-yellow-500/10' :
                                    'border-red-500 bg-red-500/10'
                                }`}>
                                <span className="text-5xl font-black text-white">{parseFloat(aiFeedback.marks)}</span>
                              </div>
                              <div className="absolute -bottom-2 right-0 bg-slate-800 border border-slate-700 px-3 py-1 rounded-full text-xs font-bold text-slate-400">
                                / 10
                              </div>
                            </div>
                          )}

                          {aiFeedback.error ? (
                            <div className="flex flex-col items-center gap-3">
                              <XCircle size={64} className="text-red-500" />
                              <h4 className="text-2xl font-bold text-white">Oops! Submission Failed</h4>
                              <p className="text-red-400 max-w-sm bg-red-500/10 p-4 rounded-xl border border-red-500/20 font-medium">
                                {aiFeedback.error}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <h4 className="text-2xl font-bold text-white uppercase tracking-tight">
                                {Number(aiFeedback.marks) >= 8 ? "Excellent Work!" :
                                  Number(aiFeedback.marks) >= 5 ? "Good Progress!" : "Keep Trying!"}
                              </h4>
                              <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 text-slate-300 text-sm italic leading-relaxed max-w-lg">
                                "{aiFeedback.reason}"
                              </div>
                              {aiFeedback.is_resubmission && (
                                <p className="text-amber-400 text-xs font-bold bg-amber-400/10 inline-block px-4 py-1.5 rounded-full border border-amber-400/20 mt-4">
                                  Resubmission: Previous marks preserved
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Side-by-Side Comparison */}
                      {(showTeacherComparison && teacherCode) && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                          {/* Student Code */}
                          <div className="flex flex-col space-y-3">
                            <div className="flex items-center justify-between px-2">
                              <h5 className="text-slate-400 font-bold text-xs uppercase flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div> Your Submitted Code
                              </h5>
                            </div>
                            <div className="h-[400px] border border-slate-800 rounded-2xl overflow-hidden shadow-inner bg-slate-950">
                              <Editor
                                height="100%"
                                language={language.toLowerCase() === 'c++' ? 'cpp' : language.toLowerCase()}
                                theme="vs-dark"
                                value={code}
                                options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, padding: { top: 16 } }}
                              />
                            </div>
                          </div>

                          {/* Teacher Code */}
                          <div className="flex flex-col space-y-3">
                            <div className="flex items-center justify-between px-2">
                              <h5 className="text-indigo-400 font-bold text-xs uppercase flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div> Teacher's Expected Solution
                              </h5>
                              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 font-bold uppercase">Optimal Solution</span>
                            </div>
                            <div className="h-[400px] border border-indigo-500/30 rounded-2xl overflow-hidden shadow-indigo-900/10 shadow-lg bg-slate-950">
                              <Editor
                                height="100%"
                                language={language.toLowerCase() === 'c++' ? 'cpp' : language.toLowerCase()}
                                theme="vs-dark"
                                value={teacherCode}
                                options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, padding: { top: 16 } }}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {!isSubmitting && !aiFeedback.error && !showTeacherComparison && teacherCode && (
                        <div className="flex justify-center pt-4">
                          <button
                            onClick={() => setShowTeacherComparison(true)}
                            className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-bold text-sm transition-colors group"
                          >
                            <span>See Side-by-Side Comparison</span>
                            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Modal Footer */}
                <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex justify-end gap-3">
                  {!isSubmitting && (
                    <button
                      onClick={() => { setShowAiModal(false); setShowTeacherComparison(false); }}
                      aria-label={showTeacherComparison ? 'Close comparison and return to workspace' : 'Close feedback and continue learning'}
                      className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center gap-2"
                    >
                      <CheckCircle size={18} aria-hidden="true" />
                      {showTeacherComparison ? 'Got It, Thanks!' : 'Continue Learning'}
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
