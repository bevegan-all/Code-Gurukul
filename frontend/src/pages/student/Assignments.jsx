import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCode2, Code, ChevronRight, Lock, Eye } from 'lucide-react';
import api from '../../utils/axios';

const Assignments = () => {
  const navigate = useNavigate();
  const [all, setAll] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selected, setSelected] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [aRes, sRes] = await Promise.all([
        api.get('/student/assignments').catch(() => ({ data: [] })),
        api.get('/student/subjects').catch(() => ({ data: [] }))
      ]);
      setAll(aRes.data);
      setSubjects(sRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const shown = selected === 'all' ? all : all.filter(a => String(a.subject_id) === String(selected));
  const countFor = (sid) => all.filter(a => String(a.subject_id) === String(sid)).length;
  const selectedSubjectName = subjects.find(s => String(s.subject_id) === String(selected))?.subject_name || null;

  return (
    <div className="flex flex-col md:flex-row gap-6 animate-in fade-in duration-300" style={{ minHeight: 'calc(100vh - 120px)' }}>

      {/* ── LEFT SIDEBAR ── */}
      <div className="w-full md:w-56 flex-shrink-0">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-6">
          <div className="px-4 py-3 bg-gradient-to-br from-blue-600 to-blue-700">
            <p className="text-xs font-bold text-blue-100 uppercase tracking-widest">Filter Subjects</p>
          </div>
          <div className="p-2 space-y-0.5">
            <button onClick={() => setSelected('all')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${selected === 'all' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
              <span className="flex items-center gap-2.5">
                <div className={`w-1.5 h-1.5 rounded-full ${selected === 'all' ? 'bg-blue-500' : 'bg-gray-300'}`} />
                All Assignments
              </span>
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${selected === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{all.length}</span>
            </button>
            {subjects.map(s => (
              <button key={s.subject_id} onClick={() => setSelected(s.subject_id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left group ${String(selected) === String(s.subject_id) ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                <span className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${String(selected) === String(s.subject_id) ? 'bg-blue-500' : 'bg-gray-300'}`} />
                  <span className="truncate">{s.subject_name}</span>
                </span>
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1 ${String(selected) === String(s.subject_id) ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{countFor(s.subject_id)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT CONTENT ── */}
      <div className="flex-1 min-w-0 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lab Assignments</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {selected === 'all' ? `Showing all ${all.length} assignments` : `${selectedSubjectName} — ${shown.length} assignment${shown.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Windows App Banner */}
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-start gap-4">
          <div className="p-2 bg-amber-100 text-amber-600 rounded-xl flex-shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-amber-800 text-sm mb-1">Web Portal is Read-Only</h3>
            <p className="text-amber-700 text-sm">To solve assignments, write code, run tests, and submit your work for grading, you must use the <strong>CodeGurukul Windows App</strong> from your local machine. Read-only preview available below.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mr-3" />
            Loading assignments…
          </div>
        ) : shown.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-20 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileCode2 className="w-8 h-8 text-gray-300" />
            </div>
            <p className="font-semibold text-gray-600 mb-1">No pending assignments</p>
            <p className="text-sm text-gray-400">You're all caught up for {selected !== 'all' ? 'this subject' : 'today'}!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map(a => (
              <div 
                key={a.id} 
                onClick={() => navigate(`/student/assignments/${a.id}`)}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-base mb-1.5 group-hover:text-blue-600 transition-colors">{a.title}</h3>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 mb-3">
                      <span className="font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                        {a.subject_name}
                      </span>
                      <span>By: {a.teacher_name}</span>
                      <span>•</span>
                      <span>Time Limit: {a.time_limit_minutes || '∞'} mins</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Code className="w-3 h-3" /> {a.compiler_required}</span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{a.description}</p>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button className="flex items-center justify-center gap-1.5 bg-blue-50 text-blue-700 font-bold px-4 py-2 rounded-xl text-sm transition-colors group-hover:bg-blue-600 group-hover:text-white">
                      <Eye className="w-4 h-4" /> View Questions
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Assignments;
