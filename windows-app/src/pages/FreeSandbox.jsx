import { useState, useEffect, useRef } from 'react';
import { Play, Send, Terminal, Bot, X, ChevronRight, Code2, Sparkles } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { io } from 'socket.io-client';
import { AnimatePresence, motion } from 'framer-motion';
import { SOCKET_URL } from '../config';
import api from '../api';
import StudentHeader from '../components/StudentHeader';

const LANGUAGES = [
  { label: 'Python 3',     value: 'Python',   monacoLang: 'python',     starter: '# Python 3\nprint("Hello, World!")\n' },
  { label: 'JavaScript',  value: 'Node.js',  monacoLang: 'javascript', starter: '// Node.js\nconsole.log("Hello, World!");\n' },
  { label: 'Java',         value: 'Java',     monacoLang: 'java',       starter: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, World!");\n  }\n}\n' },
  { label: 'C++',          value: 'C++',      monacoLang: 'cpp',        starter: '#include <iostream>\nusing namespace std;\nint main() {\n  cout << "Hello, World!" << endl;\n  return 0;\n}\n' },
  { label: 'C',            value: 'C',        monacoLang: 'c',          starter: '#include <stdio.h>\nint main() {\n  printf("Hello, World!\\n");\n  return 0;\n}\n' },
];

export default function FreeSandbox() {
  const [user] = useState(JSON.parse(localStorage.getItem('user')) || {});
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [code, setCode] = useState(LANGUAGES[0].starter);
  const [output, setOutput] = useState('');
  const [terminalInput, setTerminalInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  // AI Chat
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'model', content: '👋 **Hi! I am Gemini Guru.** I am here to help you in the Free Sandbox. Ask me anything — how to debug your code, explain a concept, or suggest what to try next!' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  const socketRef = useRef(null);
  const outputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    outputRef.current?.scrollTo(0, outputRef.current.scrollHeight);
  }, [output]);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, { transports: ['websocket'] });

    socketRef.current.on('code:output', (data) => {
      setOutput(prev => prev + data.data);
    });

    socketRef.current.on('code:done', (data) => {
      setOutput(prev => prev + `\n─── Process exited with code ${data.exitCode} ───`);
      setIsRunning(false);
    });

    return () => socketRef.current?.disconnect();
  }, []);

  const handleLangChange = (lang) => {
    setSelectedLang(lang);
    setCode(lang.starter);
    setOutput('');
    setTerminalInput('');
  };

  const handleTerminalInputSubmit = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!isRunning || !socketRef.current) return;
      
      const val = terminalInput;
      socketRef.current.emit('code:input', { input: val });
      setOutput(prev => prev + val + '\n');
      setTerminalInput('');
    }
  };

  const handleRun = async () => {
    setIsRunning(true);
    setOutput('');
    try {
      await api.post('/compiler/run', {
        code,
        language: selectedLang.value,
        socketId: socketRef.current.id
      });
    } catch (err) {
      setOutput(`[Error]: ${err.response?.data?.error || err.message}`);
      setIsRunning(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatInput('');
    setIsChatLoading(true);
    try {
      const prompt = `I am using Free Sandbox in ${selectedLang.label}.\nMy current code:\n\`\`\`${selectedLang.monacoLang}\n${code}\n\`\`\`\n\nStudent's question: ${userMsg}`;
      const res = await api.post('/chatbot/message', {
        session_type: 'free_sandbox',
        reference_id: 0,
        message: prompt,
        session_id: sessionId
      });
      setSessionId(res.data.session_id);
      setChatMessages(prev => [...prev, { role: 'model', content: res.data.reply }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'model', content: 'Sorry, I could not connect to Gemini right now. Please try again.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <StudentHeader
        user={user}
        title="Free Sandbox"
        subtitle="Write, run and explore code in any language"
      />

      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: Editor + Terminal */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-slate-900">

          {/* Toolbar */}
          <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center gap-3 shrink-0">
            <Code2 size={18} className="text-indigo-400" />
            <span className="text-slate-400 text-sm font-semibold mr-2">Language:</span>
            <div className="flex gap-1">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.value}
                  onClick={() => handleLangChange(lang)}
                  className={`px-3 py-1 text-xs font-bold rounded-full transition-colors border ${
                    selectedLang.value === lang.value
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-700 text-slate-400 border-slate-600 hover:bg-slate-600 hover:text-white'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setIsChatOpen(o => !o)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 text-xs font-bold transition-colors"
              >
                <Bot size={14} /> Gemini Guru
              </button>
              <button
                onClick={handleRun}
                disabled={isRunning}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
              >
                {isRunning
                  ? <><div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Running...</>
                  : <><Play size={14} fill="currentColor" /> Run Code</>
                }
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              theme="vs-dark"
              language={selectedLang.monacoLang}
              value={code}
              onChange={v => setCode(v || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 15,
                padding: { top: 16 },
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                scrollBeyondLastLine: false,
                mouseWheelZoom: true,
                automaticLayout: true,
              }}
            />
          </div>

          {/* Terminal Output */}
          <div className="h-52 bg-[#1a1a2e] border-t border-slate-700 flex flex-col shrink-0">
            <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex justify-between items-center">
              <span className="text-slate-400 font-mono text-xs font-bold flex items-center gap-1.5">
                <Terminal size={13} /> Output Console (Interactive)
              </span>
              <button onClick={() => setOutput('')} className="text-slate-600 hover:text-slate-400 text-xs hover:underline">
                Clear
              </button>
            </div>
            <div ref={outputRef} className="flex-1 overflow-auto p-4 font-mono text-sm bg-[#1a1a2e]">
              <div className="text-emerald-400 whitespace-pre-wrap leading-relaxed pb-2">
                {output || <span className="text-slate-600 italic">Run your code and the output will appear here...</span>}
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

        {/* RIGHT: Gemini Chat Panel (slides in from right inside the flex row) */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 380, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="bg-slate-800 border-l border-slate-700 flex flex-col overflow-hidden shrink-0"
            >
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-gradient-to-r from-indigo-900/60 to-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                    <Sparkles size={16} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm">Gemini Guru</h3>
                    <p className="text-indigo-300 text-[10px]">AI Coding Assistant</p>
                  </div>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-slate-700 text-slate-200 rounded-bl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-700 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1 items-center">
                      {[0, 75, 150].map(d => (
                        <div key={d} className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-3 border-t border-slate-700 bg-slate-900/50 shrink-0">
                <form
                  onSubmit={e => { e.preventDefault(); handleSendMessage(); }}
                  className="flex gap-2 items-end"
                >
                  <textarea
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
                    }}
                    placeholder="Ask Gemini about your code..."
                    rows={2}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-indigo-500 scrollbar-hide"
                  />
                  <button
                    type="submit"
                    disabled={isChatLoading || !chatInput.trim()}
                    className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-40 shrink-0"
                  >
                    <Send size={16} />
                  </button>
                </form>
                <p className="text-slate-600 text-[10px] mt-1.5 text-center">Shift+Enter for new line • Enter to send</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
