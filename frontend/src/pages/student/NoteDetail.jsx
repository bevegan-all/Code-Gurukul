import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NotebookPen, ArrowLeft, Calendar, FileText } from 'lucide-react';
import api from '../../utils/axios';

const NoteDetail = () => {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/student/notes/${noteId}`)
      .then(res => setNote(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [noteId]);

  if (loading) return <div className="p-8 text-gray-400">Loading note details...</div>;
  if (!note) return <div className="p-8 text-red-500">Note not found or access denied.</div>;

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-8 md:p-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <NotebookPen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Study Note</span>
            <h1 className="text-3xl font-bold text-gray-900 mt-1">{note.title}</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-8 pb-8 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-gray-700">{note.subject_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>Published on {new Date(note.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Content area */}
        <div className="prose prose-blue max-w-none text-gray-800"
          dangerouslySetInnerHTML={{ __html: note.content_html }}
        />
      </div>
    </div>
  );
};

export default NoteDetail;
