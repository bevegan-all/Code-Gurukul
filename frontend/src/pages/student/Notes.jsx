import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotebookPen } from 'lucide-react';
import api from '../../utils/axios';

const Notes = () => {
  const navigate = useNavigate();
  const [all, setAll] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selected, setSelected] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [nRes, sRes] = await Promise.all([
        api.get('/student/notes').catch(() => ({ data: [] })),
        api.get('/student/subjects').catch(() => ({ data: [] }))
      ]);
      setAll(nRes.data);
      setSubjects(sRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const shown = selected === 'all' ? all : all.filter(n => String(n.subject_id) === String(selected));
  const countFor = (sid) => all.filter(n => String(n.subject_id) === String(sid)).length;
  const selectedSubjectName = subjects.find(s => String(s.subject_id) === String(selected))?.subject_name || null;

  return (
    <div className="flex flex-col md:flex-row gap-6 animate-in fade-in duration-300" style={{ minHeight: 'calc(100vh - 120px)' }}>

      {/* ── LEFT SIDEBAR ── */}
      <div className="w-full md:w-56 flex-shrink-0">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-6">
          <div className="px-4 py-3 bg-gradient-to-br from-emerald-600 to-emerald-700">
            <p className="text-xs font-bold text-emerald-100 uppercase tracking-widest">Filter Subjects</p>
          </div>
          <div className="p-2 space-y-0.5">
            <button onClick={() => setSelected('all')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${selected === 'all' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
              <span className="flex items-center gap-2.5">
                <div className={`w-1.5 h-1.5 rounded-full ${selected === 'all' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                All Notes
              </span>
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${selected === 'all' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{all.length}</span>
            </button>
            {subjects.map(s => (
              <button key={s.subject_id} onClick={() => setSelected(s.subject_id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left group ${String(selected) === String(s.subject_id) ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                <span className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${String(selected) === String(s.subject_id) ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  <span className="truncate">{s.subject_name}</span>
                </span>
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1 ${String(selected) === String(s.subject_id) ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{countFor(s.subject_id)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT CONTENT ── */}
      <div className="flex-1 min-w-0 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Study Notes</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {selected === 'all' ? `Showing all ${all.length} notes` : `${selectedSubjectName} — ${shown.length} note${shown.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mr-3" />
            Loading notes…
          </div>
        ) : shown.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-20 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <NotebookPen className="w-8 h-8 text-gray-300" />
            </div>
            <p className="font-semibold text-gray-600 mb-1">No notes available</p>
            <p className="text-sm text-gray-400">Your instructors haven't published any notes for {selected !== 'all' ? 'this subject' : 'your classes'} yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shown.map(n => (
              <div 
                key={n._id} 
                onClick={() => navigate(`/student/notes/${n._id}`)}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-emerald-200 transition-all flex flex-col h-full cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-base mb-1.5 truncate group-hover:text-emerald-700 transition-colors">{n.title}</h3>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
                      <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {n.subject_name}
                      </span>
                      <span>•</span>
                      <span>{new Date(n.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl flex-shrink-0 group-hover:bg-emerald-100 transition-colors">
                    <NotebookPen className="w-4 h-4" />
                  </div>
                </div>
                {/* HTML content snippet */}
                <div className="prose prose-sm max-w-none text-gray-600 line-clamp-4 flex-1 mt-2"
                  dangerouslySetInnerHTML={{ __html: n.content_html }}
                />
                
                <div className="mt-4 pt-4 border-t border-gray-100 mt-auto">
                  <button className="text-emerald-600 font-semibold text-sm hover:text-emerald-800 transition-colors w-full text-center group-hover:underline">
                    Read Full Note →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notes;
