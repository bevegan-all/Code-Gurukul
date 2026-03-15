import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Download, Info } from 'lucide-react';
import api from '../../utils/axios';

const ManageStudents = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');

  const emptyForm = { id: null, name: '', email: '', phone: '', roll_no: '', parent_email: '', parent_phone: '', is_blind: false, is_active: true, class_id: '', minor_subject_id: '', lab_id: '', minor_lab_id: '' };
  const [form, setForm] = useState(emptyForm);

  const [filterClass, setFilterClass] = useState('');
  const [filterMinor, setFilterMinor] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [classLabs, setClassLabs] = useState([]);
  const [minorLabs, setMinorLabs] = useState([]);

  useEffect(() => {
    if (form.class_id) {
      api.get(`/admin/classes/${form.class_id}/labs`).then(res => setClassLabs(res.data)).catch(console.error);
    } else {
      setClassLabs([]);
    }
  }, [form.class_id]);

  useEffect(() => {
    if (form.minor_subject_id) {
      api.get(`/admin/subjects/${form.minor_subject_id}/minor-labs`).then(res => setMinorLabs(res.data)).catch(console.error);
    } else {
      setMinorLabs([]);
    }
  }, [form.minor_subject_id]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const stRes = await api.get('/admin/students');
      setStudents(stRes.data);
    } catch (err) { console.error('Students fetch failed:', err.response?.data || err.message); }

    try {
      const clRes = await api.get('/admin/classes');
      setClasses(clRes.data);
    } catch (err) { console.error('Classes fetch failed:', err.response?.data || err.message); }

    try {
      const subRes = await api.get('/admin/subjects');
      setSubjects(subRes.data);
    } catch (err) { console.error('Subjects fetch failed:', err.response?.data || err.message); }

    setLoading(false);
  };

  const openCreate = () => { setForm(emptyForm); setShowModal(true); };

  const openEdit = (student) => {
    setForm({
      id: student.id,
      name: student.name,
      email: student.email,
      phone: student.phone || '',
      roll_no: student.StudentProfile?.roll_no || '',
      parent_email: student.StudentProfile?.parent_email || '',
      parent_phone: student.StudentProfile?.parent_phone || '',
      is_blind: student.is_blind || false,
      is_active: student.is_active !== false,
      class_id: student.StudentProfile?.class_id ? String(student.StudentProfile.class_id) : '',
      minor_subject_id: student.StudentProfile?.minor_subject_id ? String(student.StudentProfile.minor_subject_id) : '',
      lab_id: student.StudentProfile?.lab_id ? String(student.StudentProfile.lab_id) : '',
      minor_lab_id: student.StudentProfile?.minor_lab_id ? String(student.StudentProfile.minor_lab_id) : '',
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        class_id: form.class_id ? Number(form.class_id) : null,
        minor_subject_id: form.minor_subject_id ? Number(form.minor_subject_id) : null,
        lab_id: form.lab_id ? Number(form.lab_id) : null,
        minor_lab_id: form.minor_lab_id ? Number(form.minor_lab_id) : null,
      };
      if (form.id) {
        await api.put(`/admin/students/${form.id}`, payload);
      } else {
        await api.post('/admin/students', payload);
      }
      setShowModal(false);
      fetchAll();
    } catch (err) { alert(err.response?.data?.error || 'Error saving student'); }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this student permanently?')) {
      try { await api.delete(`/admin/students/${id}`); fetchAll(); }
      catch (err) { alert(err.response?.data?.error || 'Error deleting student'); }
    }
  };

  // When a class is selected, show its subjects info
  const selectedClass = classes.find(c => String(c.id) === String(form.class_id));
  const minorSubjects = subjects.filter(s => s.type === 'minor');

  useEffect(() => {
    if (classLabs.length > 0 && form.roll_no && selectedClass) {
      const rollSuffix = form.roll_no.replace(selectedClass.roll_no_prefix || '', '');
      const rollNum = parseInt(rollSuffix, 10);
      
      const matchingLab = classLabs.find(lab => {
        const fromSuffix = lab.roll_from.replace(selectedClass.roll_no_prefix || '', '');
        const toSuffix = lab.roll_to.replace(selectedClass.roll_no_prefix || '', '');
        const from = parseInt(fromSuffix, 10);
        const to = parseInt(toSuffix, 10);
        return !isNaN(rollNum) && rollNum >= from && rollNum <= to;
      });

      if (matchingLab && String(matchingLab.id) !== form.lab_id) {
        setForm(prev => ({ ...prev, lab_id: String(matchingLab.id) }));
      }
    }
  }, [form.roll_no, classLabs, selectedClass]);

  const filtered = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                          s.email.toLowerCase().includes(search.toLowerCase()) || 
                          (s.StudentProfile?.roll_no || '').toLowerCase().includes(search.toLowerCase());
    // eslint-disable-next-line eqeqeq
    const matchesClass = filterClass ? s.StudentProfile?.class_id == filterClass : true;
    // eslint-disable-next-line eqeqeq
    const matchesMinor = filterMinor ? s.StudentProfile?.minor_subject_id == filterMinor : true;
    const matchesStatus = filterStatus ? (filterStatus === 'active' ? s.is_active : !s.is_active) : true;
    
    return matchesSearch && matchesClass && matchesMinor && matchesStatus;
  });

  return (
    <div className="animate-slide-in space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Students</h1>
          <p className="text-gray-500 mt-1">Enroll students, assign classes and optional minor subject</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all shadow-sm">
            <Download className="w-4 h-4" /> Bulk Import
          </button>
          <button onClick={openCreate} className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2 transition-all">
            <Plus className="w-5 h-5" /> Add Student
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col flex-1 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-4 justify-between items-center bg-gray-50/50">
          <div className="relative w-full max-w-sm">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" placeholder="Search by name, email, or roll..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-3">
            <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary">
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={filterMinor} onChange={e => setFilterMinor(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary">
              <option value="">All Minor Subjects</option>
              {minorSubjects.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
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
                <th className="px-6 py-4">Roll No</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Class</th>
                <th className="px-6 py-4">Minor Subject</th>
                <th className="px-6 py-4">Accessibility</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan="8" className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="8" className="px-6 py-8 text-center text-gray-500">No students found.</td></tr>
              ) : (
                filtered.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-gray-500">{student.StudentProfile?.roll_no || '—'}</td>
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold">{student.name.charAt(0)}</div>
                      <span className="font-semibold text-gray-900">{student.name}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{student.email}</td>
                    <td className="px-6 py-4 text-gray-600">{student.StudentProfile?.Class?.name || '—'}</td>
                    <td className="px-6 py-4">
                      {student.StudentProfile?.MinorSubject
                        ? <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">{student.StudentProfile.MinorSubject.name}</span>
                        : <span className="text-gray-400 text-xs">None</span>}
                      <div className="text-xs text-gray-400 mt-1">
                        Lab: {student.StudentProfile?.Lab?.name || '-'} | Minor: {student.StudentProfile?.MinorLab?.name || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {student.is_blind ? <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">Blind Mode</span> : <span className="text-gray-400 text-xs">Standard</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${student.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {student.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openEdit(student)} className="p-1.5 text-gray-400 hover:text-primary transition-colors"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(student.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors ml-2"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{form.id ? 'Edit Student' : 'Enroll New Student'}</h2>
            <form onSubmit={handleSave} className="space-y-5">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input type="text" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-gray-400 text-xs">(@mitacsc.edu.in)</span></label>
                  <input type="email" required disabled={!!form.id} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none disabled:bg-gray-50 disabled:text-gray-400" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
                  <div className="flex border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-primary overflow-hidden">
                    <span className="bg-gray-100 px-3 py-2 text-gray-500 border-r" style={{minWidth: '2.5rem'}}>{selectedClass?.roll_no_prefix || ''}</span>
                    <input type="text" required className="w-full px-4 py-2 outline-none" value={form.roll_no.replace(selectedClass?.roll_no_prefix || '', '')} onChange={(e) => setForm({ ...form, roll_no: (selectedClass?.roll_no_prefix || '') + e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parent Email</label>
                  <input type="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" value={form.parent_email} onChange={(e) => setForm({ ...form, parent_email: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parent phone</label>
                  <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Assign to Class</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    value={form.class_id}
                    onChange={(e) => setForm({ ...form, class_id: e.target.value, lab_id: '' })}
                  >
                    <option value="">No class assigned</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name} — {c.Course?.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Major Lab Batch</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none disabled:bg-gray-100 disabled:text-gray-400"
                    value={form.lab_id}
                    onChange={(e) => setForm({ ...form, lab_id: e.target.value })}
                    disabled={!form.class_id || classLabs.length === 0}
                  >
                    <option value="">{classLabs.length === 0 ? 'No labs for this class' : 'Auto-assigned by Roll No'}</option>
                    {classLabs.map(l => <option key={l.id} value={l.id}>{l.name} ({l.roll_from}-{l.roll_to})</option>)}
                  </select>
                  {form.class_id && classLabs.length === 0 && <span className="text-xs text-red-500">No lab batches created for this class yet.</span>}
                </div>
              </div>
              {selectedClass && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-700">
                    Student will automatically inherit all major subjects and teachers assigned to <strong>{selectedClass.name}</strong> class.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Minor Subject <span className="text-gray-400 font-normal">(optional)</span></label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    value={form.minor_subject_id}
                    onChange={(e) => setForm({ ...form, minor_subject_id: e.target.value, minor_lab_id: '' })}
                  >
                    <option value="">None</option>
                    {minorSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Minor Lab Batch</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none disabled:bg-gray-100 disabled:text-gray-400"
                    value={form.minor_lab_id}
                    onChange={(e) => setForm({ ...form, minor_lab_id: e.target.value })}
                    disabled={!form.minor_subject_id || minorLabs.length === 0}
                  >
                    <option value="">Select Lab Batch...</option>
                    {minorLabs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                  {form.minor_subject_id && minorLabs.length === 0 && <span className="text-xs text-red-500">No minor lab batches created.</span>}
                </div>
              </div>

              {/* Accessibility + Active */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="is_blind" className="w-4 h-4 text-primary rounded" checked={form.is_blind} onChange={(e) => setForm({ ...form, is_blind: e.target.checked })} />
                  <label htmlFor="is_blind" className="text-sm font-medium text-gray-800">Enable Adaptive Mode (Blind / Low-Vision User)</label>
                </div>
                {form.id && (
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="is_active_student" className="w-4 h-4 text-primary rounded" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                    <label htmlFor="is_active_student" className="text-sm font-medium text-gray-800">Account is Active</label>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm">Save Student</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageStudents;
