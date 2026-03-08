import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Users } from 'lucide-react';
import api from '../../utils/axios';

const ManageClasses = () => {
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [current, setCurrent] = useState({ id: null, name: '', course_id: '' });
  const [search, setSearch] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [clsRes, courseRes] = await Promise.all([api.get('/admin/classes'), api.get('/admin/courses')]);
      setClasses(clsRes.data);
      setCourses(courseRes.data);
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
      setCurrent({ id: null, name: '', course_id: '' });
      fetchData();
    } catch (err) { alert(err.response?.data?.error || 'Error saving class'); }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this class? All students assigned to it will lose their class assignment.')) {
      try { await api.delete(`/admin/classes/${id}`); fetchData(); }
      catch (err) { alert(err.response?.data?.error || 'Error deleting class'); }
    }
  };

  const filtered = classes.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.Course?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-slide-in space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Classes</h1>
          <p className="text-gray-500 mt-1">Configure class sections (e.g. FYBCA-A, SYBCA-B)</p>
        </div>
        <button
          onClick={() => { setCurrent({ id: null, name: '', course_id: '' }); setShowModal(true); }}
          className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2 transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Class
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col flex-1 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="relative w-80">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search classes or courses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
            <thead className="bg-gray-50/80 text-gray-600 font-medium border-b border-gray-100 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4">Class Name</th>
                <th className="px-6 py-4">Course</th>
                <th className="px-6 py-4">Department</th>
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
                    <td className="px-6 py-4 text-gray-400">{cls.Course?.Department?.name || '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => { setCurrent({ id: cls.id, name: cls.name, course_id: cls.course_id }); setShowModal(true); }} className="p-1.5 text-gray-400 hover:text-primary transition-colors">
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

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{current.id ? 'Edit Class' : 'Add Class'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Name <span className="text-gray-400 text-xs">(e.g. FYBCA-A)</span></label>
                <input
                  type="text" required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  value={current.name}
                  onChange={(e) => setCurrent({ ...current, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                <select
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  value={current.course_id}
                  onChange={(e) => setCurrent({ ...current, course_id: e.target.value })}
                >
                  <option value="">Select a course...</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name} — {c.Department?.name}</option>)}
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageClasses;
