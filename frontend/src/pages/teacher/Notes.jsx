import React, { useEffect, useState } from 'react';
import { NotebookPen, Plus, Trash2, Eye, EyeOff, X, CheckCircle2, ChevronRight, Edit2 } from 'lucide-react';
import api from '../../utils/axios';
import { useNavigate } from 'react-router-dom';

/* ─── Create / Edit Form Modal ─── */
const NoteForm = ({ subjects, defaultSubjectId, editNote, onSaved, onClose }) => {
  const defSub = subjects.find(s => String(s.subject_id) === String(defaultSubjectId));
  const [form, setForm] = useState({
    title: editNote?.title || '',
    content_html: editNote?.content_html || '',
    status: editNote?.status || 'draft',
    subject_id: editNote?.subject_id || defSub?.subject_id || '',
    class_id: editNote?.class_id || defSub?.class_id || '',
  });
  const [saving, setSaving] = useState(null); // null | 'draft' | 'published'

  const submit = async (e, publishStatus) => {
    e.preventDefault();
    setSaving(publishStatus);
    try {
      if (editNote) await api.put(`/teacher/notes/${editNote._id}`, { ...form, status: publishStatus });
      else await api.post('/teacher/notes', { ...form, status: publishStatus });
      onSaved();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save note');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{editNote ? 'Edit Note' : 'New Note'}</h2>
            {defSub && !editNote && <p className="text-xs text-emerald-600 font-medium mt-0.5">{defSub.subject_name}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Title *</label>
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                placeholder="e.g., Introduction to OOP" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Subject</label>
              <select value={form.subject_id}
                onChange={e => { const s = subjects.find(x => String(x.subject_id) === e.target.value); setForm(f => ({ ...f, subject_id: e.target.value, class_id: s?.class_id || '' })); }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white">
                <option value="">All subjects</option>
                {subjects.map(s => <option key={s.id} value={s.subject_id}>{s.subject_name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Content * <span className="normal-case text-gray-400 font-normal">(HTML supported)</span></label>
            </div>
            <textarea required value={form.content_html} onChange={e => setForm(f => ({ ...f, content_html: e.target.value }))}
              rows={13} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-gray-50 resize-none"
              placeholder={"<h2>Introduction to OOP</h2>\n<p>Object Oriented Programming is a paradigm...</p>\n\n<h3>Key Concepts</h3>\n<ul>\n  <li>Encapsulation</li>\n  <li>Inheritance</li>\n</ul>\n\n<pre><code>class Hello {\n  public static void main(String[] args) {\n    System.out.println(\"Hello World\");\n  }\n}</code></pre>"} />
            <p className="text-xs text-gray-400 mt-1.5">Use HTML tags: &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;code&gt;, &lt;pre&gt;, &lt;strong&gt;, &lt;em&gt;</p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
            <div className="flex gap-2.5">
              <button type="button" disabled={!!saving} onClick={e => submit(e, 'draft')}
                className="px-4 py-2.5 border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 text-sm font-bold rounded-xl flex items-center gap-2 disabled:opacity-60 transition-all">
                {saving === 'draft' ? 'Saving…' : '💾 Save Draft'}
              </button>
              <button type="button" disabled={!!saving} onClick={e => submit(e, 'published')}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 disabled:opacity-60 transition-all shadow-sm">
                {saving === 'published' ? 'Publishing…' : (editNote ? '🚀 Update & Publish' : '🚀 Publish Now')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

const Badge = ({ status }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
    {status === 'published' ? '● Live' : '○ Draft'}
  </span>
);

/* ─── Main Notes Page ─── */
const Notes = () => {
  const [all, setAll] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selected, setSelected] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editNote, setEditNote] = useState(null);
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    const [nRes, sRes] = await Promise.all([
      api.get('/teacher/notes').catch(() => ({ data: [] })),
      api.get('/teacher/my-subjects').catch(() => ({ data: [] }))
    ]);
    setAll(nRes.data);
    setSubjects(sRes.data);
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const toggleStatus = async (n) => {
    await api.put(`/teacher/notes/${n._id}`, { ...n, status: n.status === 'published' ? 'draft' : 'published' });
    fetchData();
  };
  const del = async (id) => { if (!confirm('Delete this note?')) return; await api.delete(`/teacher/notes/${id}`); fetchData(); };
  const openEdit = (n) => { setEditNote(n); setShowForm(true); };
  const openCreate = () => { setEditNote(null); setShowForm(true); };

  const shown = selected === 'all' ? all : all.filter(n => String(n.subject_id) === String(selected));
  const countFor = (sid) => all.filter(n => String(n.subject_id) === String(sid)).length;
  const selectedSubjectName = subjects.find(s => String(s.subject_id) === String(selected))?.subject_name || null;
  const getSubjectName = (sid) => subjects.find(s => String(s.subject_id) === String(sid))?.subject_name || null;

  return (
    <div className="flex gap-6 animate-in fade-in duration-300" style={{ minHeight: 'calc(100vh - 120px)' }}>

      {/* ── LEFT SIDEBAR ── */}
      <div className="w-56 flex-shrink-0">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-0">
          <div className="px-4 py-3 bg-gradient-to-br from-emerald-600 to-emerald-700">
            <p className="text-xs font-bold text-emerald-200 uppercase tracking-widest">Subjects</p>
          </div>
          <div className="p-2 space-y-0.5">
            <button onClick={() => setSelected('all')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${selected === 'all' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
              <span className="flex items-center gap-2.5">
                <div className={`w-1.5 h-1.5 rounded-full ${selected === 'all' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                All
              </span>
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${selected === 'all' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{all.length}</span>
            </button>
            {subjects.map(s => (
              <button key={s.id} onClick={() => setSelected(s.subject_id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${String(selected) === String(s.subject_id) ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                <span className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${String(selected) === String(s.subject_id) ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  <span className="truncate">{s.subject_name}</span>
                </span>
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1 ${String(selected) === String(s.subject_id) ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{countFor(s.subject_id)}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-gray-100 p-2">
            <button onClick={() => navigate('/teacher/subjects')}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all">
              <ChevronRight className="w-3.5 h-3.5" /> Open in Subjects
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT CONTENT ── */}
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notes</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {selected === 'all' ? `Showing all ${all.length} notes` : `${selectedSubjectName} — ${shown.length} note${shown.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-colors">
            <Plus className="w-4 h-4" /> New Note
          </button>
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
            <p className="font-semibold text-gray-600 mb-1">No notes {selected !== 'all' ? 'for this subject' : 'yet'}</p>
            <p className="text-sm text-gray-400 mb-5">Create rich HTML notes and publish them to your students.</p>
            <button onClick={openCreate}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-colors">
              <Plus className="w-4 h-4" /> Create Note
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {shown.map(n => {
              const subName = getSubjectName(n.subject_id);
              return (
                <div key={n._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all p-5 group">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge status={n.status} />
                      {subName && (
                        <span className="inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">{subName}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={() => openEdit(n)}
                        className="p-1.5 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors" title="Edit">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => toggleStatus(n)}
                        className={`p-1.5 rounded-lg transition-colors ${n.status === 'published' ? 'bg-amber-50 text-amber-500 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100'}`}
                        title={n.status === 'published' ? 'Unpublish' : 'Publish'}>
                        {n.status === 'published' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => del(n._id)}
                        className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-colors" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 text-base mb-2">{n.title}</h3>
                  {n.content_html && (
                    <div className="text-xs text-gray-400 line-clamp-3 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: n.content_html.replace(/<[^>]+>/g, ' ').substring(0, 200) + '…' }} />
                  )}
                  <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(n)} className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                      <Edit2 className="w-3 h-3" /> Edit note
                    </button>
                    <button onClick={() => toggleStatus(n)} className={`text-xs font-semibold flex items-center gap-1 ${n.status === 'published' ? 'text-amber-600 hover:text-amber-800' : 'text-emerald-600 hover:text-emerald-800'}`}>
                      {n.status === 'published' ? <><EyeOff className="w-3 h-3" /> Unpublish</> : <><Eye className="w-3 h-3" /> Publish</>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <NoteForm subjects={subjects} defaultSubjectId={selected} editNote={editNote}
          onSaved={() => { setShowForm(false); setEditNote(null); fetchData(); }}
          onClose={() => { setShowForm(false); setEditNote(null); }} />
      )}
    </div>
  );
};

export default Notes;
