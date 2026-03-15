import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileCode2, NotebookPen, ArrowLeft, Clock, ClipboardList } from 'lucide-react';
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
          aria-label="Go back to subjects list"
          className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Back to Subjects
        </button>

        {loading ? (
          <div className="flex justify-center p-12" role="status" aria-label="Loading subject detail">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" aria-hidden="true"></div>
            <span className="sr-only">Loading subject…</span>
          </div>
        ) : !data ? (
          <div role="alert">Failed to load subject data.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
            
            {/* Notes Section */}
            <section aria-label="Study Notes">
               <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-3">
                 <NotebookPen className="text-emerald-500" aria-hidden="true" /> Study Notes
               </h3>
               
               {data.notes && data.notes.length > 0 ? (
                 <div className="space-y-4 mt-4" role="list">
                   {data.notes.map(n => (
                      <div 
                        key={n._id}
                        role="link"
                        tabIndex={0}
                        aria-label={`Note: ${n.title}, published ${new Date(n.created_at).toLocaleDateString()}. Press Enter to read.`}
                        onClick={() => navigate(`/app/notes/${n._id}`)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/app/notes/${n._id}`); } }}
                        className="bg-white border-l-4 border-emerald-500 p-4 rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-shadow"
                      >
                         <h4 className="font-bold text-slate-800 mb-1">{n.title}</h4>
                         <p className="text-xs text-slate-500 mb-3 line-clamp-2">{n.content_html.replace(/<[^>]+>/g, '')}</p>
                         <div className="flex justify-start text-xs font-semibold text-slate-400">
                           <Clock size={14} className="mr-1" aria-hidden="true" /> {new Date(n.created_at).toLocaleDateString()}
                         </div>
                      </div>
                   ))}
                 </div>
               ) : (
                 <div className="bg-white p-8 mt-4 rounded-xl border border-slate-200 text-center text-slate-500" role="status">
                   No notes published.
                 </div>
               )}
            </section>

            {/* Assignments Section */}
            <section aria-label="Lab Assignments">
               <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-3">
                 <FileCode2 className="text-indigo-500" aria-hidden="true" /> Lab Assignments
               </h3>
               
               {data.assignments && data.assignments.length > 0 ? (
                 <div className="space-y-4 mt-4" role="list">
                   {data.assignments.map(a => (
                      <div 
                        key={a.id}
                        role="listitem"
                        className="bg-white border-l-4 border-indigo-500 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow group"
                      >
                         <div className="flex justify-between items-start mb-1">
                           <h4 className="font-bold text-slate-800 mr-2">{a.title}</h4>
                           <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md shrink-0">{a.compiler_required}</span>
                         </div>
                         <p className="text-xs text-slate-500 mb-4 line-clamp-2">{a.description}</p>
                         <div className="flex justify-between items-center text-xs font-semibold">
                           <span className="text-slate-400 flex items-center gap-1">
                             <Clock size={14} aria-hidden="true" /> {a.time_limit_minutes ? `${a.time_limit_minutes} min` : 'No limit'}
                           </span>
                           {a.is_submitted ? (
                             <div className="flex items-center gap-2">
                                <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100" aria-label={`Score: ${a.ai_marks} out of 10`}>Score: {a.ai_marks}</span>
                                <span className="text-slate-400">Submitted</span>
                             </div>
                           ) : (
                             <button 
                               onClick={() => navigate(`/lab/${a.id}`)}
                               aria-label={`Start lab for ${a.title}`}
                               className="text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors"
                             >
                               Start Lab
                             </button>
                           )}
                         </div>
                      </div>
                   ))}
                 </div>
               ) : (
                 <div className="bg-white p-8 mt-4 rounded-xl border border-slate-200 text-center text-slate-500" role="status">
                   No labs published.
                 </div>
               )}
            </section>

            {/* Quizzes Section */}
            <section aria-label="Subject Quizzes">
               <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-3">
                 <ClipboardList className="text-purple-500" aria-hidden="true" /> Subject Quizzes
               </h3>
               
               {data.quizzes && data.quizzes.length > 0 ? (
                 <div className="space-y-4 mt-4" role="list">
                   {data.quizzes.map(q => (
                      <div 
                        key={q.id}
                        role="listitem"
                        className="bg-white border-l-4 border-purple-500 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow group"
                      >
                         <h4 className="font-bold text-slate-800 mb-1">{q.title}</h4>
                         <div className="flex justify-between items-center text-xs font-semibold mt-4">
                           <span className="text-slate-400 flex items-center gap-1">
                             <Clock size={14} aria-hidden="true" /> {q.time_limit_minutes ? `${q.time_limit_minutes} min` : 'No limit'}
                           </span>
                           {q.is_attempted ? (
                             <div className="flex items-center gap-2">
                               <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100" aria-label={`Score: ${q.total_marks} marks`}>Score: {q.total_marks}</span>
                               <span className="text-slate-400 font-bold uppercase tracking-tighter">Attempted</span>
                             </div>
                           ) : (
                             <button 
                               onClick={() => navigate(`/quiz/${q.id}`)}
                               aria-label={`Take quiz: ${q.title}`}
                               className="text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors"
                             >
                               Take Quiz
                             </button>
                           )}
                         </div>
                      </div>
                   ))}
                 </div>
               ) : (
                 <div className="bg-white p-8 mt-4 rounded-xl border border-slate-200 text-center text-slate-500" role="status">
                   No quizzes published.
                 </div>
               )}
            </section>

          </div>
        )}
      </div>
    </div>
  );
}
