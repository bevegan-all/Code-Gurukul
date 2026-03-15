import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Users, ArrowLeft, Calendar } from 'lucide-react';
import api from '../../utils/axios';

const ManageClassLabs = ({ classObj, onBack }) => {
  const [labs, setLabs] = useState([]);
  const [labSlots, setLabSlots] = useState({});
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showLabModal, setShowLabModal] = useState(false);
  const [curLab, setCurLab] = useState({ id: null, name: '', roll_from: '', roll_to: '' });

  const [showSlotModal, setShowSlotModal] = useState(false);
  const [activeLabId, setActiveLabId] = useState(null);
  const [curSlot, setCurSlot] = useState({ id: null, day: 'Monday', start_time: '', end_time: '', teacher_id: '', subject_id: '' });
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    fetchData();
    fetchTeachers();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get(`/admin/classes/${classObj.id}/labs`);
      setLabs(res.data);

      const slotsData = {};
      for (const lab of res.data) {
        const slotRes = await api.get(`/admin/labs/${lab.id}/slots`);
        slotsData[lab.id] = slotRes.data;
      }
      setLabSlots(slotsData);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchTeachers = async () => {
    try {
      const res = await api.get('/admin/teachers');
      setTeachers(res.data);
      const subRes = await api.get('/admin/subjects');
      // Use == for loose equality since course_id can be number or string depending on context
      const filtered = subRes.data.filter(s => 
        (s.type === 'major' || s.type === 'vsc') && 
        // eslint-disable-next-line eqeqeq
        s.course_id == classObj.course_id && 
        s.year === classObj.year
      );
      setSubjects(filtered.length > 0 ? filtered : subRes.data.filter(s => s.type === 'major' || s.type === 'vsc'));
    } catch (err) { console.error(err); }
  }

  const handleSaveLab = async (e) => {
    e.preventDefault();
    try {
      if (curLab.id) await api.put(`/admin/labs/${curLab.id}`, curLab);
      else await api.post(`/admin/classes/${classObj.id}/labs`, curLab);
      setShowLabModal(false);
      fetchData();
    } catch (err) { alert(err.response?.data?.error || 'Error saving lab'); }
  };

  const handleDeleteLab = async (id) => {
    if (window.confirm('Delete this lab?')) {
      try { await api.delete(`/admin/labs/${id}`); fetchData(); }
      catch (err) { alert(err.response?.data?.error || 'Error deleting lab'); }
    }
  };

  const handleSaveSlot = async (e) => {
    e.preventDefault();
    try {
      if (curSlot.id) await api.put(`/admin/lab-slots/${curSlot.id}`, curSlot);
      else await api.post(`/admin/labs/${activeLabId}/slots`, curSlot);
      setShowSlotModal(false);
      fetchData();
    } catch (err) { alert(err.response?.data?.error || 'Error saving slot'); }
  }

  const handleDeleteSlot = async (id) => {
    if (window.confirm('Delete this slot?')) {
      try { await api.delete(`/admin/lab-slots/${id}`); fetchData(); }
      catch (err) { alert('Error deleting slot'); }
    }
  }

  return (
    <>
      <div className="animate-slide-in space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Labs: {classObj.name}</h1>
            <p className="text-gray-500 mt-1">Configure lab batches and assign timetable slots</p>
          </div>
          <button
            onClick={() => { setCurLab({ id: null, name: '', roll_from: '', roll_to: '' }); setShowLabModal(true); }}
            className="ml-auto bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Add Lab Batch
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? <p className="text-gray-500">Loading labs...</p> : labs.map(lab => (
            <div key={lab.id} className="bg-white border text-left border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{lab.name}</h3>
                  <p className="text-sm text-gray-500">Roll No: {lab.roll_from} - {lab.roll_to}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setCurLab(lab); setShowLabModal(true); }} className="text-gray-400 hover:text-primary"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDeleteLab(lab.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center justify-between border-b pb-1">
                  Timetable Slots
                  <button
                    onClick={() => { setActiveLabId(lab.id); setCurSlot({ id: null, day: 'Monday', start_time: '', end_time: '', teacher_id: '', subject_id: '' }); setShowSlotModal(true); }}
                    className="text-primary hover:text-blue-700 text-xs"
                  >+ Add Slot</button>
                </h4>
                <ul className="space-y-2">
                  {(labSlots[lab.id] || []).length === 0 ? <p className="text-xs text-gray-400">No slots assigned</p> : (
                    labSlots[lab.id].map(slot => (
                      <li key={slot.id} className="text-sm bg-gray-50 rounded p-2 flex justify-between items-center border border-gray-100">
                        <div>
                          <div className="font-medium flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-gray-400" /> {slot.day}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{slot.start_time} - {slot.end_time}</div>
                          <div className="text-xs text-blue-600 mt-0.5 line-clamp-1" title={`Teacher: ${slot.User?.name || 'TBD'} | Subject: ${slot.Subject?.name || 'N/A'}`}>
                            {slot.User?.name || 'TBD'} • {slot.Subject?.name || 'No Subject'}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setActiveLabId(lab.id); setCurSlot({ ...slot, teacher_id: slot.teacher_id || '', subject_id: slot.subject_id || '' }); setShowSlotModal(true); }} className="text-gray-400 hover:text-primary"><Edit className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDeleteSlot(slot.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          ))}
          {labs.length === 0 && !loading && <div className="text-gray-500 italic p-4">No lab batches found.</div>}
        </div>
      </div>

      {showLabModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[99999]">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{curLab.id ? 'Edit Lab' : 'Add Lab'}</h2>
            <form onSubmit={handleSaveLab} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name <span className="text-xs text-gray-400">(e.g. B1)</span></label>
                <input type="text" required value={curLab.name} onChange={e => setCurLab({ ...curLab, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Roll From</label>
                  <div className="flex border rounded-lg focus-within:ring-2 focus-within:ring-primary overflow-hidden">
                    <span className="bg-gray-100 px-3 py-2 text-gray-500 border-r">{classObj.roll_no_prefix || ''}</span>
                    <input type="text" required value={curLab.roll_from.replace(classObj.roll_no_prefix || '', '')} onChange={e => setCurLab({ ...curLab, roll_from: (classObj.roll_no_prefix || '') + e.target.value })} className="w-full px-4 py-2 outline-none" placeholder="01" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Roll To</label>
                  <div className="flex border rounded-lg focus-within:ring-2 focus-within:ring-primary overflow-hidden">
                    <span className="bg-gray-100 px-3 py-2 text-gray-500 border-r">{classObj.roll_no_prefix || ''}</span>
                    <input type="text" required value={curLab.roll_to.replace(classObj.roll_no_prefix || '', '')} onChange={e => setCurLab({ ...curLab, roll_to: (classObj.roll_no_prefix || '') + e.target.value })} className="w-full px-4 py-2 outline-none" placeholder="20" />
                  </div>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowLabModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSlotModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[99999]">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{curSlot.id ? 'Edit Slot' : 'Add Slot'}</h2>
            <form onSubmit={handleSaveSlot} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Day</label>
                <select required value={curSlot.day} onChange={e => setCurSlot({ ...curSlot, day: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-primary">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Time</label>
                  <input type="time" required value={curSlot.start_time} onChange={e => setCurSlot({ ...curSlot, start_time: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Time</label>
                  <input type="time" required value={curSlot.end_time} onChange={e => setCurSlot({ ...curSlot, end_time: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <select value={curSlot.subject_id} onChange={e => setCurSlot({ ...curSlot, subject_id: e.target.value ? parseInt(e.target.value) : '' })} className="w-full px-4 py-2 border rounded-lg">
                  <option value="">-- No Subject --</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.type?.toUpperCase()})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Teacher</label>
                <select required value={curSlot.teacher_id} onChange={e => setCurSlot({ ...curSlot, teacher_id: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
                  <option value="">Select Teacher...</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowSlotModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};


const ManageClasses = () => {
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [current, setCurrent] = useState({ id: null, year: '', course_id: '', division: '', roll_no_prefix: '' });
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');

  const [viewClass, setViewClass] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [clsRes, courseRes, deptRes] = await Promise.all([api.get('/admin/classes'), api.get('/admin/courses'), api.get('/admin/departments')]);
      setClasses(clsRes.data);
      setCourses(courseRes.data);
      setDepartments(deptRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (current.id) {
        await api.put(`/admin/classes/${current.id}`, current);
      } else {
        await api.post('/admin/classes', current);
      }
      setShowModal(false);
      fetchData();
    } catch (err) { alert(err.response?.data?.error || 'Error saving class'); }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this class? All students assigned to it will lose their class assignment.')) {
      try { await api.delete(`/admin/classes/${id}`); fetchData(); }
      catch (err) { alert(err.response?.data?.error || 'Error deleting class'); }
    }
  };

  const filtered = classes.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || (c.Course?.name || '').toLowerCase().includes(search.toLowerCase());
    const matchesYear = filterYear ? c.year === filterYear : true;
    // eslint-disable-next-line eqeqeq
    const matchesCourse = filterCourse ? c.course_id == filterCourse : true;
    
    const courseObj = courses.find(co => co.id === c.course_id);
    // eslint-disable-next-line eqeqeq
    const matchesDepartment = filterDepartment ? courseObj?.department_id == filterDepartment : true;

    return matchesSearch && matchesYear && matchesCourse && matchesDepartment;
  });

  if (viewClass) {
    return <ManageClassLabs classObj={viewClass} onBack={() => { setViewClass(null); fetchData(); }} />;
  }

  return (
    <>
      <div className="animate-slide-in space-y-6 flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Classes</h1>
            <p className="text-gray-500 mt-1">Configure classes and map major subject labs</p>
          </div>
          <button
            onClick={() => { setCurrent({ id: null, year: 'FY', course_id: '', division: '', roll_no_prefix: '' }); setShowModal(true); }}
            className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2 transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Class
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col flex-1 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-wrap gap-4 justify-between items-center bg-gray-50/50">
            <div className="relative w-full max-w-sm">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search classes or courses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-3">
              <select value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary">
                <option value="">All Departments</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary">
                <option value="">All Years</option>
                <option value="FY">First Year (FY)</option>
                <option value="SY">Second Year (SY)</option>
                <option value="TY">Third Year (TY)</option>
                <option value="LY">Last Year (LY)</option>
              </select>
              <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary">
                <option value="">All Courses</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
              <thead className="bg-gray-50/80 text-gray-600 font-medium border-b border-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4">Class Name</th>
                  <th className="px-6 py-4">Course</th>
                  <th className="px-6 py-4">Labs</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">No classes found.</td></tr>
                ) : (
                  filtered.map((cls) => (
                    <tr key={cls.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center font-bold">
                          <Users className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-gray-900">{cls.name}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{cls.Course?.name || '—'}</td>
                      <td className="px-6 py-4 text-gray-600">
                        <button onClick={() => setViewClass(cls)} className="text-secondary hover:text-cyan-700 hover:underline font-medium">Manage Labs</button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => { setCurrent({ id: cls.id, year: cls.year || 'FY', course_id: cls.course_id, division: cls.division || '', roll_no_prefix: cls.roll_no_prefix || '' }); setShowModal(true); }} className="p-1.5 text-gray-400 hover:text-primary transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(cls.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors ml-2">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[99999]">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{current.id ? 'Edit Class' : 'Add Class'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <select required value={current.year} onChange={e => setCurrent({ ...current, year: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-primary">
                    <option value="FY">First Year (FY)</option>
                    <option value="SY">Second Year (SY)</option>
                    <option value="TY">Third Year (TY)</option>
                    <option value="LY">Last Year (LY)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                  <select
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    value={current.course_id}
                    onChange={(e) => setCurrent({ ...current, course_id: e.target.value })}
                  >
                    <option value="">Select course...</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Division <span className="text-xs font-normal text-gray-400">(e.g. E3)</span></label>
                  <input type="text" required value={current.division} onChange={e => setCurrent({ ...current, division: e.target.value })} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Roll Prefix <span className="text-xs font-normal text-gray-400">(e.g. SE3)</span></label>
                  <input type="text" required value={current.roll_no_prefix} onChange={e => setCurrent({ ...current, roll_no_prefix: e.target.value })} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-primary" />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ManageClasses;
