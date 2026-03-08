import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NotebookPen, ArrowLeft, Calendar, FileText } from 'lucide-react';
import StudentHeader from '../components/StudentHeader';
import api from '../api';

export default function NoteDetail() {
  const [user] = useState(JSON.parse(localStorage.getItem('user')) || {});
  const { id } = useParams();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/student/notes/${id}`)
      .then(res => setNote(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <StudentHeader user={user} title={note ? note.title : "Loading Note..."} subtitle="Class Study Material" />
      
      <div className="p-8 max-w-4xl mx-auto w-full flex-1 overflow-y-auto">
        <button 
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-emerald-600 transition-colors"
        >
          <ArrowLeft size={16} /> Go Back
        </button>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        ) : !note ? (
          <div className="text-center text-slate-500">Note not found.</div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-10 animate-in fade-in duration-300">
             <div className="border-b border-slate-100 pb-8 mb-8 text-center">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-emerald-100">
                   <NotebookPen size={32} />
                </div>
                <h1 className="text-3xl font-black text-slate-800 mb-2">{note.title}</h1>
                <div className="flex items-center justify-center gap-4 text-sm font-semibold text-slate-400 mt-4">
                   <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-full"><FileText size={14} /> Subject: {note.subject_name}</span>
                   <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-full"><Calendar size={14} /> {new Date(note.created_at).toLocaleDateString()}</span>
                </div>
             </div>

             <div className="prose prose-slate max-w-none text-slate-700 leading-loose prose-h1:text-slate-800 prose-h2:text-slate-800 prose-h3:text-slate-800 prose-a:text-indigo-600 hover:prose-a:text-indigo-500 prose-img:rounded-xl">
               <div dangerouslySetInnerHTML={{ __html: note.content_html }} />
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
