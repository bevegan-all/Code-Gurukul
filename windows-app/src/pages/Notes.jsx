import React, { useState, useEffect } from 'react';
import { NotebookPen, Filter, BookOpen, Clock, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StudentHeader from '../components/StudentHeader';
import api from '../api';

export default function Notes() {
  const [user] = useState(JSON.parse(localStorage.getItem('user')) || {});
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/student/notes')
      .then(res => setNotes(Array.isArray(res.data) ? res.data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Ensure notes is an array with a fallback mechanism 
  const safeNotes = Array.isArray(notes) ? notes : [];
  const subjects = ['All', ...new Set(safeNotes.map(n => n.subject_name))];
  const filteredNotes = filter === 'All' ? safeNotes : safeNotes.filter(n => n.subject_name === filter);

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <StudentHeader user={user} title="Class Notes" subtitle="Read study material assigned by teachers" />
      
      <div className="p-8 max-w-6xl mx-auto w-full flex-1">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Available Notes</h2>
            <p className="text-slate-500 mt-1">Review lecture materials to prepare for your lab assignments.</p>
          </div>
          <div className="flex gap-2 items-center">
            <Filter size={18} className="text-slate-400" />
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 shadow-sm hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow transition-colors"
            >
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredNotes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {filteredNotes.map(n => (
              <div 
                key={n._id} 
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-lg transition-all group flex flex-col cursor-pointer border-l-4 border-l-emerald-500"
                onClick={() => navigate(`/app/notes/${n._id}`)}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-100 transition-colors">
                    <NotebookPen size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-slate-800 line-clamp-1 group-hover:text-emerald-700 transition-colors">{n.title}</h4>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 inline-block mt-1">
                      {n.subject_name}
                    </span>
                  </div>
                </div>
                
                <p className="text-slate-500 text-sm line-clamp-3 mb-6 flex-1">
                  {n.content_html.replace(/<[^>]+>/g, '')}
                </p>
                
                <div className="flex justify-between items-center border-t border-slate-100 mt-auto pt-4 text-xs font-medium text-slate-400">
                  <span className="flex items-center gap-1.5"><Clock size={14} /> {new Date(n.created_at).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1 text-emerald-600 group-hover:translate-x-1 transition-transform font-bold">
                    Read <Play size={12} className="fill-current" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border rounded-2xl p-12 text-center shadow-sm">
            <NotebookPen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-700">No Notes Available</h3>
            <p className="text-slate-500">There are no study materials published yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
