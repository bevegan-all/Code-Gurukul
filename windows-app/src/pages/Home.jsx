import React, { useState, useEffect } from 'react';
import { BookOpen, FileCode2, NotebookPen, ClipboardList } from 'lucide-react';
import StudentHeader from '../components/StudentHeader';
import api from '../api';

const statCards = [
  { label: 'My Subjects', key: 'totalSubjects', icon: <BookOpen size={28} aria-hidden="true" />, color: 'indigo', desc: 'Assigned automatically via class enrollment' },
  { label: 'Active Assignments', key: 'activeAssignments', icon: <FileCode2 size={28} aria-hidden="true" />, color: 'fuchsia', desc: 'Ready to be submitted in the Sandbox Lab' },
  { label: 'Published Notes', key: 'publishedNotes', icon: <NotebookPen size={28} aria-hidden="true" />, color: 'emerald', desc: 'Latest study material from your professors' },
  { label: 'Active Quizzes', key: 'activeQuizzes', icon: <ClipboardList size={28} aria-hidden="true" />, color: 'orange', desc: 'Timed tests to evaluate your knowledge' },
];

const colorMap = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', foot: 'text-slate-500' },
  fuchsia: { bg: 'bg-fuchsia-50', text: 'text-fuchsia-600', foot: 'text-fuchsia-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', foot: 'text-emerald-600' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600', foot: 'text-orange-600' },
};

export default function Home() {
  const [user] = useState(JSON.parse(localStorage.getItem('user')) || {});
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/student/dashboard')
      .then(res => setData(res.data))
      .catch(err => console.error('Dashboard fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <StudentHeader user={user} title="Student Overview" subtitle="Welcome back" />
      
      <div className="p-8 max-w-6xl mx-auto w-full flex-1">
        {loading ? (
          <div className="flex justify-center p-12" role="status" aria-label="Loading dashboard content">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" aria-hidden="true"></div>
            <span className="sr-only">Loading dashboard…</span>
          </div>
        ) : !data ? (
          <div role="alert">Error loading dashboard.</div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Welcome Back, {user.name}</h1>
              <p className="text-slate-500 mt-1">Here is your learning overview for today.</p>
              <p className="text-sm font-bold text-indigo-700 bg-indigo-100 inline-flex px-4 py-1.5 rounded-full mt-3 shadow-inner border border-indigo-200">
                {data.course_name || 'N/A'} — {data.class_name || 'N/A'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4" role="list" aria-label="Dashboard statistics">
              {statCards.map(card => {
                const c = colorMap[card.color];
                const value = data.stats?.[card.key] || 0;
                return (
                  <div
                    key={card.key}
                    role="listitem"
                    aria-label={`${card.label}: ${value}. ${card.desc}`}
                    className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group"
                  >
                    <div className="flex justify-between items-start relative z-10">
                      <div>
                        <p className="text-sm font-bold text-slate-500 mb-1 uppercase tracking-wider">{card.label}</p>
                        <h3 className="text-4xl font-black text-slate-900" aria-hidden="true">{value}</h3>
                      </div>
                      <div className={`p-4 ${c.bg} ${c.text} rounded-xl`} aria-hidden="true">
                        {card.icon}
                      </div>
                    </div>
                    <div className={`mt-4 pt-4 border-t border-slate-100 text-sm font-semibold ${c.foot}`}>
                      {card.desc}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 rounded-3xl p-10 text-white shadow-xl relative overflow-hidden mt-8">
              <div className="absolute -right-20 -bottom-20 w-80 h-80 border-4 border-indigo-500 rounded-full opacity-20" aria-hidden="true"></div>
              <h2 className="text-2xl md:text-3xl font-bold mb-3 relative z-10 leading-snug max-w-2xl drop-shadow-lg">
                Your Secure Sandbox Environment is Active.
              </h2>
              <p className="text-indigo-200 font-medium z-10 relative text-lg mb-6">
                Navigate to your assignments to launch the interactive code editor or take quizzes securely.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
