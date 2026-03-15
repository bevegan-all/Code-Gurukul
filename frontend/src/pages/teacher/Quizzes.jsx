import React, { useEffect, useState } from 'react';
import { BookOpen, Plus, Trash2, Eye, EyeOff, X, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import api from '../../utils/axios';
import { useNavigate } from 'react-router-dom';

/* ─── Create Form Modal ─── */
const CreateForm = ({ subjects, defaultSubjectId, onSaved, onClose }) => {
  const defSub = subjects.find(s => String(s.subject_id) === String(defaultSubjectId));
  const [form, setForm] = useState({
    title: '', time_limit_minutes: 30, status: 'draft',
    subject_id: defSub?.subject_id || '',
    class_id: defSub?.class_id || '',
    target_labs: [],
    questions: [{ question_text: '', question_type: 'single', options: ['', '', '', ''], correct: 0 }]
  });
  const [saving, setSaving] = useState(null); // null | 'draft' | 'published'
  const [availableLabs, setAvailableLabs] = useState([]);

  useEffect(() => {
    if (!form.subject_id) {
      setAvailableLabs([]);
      return;
    }
    const sub = subjects.find(s => String(s.subject_id) === String(form.subject_id));
    if (!sub) return;

    if (sub.type === 'major' && form.class_id) {
      api.get(`/teacher/labs/${form.class_id}`).then(res => setAvailableLabs(res.data)).catch(console.error);
    } else if (sub.type === 'minor') {
      api.get(`/teacher/minor-labs/${form.subject_id}`).then(res => setAvailableLabs(res.data)).catch(console.error);
    } else {
      setAvailableLabs([]);
    }
  }, [form.subject_id, form.class_id, subjects]);

  const toggleLab = (labId) => {
    setForm(f => ({
      ...f,
      target_labs: f.target_labs.includes(String(labId))
        ? f.target_labs.filter(id => id !== String(labId))
        : [...f.target_labs, String(labId)]
    }));
  };

  const addQ = () => setForm(f => ({ ...f, questions: [...f.questions, { question_text: '', question_type: 'single', options: ['', '', '', ''], correct: 0 }] }));
  const removeQ = (i) => setForm(f => ({ ...f, questions: f.questions.filter((_, j) => j !== i) }));
  const updateQ = (qi, field, val) => setForm(f => { const qs = [...f.questions]; qs[qi][field] = val; return { ...f, questions: qs }; });
  const updateOpt = (qi, oi, val) => setForm(f => { const qs = [...f.questions]; qs[qi].options[oi] = val; return { ...f, questions: qs }; });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.subject_id) return alert('Please select a subject');
    const publishStatus = e.nativeEvent.submitter ? e.nativeEvent.submitter.value : 'draft';
    setSaving(publishStatus);
    try {
      const payload = {
        ...form,
        status: publishStatus,
        questions: form.questions.map(q => ({
          question_text: q.question_text, question_type: q.question_type,
          options: q.options.map((text, i) => ({ option_text: text, is_correct: i === q.correct }))
        }))
      };
      await api.post('/teacher/quizzes', payload);
      onSaved();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create quiz');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">New Quiz</h2>
            {defSub && <p className="text-xs text-purple-600 font-medium mt-0.5">{defSub.subject_name} · {defSub.class_name}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Quiz Title *</label>
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                placeholder="e.g., Unit 1 OOP Quiz" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Time (min)</label>
              <input type="number" min="1" value={form.time_limit_minutes} onChange={e => setForm(f => ({ ...f, time_limit_minutes: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Subject *</label>
            <select required value={form.subject_id}
              onChange={e => { const s = subjects.find(x => String(x.subject_id) === e.target.value); setForm(f => ({ ...f, subject_id: e.target.value, class_id: s?.class_id || '' })); }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white">
              <option value="">Select subject…</option>
              {subjects.map(s => <option key={s.id} value={s.subject_id}>{s.subject_name} — {s.class_name}</option>)}
            </select>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Target Lab Batches <span className="text-gray-400 font-normal lowercase">(optional)</span></label>
            {availableLabs.length === 0 ? (
              <p className="text-sm text-gray-500 italic bg-gray-50 p-2 rounded-lg">Select a subject first to fetch its lab batches.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableLabs.map(lab => (
                  <label key={lab.id} className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg cursor-pointer transition-all ${form.target_labs.includes(String(lab.id)) ? 'bg-blue-50 border-blue-200 shadow-sm' : 'hover:bg-gray-50'}`}>
                    <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={form.target_labs.includes(String(lab.id))} onChange={() => toggleLab(lab.id)} />
                    <span className="text-sm font-medium text-gray-700">{lab.name} {lab.roll_from ? `(${lab.roll_from}-${lab.roll_to})` : ''}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">MCQ Questions</label>
              <button type="button" onClick={addQ} className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-800">
                <Plus className="w-3.5 h-3.5" /> Add Question
              </button>
            </div>
            <div className="space-y-4">
              {form.questions.map((q, qi) => (
                <div key={qi} className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
                    <span className="text-xs font-bold text-gray-500">Question {qi + 1}</span>
                    {form.questions.length > 1 && <button type="button" onClick={() => removeQ(qi)} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>}
                  </div>
                  <div className="p-4 space-y-3">
                    <input required value={q.question_text} onChange={e => updateQ(qi, 'question_text', e.target.value)}
                      placeholder="Enter the question…"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-200" />
                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((opt, oi) => (
                        <label key={oi}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer border-2 transition-all ${q.correct === oi ? 'border-emerald-400 bg-emerald-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}>
                          <input type="radio" name={`q${qi}_c`} checked={q.correct === oi} onChange={() => updateQ(qi, 'correct', oi)} className="accent-emerald-500 flex-shrink-0" />
                          <input value={opt} onChange={e => updateOpt(qi, oi, e.target.value)} required
                            placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                            className="flex-1 text-sm bg-transparent border-none outline-none min-w-0"
                            onClick={e => e.stopPropagation()} />
                          {q.correct === oi && <span className="text-emerald-600 font-bold text-xs flex-shrink-0">✓</span>}
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400">Select the radio button on the correct option.</p>
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
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 disabled:opacity-60 transition-all shadow-sm">
                {saving === 'published' ? 'Publishing…' : '🚀 Publish Now'}
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

/* ─── Main Quizzes Page ─── */
const Quizzes = () => {
  const [all, setAll] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selected, setSelected] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    const [qRes, sRes] = await Promise.all([
      api.get('/teacher/quizzes').catch(() => ({ data: [] })),
      api.get('/teacher/my-subjects').catch(() => ({ data: [] }))
    ]);
    setAll(qRes.data);
    setSubjects(sRes.data);
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const toggleStatus = async (id, curr) => { await api.put(`/teacher/quizzes/${id}`, { status: curr === 'published' ? 'draft' : 'published' }); fetchData(); };
  const del = async (id) => { if (!confirm('Delete this quiz?')) return; await api.delete(`/teacher/quizzes/${id}`); fetchData(); };

  const shown = selected === 'all' ? all : all.filter(q => String(q.subject_id) === String(selected));
  const countFor = (sid) => all.filter(q => String(q.subject_id) === String(sid)).length;
  const selectedSubjectName = subjects.find(s => String(s.subject_id) === String(selected))?.subject_name || null;

  return (
    <div className="flex gap-6 animate-in fade-in duration-300" style={{ minHeight: 'calc(100vh - 120px)' }}>

      {/* ── LEFT SIDEBAR ── */}
      <div className="w-56 flex-shrink-0">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-0">
          <div className="px-4 py-3 bg-gradient-to-br from-blue-600 to-blue-700">
            <p className="text-xs font-bold text-blue-200 uppercase tracking-widest">Subjects</p>
          </div>
          <div className="p-2 space-y-0.5">
            <button onClick={() => setSelected('all')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${selected === 'all' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
              <span className="flex items-center gap-2.5">
                <div className={`w-1.5 h-1.5 rounded-full ${selected === 'all' ? 'bg-blue-500' : 'bg-gray-300'}`} />
                All
              </span>
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${selected === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{all.length}</span>
            </button>
            {subjects.map(s => (
              <button key={s.id} onClick={() => setSelected(s.subject_id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${String(selected) === String(s.subject_id) ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                <span className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${String(selected) === String(s.subject_id) ? 'bg-blue-500' : 'bg-gray-300'}`} />
                  <span className="truncate">{s.subject_name}</span>
                </span>
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1 ${String(selected) === String(s.subject_id) ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{countFor(s.subject_id)}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-gray-100 p-2">
            <button onClick={() => navigate('/teacher/subjects')}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
              <ChevronRight className="w-3.5 h-3.5" /> Open in Subjects
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT CONTENT ── */}
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quizzes</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {selected === 'all' ? `Showing all ${all.length} quizzes` : `${selectedSubjectName} — ${shown.length} quiz${shown.length !== 1 ? 'zes' : ''}`}
            </p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-colors">
            <Plus className="w-4 h-4" /> New Quiz
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mr-3" />
            Loading quizzes…
          </div>
        ) : shown.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-20 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-gray-300" />
            </div>
            <p className="font-semibold text-gray-600 mb-1">No quizzes {selected !== 'all' ? 'for this subject' : 'yet'}</p>
            <p className="text-sm text-gray-400 mb-5">Create an MCQ quiz for your students to attempt.</p>
            <button onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-colors">
              <Plus className="w-4 h-4" /> Create Quiz
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map(q => (
              <div key={q.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                      <h3 className="font-bold text-gray-900 text-base">{q.title}</h3>
                      <Badge status={q.status} />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {q.subject_name && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
                          {q.subject_name}{q.class_name && ` · ${q.class_name}`}
                        </span>
                      )}
                      {q.time_limit_minutes && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full">
                          <Clock className="w-3 h-3" /> {q.time_limit_minutes} min
                        </span>
                      )}
                      {q.questions_count > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full">
                          {q.questions_count} questions
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => toggleStatus(q.id, q.status)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${q.status === 'published' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                      {q.status === 'published' ? <><Eye className="w-3.5 h-3.5" /> Published</> : <><EyeOff className="w-3.5 h-3.5" /> Draft</>}
                    </button>
                    <button onClick={() => del(q.id)} className="p-2 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-all">
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

export default Quizzes;
