import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileCode2, NotebookPen, ArrowLeft, Clock } from 'lucide-react';
import StudentHeader from '../components/StudentHeader';
import api from '../api';

export default function LearnModeDetail() {
  const [user] = useState(JSON.parse(localStorage.getItem('user')) || {});
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/student/subjects/${id}`)
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <StudentHeader user={user} title={data ? data.name : "Loading..."} subtitle="Subject Detail" />
      
      <div className="p-8 max-w-6xl mx-auto w-full flex-1">
        <button 
          onClick={() => navigate('/app/learn')}
          className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Subjects
        </button>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : !data ? (
          <div>Failed to load subject data.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-300">
            
            {/* Notes Section */}
            <div className="space-y-4">
               <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-3">
                 <NotebookPen className="text-emerald-500" /> Study Notes
               </h3>
               
               {data.notes && data.notes.length > 0 ? (
                 <div className="space-y-4">
                   {data.notes.map(n => (
                      <div 
                        key={n._id}
                        onClick={() => navigate(`/app/notes/${n._id}`)}
                        className="bg-white border-l-4 border-emerald-500 p-4 rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-shadow"
                      >
                         <h4 className="font-bold text-slate-800 mb-1">{n.title}</h4>
                         <p className="text-xs text-slate-500 mb-3 line-clamp-2">{n.content_html.replace(/<[^>]+>/g, '')}</p>
                         <div className="flex justify-start text-xs font-semibold text-slate-400">
                           <Clock size={14} className="mr-1" /> {new Date(n.created_at).toLocaleDateString()}
                         </div>
                      </div>
                   ))}
                 </div>
               ) : (
                 <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
                   No notes published for this subject.
                 </div>
               )}
            </div>

            {/* Assignments Section */}
            <div className="space-y-4">
               <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-3">
                 <FileCode2 className="text-indigo-500" /> Lab Assignments
               </h3>
               
               {data.assignments && data.assignments.length > 0 ? (
                 <div className="space-y-4">
                   {data.assignments.map(a => (
                      <div 
                        key={a.id}
                        className="bg-white border-l-4 border-indigo-500 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow group"
                      >
                         <div className="flex justify-between items-start mb-1">
                           <h4 className="font-bold text-slate-800 mr-2">{a.title}</h4>
                           <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md shrink-0">{a.compiler_required}</span>
                         </div>
                         <p className="text-xs text-slate-500 mb-4 line-clamp-2">{a.description}</p>
                         <div className="flex justify-between items-center text-xs font-semibold">
                           <span className="text-slate-400 flex items-center gap-1"><Clock size={14} /> {a.time_limit_minutes ? `${a.time_limit_minutes} min` : 'No limit'}</span>
                           <button 
                             onClick={() => navigate(`/lab/${a.id}`)}
                             className="text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors"
                           >
                             Start Lab
                           </button>
                         </div>
                      </div>
                   ))}
                 </div>
               ) : (
                 <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
                   No lab assignments published.
                 </div>
               )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
