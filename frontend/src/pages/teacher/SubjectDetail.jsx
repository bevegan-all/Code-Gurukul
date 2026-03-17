import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileCode2, BookOpen, NotebookPen, GraduationCap, Plus, Eye, EyeOff, Trash2, X, CheckCircle2, Clock, Download } from 'lucide-react';
import api from '../../utils/axios';
import StudentDetailModal from '../../components/StudentDetailModal';
import html2pdf from 'html2pdf.js';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import ImageResize from '../../vendor/quill-image-resize/ImageResize';

window.Quill = Quill;
Quill.register('modules/imageResize', ImageResize);

const Font = Quill.import('formats/font');
Font.whitelist = ['arial', 'courier-new', 'georgia', 'times-new-roman', 'verdana'];
Quill.register(Font, true);

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    [{ 'font': [false, 'arial', 'courier-new', 'georgia', 'times-new-roman', 'verdana'] }],
    [{ 'size': ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'align': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['link', 'image', 'code-block'],
    ['clean']
  ],
  imageResize: {
    parchment: Quill.import('parchment'),
    modules: ['Resize', 'DisplaySize', 'Toolbar']
  }
};

/* ─────────────── helpers ─────────────── */
const Badge = ({ status }) => (
  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
    {status}
  </span>
);

/* ─────────────── Assignment mini-form ─────────────── */
const AssignmentForm = ({ subject, assignment, onSaved, onClose }) => {
  const [form, setForm] = useState({
    title: assignment?.title || '', 
    compiler_required: assignment?.compiler_required || 'java', 
    time_limit_minutes: assignment?.time_limit_minutes || 60, 
    status: assignment?.status || 'draft', 
    description: assignment?.description || '',
    subject_id: subject.subject_id, class_id: subject.class_id,
    sets: assignment?.AssignmentSets?.length > 0 
      ? assignment.AssignmentSets.map(s => ({
          id: s.id,
          name: s.set_name,
          questions: s.AssignmentQuestions.map(q => ({
            id: q.id,
            question_text: q.question_text,
            expected_code: q.expected_code,
            max_marks: q.max_marks
          }))
        }))
      : [{ name: 'Set A', questions: [{ question_text: '', expected_code: '' }] }]
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
      const data = { ...form, status: publishStatus };
      if (assignment) await api.put(`/teacher/assignments/${assignment.id}`, data);
      else await api.post('/teacher/assignments', data);
      onSaved();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setSaving(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{assignment ? 'Edit Lab Assignment' : 'New Lab Assignment'}</h2>
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
                {['java', 'python', 'c', 'cpp', 'javascript', 'go', 'r', 'postgresql', 'mongodb', 'hbase'].map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
              </select>
              {form.compiler_required === 'java' && (
                <p className="mt-1 text-[10px] text-amber-600 font-medium">
                  Note: Students must use 1st line as <b>public class Main</b> to run Java code.
                </p>
              )}
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
                {saving === 'published' ? (assignment ? 'Updating…' : 'Publishing…') : (assignment ? '📝 Update & Publish' : '🚀 Publish')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─────────────── Quiz mini-form ─────────────── */
const QuizForm = ({ subject, quiz, onSaved, onClose }) => {
  const [form, setForm] = useState({
    title: quiz?.title || '', 
    time_limit_minutes: quiz?.time_limit_minutes || 30, 
    status: quiz?.status || 'draft',
    subject_id: subject.subject_id, class_id: subject.class_id,
    questions: quiz?.QuizQuestions?.length > 0
      ? quiz.QuizQuestions.map(q => ({
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          correct: q.QuizOptions.findIndex(o => o.is_correct),
          multiselect: q.QuizOptions.map((o, i) => o.is_correct ? i : null).filter(i => i !== null),
          options: q.QuizOptions.map(o => o.option_text),
          optionIds: q.QuizOptions.map(o => o.id)
        }))
      : [{ question_text: '', question_type: 'single', options: ['', '', '', ''], correct: 0, multiselect: [] }]
  });
  const [saving, setSaving] = useState(null);

  const addQ = () => setForm(f => ({ ...f, questions: [...f.questions, { question_text: '', question_type: 'single', options: ['', '', '', ''], correct: 0, multiselect: [] }] }));
  const removeQ = (i) => setForm(f => ({ ...f, questions: f.questions.filter((_, j) => j !== i) }));
  const setType = (qi, type) => setForm(f => {
    const questions = f.questions.map((q, i) => {
      if (i !== qi || q.question_type === type) return q;
      
      const newQ = { ...q, question_type: type };
      if (type === 'multiple') {
        newQ.multiselect = [q.correct !== undefined ? q.correct : 0];
      } else {
        newQ.correct = q.multiselect?.[0] || 0;
      }
      return newQ;
    });
    return { ...f, questions };
  });

  const toggleCorrect = (qi, oi) => setForm(f => {
    const questions = f.questions.map((q, i) => {
      if (i !== qi) return q;
      
      if (q.question_type === 'single') {
        return { ...q, correct: oi };
      } else {
        const current = q.multiselect || [];
        const nextMultiselect = current.includes(oi)
          ? current.filter(id => id !== oi)
          : [...current, oi];
        return { ...q, multiselect: nextMultiselect };
      }
    });
    return { ...f, questions };
  });

  const updateQ = (qi, field, val) => setForm(f => ({
    ...f,
    questions: f.questions.map((q, i) => i === qi ? { ...q, [field]: val } : q)
  }));

  const updateOpt = (qi, oi, val) => setForm(f => ({
    ...f,
    questions: f.questions.map((q, i) => {
      if (i !== qi) return q;
      const nextOpts = [...q.options];
      nextOpts[oi] = val;
      return { ...q, options: nextOpts };
    })
  }));

  const submit = async (e) => {
    e.preventDefault();
    const publishStatus = e.nativeEvent.submitter ? e.nativeEvent.submitter.value : 'draft';
    setSaving(publishStatus);
    try {
      const payload = {
        ...form,
        status: publishStatus,
        questions: form.questions.map((q, qi) => ({
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options.map((text, oi) => {
            const isCorrect = q.question_type === 'single' ? oi === q.correct : q.multiselect?.includes(oi);
            return { 
              id: q.optionIds?.[oi],
              option_text: text, 
              is_correct: !!isCorrect 
            };
          })
        }))
      };
      if (quiz) await api.put(`/teacher/quizzes/${quiz.id}`, payload);
      else await api.post('/teacher/quizzes', payload);
      onSaved();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setSaving(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{quiz ? 'Edit Quiz' : 'New Quiz'}</h2>
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
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-full px-2 py-0.5">Q{qi + 1}</span>
                      <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg p-0.5">
                        <button type="button" onClick={() => setType(qi, 'single')}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${q.question_type === 'single' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}>
                          Single
                        </button>
                        <button type="button" onClick={() => setType(qi, 'multiple')}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${q.question_type === 'multiple' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}>
                          Multi
                        </button>
                      </div>
                    </div>
                    {form.questions.length > 1 && <button type="button" onClick={() => removeQ(qi)} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>}
                  </div>
                  <input required value={q.question_text} onChange={e => updateQ(qi, 'question_text', e.target.value)}
                    placeholder="Question text..."
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-200 bg-white" />
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, oi) => {
                      const isCorrect = q.question_type === 'single' ? q.correct === oi : q.multiselect?.includes(oi);
                      return (
                        <label key={oi} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition-colors ${isCorrect ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                          <input 
                            type={q.question_type === 'single' ? "radio" : "checkbox"} 
                            name={`q${qi}_correct`} 
                            checked={isCorrect} 
                            onChange={() => toggleCorrect(qi, oi)} 
                            className={`accent-emerald-500 flex-shrink-0 ${q.question_type === 'multiple' ? 'rounded' : ''}`} 
                          />
                          <input value={opt} onChange={e => updateOpt(qi, oi, e.target.value)}
                            placeholder={`Option ${oi + 1}`} required
                            className="flex-1 text-sm bg-transparent border-none outline-none min-w-0"
                            onClick={e => e.stopPropagation()} />
                          {isCorrect && <span className="text-xs text-emerald-600 font-semibold flex-shrink-0">✓</span>}
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-400">
                    {q.question_type === 'single' ? 'Pick the one correct answer.' : 'Select all options that are correct.'}
                  </p>
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
                {saving === 'published' ? (quiz ? 'Updating…' : 'Publishing…') : (quiz ? '📝 Update & Publish' : '🚀 Publish')}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] h-[95vh] border border-gray-100 flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{note ? 'Edit Note' : 'New Note'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{subject.subject_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSave} className="p-5 flex-1 flex flex-col overflow-hidden">
          <div className="grid grid-cols-1 gap-3 flex-shrink-0 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" placeholder="Note title..." />
            </div>
          </div>
          <div className="flex-1 flex flex-col min-h-0 mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1 flex-shrink-0">Content *</label>
            <div className="bg-white rounded-xl overflow-hidden border border-gray-200 flex-1 flex flex-col">
              <ReactQuill 
                theme="snow"
                value={form.content_html}
                onChange={(value) => setForm(f => ({ ...f, content_html: value }))}
                modules={quillModules}
                className="quill-editor"
              />
            </div>
            <style>{`
              .quill-editor { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
              .quill-editor .ql-container {
                flex: 1;
                overflow-y: auto;
                font-family: inherit;
                font-size: 14px;
                border-bottom: none !important;
                border-left: none !important;
                border-right: none !important;
              }
              .quill-editor .ql-toolbar {
                border-top: none !important;
                border-left: none !important;
                border-right: none !important;
                background-color: #f9fafb;
                flex-shrink: 0;
              }
              .ql-font-arial { font-family: 'Arial', sans-serif; }
              .quill-editor .ql-picker.ql-font { width: 150px !important; text-align: left; }
              .quill-editor .ql-picker.ql-font .ql-picker-label[data-value='arial']::before,
              .quill-editor .ql-picker.ql-font .ql-picker-item[data-value='arial']::before { content: 'Arial'; font-family: 'Arial', sans-serif; }
              
              .ql-font-times-new-roman { font-family: 'Times New Roman', serif; }
              .quill-editor .ql-picker.ql-font .ql-picker-label[data-value='times-new-roman']::before,
              .quill-editor .ql-picker.ql-font .ql-picker-item[data-value='times-new-roman']::before { content: 'Times New Roman'; font-family: 'Times New Roman', serif; }
              
              .ql-font-georgia { font-family: 'Georgia', serif; }
              .quill-editor .ql-picker.ql-font .ql-picker-label[data-value='georgia']::before,
              .quill-editor .ql-picker.ql-font .ql-picker-item[data-value='georgia']::before { content: 'Georgia'; font-family: 'Georgia', serif; }
              
              .ql-font-courier-new { font-family: 'Courier New', monospace; }
              .quill-editor .ql-picker.ql-font .ql-picker-label[data-value='courier-new']::before,
              .quill-editor .ql-picker.ql-font .ql-picker-item[data-value='courier-new']::before { content: 'Courier New'; font-family: 'Courier New', monospace; }
              
              .ql-font-verdana { font-family: 'Verdana', sans-serif; }
              .quill-editor .ql-picker.ql-font .ql-picker-label[data-value='verdana']::before,
              .quill-editor .ql-picker.ql-font .ql-picker-item[data-value='verdana']::before { content: 'Verdana'; font-family: 'Verdana', sans-serif; }

              /* Ensure bullets and numbers are visible inside the editor content */
              .quill-editor .ql-editor ul, .quill-editor .ql-editor ol {
                padding-left: 1.5rem !important;
              }
              .quill-editor .ql-editor ul > li {
                list-style-type: disc !important;
              }
              .quill-editor .ql-editor ol > li {
                list-style-type: decimal !important;
              }
              .quill-editor .ql-editor li::before {
                display: none !important;
              }
            `}</style>
          </div>
          <div className="flex items-center justify-between gap-2 pt-4 border-t border-gray-100 flex-shrink-0">
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
  const queryParams = new URLSearchParams(window.location.search);
  const classIdFromUrl = queryParams.get('class_id');
  const [subject, setSubject] = useState(null);
  const [faculties, setFaculties] = useState({ subjectTeacher: '', labs: [] });
  const [tab, setTab] = useState(queryParams.get('tab') || 'assignments');
  const [assignments, setAssignments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [notes, setNotes] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(null); // 'assignment' | 'quiz' | 'note' | null
  const [editItem, setEditItem] = useState(null);
  const [editNote, setEditNote] = useState(null);
  const [labs, setLabs] = useState([]);
  const [selectedLabId, setSelectedLabId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  // Attendance states
  const [attendanceDates, setAttendanceDates] = useState([]);
  const [selectedAttSlot, setSelectedAttSlot] = useState(null); // { date, lab_id }
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attLoading, setAttLoading] = useState(false);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const [sRes, aRes, qRes, nRes, stRes, fRes] = await Promise.all([
          api.get('/teacher/my-subjects').catch(() => ({ data: [] })),
          api.get('/teacher/assignments').catch(() => ({ data: [] })),
          api.get('/teacher/quizzes').catch(() => ({ data: [] })),
          api.get('/teacher/notes').catch(() => ({ data: [] })),
          api.get(`/teacher/my-students-by-subject/${subjectId}`).catch(() => ({ data: [] })),
          api.get(`/teacher/subject/${subjectId}/faculties`, { params: { class_id: classIdFromUrl } }).catch(() => ({ data: { subjectTeacher: '', labs: [] } })),
        ]);
        
        // Find subject matching both subjectId AND classId (if provided)
        const sub = (sRes.data || []).find(s => 
          String(s.subject_id) === String(subjectId) && 
          (!classIdFromUrl || String(s.class_id) === String(classIdFromUrl))
        );

        setSubject(sub || null);
        setFaculties(fRes.data);
        setAssignments((aRes.data || []).filter(a => String(a.subject_id) === String(subjectId)));
        setQuizzes((qRes.data || []).filter(q => String(q.subject_id) === String(subjectId)));
        setNotes((nRes.data || []).filter(n => String(n.subject_id) === String(subjectId)));
        setStudents((stRes.data || []));

        if (sub) {
          const lRes = sub.type !== 'minor' 
            ? await api.get(`/teacher/labs/${sub.class_id || 0}`)
            : await api.get(`/teacher/minor-labs/${subjectId}`);
          setLabs(lRes.data || []);
        }
      } catch (err) {
        console.error("Failed to load subject detail:", err);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, [subjectId, classIdFromUrl]);

  useEffect(() => {
    if (!loading && subject) {
      api.get(`/teacher/my-students-by-subject/${subjectId}`, { params: { lab_id: selectedLabId } })
        .then(res => setStudents(res.data))
        .catch(console.error);
    }
  }, [selectedLabId, subjectId]);
  
  useEffect(() => {
    if (tab === 'attendance' && subject) {
      api.get(`/teacher/attendance/${subjectId}/dates`)
        .then(res => setAttendanceDates(res.data))
        .catch(console.error);
    }
  }, [tab, subjectId]);

  useEffect(() => {
    if (selectedAttSlot) {
      setAttLoading(true);
      const lId = selectedAttSlot.lab_id || selectedAttSlot.minor_lab_id || '0';
      api.get(`/teacher/attendance/${subjectId}/lab/${lId}/date/${selectedAttSlot.date}`)
        .then(res => setAttendanceRecords(res.data))
        .catch(console.error)
        .finally(() => setAttLoading(false));
    }
  }, [selectedAttSlot, subjectId]);

  const toggleAttendance = async (recId) => {
    try {
      const res = await api.put(`/teacher/attendance/${recId}`);
      if (res.data.success) {
        setAttendanceRecords(prev => prev.map(r => r.attendance_id === recId ? { ...r, status: res.data.newStatus } : r));
      }
    } catch(err) { alert('Failed to change attendance'); }
  };

  const markAsHoliday = async () => {
    if (!selectedAttSlot) return;
    try {
      const isMinor = !!selectedAttSlot.minor_lab_id;
      const lId = selectedAttSlot.lab_id || selectedAttSlot.minor_lab_id || null;
      const res = await api.post('/teacher/attendance/holiday', {
        subjectId,
        labId: lId,
        isMinor,
        date: selectedAttSlot.date
      });
      if (res.data.success) {
        const datesRes = await api.get(`/teacher/attendance/${subjectId}/dates`);
        setAttendanceDates(datesRes.data);
        const updated = datesRes.data.find(d => d.date === selectedAttSlot.date && (d.lab_id === selectedAttSlot.lab_id || d.minor_lab_id === selectedAttSlot.minor_lab_id));
        setSelectedAttSlot(updated);
        if (res.data.is_holiday) setAttendanceRecords([]);
      }
    } catch(err) { alert('Failed to toggle holiday'); }
  };

  const refetch = async () => {
    setShowForm(null);
    setEditItem(null);
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

  const downloadNotePDF = (note) => {
    const element = document.createElement('div');
    element.style.padding = '40px';
    element.style.fontFamily = 'Arial, sans-serif';
    element.innerHTML = `
      <style>
        .ql-font-arial { font-family: 'Arial', sans-serif; }
        .ql-font-times-new-roman { font-family: 'Times New Roman', serif; }
        .ql-font-georgia { font-family: 'Georgia', serif; }
        .ql-font-courier-new { font-family: 'Courier New', monospace; }
        .ql-font-verdana { font-family: 'Verdana', sans-serif; }
        .ql-align-center { text-align: center; }
        .ql-align-right { text-align: right; }
        .ql-align-justify { text-align: justify; }
        .ql-editor ul, .ql-editor ol { padding-left: 20px; }
        .ql-editor img { max-width: 100%; height: auto; }
      </style>
      <div style="margin-bottom: 30px; border-bottom: 2px solid #9333ea; padding-bottom: 15px;">
        <h1 style="margin: 0; color: #111827; font-size: 28px;">${note.title}</h1>
        <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
          Subject: <strong>${subject.subject_name}</strong> | Published on: ${new Date(note.created_at).toLocaleDateString()}
        </p>
      </div>
      <div class="ql-editor" style="color: #374151; line-height: 1.6;">
        ${note.content_html}
      </div>
    `;

    const opt = {
      margin: 0.5,
      filename: `${note.title.replace(/\s+/g, '_')}_Notes.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().from(element).set(opt).save();
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
    { key: 'attendance', label: 'Student Attendance', icon: CheckCircle2 },
    { key: 'students', label: 'Students', icon: GraduationCap },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/teacher/subjects')} className="text-gray-400 hover:text-gray-700 transition-colors flex">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">{subject.subject_name}</h1>
          <span className={`px-2 py-0.5 text-xs font-bold rounded-full uppercase ${
            subject.type === 'major' ? 'bg-purple-100 text-purple-700' : 
            subject.type === 'vsc' ? 'bg-emerald-100 text-emerald-700' : 
            'bg-blue-100 text-blue-700'
          }`}>
            {subject.type}
          </span>
        </div>
        
        {/* Faculty List */}
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {subject.type !== 'vsc' && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">Subject Teacher:</span>
              <span className="text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">{faculties.subjectTeacher}</span>
            </div>
          )}
          {faculties.labs?.length > 0 && faculties.labs.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">{l.lab_name} ({l.day}):</span>
              <span className="text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">{l.teacher_name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs - Old UI format without counts */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        {tabs.map(t => (
          <button key={t.key} 
            onClick={() => {
              setTab(t.key);
              navigate(`/teacher/subjects/${subjectId}?tab=${t.key}${classIdFromUrl ? `&class_id=${classIdFromUrl}` : ''}`, { replace: true });
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
              <button 
                onClick={() => { setEditItem(null); setShowForm('assignment'); }} 
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-medium text-sm shadow-sm transition-colors"
              >
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
                  <button 
                    onClick={async () => {
                      const res = await api.get(`/teacher/assignments/${a.id}`);
                      setEditItem(res.data);
                      setShowForm('assignment');
                    }}
                    className="p-2 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors"
                    title="Edit Assignment"
                  >
                    <FileCode2 className="w-4 h-4" />
                  </button>
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
              <button 
                onClick={() => { setEditItem(null); setShowForm('quiz'); }} 
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-medium text-sm shadow-sm transition-colors"
              >
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
                  <button 
                    onClick={async () => {
                      const res = await api.get(`/teacher/quizzes/${q.id}`);
                      setEditItem(res.data);
                      setShowForm('quiz');
                    }}
                    className="p-2 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors"
                    title="Edit Quiz"
                  >
                    <FileCode2 className="w-4 h-4" />
                  </button>
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
                        <button onClick={() => downloadNotePDF(n)} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100" title="Download PDF"><Download className="w-3.5 h-3.5" /></button>
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
                    <div className="mt-3 flex justify-end">
                      <button onClick={() => downloadNotePDF(n)} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 uppercase tracking-wider">
                        <Download className="w-3 h-3" /> Download PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ATTENDANCE tab ── */}
        {tab === 'attendance' && (
          <div className="p-0 flex flex-col md:flex-row h-[600px]">
            {/* Sidebar of Dates */}
            <div className="w-full md:w-64 border-r border-gray-100 bg-gray-50/30 overflow-y-auto">
              <div className="p-4 border-b border-gray-100 sticky top-0 bg-gray-50/90 backdrop-blur-sm z-10">
                <h3 className="font-bold text-gray-800 text-sm">Attendance History</h3>
              </div>
              <div className="p-2 space-y-1">
                {attendanceDates.length === 0 ? (
                  <p className="text-center text-xs text-gray-500 p-4">No attendance records found.</p>
                ) : attendanceDates.map((slot, i) => (
                  <button 
                    key={i}
                    onClick={() => setSelectedAttSlot(slot)}
                    className={`w-full text-left p-3 rounded-xl transition-all ${selectedAttSlot?.date === slot.date && (selectedAttSlot?.lab_id === slot.lab_id || selectedAttSlot?.minor_lab_id === slot.minor_lab_id) ? 'bg-purple-100 text-purple-700 shadow-sm' : 'hover:bg-white hover:shadow-sm text-gray-600'}`}
                  >
                    <div className="flex items-center justify-between font-bold text-sm">
                      {new Date(slot.date).toLocaleDateString('en-GB')}
                      {slot.is_holiday && <span className="text-[8px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full uppercase">Holiday</span>}
                    </div>
                    <div className="text-xs opacity-70 mt-0.5">{slot.lab_name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Attendance Details */}
            <div className="flex-1 overflow-y-auto bg-white p-6">
              {!selectedAttSlot ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <CheckCircle2 className="w-12 h-12 mb-3 text-gray-200" />
                  <p className="font-medium">Select a date and lab to view attendance.</p>
                </div>
              ) : attLoading ? (
                <div className="h-full flex items-center justify-center text-gray-400 animate-pulse">Loading records...</div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 filter tracking-tight">
                        {new Date(selectedAttSlot.date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </h3>
                      <p className="text-sm text-gray-500 font-medium">{selectedAttSlot.lab_name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {selectedAttSlot.is_holiday ? (
                        <div className="bg-rose-50 text-rose-600 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border border-rose-100">Holiday Marked</div>
                      ) : (
                        <div className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg text-sm font-bold flex gap-2">
                           <span>Total: {attendanceRecords.length}</span>
                           <span className="opacity-40">|</span>
                           <span className="text-emerald-600">Present: {attendanceRecords.filter(r => r.status === 'present').length}</span>
                        </div>
                      )}
                      <button 
                        onClick={markAsHoliday}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${selectedAttSlot.is_holiday ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      >
                         {selectedAttSlot.is_holiday ? 'Recreate as Normal Day' : 'Mark Holiday'}
                      </button>
                    </div>
                  </div>

                  {selectedAttSlot.is_holiday && (
                    <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2">
                       <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-100 rounded-lg text-rose-600"><CheckCircle2 className="w-5 h-5" /></div>
                        <div>
                          <p className="text-sm font-bold text-rose-900 uppercase tracking-tight">Holiday Mode</p>
                          <p className="text-xs text-rose-500">Records are kept but this date is flagged as holiday.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {attendanceRecords.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 italic border border-dashed rounded-2xl">No students found in this record.</div>
                  ) : (
                    <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50/60 text-gray-500 text-xs uppercase tracking-wider">
                          <tr>
                            <th className="px-5 py-3 text-left font-semibold">Roll No</th>
                            <th className="px-5 py-3 text-left font-semibold">Student Name</th>
                            <th className="px-5 py-3 text-center font-semibold text-gray-400">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {attendanceRecords.map(r => (
                            <tr key={r.attendance_id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-5 py-3 text-gray-500 font-medium">{r.roll_no || '—'}</td>
                              <td className="px-5 py-3 font-bold text-gray-900">{r.name}</td>
                              <td className="px-5 py-3 text-center">
                                <button 
                                  onClick={() => toggleAttendance(r.attendance_id)}
                                  className={`w-28 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${r.status === 'present' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 shadow-sm' : 'bg-rose-50 text-rose-500 hover:bg-rose-100 shadow-sm'}`}
                                >
                                  {r.status === 'present' ? 'Present' : 'Absent'}
                                </button>
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
          </div>
        )}

        {/* ── STUDENTS tab ── */}
        {tab === 'students' && (
          <div className="p-0">
            <div className="px-5 py-4 border-b border-gray-50 flex justify-between items-center">
              <div className="text-sm font-medium text-gray-500">{students.length} student{students.length !== 1 ? 's' : ''} {subject.class_name ? `in ${subject.class_name}` : 'assigned'}</div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Filter by Lab:</span>
                <select 
                  value={selectedLabId} 
                  onChange={e => setSelectedLabId(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-purple-300"
                >
                  <option value="">All Students</option>
                  {labs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>
            {students.length === 0 ? (
              <div className="p-16 text-center">
                <GraduationCap className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No students enrolled in this lab batch yet.</p>
              </div>
            ) : (
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
                    <tr 
                      key={s.id} 
                      className="hover:bg-purple-50/50 cursor-pointer transition-colors group"
                      onClick={() => setSelectedStudentId(s.id)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs flex-shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                            {s.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 group-hover:text-purple-700 transition-colors">{s.name}</div>
                            <div className="text-[10px] text-gray-400 font-medium tracking-tight">Click to view performance</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-500 font-medium">{s.roll_no || '—'}</td>
                      <td className="px-5 py-4 text-gray-500 italic">{s.email}</td>
                      <td className="px-5 py-4">
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-tight ${s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Forms & Modals */}
      {selectedStudentId && <StudentDetailModal studentId={selectedStudentId} onClose={() => setSelectedStudentId(null)} />}
      {showForm === 'assignment' && <AssignmentForm subject={subject} assignment={editItem} onSaved={refetch} onClose={() => { setShowForm(null); setEditItem(null); }} />}
      {showForm === 'quiz' && <QuizForm subject={subject} quiz={editItem} onSaved={refetch} onClose={() => { setShowForm(null); setEditItem(null); }} />}
      {showForm === 'note' && <NoteForm subject={subject} note={editNote} onSaved={refetch} onClose={() => { setShowForm(null); setEditNote(null); }} />}

    </div>
  );
};

export default SubjectDetail;
