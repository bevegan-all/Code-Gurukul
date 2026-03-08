import React, { useEffect, useState } from 'react';
import { FileCode2, Plus, Trash2, Eye, EyeOff, X, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import api from '../../utils/axios';
import { useNavigate } from 'react-router-dom';

/* ─── Create Form Modal ─── */
const CreateForm = ({ subjects, defaultSubjectId, onSaved, onClose }) => {
  const defSub = subjects.find(s => String(s.subject_id) === String(defaultSubjectId));
  const [form, setForm] = useState({
    title: '', compiler_required: 'java', time_limit_minutes: 60, status: 'draft',
    subject_id: defSub?.subject_id || '',
    class_id: defSub?.class_id || '',
    sets: [{ name: 'Set A', questions: [{ question_text: '', expected_code: '' }] }]
  });
  const [saving, setSaving] = useState(null); // null | 'draft' | 'published'

  const addQ = () => setForm(f => { const s = [...f.sets]; s[0].questions = [...s[0].questions, { question_text: '', expected_code: '' }]; return { ...f, sets: s }; });
  const updateQ = (qi, field, val) => setForm(f => { const s = [...f.sets]; s[0].questions[qi][field] = val; return { ...f, sets: s }; });
  const removeQ = (qi) => setForm(f => { const s = [...f.sets]; s[0].questions = s[0].questions.filter((_, i) => i !== qi); return { ...f, sets: s }; });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.subject_id) return alert('Please select a subject');
    const publishStatus = e.nativeEvent.submitter ? e.nativeEvent.submitter.value : 'draft';
    setSaving(publishStatus);
    try {
      await api.post('/teacher/assignments', { ...form, status: publishStatus });
      onSaved();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create assignment');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">New Lab Assignment</h2>
            {defSub && <p className="text-xs text-purple-600 font-medium mt-0.5">{defSub.subject_name} · {defSub.class_name}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Title *</label>
            <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent"
              placeholder="e.g., Core Java Assignment 1 — OOP Concepts" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Subject *</label>
              <select required value={form.subject_id}
                onChange={e => { const s = subjects.find(x => String(x.subject_id) === e.target.value); setForm(f => ({ ...f, subject_id: e.target.value, class_id: s?.class_id || '' })); }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white">
                <option value="">Select…</option>
                {subjects.map(s => <option key={s.id} value={s.subject_id}>{s.subject_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Compiler</label>
              <select value={form.compiler_required} onChange={e => setForm(f => ({ ...f, compiler_required: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white">
                {['java', 'python', 'c', 'cpp', 'javascript', 'go'].map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Time (min)</label>
              <input type="number" min="0" value={form.time_limit_minutes} onChange={e => setForm(f => ({ ...f, time_limit_minutes: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Questions</label>
              <button type="button" onClick={addQ} className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-800 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Question
              </button>
            </div>
            <div className="space-y-3">
              {form.sets[0].questions.map((q, qi) => (
                <div key={qi} className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
                    <span className="text-xs font-bold text-gray-500">Question {qi + 1}</span>
                    {form.sets[0].questions.length > 1 && (
                      <button type="button" onClick={() => removeQ(qi)} className="text-red-400 hover:text-red-600 transition-colors"><X className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    <textarea required rows={2} value={q.question_text} onChange={e => updateQ(qi, 'question_text', e.target.value)}
                      placeholder="Problem statement / question for the student…"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none" />
                    <textarea required rows={3} value={q.expected_code} onChange={e => updateQ(qi, 'expected_code', e.target.value)}
                      placeholder="Reference solution (teacher's expected code — used for AI grading)…"
                      className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-purple-200 bg-gray-50 resize-none" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
            <div className="flex gap-2.5">
              <button type="submit" name="action" value="draft" disabled={!!saving}
                className="px-4 py-2.5 border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 text-sm font-bold rounded-xl flex items-center gap-2 disabled:opacity-60 transition-all">
                {saving === 'draft' ? 'Saving…' : '💾 Save Draft'}
              </button>
              <button type="submit" name="action" value="published" disabled={!!saving}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 disabled:opacity-60 transition-all shadow-sm">
                {saving === 'published' ? 'Publishing…' : '🚀 Publish Now'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Status Badge ─── */
const Badge = ({ status }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
    {status === 'published' ? '● Live' : '○ Draft'}
  </span>
);

/* ─── Main Page ─── */
const Assignments = () => {
  const [all, setAll] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selected, setSelected] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    const [aRes, sRes] = await Promise.all([
      api.get('/teacher/assignments').catch(() => ({ data: [] })),
      api.get('/teacher/my-subjects').catch(() => ({ data: [] }))
    ]);
    setAll(aRes.data);
    setSubjects(sRes.data);
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const toggleStatus = async (id, curr) => {
    await api.put(`/teacher/assignments/${id}`, { status: curr === 'published' ? 'draft' : 'published' });
    fetchData();
  };
  const del = async (id) => {
    if (!confirm('Delete this assignment? This cannot be undone.')) return;
    await api.delete(`/teacher/assignments/${id}`);
    fetchData();
  };

  const shown = selected === 'all' ? all : all.filter(a => String(a.subject_id) === String(selected));
  const countFor = (sid) => all.filter(a => String(a.subject_id) === String(sid)).length;
  const selectedSubjectName = subjects.find(s => String(s.subject_id) === String(selected))?.subject_name || null;

  return (
    <div className="flex gap-6 animate-in fade-in duration-300" style={{ minHeight: 'calc(100vh - 120px)' }}>

      {/* ── LEFT SIDEBAR ── */}
      <div className="w-56 flex-shrink-0">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-0">
          <div className="px-4 py-3 bg-gradient-to-br from-purple-600 to-purple-700">
            <p className="text-xs font-bold text-purple-200 uppercase tracking-widest">Subjects</p>
          </div>
          <div className="p-2 space-y-0.5">
            <button onClick={() => setSelected('all')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${selected === 'all' ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
              <span className="flex items-center gap-2.5">
                <div className={`w-1.5 h-1.5 rounded-full ${selected === 'all' ? 'bg-purple-500' : 'bg-gray-300'}`} />
                All
              </span>
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${selected === 'all' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>{all.length}</span>
            </button>
            {subjects.map(s => (
              <button key={s.id} onClick={() => setSelected(s.subject_id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left group ${String(selected) === String(s.subject_id) ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                <span className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${String(selected) === String(s.subject_id) ? 'bg-purple-500' : 'bg-gray-300'}`} />
                  <span className="truncate">{s.subject_name}</span>
                </span>
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1 ${String(selected) === String(s.subject_id) ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>{countFor(s.subject_id)}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-gray-100 p-2">
            <button onClick={() => navigate('/teacher/subjects')}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all">
              <ChevronRight className="w-3.5 h-3.5" />
              Open in Subjects
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT CONTENT ── */}
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lab Assignments</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {selected === 'all' ? `Showing all ${all.length} assignments` : `${selectedSubjectName} — ${shown.length} assignment${shown.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-colors">
            <Plus className="w-4 h-4" /> New Assignment
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mr-3" />
            Loading assignments…
          </div>
        ) : shown.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-20 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileCode2 className="w-8 h-8 text-gray-300" />
            </div>
            <p className="font-semibold text-gray-600 mb-1">No assignments {selected !== 'all' ? 'for this subject' : 'yet'}</p>
            <p className="text-sm text-gray-400 mb-5">Create an assignment for your students to solve in the lab.</p>
            <button onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-colors">
              <Plus className="w-4 h-4" /> Create Assignment
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map(a => (
              <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                      <h3 className="font-bold text-gray-900 text-base">{a.title}</h3>
                      <Badge status={a.status} />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {a.subject_name && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full">
                          {a.subject_name}
                          {a.class_name && ` · ${a.class_name}`}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full capitalize">
                        {a.compiler_required}
                      </span>
                      {a.time_limit_minutes && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full">
                          <Clock className="w-3 h-3" /> {a.time_limit_minutes} min
                        </span>
                      )}
                    </div>
                    {a.description && <p className="text-sm text-gray-400 mt-2 line-clamp-1">{a.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => toggleStatus(a.id, a.status)}
                      title={a.status === 'published' ? 'Unpublish' : 'Publish'}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${a.status === 'published' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                      {a.status === 'published' ? <><Eye className="w-3.5 h-3.5" /> Published</> : <><EyeOff className="w-3.5 h-3.5" /> Draft</>}
                    </button>
                    <button onClick={() => del(a.id)}
                      className="p-2 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateForm subjects={subjects} defaultSubjectId={selected}
          onSaved={() => { setShowCreate(false); fetchData(); }}
          onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
};

export default Assignments;
