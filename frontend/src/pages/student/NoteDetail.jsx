import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NotebookPen, ArrowLeft, Calendar, FileText, Download } from 'lucide-react';
import api from '../../utils/axios';
import html2pdf from 'html2pdf.js';
import 'react-quill/dist/quill.snow.css';

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

  const generatePDF = () => {
    const element = document.getElementById('note-pdf-content');
    const opt = {
      margin: 1,
      filename: `${note.title.replace(/\s+/g, '_')}_Notes.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().from(element).set(opt).save();
  };

  if (loading) return <div className="p-8 text-gray-400">Loading note details...</div>;
  if (!note) return <div className="p-8 text-red-500">Note not found or access denied.</div>;

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button 
          onClick={generatePDF}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm"
        >
          <Download className="w-4 h-4" /> Download PDF
        </button>
      </div>

      <div id="note-pdf-content" className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-8 md:p-10">
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
        <div className="ql-container ql-snow" style={{ border: 'none' }}>
          <div className="ql-editor !p-0 text-gray-800"
            dangerouslySetInnerHTML={{ __html: note.content_html }}
          />
        </div>

        <style>{`
          .ql-font-arial { font-family: 'Arial', sans-serif; }
          .ql-font-times-new-roman { font-family: 'Times New Roman', serif; }
          .ql-font-georgia { font-family: 'Georgia', serif; }
          .ql-font-courier-new { font-family: 'Courier New', monospace; }
          .ql-font-verdana { font-family: 'Verdana', sans-serif; }
          
          .ql-editor ul, .ql-editor ol {
            padding-left: 1.5rem !important;
            margin-bottom: 1rem;
          }
          .ql-editor ul > li {
            list-style-type: disc !important;
          }
          .ql-editor ol > li {
            list-style-type: decimal !important;
          }
          .ql-editor li::before {
            display: none !important;
          }
          .ql-editor img {
            max-width: 100%;
            height: auto;
          }
          /* Fix for alignment */
          .ql-align-center { text-align: center; }
          .ql-align-right { text-align: right; }
          .ql-align-justify { text-align: justify; }
        `}</style>
      </div>
    </div>
  );
};

export default NoteDetail;
