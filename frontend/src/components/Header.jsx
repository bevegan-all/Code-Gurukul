import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Search, Clock, UserPlus, FileCode2, ClipboardList } from 'lucide-react';
import api from '../utils/axios';

const roleLabel = {
  admin: 'System Administrator',
  teacher: 'Instructor',
  student: 'Student',
};

const Header = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);
  const dropdownRef = useRef(null);

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

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (user?.role) {
      const fetchNotifications = async () => {
        try {
          let url = '';
          if (user.role === 'admin') url = '/admin/recent-activity';
          else if (user.role === 'teacher') url = '/teacher/notifications';
          else if (user.role === 'student') url = '/student/recent-activity';

          const res = await api.get(url);
          const acts = res.data;
          setNotifications(acts);
          if (acts.length > 0) {
            const lastSeenId = localStorage.getItem(`lastSeen${user.role}ActivityId`);
            if (!lastSeenId || lastSeenId !== String(acts[0].id)) {
              setHasUnread(true);
            }
          }
        } catch (err) {
          console.error('Failed to load notifications:', err);
        }
      };
      fetchNotifications();
    }
  }, [user?.role]);

  // Handle clicking outside the notification dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && notifications.length > 0) {
      setHasUnread(false);
      localStorage.setItem(`lastSeen${user.role}ActivityId`, notifications[0].id.toString());
    }
  };

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
    <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-20 shadow-sm transition-all">
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

        {/* Notifications Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={handleToggleNotifications}
            className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 rounded-full hover:bg-gray-100"
          >
            <Bell className="w-5 h-5" />
            {hasUnread && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-gray-100 py-3 z-50 animate-slide-in">
              <div className="px-4 pb-3 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-gray-800">Recent Activity</h3>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">{notifications.length} Items</span>
              </div>
              <div className="max-h-80 overflow-y-auto mt-2 space-y-1 px-2">
                {notifications.length > 0 ? notifications.map((act) => {
                  const isAdmin = user.role === 'admin';
                  const timestamp = isAdmin ? act.timestamp : act.created_at;
                  
                  // Admin specific fields
                  const adminAction = act.action_type;
                  const description = act.description;
                  const userName = act.User?.name || 'System';

                  return (
                    <div key={act.id + (act.type || adminAction || '')} className="p-3 hover:bg-gray-50 rounded-xl transition-colors flex gap-3 items-start">
                      <div className={`p-2 rounded-full shrink-0 ${
                        isAdmin ? (
                          adminAction === 'CREATE' ? 'bg-emerald-50 text-emerald-600' :
                          adminAction === 'UPDATE' ? 'bg-blue-50 text-blue-600' :
                          adminAction === 'DELETE' ? 'bg-red-50 text-red-600' :
                          'bg-purple-50 text-purple-600'
                        ) : (
                          act.type === 'assignment' ? 'bg-purple-50 text-purple-600' : 
                          act.type === 'quiz' ? 'bg-orange-50 text-orange-600' :
                          'bg-blue-50 text-blue-600'
                        )
                      }`}>
                        {isAdmin ? (
                          adminAction === 'CREATE' ? <UserPlus className="w-4 h-4" /> :
                          adminAction === 'UPDATE' ? <Clock className="w-4 h-4" /> :
                          adminAction === 'DELETE' ? <Bell className="w-4 h-4" /> :
                          <FileCode2 className="w-4 h-4" />
                        ) : (
                          act.type === 'assignment' ? <FileCode2 className="w-4 h-4" /> : 
                          act.type === 'quiz' ? <ClipboardList className="w-4 h-4" /> :
                          <Clock className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 leading-tight break-words">
                          {isAdmin ? description : act.title}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1 flex items-center justify-between font-medium">
                          <span className="truncate max-w-[120px]">{isAdmin ? userName : (act.subject || 'System')}</span>
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded ml-2 flex-shrink-0">
                            {new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })} {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-center py-10 opacity-40">
                    <Bell className="w-10 h-10 mx-auto mb-2" />
                    <p className="text-xs font-bold uppercase tracking-widest">No recent activity</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
          {user?.profile_image ? (
            <img 
              src={user.profile_image} 
              alt={displayName} 
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full object-cover border-2 border-primary/20"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              {initials}
            </div>
          )}
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
