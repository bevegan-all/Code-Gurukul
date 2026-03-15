import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, LogOut, BookOpen, Clock, Users, FileCode2, BookMarked, NotebookPen, GraduationCap, Trophy, Calendar } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const TeacherSidebar = () => {
  const { user, logout } = useAuth();

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/teacher/dashboard' },
    { label: 'My Timetable', icon: Calendar, path: '/teacher/timetable' },
    { label: 'My Subjects', icon: BookMarked, path: '/teacher/subjects' },
    { label: 'My Classes', icon: Users, path: '/teacher/classes' },
    { label: 'Students', icon: GraduationCap, path: '/teacher/students' },
    { label: 'Lab Assignments', icon: FileCode2, path: '/teacher/assignments' },
    { label: 'Quizzes', icon: BookOpen, path: '/teacher/quizzes' },
    { label: 'Notes', icon: NotebookPen, path: '/teacher/notes' },
    { label: 'Live Lab Monitor', icon: Clock, path: '/teacher/monitor' },
    { label: 'Leaderboard', icon: Trophy, path: '/teacher/leaderboard' },
  ];

  const initial = user?.name?.charAt(0).toUpperCase() || 'T';

  return (
    <div className="h-screen w-64 bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 shadow-sm z-10">
      <div className="p-5 flex items-center justify-center border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-600 rounded-lg shadow-sm">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-800">CodeGurukul</h1>
        </div>
      </div>

      {/* User info */}
      {user && (
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm flex-shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
        </div>
      )}

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-sm font-medium ${
                isActive
                  ? 'bg-purple-50 text-purple-700 shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 w-full text-left text-red-500 rounded-xl hover:bg-red-50 transition-colors text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default TeacherSidebar;
