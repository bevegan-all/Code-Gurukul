import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, BookOpen } from 'lucide-react';
import api from '../../utils/axios';

const ManageSubjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentSub, setCurrentSub] = useState({ id: null, name: '', type: 'major', course_id: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subRes, courseRes] = await Promise.all([
        api.get('/admin/subjects'),
        api.get('/admin/courses')
      ]);
      setSubjects(subRes.data);
      setCourses(courseRes.data);
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
      setCurrentSub({ id: null, name: '', type: 'major', course_id: '' });
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

  return (
    <div className="animate-slide-in space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Subjects</h1>
          <p className="text-gray-500 mt-1">Configure major limits and open minor subjects</p>
        </div>
        <button
          onClick={() => { setCurrentSub({ id: null, name: '', type: 'major', course_id: '' }); setShowModal(true); }}
          className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2 transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Subject
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col flex-1 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative w-80">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search subjects..."
              className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div className="overflow-auto flex-1 relative">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-max pb-24">
            <thead className="bg-gray-50/80 backdrop-blur-sm text-gray-600 font-medium border-b border-gray-100 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 rounded-tl-lg">Subject Name</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Linked Course</th>
                <th className="px-6 py-4 text-right rounded-tr-lg">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : subjects.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">No subjects found.</td>
                </tr>
              ) : (
                subjects.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-gray-900">{sub.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${sub.type === 'major' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {sub.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{sub.type === 'minor' ? 'All (Open Minor)' : sub.Course?.name || 'Unknown'}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => { setCurrentSub({ id: sub.id, name: sub.name, type: sub.type, course_id: sub.course_id || '' }); setShowModal(true); }} className="p-1.5 text-gray-400 hover:text-primary transition-colors">
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

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 animate-slide-in">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  value={currentSub.type}
                  onChange={(e) => setCurrentSub({ ...currentSub, type: e.target.value, course_id: e.target.value === 'minor' ? '' : currentSub.course_id })}
                >
                  <option value="major">Major (Specific to Course)</option>
                  <option value="minor">Minor (Open for all)</option>
                </select>
              </div>
              
              {currentSub.type === 'major' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Linked Course</label>
                  <select
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    value={currentSub.course_id}
                    onChange={(e) => setCurrentSub({ ...currentSub, course_id: e.target.value })}
                  >
                    <option value="">Select a course...</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-colors">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageSubjects;
