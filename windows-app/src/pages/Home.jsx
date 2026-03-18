import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, FileCode2, NotebookPen, ClipboardList, Quote, Calendar, Trophy } from 'lucide-react';
import StudentHeader from '../components/StudentHeader';
import api from '../api';

const colorMap = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', foot: 'text-slate-500' },
  fuchsia: { bg: 'bg-fuchsia-50', text: 'text-fuchsia-600', foot: 'text-fuchsia-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', foot: 'text-emerald-600' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600', foot: 'text-orange-600' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600', foot: 'text-rose-600' },
};

export default function Home() {
  const navigate = useNavigate();
  const [user] = useState(JSON.parse(localStorage.getItem('user')) || {});
  const [data, setData] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  const dynamicStatCards = [
    { label: 'My Subjects', key: 'totalSubjects', icon: <BookOpen size={28} aria-hidden="true" />, color: 'indigo', desc: 'Active enrolled courses', path: '/app/home' },
    { label: 'Active Labs', key: 'activeAssignments', icon: <FileCode2 size={28} aria-hidden="true" />, color: 'fuchsia', desc: `Lab Accuracy: ${data?.stats?.avgAssignment || '0.0'}%`, path: '/app/assignments' },
    { label: 'Materials', key: 'publishedNotes', icon: <NotebookPen size={28} aria-hidden="true" />, color: 'emerald', desc: 'Latest study material', path: '/app/notes' },
    { label: 'Quizzes', key: 'activeQuizzes', icon: <ClipboardList size={28} aria-hidden="true" />, color: 'orange', desc: `Quiz Accuracy: ${data?.stats?.avgQuiz || '0.0'}%`, path: '/app/quizzes' },
    { label: 'Accuracy', key: 'overallAccuracy', icon: <Trophy size={28} aria-hidden="true" />, color: 'rose', desc: 'Overall Performance', path: '/app/leaderboard', suffix: '%' },
  ];

  useEffect(() => {
    Promise.all([
      api.get('/student/dashboard'),
      api.get('/student/attendance')
    ]).then(([dashRes, attRes]) => {
      setData(dashRes.data);
      setAttendance(attRes.data);
    })
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

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 pt-4" role="list" aria-label="Dashboard statistics">
              {dynamicStatCards.map(card => {
                const c = colorMap[card.color];
                const value = data.stats?.[card.key] || 0;
                return (
                  <div
                    key={card.key}
                    role="listitem"
                    onClick={() => navigate(card.path)}
                    className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-start relative z-10">
                      <div>
                        <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">{card.label}</p>
                        <h3 className="text-4xl font-black text-slate-900">{value}{card.suffix || ''}</h3>
                      </div>
                      <div className={`p-4 ${c.bg} ${c.text} rounded-xl transition-transform group-hover:scale-110 shadow-sm border border-transparent group-hover:border-slate-100`}>
                        {card.icon}
                      </div>
                    </div>
                    <div className={`mt-4 pt-4 border-t border-slate-100 text-[10px] font-black uppercase tracking-widest ${c.foot}`}>
                      {card.desc}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
              {/* Attendance Chart */}
              <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Academic Attendance</h2>
                    <p className="text-[10px] text-slate-400 font-black uppercase mt-1 tracking-widest">Live Presence Data</p>
                  </div>
                  <button 
                    onClick={() => navigate('/app/attendance')}
                    className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                  >
                    Details <Calendar size={12} />
                  </button>
                </div>

                <div className="flex items-end justify-between h-48 gap-4 px-2">
                  {attendance.length > 0 ? attendance.map((item, idx) => {
                    const perc = item.total > 0 ? Math.round((item.present / item.total) * 100) : 0;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-4 group/bar h-full justify-end">
                        <div className="relative w-full flex flex-col items-center justify-end h-full">
                          <div className="w-full bg-slate-50 rounded-t-2xl h-full absolute bottom-0 border-x border-t border-slate-100/50"></div>
                          <div 
                            className="w-full bg-indigo-600 rounded-t-2xl transition-all duration-1000 ease-out relative shadow-lg shadow-indigo-100 group-hover/bar:bg-indigo-500"
                            style={{ height: `${perc}%` }}
                          >
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-black text-white drop-shadow-sm">
                              {perc}%
                            </div>
                          </div>
                        </div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter truncate w-full text-center" title={item.subject_name}>
                          {item.subject_name.length > 10 ? item.subject_name.substring(0, 8) + '...' : item.subject_name}
                        </p>
                      </div>
                    );
                  }) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-3">
                      <BookOpen size={40} className="text-slate-200" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No attendance data yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Motivational Sidebar */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-950 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
                <div className="absolute -right-20 -bottom-20 w-80 h-80 border-4 border-slate-700/20 rounded-full"></div>
                
                <div className="relative z-10">
                  <Quote size={40} className="text-indigo-500/20 mb-6" />
                  <h2 className="text-2xl font-bold mb-4 leading-tight">
                    "Focus on the process, <br/>Results will follow."
                  </h2>
                </div>
                
                <div className="relative z-10 bg-indigo-600/10 backdrop-blur-md p-5 rounded-2xl border border-white/5">
                   <p className="text-xs text-indigo-200 leading-relaxed font-medium">Your interactive sandbox is ready for assignments. Keep coding, keep growing.</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-sm relative overflow-hidden mt-8">
              <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-50 rounded-full opacity-50" aria-hidden="true"></div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2 relative z-10">
                Your Secure Sandbox Environment is Active.
              </h2>
              <p className="text-slate-500 font-medium z-10 relative mb-6">
                Navigate to your assignments to launch the interactive code editor or take quizzes securely.
              </p>
              <button 
                onClick={() => navigate('/app/assignments')}
                className="relative z-10 px-8 py-3 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                Go to Assignments
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
