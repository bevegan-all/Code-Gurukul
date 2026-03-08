import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Filter, Play, Clock } from 'lucide-react';
import StudentHeader from '../components/StudentHeader';
import api from '../api';

export default function Quizzes() {
  const navigate = useNavigate();
  const [user] = useState(JSON.parse(localStorage.getItem('user')) || {});
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    api.get('/student/quizzes')
      .then(res => setQuizzes(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const safeQuizzes = Array.isArray(quizzes) ? quizzes : [];
  const subjects = ['All', ...new Set(safeQuizzes.map(q => q.subject_name))];
  const filteredQuizzes = filter === 'All' ? safeQuizzes : safeQuizzes.filter(q => q.subject_name === filter);

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <StudentHeader user={user} title="Secure Quizzes" subtitle="Timed MCQ tests monitored via Session Tracker" />
      
      <div className="p-8 max-w-6xl mx-auto w-full flex-1">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Assigned Quizzes</h2>
            <p className="text-slate-500 mt-1">Once you start a secured quiz, your screen will be locked to the test.</p>
          </div>
          <div className="flex gap-2 items-center">
            <Filter size={18} className="text-slate-400" />
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 shadow-sm hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            >
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredQuizzes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {filteredQuizzes.map(q => (
              <div 
                key={q.id} 
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-lg transition-all group flex flex-col border-l-4 border-l-orange-500"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                    <ClipboardList size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-slate-800 line-clamp-1">{q.title}</h4>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 inline-block mt-1">
                      {q.subject_name}
                    </span>
                  </div>
                </div>
                
                <div className="flex-1"></div>
                
                <div className="flex justify-between items-center border-t border-slate-100 mt-6 pt-4 text-xs font-medium text-slate-500">
                  <span className="flex items-center gap-1.5"><Clock size={14} /> {q.time_limit_minutes ? `${q.time_limit_minutes} Mins` : 'Unlimited'}</span>
                  
                  {q.is_attempted ? (
                    <div className="flex items-center gap-3 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Attempted</span>
                        <span className="font-extrabold text-slate-700 text-[13px]">{q.total_marks != null ? `${q.total_marks}` : '-'} pts</span>
                      </div>
                      <div className="h-6 w-px bg-emerald-200"></div>
                      <span className="text-emerald-700 font-bold text-xs uppercase tracking-wide">
                        Completed
                      </span>
                    </div>
                  ) : (
                    <button 
                      onClick={() => navigate(`/quiz/${q.id}`)}
                      className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white px-5 py-2 rounded-lg transition-colors font-bold flex items-center gap-2 hover:-translate-y-0.5"
                    >
                       Start <Play size={14} className="fill-current" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
           <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-12 border border-orange-100 text-center shadow-sm">
             <ClipboardList className="w-20 h-20 text-orange-300 mx-auto mb-6 opacity-80" />
             <h3 className="text-2xl font-bold text-slate-800 mb-2">No Quizzes Active</h3>
             <p className="text-slate-500 font-medium max-w-sm mx-auto">There are currently no active MCQ tests assigned to your class.</p>
           </div>
        )}
      </div>
    </div>
  );
}
