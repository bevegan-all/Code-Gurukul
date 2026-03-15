import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, BookOpen, ArrowLeft, Calendar } from 'lucide-react';
import api from '../../utils/axios';

const ManageMinorLabs = ({ subjectObj, onBack }) => {
  const [labs, setLabs] = useState([]);
  const [labSlots, setLabSlots] = useState({});
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showLabModal, setShowLabModal] = useState(false);
  const [curLab, setCurLab] = useState({ id: null, name: '' });

  const [showSlotModal, setShowSlotModal] = useState(false);
  const [activeLabId, setActiveLabId] = useState(null);
  const [curSlot, setCurSlot] = useState({ id: null, day: 'Monday', start_time: '', end_time: '', teacher_id: '' });

  useEffect(() => {
    fetchData();
    fetchTeachers();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get(`/admin/subjects/${subjectObj.id}/minor-labs`);
      setLabs(res.data);

      const slotsData = {};
      for (const lab of res.data) {
        const slotRes = await api.get(`/admin/minor-labs/${lab.id}/slots`);
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
    } catch (err) { console.error(err); }
  }

  const handleSaveLab = async (e) => {
    e.preventDefault();
    try {
      if (curLab.id) await api.put(`/admin/minor-labs/${curLab.id}`, curLab);
      else await api.post(`/admin/subjects/${subjectObj.id}/minor-labs`, curLab);
      setShowLabModal(false);
      fetchData();
    } catch (err) { alert(err.response?.data?.error || 'Error saving lab'); }
  };

  const handleDeleteLab = async (id) => {
    if (window.confirm('Delete this minor lab batch?')) {
      try { await api.delete(`/admin/minor-labs/${id}`); fetchData(); }
      catch (err) { alert(err.response?.data?.error || 'Error deleting lab'); }
    }
  };

  const handleSaveSlot = async (e) => {
    e.preventDefault();
    try {
      if (curSlot.id) await api.put(`/admin/minor-lab-slots/${curSlot.id}`, curSlot);
      else await api.post(`/admin/minor-labs/${activeLabId}/slots`, curSlot);
      setShowSlotModal(false);
      fetchData();
    } catch (err) { alert(err.response?.data?.error || 'Error saving slot'); }
  }

  const handleDeleteSlot = async (id) => {
    if (window.confirm('Delete this slot?')) {
      try { await api.delete(`/admin/minor-lab-slots/${id}`); fetchData(); }
      catch (err) { alert('Error deleting slot'); }
    }
  }

  return (
    <>
      <div className="animate-slide-in space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Minor Labs: {subjectObj.name}</h1>
            <p className="text-gray-500 mt-1">Configure minor lab batches and assign timetable slots</p>
          </div>
          <button
            onClick={() => { setCurLab({ id: null, name: '' }); setShowLabModal(true); }}
            className="ml-auto bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Add Minor Lab
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? <p className="text-gray-500">Loading labs...</p> : labs.map(lab => (
            <div key={lab.id} className="bg-white border text-left border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{lab.name}</h3>
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
                    onClick={() => { setActiveLabId(lab.id); setCurSlot({ id: null, day: 'Monday', start_time: '', end_time: '', teacher_id: '' }); setShowSlotModal(true); }}
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
                          <div className="text-xs text-blue-600 mt-0.5">Teacher: {slot.User?.name || 'TBD'}</div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setActiveLabId(lab.id); setCurSlot({ ...slot, teacher_id: slot.teacher_id || '' }); setShowSlotModal(true); }} className="text-gray-400 hover:text-primary"><Edit className="w-3.5 h-3.5" /></button>
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
            <h2 className="text-xl font-bold text-gray-900 mb-6">{curLab.id ? 'Edit Minor Lab' : 'Add Minor Lab'}</h2>
            <form onSubmit={handleSaveLab} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lab Name <span className="text-xs text-gray-400">(e.g. M1)</span></label>
                <input type="text" required value={curLab.name} onChange={e => setCurLab({ ...curLab, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary" />
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


const ManageSubjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentSub, setCurrentSub] = useState({ id: null, name: '', type: 'major', year: 'FY', department_id: '', course_id: '' });

  const [viewSubject, setViewSubject] = useState(null);
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCourse, setFilterCourse] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subRes, courseRes, deptRes] = await Promise.all([
        api.get('/admin/subjects'),
        api.get('/admin/courses'),
        api.get('/admin/departments')
      ]);
      setSubjects(subRes.data);
      setCourses(courseRes.data);
      setDepartments(deptRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (currentSub.id) {
        await api.put(`/admin/subjects/${currentSub.id}`, currentSub);
      } else {
        await api.post('/admin/subjects', currentSub);
      }
      setShowModal(false);
      setCurrentSub({ id: null, name: '', type: 'major', year: 'FY', department_id: '', course_id: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error saving subject');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this subject?')) {
      try {
        await api.delete(`/admin/subjects/${id}`);
        fetchData();
      } catch (err) {
        alert(err.response?.data?.error || 'Error deleting subject');
      }
    }
  };

  const filtered = subjects.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesYear = filterYear ? c.year === filterYear : true;
    const matchesType = filterType ? c.type === filterType : true;
    // eslint-disable-next-line eqeqeq
    const matchesCourse = filterCourse ? c.course_id == filterCourse : true;
    return matchesSearch && matchesYear && matchesType && matchesCourse;
  });

  if (viewSubject) {
    return <ManageMinorLabs subjectObj={viewSubject} onBack={() => { setViewSubject(null); fetchData(); }} />;
  }

  return (
    <>
      <div className="animate-slide-in space-y-6 flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Subjects</h1>
            <p className="text-gray-500 mt-1">Configure major subjects and minor (open) subjects and labs</p>
          </div>
          <button
            onClick={() => { setCurrentSub({ id: null, name: '', type: 'major', year: 'FY', department_id: '', course_id: '' }); setShowModal(true); }}
            className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2 transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Subject
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col flex-1 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap gap-4 justify-between items-center">
            <div className="relative w-full max-w-sm">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search subjects..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
            
            <div className="flex gap-3">
              <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary">
                <option value="">All Years</option>
                <option value="FY">First Year (FY)</option>
                <option value="SY">Second Year (SY)</option>
                <option value="TY">Third Year (TY)</option>
                <option value="LY">Last Year (LY)</option>
              </select>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary">
                <option value="">All Types</option>
                <option value="major">Major</option>
                <option value="minor">Minor</option>
                <option value="vsc">VSC</option>
              </select>
              <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary">
                <option value="">All Courses</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-auto flex-1 relative">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-max pb-24">
              <thead className="bg-gray-50/80 backdrop-blur-sm text-gray-600 font-medium border-b border-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 rounded-tl-lg">Subject Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Year</th>
                  <th className="px-6 py-4">Linked Course / Minor Labs</th>
                  <th className="px-6 py-4 text-right rounded-tr-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">No subjects found.</td>
                  </tr>
                ) : (
                  filtered.map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-gray-900">{sub.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${sub.type === 'major' ? 'bg-purple-100 text-purple-700' : (sub.type === 'vsc' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700')}`}>
                          {sub.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{sub.year || 'FY'}</td>
                      <td className="px-6 py-4 text-gray-500">
                        {sub.type === 'minor' ? (
                          <button onClick={() => setViewSubject(sub)} className="text-secondary hover:text-cyan-700 hover:underline font-medium">Manage Minor Labs</button>
                        ) : (
                          sub.Course?.name || 'Unknown'
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => { setCurrentSub({ id: sub.id, name: sub.name, type: sub.type, year: sub.year || 'FY', department_id: sub.department_id || '', course_id: sub.course_id || '' }); setShowModal(true); }} className="p-1.5 text-gray-400 hover:text-primary transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(sub.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors ml-2">
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
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-[99999]">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{currentSub.id ? 'Edit Subject' : 'Add Subject'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  value={currentSub.name}
                  onChange={(e) => setCurrentSub({ ...currentSub, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    value={currentSub.type}
                    onChange={(e) => setCurrentSub({ ...currentSub, type: e.target.value, course_id: e.target.value === 'minor' ? '' : currentSub.course_id, department_id: e.target.value === 'minor' ? '' : currentSub.department_id })}
                  >
                    <option value="major">Major</option>
                    <option value="minor">Minor</option>
                    <option value="vsc">VSC</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <select required value={currentSub.year} onChange={e => setCurrentSub({ ...currentSub, year: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-primary">
                    <option value="FY">FY</option>
                    <option value="SY">SY</option>
                    <option value="TY">TY</option>
                    <option value="LY">LY</option>
                  </select>
                </div>
              </div>

              {(currentSub.type === 'major' || currentSub.type === 'vsc') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <select
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                      value={currentSub.department_id}
                      onChange={(e) => setCurrentSub({ ...currentSub, department_id: e.target.value, course_id: '' })}
                    >
                      <option value="">Select Department...</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Linked Course</label>
                    <select
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                      value={currentSub.course_id}
                      onChange={(e) => setCurrentSub({ ...currentSub, course_id: e.target.value })}
                    >
                      <option value="">Select Course...</option>
                      {courses.filter(c => !currentSub.department_id || c.department_id === Number(currentSub.department_id)).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-colors">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ManageSubjects;
