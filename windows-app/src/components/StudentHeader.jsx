import React from 'react';
import { ShieldAlert } from 'lucide-react';

const StudentHeader = ({ user, title = "Secure Lab Active", subtitle = "Activity monitored by assigned session" }) => {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <div className="bg-blue-100 p-2.5 rounded-xl shadow-inner">
          <ShieldAlert className="text-blue-600" size={24} />
        </div>
        <div>
          <h1 className="font-bold text-slate-800 text-lg leading-tight">{title}</h1>
          <p className="text-xs text-slate-500 font-medium">
            {subtitle} {user?.name ? `- ${user.name}` : ''}
          </p>
        </div>
      </div>
      
      {/* User Info (shifted away from top-right corner to NOT overlap Exit Button) */}
      <div className="flex items-center gap-4 pr-16">
        <div className="text-right">
          <p className="text-sm font-bold text-slate-800">{user?.name || 'Student'}</p>
          <p className="text-xs text-slate-500 font-medium">Student • CodeGurukul</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-white font-bold shadow-sm">
          {user?.name?.charAt(0) || 'S'}
        </div>
      </div>
    </header>
  );
};

export default StudentHeader;
