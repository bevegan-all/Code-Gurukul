import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileCode2, BookOpen, NotebookPen, GraduationCap, Plus, Eye, EyeOff, Trash2, X, CheckCircle2, Clock } from 'lucide-react';
import api from '../../utils/axios';

/* ─────────────── helpers ─────────────── */
const Badge = ({ status }) => (
  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
    {status}
  </span>
);

/* ─────────────── Assignment mini-form ─────────────── */
const AssignmentForm = ({ subject, onSaved, onClose }) => {
  const [form, setForm] = useState({
    title: '', compiler_required: 'java', time_limit_minutes: 60, status: 'draft', description: '',
    subject_id: subject.subject_id, class_id: subject.class_id,
    sets: [{ name: 'Set A', questions: [{ question_text: '', expected_code: '' }] }]
  });
  const [saving, setSaving] = useState(null); // null | 'draft' | 'published'

  const addQuestion = () => setForm(f => ({
    ...f,
    sets: [{ ...f.sets[0], questions: [...f.sets[0].questions, { question_text: '', expected_code: '' }] }]
  }));
  const updateQ = (qi, field, val) => setForm(f => {
    const newQs = [...f.sets[0].questions];
    newQs[qi] = { ...newQs[qi], [field]: val };
    return { ...f, sets: [{ ...f.sets[0], questions: newQs }] };
  });
  const removeQ = (qi) => setForm(f => ({
    ...f,
    sets: [{ ...f.sets[0], questions: f.sets[0].questions.filter((_, i) => i !== qi) }]
  }));

  const submit = async (e) => {
    e.preventDefault();
    const publishStatus = e.nativeEvent.submitter ? e.nativeEvent.submitter.value : 'draft';
    setSaving(publishStatus);
    try {
      await api.post('/teacher/assignments', { ...form, status: publishStatus });
      onSaved();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setSaving(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">New Lab Assignment</h2>
            <p className="text-xs text-gray-400 mt-0.5">{subject.subject_name} · {subject.class_name || 'N/A'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          {/* Row 1 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Title *</label>
            <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              placeholder="e.g., Core Java Assignment 1 — OOP Concepts" />
          </div>
          {/* Row 2 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Compiler</label>
              <select value={form.compiler_required} onChange={e => setForm(f => ({ ...f, compiler_required: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                {['java', 'python', 'c', 'cpp', 'javascript', 'go'].map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time (min)</label>
              <input type="number" min="0" value={form.time_limit_minutes} onChange={e => setForm(f => ({ ...f, time_limit_minutes: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>
          </div>
          {/* Questions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-800 text-sm">Questions</h3>
              <button type="button" onClick={addQuestion} className="text-xs text-purple-600 hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Add Question</button>
            </div>
            <div className="space-y-3">
              {form.sets[0].questions.map((q, qi) => (
                <div key={qi} className="bg-gray-50 rounded-xl p-3 space-y-2 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500">Q{qi + 1}</span>
                    {form.sets[0].questions.length > 1 && <button type="button" onClick={() => removeQ(qi)} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>}
                  </div>
                  <textarea required rows={2} value={q.question_text} onChange={e => updateQ(qi, 'question_text', e.target.value)}
                    placeholder="Problem statement / question for the student..."
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-200 bg-white" />
                  <textarea required rows={3} value={q.expected_code} onChange={e => updateQ(qi, 'expected_code', e.target.value)}
                    placeholder="Your reference/expected solution code (used for AI grading)..."
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-purple-200 bg-white" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
            <div className="flex gap-2">
              <button type="submit" name="action" value="draft" disabled={!!saving}
                className="px-4 py-2 border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 text-sm font-semibold rounded-xl flex items-center gap-2 disabled:opacity-60 transition-colors">
                {saving === 'draft' ? 'Saving…' : '💾 Save Draft'}
              </button>
              <button type="submit" name="action" value="published" disabled={!!saving}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 disabled:opacity-60 transition-colors shadow-sm">
                {saving === 'published' ? 'Publishing…' : '🚀 Publish'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─────────────── Quiz mini-form ─────────────── */
const QuizForm = ({ subject, onSaved, onClose }) => {
  const [form, setForm] = useState({
    title: '', time_limit_minutes: 30, status: 'draft',
    subject_id: subject.subject_id, class_id: subject.class_id,
    questions: [{ question_text: '', question_type: 'single', options: ['', '', '', ''], correct: 0 }]
  });
  const [saving, setSaving] = useState(null);

  const addQ = () => setForm(f => ({ ...f, questions: [...f.questions, { question_text: '', question_type: 'single', options: ['', '', '', ''], correct: 0 }] }));
  const removeQ = (i) => setForm(f => ({ ...f, questions: f.questions.filter((_, j) => j !== i) }));
  const updateQ = (qi, field, val) => setForm(f => { const qs = [...f.questions]; qs[qi][field] = val; return { ...f, questions: qs }; });
  const updateOpt = (qi, oi, val) => setForm(f => { const qs = [...f.questions]; qs[qi].options[oi] = val; return { ...f, questions: qs }; });

  const submit = async (e) => {
    e.preventDefault();
    const publishStatus = e.nativeEvent.submitter ? e.nativeEvent.submitter.value : 'draft';
    setSaving(publishStatus);
    try {
      const payload = {
        ...form,
        status: publishStatus,
        questions: form.questions.map(q => ({
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options.map((text, i) => ({ option_text: text, is_correct: i === q.correct }))
        }))
      };
      await api.post('/teacher/quizzes', payload);
      onSaved();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setSaving(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">New Quiz</h2>
            <p className="text-xs text-gray-400 mt-0.5">{subject.subject_name} · {subject.class_name || 'N/A'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Quiz Title *</label>
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                placeholder="e.g., Unit 1 OOP Quiz" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time (min)</label>
              <input type="number" min="1" value={form.time_limit_minutes} onChange={e => setForm(f => ({ ...f, time_limit_minutes: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-800 text-sm">MCQ Questions</h3>
              <button type="button" onClick={addQ} className="text-xs text-purple-600 hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Add Question</button>
            </div>
            <div className="space-y-4">
              {form.questions.map((q, qi) => (
                <div key={qi} className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-full px-2 py-0.5">Q{qi + 1}</span>
                    {form.questions.length > 1 && <button type="button" onClick={() => removeQ(qi)} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>}
                  </div>
                  <input required value={q.question_text} onChange={e => updateQ(qi, 'question_text', e.target.value)}
                    placeholder="Question text..."
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-200 bg-white" />
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, oi) => (
                      <label key={oi} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition-colors ${q.correct === oi ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                        <input type="radio" name={`q${qi}_correct`} checked={q.correct === oi} onChange={() => updateQ(qi, 'correct', oi)} className="accent-emerald-500 flex-shrink-0" />
                        <input value={opt} onChange={e => updateOpt(qi, oi, e.target.value)}
                          placeholder={`Option ${oi + 1}`} required
                          className="flex-1 text-sm bg-transparent border-none outline-none min-w-0"
                          onClick={e => e.stopPropagation()} />
                        {q.correct === oi && <span className="text-xs text-emerald-600 font-semibold flex-shrink-0">✓</span>}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">Click the radio button on the correct answer option.</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
            <div className="flex gap-2">
              <button type="submit" name="action" value="draft" disabled={!!saving}
                className="px-4 py-2 border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 text-sm font-semibold rounded-xl flex items-center gap-2 disabled:opacity-60 transition-colors">
                {saving === 'draft' ? 'Saving…' : '💾 Save Draft'}
              </button>
              <button type="submit" name="action" value="published" disabled={!!saving}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 disabled:opacity-60 transition-colors shadow-sm">
                {saving === 'published' ? 'Publishing…' : '🚀 Publish'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─────────────── Note mini-form ─────────────── */
const NoteForm = ({ subject, note, onSaved, onClose }) => {
  const [form, setForm] = useState({
    title: note?.title || '',
    content_html: note?.content_html || '',
    status: note?.status || 'draft',
    subject_id: subject.subject_id, class_id: subject.class_id
  });
  const [saving, setSaving] = useState(null); // null | 'draft' | 'published'

  const handleSave = async (e) => {
    e.preventDefault();
    const publishStatus = e.nativeEvent.submitter ? e.nativeEvent.submitter.value : 'draft';
    setSaving(publishStatus);
    try {
      const data = { ...form, status: publishStatus };
      if (note) await api.put(`/teacher/notes/${note._id}`, data);
      else await api.post('/teacher/notes', data);
      onSaved();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save note');
    } finally { setSaving(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{note ? 'Edit Note' : 'New Note'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{subject.subject_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" placeholder="Note title..." />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content (HTML supported) *</label>
            <textarea required value={form.content_html} onChange={e => setForm(f => ({ ...f, content_html: e.target.value }))}
              rows={14} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-300"
              placeholder={"<h2>Introduction to OOP</h2>\n<p>Object Oriented Programming is...</p>\n<pre><code>class Hello {\n  public static void main(String[] args) {\n    System.out.println(\"Hello\");\n  }\n}</code></pre>"} />
          </div>
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
            <div className="flex gap-2">
              <button type="submit" name="action" value="draft" disabled={!!saving}
                className="px-4 py-2 border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 text-sm font-semibold rounded-xl flex items-center gap-2 disabled:opacity-60 transition-colors">
                {saving === 'draft' ? 'Saving…' : '💾 Save Draft'}
              </button>
              <button type="submit" name="action" value="published" disabled={!!saving}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 disabled:opacity-60 transition-colors shadow-sm">
                {saving === 'published' ? (note ? 'Updating…' : 'Publishing…') : (note ? '📝 Update & Publish' : '🚀 Publish')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─────────────── MAIN SUBJECT DETAIL PAGE ─────────────── */
const SubjectDetail = () => {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const [subject, setSubject] = useState(null);
  const [tab, setTab] = useState(new URLSearchParams(window.location.search).get('tab') || 'assignments');
  const [assignments, setAssignments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [notes, setNotes] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(null); // 'assignment' | 'quiz' | 'note' | null
  const [editNote, setEditNote] = useState(null);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const [sRes, aRes, qRes, nRes, stRes] = await Promise.all([
          api.get('/teacher/my-subjects').catch(() => ({ data: [] })),
          api.get('/teacher/assignments').catch(() => ({ data: [] })),
          api.get('/teacher/quizzes').catch(() => ({ data: [] })),
          api.get('/teacher/notes').catch(() => ({ data: [] })),
          api.get(`/teacher/my-students-by-subject/${subjectId}`).catch(() => ({ data: [] })),
        ]);
        const sub = (sRes.data || []).find(s => String(s.subject_id) === String(subjectId));
        setSubject(sub || null);
        setAssignments((aRes.data || []).filter(a => String(a.subject_id) === String(subjectId)));
        setQuizzes((qRes.data || []).filter(q => String(q.subject_id) === String(subjectId)));
        setNotes((nRes.data || []).filter(n => String(n.subject_id) === String(subjectId)));
        setStudents((stRes.data || []));
      } catch (err) {
        console.error("Failed to load subject detail:", err);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, [subjectId]);

  const refetch = async () => {
    setShowForm(null);
    setEditNote(null);
    const [aRes, qRes, nRes] = await Promise.all([
      api.get('/teacher/assignments').catch(() => ({ data: [] })),
      api.get('/teacher/quizzes').catch(() => ({ data: [] })),
      api.get('/teacher/notes').catch(() => ({ data: [] })),
    ]);
    setAssignments((aRes.data || []).filter(a => String(a.subject_id) === String(subjectId)));
    setQuizzes((qRes.data || []).filter(q => String(q.subject_id) === String(subjectId)));
    setNotes((nRes.data || []).filter(n => String(n.subject_id) === String(subjectId)));
  };

  const toggleStatus = async (type, id, curr) => {
    const ns = curr === 'published' ? 'draft' : 'published';
    await api.put(`/teacher/${type}/${id}`, { status: ns });
    refetch();
  };
  const deleteItem = async (type, id, mongo) => {
    if (!confirm('Delete this item?')) return;
    await api.delete(`/teacher/${type}/${mongo ? id : id}`);
    refetch();
  };

  if (loading) return <div className="p-8 text-gray-400 animate-pulse">Loading subject...</div>;
  if (!subject) return (
    <div className="p-8 text-center">
      <p className="text-gray-500 mb-4">Subject not found.</p>
      <button onClick={() => navigate('/teacher/subjects')} className="text-purple-600 hover:underline text-sm">← Back to Subjects</button>
    </div>
  );

  const tabs = [
    { key: 'assignments', label: 'Lab Assignments', icon: FileCode2 },
    { key: 'quizzes', label: 'Quizzes', icon: BookOpen },
    { key: 'notes', label: 'Notes', icon: NotebookPen },
    { key: 'students', label: 'Students', icon: GraduationCap },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header - Old UI format */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/teacher/subjects')} className="text-gray-400 hover:text-gray-700 transition-colors flex mt-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold border-gray-900 text-gray-800 tracking-tight">{subject.subject_name}</h1>
        <span className={`px-2 py-0.5 text-xs font-bold rounded-full uppercase ${subject.type === 'major' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
          {subject.type}
        </span>
      </div>

      {/* Tabs - Old UI format without counts */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        {tabs.map(t => (
          <button key={t.key} 
            onClick={() => {
              setTab(t.key);
              navigate(`/teacher/subjects/${subjectId}?tab=${t.key}`, { replace: true });
            }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t.key ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full min-h-[300px]">
        {/* ── ASSIGNMENTS tab ── */}
        {tab === 'assignments' && (
          <div className="p-6">
            <div className="flex justify-end mb-4">
              <button onClick={() => setShowForm('assignment')} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-medium text-sm shadow-sm transition-colors">
                <Plus className="w-4 h-4" /> New Assignment
              </button>
            </div>
            {assignments.length === 0 ? (
              <div className="p-16 text-center">
                <FileCode2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No lab assignments created yet.</p>
              </div>
            ) : assignments.map(a => (
              <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-900">{a.title}</h3>
                    <Badge status={a.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                    <span className="capitalize">{a.compiler_required}</span>
                    {a.time_limit_minutes && <><span>·</span><span className="flex items-center gap-1"><Clock className="w-3 h-3" />{a.time_limit_minutes}min</span></>}
                    {a.description && <><span>·</span><span className="line-clamp-1">{a.description}</span></>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => toggleStatus('assignments', a.id, a.status)} title={a.status === 'published' ? 'Unpublish' : 'Publish'}
                    className={`p-2 rounded-lg transition-colors ${a.status === 'published' ? 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                    {a.status === 'published' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => deleteItem('assignments', a.id)} className="p-2 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── QUIZZES tab ── */}
        {tab === 'quizzes' && (
          <div className="p-6">
            <div className="flex justify-end mb-4">
              <button onClick={() => setShowForm('quiz')} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-medium text-sm shadow-sm transition-colors">
                <Plus className="w-4 h-4" /> New Quiz
              </button>
            </div>
            {quizzes.length === 0 ? (
              <div className="p-16 text-center">
                <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No quizzes created yet.</p>
              </div>
            ) : quizzes.map(q => (
              <div key={q.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-900">{q.title}</h3>
                    <Badge status={q.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    {q.time_limit_minutes && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{q.time_limit_minutes}min</span>}
                    {q.questions_count > 0 && <><span>·</span><span>{q.questions_count} questions</span></>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => toggleStatus('quizzes', q.id, q.status)}
                    className={`p-2 rounded-lg transition-colors ${q.status === 'published' ? 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                    {q.status === 'published' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => deleteItem('quizzes', q.id)} className="p-2 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── NOTES tab ── */}
        {tab === 'notes' && (
          <div className="p-6">
            <div className="flex justify-end mb-4">
              <button onClick={() => { setEditNote(null); setShowForm('note'); }} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-medium text-sm shadow-sm transition-colors">
                <Plus className="w-4 h-4" /> New Note
              </button>
            </div>
            {notes.length === 0 ? (
              <div className="p-16 text-center">
                <NotebookPen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No notes created yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {notes.map(n => (
                  <div key={n._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <Badge status={n.status} />
                      <div className="flex gap-1.5">
                        <button onClick={() => { setEditNote(n); setShowForm('note'); }} className="p-1.5 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100"><FileCode2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => toggleStatus('notes', n._id, n.status)}
                          className={`p-1.5 rounded-lg transition-colors ${n.status === 'published' ? 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                          {n.status === 'published' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => deleteItem('notes', n._id, true)} className="p-1.5 bg-red-50 text-red-400 rounded-lg hover:bg-red-100 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <h3 className="font-bold text-gray-900">{n.title}</h3>
                    {n.content_html && <div className="text-xs text-gray-400 mt-1 line-clamp-3" dangerouslySetInnerHTML={{ __html: n.content_html.substring(0, 200) }} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STUDENTS tab ── */}
        {tab === 'students' && (
          <div className="p-0">
            {students.length === 0 ? (
              <div className="p-16 text-center">
                <GraduationCap className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No students enrolled in this class yet.</p>
              </div>
            ) : (
              <div>
                <div className="px-5 py-4 border-b border-gray-50 text-sm font-medium text-gray-500">{students.length} student{students.length !== 1 ? 's' : ''} {subject.class_name ? `in ${subject.class_name}` : 'assigned'}</div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50/60 text-gray-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3 text-left font-semibold">Name</th>
                      <th className="px-5 py-3 text-left font-semibold">Roll No</th>
                      <th className="px-5 py-3 text-left font-semibold">Email</th>
                      <th className="px-5 py-3 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {students.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs flex-shrink-0">{s.name?.charAt(0).toUpperCase()}</div>
                            <span className="font-medium text-gray-900">{s.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-gray-500">{s.roll_no || '—'}</td>
                        <td className="px-5 py-4 text-gray-500">{s.email}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{s.is_active ? 'Active' : 'Inactive'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Forms */}
      {showForm === 'assignment' && <AssignmentForm subject={subject} onSaved={refetch} onClose={() => setShowForm(null)} />}
      {showForm === 'quiz' && <QuizForm subject={subject} onSaved={refetch} onClose={() => setShowForm(null)} />}
      {showForm === 'note' && <NoteForm subject={subject} note={editNote} onSaved={refetch} onClose={() => { setShowForm(null); setEditNote(null); }} />}
    </div>
  );
};

export default SubjectDetail;
