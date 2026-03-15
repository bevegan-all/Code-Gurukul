import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Clock, MonitorPlay, ChevronRight, CheckCircle2, BookOpen, TerminalSquare } from 'lucide-react';
import StudentHeader from '../components/StudentHeader';
import api from '../api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user] = useState(JSON.parse(localStorage.getItem('user')) || {});
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/student/assignments')
      .then(res => setAssignments(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error('Failed to load assignments:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <StudentHeader user={user} title="Lab Assignments" subtitle="Published coding assignments from your teachers" />

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Banner */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-700 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <GraduationCap size={28} aria-hidden="true" /> Coding Lab
              </h2>
              <p className="text-indigo-100 text-base max-w-xl">
                Select a published assignment to enter the secure compiler workspace. Your code will be automatically graded by Gemini AI.
              </p>
            </div>
            <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4" aria-hidden="true">
              <MonitorPlay size={220} aria-hidden="true" />
            </div>
          </div>

          {/* Assignment List */}
          <div>
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
              <TerminalSquare size={24} className="text-indigo-600" aria-hidden="true" /> Available Assignments
            </h3>
            {loading ? (
              <div className="flex justify-center p-12" role="status" aria-label="Loading assignments">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" aria-hidden="true" />
                <span className="sr-only">Loading assignments…</span>
              </div>
            ) : assignments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="list" aria-label="Lab assignments">
                {assignments.map(a => (
                  <div
                    key={a.id}
                    role="listitem"
                    className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 hover:-translate-y-1 transition-all duration-300 flex flex-col group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-indigo-100 transition-colors z-0" aria-hidden="true"></div>
                    <div className="relative z-10 flex flex-col h-full">
                      <div className="flex flex-col items-start gap-3 mb-4">
                        <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                          {a.subject_name}
                        </span>
                        <h4 className="font-extrabold text-xl text-slate-800 leading-tight">{a.title}</h4>
                      </div>
                      <p className="text-slate-500 text-sm line-clamp-3 mb-8 flex-1 font-medium">{a.description}</p>
                      <div className="flex items-center justify-between pt-5 border-t-2 border-slate-50 mt-auto">
                        <div className="flex flex-col">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Assigned By</span>
                           <span className="text-xs font-bold text-slate-600">{a.teacher_name}</span>
                        </div>
                        <button
                          onClick={() => navigate(`/lab/${a.id}`)}
                          aria-label={`Launch lab for ${a.title}, subject ${a.subject_name}, assigned by ${a.teacher_name}`}
                          className="bg-slate-900 group-hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm"
                        >
                          Launch Lab <ChevronRight size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center flex flex-col items-center shadow-sm" role="status">
                <CheckCircle2 size={48} className="text-emerald-500 mb-4" aria-hidden="true" />
                <h4 className="text-xl font-bold text-slate-800">All caught up!</h4>
                <p className="text-slate-500 mt-2 max-w-xs">There are no published lab assignments for your subjects right now.</p>
                <button
                  onClick={() => navigate('/app/learn')}
                  aria-label="Browse enrolled subjects in Learn Mode"
                  className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors"
                >
                  <BookOpen size={18} aria-hidden="true" /> Browse Subjects
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
