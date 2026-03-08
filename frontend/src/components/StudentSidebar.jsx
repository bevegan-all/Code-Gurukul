import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, LogOut, BookOpen, FileCode2, BookMarked, NotebookPen, Trophy } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const StudentSidebar = () => {
  const { user, logout } = useAuth();

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/student/dashboard' },
    { label: 'My Subjects', icon: BookMarked, path: '/student/subjects' },
    { label: 'Lab Assignments', icon: FileCode2, path: '/student/assignments' },
    { label: 'Notes & Materials', icon: NotebookPen, path: '/student/notes' },
    { label: 'Leaderboard', icon: Trophy, path: '/student/leaderboard' },
  ];

  const initial = user?.name?.charAt(0).toUpperCase() || 'S';

  return (
    <div className="h-screen w-64 bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 shadow-sm z-10">
      <div className="p-5 flex items-center justify-center border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg shadow-sm">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-800">CodeGurukul</h1>
        </div>
      </div>

      {user && (
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] uppercase font-bold rounded-full border border-gray-200">
              Student
            </span>
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
                  ? 'bg-blue-50 text-blue-700 shadow-sm'
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

export default StudentSidebar;
