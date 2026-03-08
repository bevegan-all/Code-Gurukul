import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, BookOpen, FileText, Code2, ClipboardList, Trophy, Terminal, ChevronLeft, ChevronRight } from 'lucide-react';
import { io } from 'socket.io-client';
import { toJpeg } from 'html-to-image';
import { SOCKET_URL } from '../config';


const StudentLayout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const [user] = useState(JSON.parse(localStorage.getItem('user')) || {});
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (!user.id) return;
    
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });

    let pingInterval = null;
    let screenshotInterval = null;

    // Silent screen capture using html-to-image (handles oklch, no permission needed)
    const captureAndSend = async () => {
      try {
        const dataUrl = await toJpeg(document.documentElement, {
          quality: 0.5,
          pixelRatio: 0.6,
          skipFonts: false,
          cacheBust: true,
          includeQueryParams: true,
          filter: (node) => {
            // Skip script tags to avoid issues
            if (node.tagName === 'SCRIPT') return false;
            return true;
          },
        });
        socket.emit('student:screen_stream', {
          studentId: user.id,
          classId: user.class_id,
          screenBase64: dataUrl
        });
      } catch (err) {
        console.error('html-to-image failed:', err.message);
      }
    };

    socket.on('teacher:start_watching', () => {
      captureAndSend(); // immediate first frame
      if (screenshotInterval) clearInterval(screenshotInterval);
      screenshotInterval = setInterval(captureAndSend, 2500);
    });

    socket.on('teacher:stop_watching', () => {
      if (screenshotInterval) { clearInterval(screenshotInterval); screenshotInterval = null; }
    });

    socket.on('connect', () => {
      socket.emit('student:online', {
        studentId: user.id,
        studentName: user.name,
        rollNo: user.roll_no,
        classId: user.class_id
      });
      if (pingInterval) clearInterval(pingInterval);
      pingInterval = setInterval(() => {
        socket.emit('student:ping', { studentId: user.id, studentName: user.name, rollNo: user.roll_no, classId: user.class_id });
      }, 5000);
    });

    socket.on('disconnect', () => {
      if (pingInterval) clearInterval(pingInterval);
      if (screenshotInterval) clearInterval(screenshotInterval);
    });

    return () => {
      if (pingInterval) clearInterval(pingInterval);
      if (screenshotInterval) clearInterval(screenshotInterval);
      socket.disconnect();
    };
  }, [user.id, user.name, user.class_id]);




  const menuItems = [
    { name: 'Home', icon: <Home size={20} />, path: '/app/home' },
    { name: 'Learn Mode', icon: <BookOpen size={20} />, path: '/app/learn' },
    { name: 'Notes', icon: <FileText size={20} />, path: '/app/notes' },
    { name: 'Lab Assignments', icon: <Code2 size={20} />, path: '/app/assignments' },
    { name: 'Free Sandbox', icon: <Terminal size={20} />, path: '/app/sandbox' },
    { name: 'Quizzes', icon: <ClipboardList size={20} />, path: '/app/quizzes' },
    { name: 'Leaderboard', icon: <Trophy size={20} />, path: '/app/leaderboard' },
  ];

  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 font-sans overflow-hidden relative">
      
      {/* Sidebar Toggle Button */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`absolute top-6 z-50 bg-indigo-600 hover:bg-indigo-500 text-white p-1.5 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center ${
          isSidebarOpen ? 'left-[15.2rem]' : 'left-4'
        }`}
        title="Toggle Sidebar"
      >
        {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {/* Sidebar Navigation */}
      <nav 
        className={`bg-slate-800 border-r border-slate-700 flex flex-col pt-8 transition-all duration-300 ease-in-out shrink-0 overflow-hidden ${
          isSidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0'
        }`}
      >
        <div className="w-64 h-full flex flex-col">
          <div className="px-6 mb-8 flex items-center gap-3">
            <div className="w-8 h-8 rounded shrink-0 bg-indigo-500 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]">
              CG
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              CodeGurukul
            </span>
          </div>

          <div className="flex-1 space-y-1 px-4 overflow-y-auto">
            {menuItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                    isActive 
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 shadow-inner' 
                      : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                  }`
                }
              >
                {item.icon}
                {item.name}
              </NavLink>
            ))}
          </div>

          <div className="p-4 border-t border-slate-700">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors font-medium border border-transparent hover:border-red-500/20"
            >
              Log out session
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-slate-50 relative flex flex-col min-w-0">
         {/* Simple header for user details can go here or in pages */}
         <Outlet />
      </main>
    </div>
  );
};

export default StudentLayout;
