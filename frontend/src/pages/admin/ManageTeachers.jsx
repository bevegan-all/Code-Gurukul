import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, X, AlertCircle, RefreshCw, CheckSquare, CheckCircle2 } from 'lucide-react';
import api from '../../utils/axios';

const ManageTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Form state
  const [form, setForm] = useState({ id: null, name: '', email: '', phone: '', is_active: true, department_id: '' });
  // major_assignments = [{ subject_id, class_id }]
  const [majorAssignments, setMajorAssignments] = useState([]);
  const [minorSubjectId, setMinorSubjectId] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    // Fetch each independently — prevents one failure from blocking dropdown data
    setLoading(true);
    try {
      const tRes = await api.get('/admin/teachers');
      setTeachers(tRes.data);
    } catch (err) { console.error('Teachers fetch failed:', err.response?.data || err.message); }

    try {
      const sRes = await api.get('/admin/subjects');
      setSubjects(sRes.data);
    } catch (err) { console.error('Subjects fetch failed:', err.response?.data || err.message); }

    try {
      const cRes = await api.get('/admin/classes');
      setClasses(cRes.data);
    } catch (err) { console.error('Classes fetch failed:', err.response?.data || err.message); }

    try {
      const dRes = await api.get('/admin/departments');
      setDepartments(dRes.data);
    } catch (err) { console.error('Departments fetch failed:', err.response?.data || err.message); }

    setLoading(false);
  };

  const openCreate = () => {
    setForm({ id: null, name: '', email: '', phone: '', is_active: true, department_id: '' });
    setMajorAssignments([]);
    setMinorSubjectId('');
    setShowModal(true);
  };

  const openEdit = (teacher) => {
    setForm({ id: teacher.id, name: teacher.name, email: teacher.email, phone: teacher.phone || '', is_active: teacher.is_active, department_id: teacher.department_id || '' });
    // reconstruct assignments
    const majors = (teacher.TeacherSubjects || []).filter(ts => ts.type === 'major').map(ts => ({ subject_id: String(ts.subject_id), class_id: String(ts.class_id) }));
    const minor = (teacher.TeacherSubjects || []).find(ts => ts.type === 'minor');
    setMajorAssignments(majors);
    setMinorSubjectId(minor ? String(minor.subject_id) : '');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        major_assignments: majorAssignments.filter(a => a.subject_id && a.class_id).map(a => ({ subject_id: Number(a.subject_id), class_id: Number(a.class_id) })),
        minor_subject_id: minorSubjectId ? Number(minorSubjectId) : null,
      };
      if (form.id) {
        await api.put(`/admin/teachers/${form.id}`, payload);
      } else {
        await api.post('/admin/teachers', payload);
      }
      setShowModal(false);
      fetchAll();
    } catch (err) { alert(err.response?.data?.error || 'Error saving teacher'); }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this teacher permanently?')) {
      try { 
        await api.delete(`/admin/teachers/${id}`); 
        setSuccessMsg('Teacher has been deleted successfully.');
        setShowSuccess(true);
        fetchAll(); 
      }
      catch (err) { alert(err.response?.data?.error || 'Error deleting teacher'); }
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length && filtered.length > 0) setSelectedIds([]);
    else setSelectedIds(filtered.map(t => t.id));
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      await api.post('/admin/teachers/bulk-delete', { ids: selectedIds });
      const count = selectedIds.length;
      setSelectedIds([]);
      setShowBulkConfirm(false);
      setSuccessMsg(`${count} teacher${count > 1 ? 's have' : ' has'} been deleted successfully.`);
      setShowSuccess(true);
      fetchAll();
    } catch (err) { alert(err.response?.data?.error || 'Bulk delete failed'); }
    finally { setBulkDeleting(false); }
  };

  const addMajorRow = () => setMajorAssignments([...majorAssignments, { subject_id: '', class_id: '' }]);
  const updateMajorRow = (idx, field, val) => {
    const updated = majorAssignments.map((a, i) => i === idx ? { ...a, [field]: val } : a);
    setMajorAssignments(updated);
  };
  const removeMajorRow = (idx) => setMajorAssignments(majorAssignments.filter((_, i) => i !== idx));

  const majorSubjects = subjects.filter(s => s.type === 'major' && (!form.department_id || s.department_id === Number(form.department_id)));
  const minorSubjects = subjects.filter(s => s.type === 'minor').filter(s => {
    // A minor subject can only be assigned to ONE teacher.
    // Hide it if it's already assigned to anyone ELSE.
    const isTakenByOther = teachers.some(t => {
      if (t.id === form.id) return false; // Skip the teacher we are currently editing
      return (t.TeacherSubjects || []).some(ts => ts.type === 'minor' && ts.subject_id === s.id);
    });
    return !isTakenByOther;
  });
  const filteredClasses = classes.filter(c => !form.department_id || c.Course?.department_id === Number(form.department_id));

  const filtered = teachers.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase());
    // eslint-disable-next-line eqeqeq
    const matchesDept = filterDepartment ? t.department_id == filterDepartment : true;
    const matchesStatus = filterStatus ? (filterStatus === 'active' ? t.is_active : !t.is_active) : true;
    return matchesSearch && matchesDept && matchesStatus;
  });

  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < filtered.length;

  return (
    <div className="animate-slide-in space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Teachers</h1>
          <p className="text-gray-500 mt-1">Add, edit, and assign subjects to teacher accounts</p>
        </div>
        <button onClick={openCreate} className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2 transition-all">
          <Plus className="w-5 h-5" />
          Add Teacher
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col flex-1 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-4 justify-between items-center bg-gray-50/50">
          <div className="relative w-full max-w-sm">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" placeholder="Search teachers..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-3">
            <select value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary">
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary">
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

            <div className="overflow-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
            <thead className="bg-gray-50/80 text-gray-600 font-medium border-b border-gray-100 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-blue-600"
                  />
                </th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Major Subjects</th>
                <th className="px-6 py-4">Minor Subject</th>
                <th className="px-6 py-4">Lab Instructor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan="8" className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="8" className="px-6 py-8 text-center text-gray-500">No teachers found.</td></tr>
              ) : (
                filtered.map((teacher) => {
                  const majors = (teacher.TeacherSubjects || []).filter(ts => ts.type === 'major');
                  const minor = (teacher.TeacherSubjects || []).find(ts => ts.type === 'minor');
                  const isSelected = selectedIds.includes(teacher.id);
                  return (
                    <tr key={teacher.id} className={`transition-colors ${isSelected ? 'bg-blue-50/60' : 'hover:bg-gray-50/50'}`}>
                      <td className="px-4 py-4">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(teacher.id)} className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-blue-600" />
                      </td>
                      <td className="px-6 py-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">{teacher.name.charAt(0)}</div>
                        <span className="font-semibold text-gray-900">{teacher.name}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{teacher.email}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {majors.length === 0 ? <span className="text-gray-400 text-xs">None</span> : majors.map((ts, i) => (
                            <span key={i} className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">{ts.Subject?.name} ({ts.Class?.name})</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {minor ? <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">{minor.Subject?.name}</span> : <span className="text-gray-400 text-xs">None</span>}
                      </td>
                      {/* Lab Instructor column */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {(teacher.labAssignments || []).length === 0 ? (
                            <span className="text-gray-400 text-xs">None</span>
                          ) : (teacher.labAssignments || []).map((label, i) => (
                            <span key={i} title={label} className="px-2 py-0.5 text-xs font-medium bg-violet-100 text-violet-700 rounded-full whitespace-nowrap">{label}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${teacher.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {teacher.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => openEdit(teacher)} className="p-1.5 text-gray-400 hover:text-primary transition-colors"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(teacher.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors ml-2"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Action Floating Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl">
          <CheckSquare className="w-5 h-5 text-blue-400" />
          <span className="font-semibold text-sm">{selectedIds.length} teacher{selectedIds.length > 1 ? 's' : ''} selected</span>
          <button onClick={() => setShowBulkConfirm(true)} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-sm font-semibold px-4 py-1.5 rounded-xl transition-colors">
            <Trash2 className="w-4 h-4" /> Delete Selected
          </button>
          <button onClick={() => setSelectedIds([])} className="p-1.5 hover:bg-gray-700 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[99999]">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex flex-col items-center text-center gap-3 mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center"><Trash2 className="w-8 h-8 text-red-500" /></div>
              <h2 className="text-xl font-bold text-gray-900">Delete Teachers?</h2>
              <p className="text-gray-500 text-sm">You are about to permanently delete <strong className="text-gray-900">{selectedIds.length} teacher{selectedIds.length > 1 ? 's' : ''}</strong>. This action cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowBulkConfirm(false)} disabled={bulkDeleting} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={handleBulkDelete} disabled={bulkDeleting} className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold disabled:opacity-60">
                {bulkDeleting ? 'Deleting...' : `Yes, Delete ${selectedIds.length}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100000] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm p-8 shadow-2xl flex flex-col items-center text-center transform animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Success!</h2>
            <p className="text-gray-500 mb-8">{successMsg}</p>
            <button 
              onClick={() => setShowSuccess(false)}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-emerald-200"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-1">{form.id ? 'Edit Teacher' : 'Add New Teacher'}</h2>
            {(subjects.length === 0 || classes.length === 0) && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-800">
                  {subjects.length === 0 && <p>⚠️ No subjects found. Please create subjects in <strong>Manage Subjects</strong> first.</p>}
                  {classes.length === 0 && <p>⚠️ No classes found. Please create classes in <strong>Manage Classes</strong> first.</p>}
                  <button type="button" onClick={fetchAll} className="mt-1 text-amber-700 underline font-medium flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Retry loading data
                  </button>
                </div>
              </div>
            )}
            <form onSubmit={handleSave} className="space-y-5">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input type="text" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-gray-400 text-xs">(@mit.edu.in)</span></label>
                  <input type="email" required disabled={!!form.id} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none disabled:bg-gray-50 disabled:text-gray-400" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    value={form.department_id}
                    onChange={(e) => {
                      setForm({ ...form, department_id: e.target.value });
                      setMajorAssignments([]); // clear major assignments when department changes
                    }}
                    required
                  >
                    <option value="">Select Department...</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                {form.id && (
                  <div className="col-span-2 flex items-center gap-2">
                    <input type="checkbox" id="teacherActive" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 text-primary rounded border-gray-300" />
                    <label htmlFor="teacherActive" className="text-sm text-gray-700">Account is Active</label>
                  </div>
                )}
              </div>

              {/* Major Subject Assignments */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-800">Major Subject Assignments</label>
                  <button type="button" onClick={addMajorRow} className="text-sm text-primary hover:text-blue-700 font-medium flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Add Row
                  </button>
                </div>
                {majorAssignments.length === 0 && <p className="text-xs text-gray-400 py-2">No major subjects assigned. Click "Add Row" to assign.</p>}
                <div className="space-y-2">
                  {majorAssignments.map((asgn, idx) => {
                    // Filter subjects: hide what's already chosen in OTHER rows for this teacher
                    const otherSelectedSubjectIds = majorAssignments
                      .filter((_, i) => i !== idx)
                      .map(a => a.subject_id);
                    
                    const availableSubjectsForThisRow = majorSubjects.filter(s => 
                      !otherSelectedSubjectIds.includes(String(s.id))
                    );

                    // Filter classes: must match subject's course/year AND not be globally taken by another teacher for same subject
                    const selectedSub = subjects.find(s => String(s.id) === asgn.subject_id);
                    let availableClassesForThisRow = [];
                    
                    if (selectedSub) {
                      // 1. Global pairs already taken [subjectId-classId]
                      const globalTakenPairs = teachers.flatMap(t => {
                        if (t.id === form.id) return []; // skip current teacher
                        return (t.TeacherSubjects || [])
                          .filter(ts => ts.type === 'major')
                          .map(ts => `${ts.subject_id}-${ts.class_id}`);
                      });

                      availableClassesForThisRow = classes.filter(c => {
                        const isSameCourseYear = c.course_id === selectedSub.course_id && c.year === selectedSub.year;
                        const isGloballyAvailable = !globalTakenPairs.includes(`${selectedSub.id}-${c.id}`);
                        return isSameCourseYear && isGloballyAvailable;
                      });
                    }

                    return (
                      <div key={idx} className="flex gap-2 items-center">
                        <select
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                          value={asgn.subject_id}
                          onChange={(e) => updateMajorRow(idx, 'subject_id', e.target.value)}
                          required
                        >
                          <option value="">Select subject...</option>
                          {availableSubjectsForThisRow.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <select
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                          value={asgn.class_id}
                          onChange={(e) => updateMajorRow(idx, 'class_id', e.target.value)}
                          required
                          disabled={!asgn.subject_id}
                        >
                          <option value="">Select class...</option>
                          {availableClassesForThisRow.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button type="button" onClick={() => removeMajorRow(idx)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Minor Subject Assignment */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Minor Subject Assignment <span className="text-gray-400 font-normal">(single only)</span></label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  value={minorSubjectId}
                  onChange={(e) => setMinorSubjectId(e.target.value)}
                >
                  <option value="">None — no minor subject</option>
                  {minorSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* VSC info note */}
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <span className="text-amber-500 text-sm mt-0.5">ℹ</span>
                <p className="text-xs text-amber-800">
                  <strong>VSC subjects</strong> have no subject teacher — they are lab-only. Assign VSC lab instructors via <strong>Manage Classes → Labs → Slots</strong>. Lab assignments are shown in the "Lab Instructor" column of this table.
                </p>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm">Save Teacher</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageTeachers;
