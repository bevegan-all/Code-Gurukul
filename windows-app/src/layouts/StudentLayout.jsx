import React, { useEffect, useState, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, BookOpen, FileText, Code2, ClipboardList, Trophy, Terminal, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { io } from 'socket.io-client';
import { toJpeg } from 'html-to-image';
import { SOCKET_URL } from '../config';


const StudentLayout = () => {
  const navigate = useNavigate();
  const socketRef = useRef(null);

  const handleLogout = () => {
    if (socketRef.current) {
      socketRef.current.emit('student:activity', {
        studentId: user?.id,
        studentName: user?.name,
        rollNo: user?.roll_no,
        classId: user?.class_id,
        activity: 'Offline',
        action: 'Logout'
      });
      socketRef.current.disconnect();
    }
    localStorage.removeItem('token');
    navigate('/');
  };

  const [user] = useState(JSON.parse(localStorage.getItem('user')) || {});
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    // Monitoring is now handled globally by RestrictionManager in App.jsx
  }, []);




  const menuItems = [
    { name: 'Home', icon: <Home size={20} aria-hidden="true" />, path: '/app/home' },
    { name: 'Learn Mode', icon: <BookOpen size={20} aria-hidden="true" />, path: '/app/learn' },
    { name: 'Notes', icon: <FileText size={20} aria-hidden="true" />, path: '/app/notes' },
    { name: 'Lab Assignments', icon: <Code2 size={20} aria-hidden="true" />, path: '/app/assignments' },
    { name: 'Check Attendance', icon: <Calendar size={20} aria-hidden="true" />, path: '/app/attendance' },
    { name: 'Free Sandbox', icon: <Terminal size={20} aria-hidden="true" />, path: '/app/sandbox' },
    { name: 'Quizzes', icon: <ClipboardList size={20} aria-hidden="true" />, path: '/app/quizzes' },
    { name: 'Leaderboard', icon: <Trophy size={20} aria-hidden="true" />, path: '/app/leaderboard' },
  ];

  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 font-sans overflow-hidden relative">
      
      {/* Sidebar Toggle Button */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`absolute top-6 z-50 bg-indigo-600 hover:bg-indigo-500 text-white p-1.5 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center ${
          isSidebarOpen ? 'left-[15.2rem]' : 'left-4'
        }`}
        aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        aria-expanded={isSidebarOpen}
        aria-controls="main-sidebar"
      >
        {isSidebarOpen ? <ChevronLeft size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
      </button>

      {/* Sidebar Navigation */}
      <nav 
        id="main-sidebar"
        aria-label="Main Navigation"
        className={`bg-slate-800 border-r border-slate-700 flex flex-col pt-8 transition-all duration-300 ease-in-out shrink-0 overflow-hidden ${
          isSidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0'
        }`}
      >
        <div className="w-64 h-full flex flex-col">
          <div className="px-6 mb-8 flex items-center gap-3">
            <div className="w-8 h-8 rounded shrink-0 bg-indigo-500 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]" aria-hidden="true">
              CG
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              CodeGurukul
            </span>
          </div>

          <div className="flex-1 space-y-1 px-4 overflow-y-auto" role="list">
            {menuItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                role="listitem"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                    isActive 
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 shadow-inner' 
                      : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                  }`
                }
                aria-current={({ isActive }) => isActive ? 'page' : undefined}
              >
                {({ isActive }) => (
                  <>
                    {item.icon}
                    {item.name}
                    {isActive && <span className="sr-only">(current page)</span>}
                  </>
                )}
              </NavLink>
            ))}
          </div>

          <div className="p-4 border-t border-slate-700">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors font-medium border border-transparent hover:border-red-500/20"
              aria-label="Log out of CodeGurukul session"
            >
              Log out session
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 overflow-y-auto bg-slate-50 relative flex flex-col min-w-0" role="main" aria-label="Page Content">
         <Outlet />
      </main>
    </div>
  );
};

export default StudentLayout;
