import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';

const roleLabel = {
  admin: 'System Administrator',
  teacher: 'Instructor',
  student: 'Student',
};

const Header = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Read logged-in user from localStorage
  const user = useMemo(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  const displayName = user?.name || 'User';
  const displayRole = roleLabel[user?.role] || (user?.role || 'Guest');
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Create breadcrumb string from path
  const formatRouteName = (route) => {
    const map = {
      admin: 'Admin', teacher: 'Teacher', student: 'Student',
      dashboard: 'Dashboard', subjects: 'Subjects', assignments: 'Lab Assignments',
      notes: 'Notes & Materials', leaderboard: 'Leaderboard', quizzes: 'Quizzes',
      classes: 'My Classes', students: 'Students',
    };
    return map[route] || (route.charAt(0).toUpperCase() + route.slice(1));
  };

  const breadcrumb = pathnames.length > 1
    ? `${formatRouteName(pathnames[0])} / ${formatRouteName(pathnames[1])}`
    : formatRouteName(pathnames[0] || 'Dashboard');

  return (
    <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-20 shadow-sm">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold text-gray-800 tracking-tight">{breadcrumb}</h2>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search here..."
            className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all text-sm w-64"
          />
        </div>

        <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 rounded-full hover:bg-gray-100">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
            {initials}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-800">{displayName}</span>
            <span className="text-xs text-gray-500">{displayRole}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
