import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Book } from 'lucide-react';
import api from '../../utils/axios';

const ManageCourses = () => {
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentCourse, setCurrentCourse] = useState({ id: null, name: '', department_id: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [courseRes, deptRes] = await Promise.all([
        api.get('/admin/courses'),
        api.get('/admin/departments')
      ]);
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
      if (currentCourse.id) {
        await api.put(`/admin/courses/${currentCourse.id}`, currentCourse);
      } else {
        await api.post('/admin/courses', currentCourse);
      }
      setShowModal(false);
      setCurrentCourse({ id: null, name: '', department_id: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error saving course');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this course?')) {
      try {
        await api.delete(`/admin/courses/${id}`);
        fetchData();
      } catch (err) {
        alert(err.response?.data?.error || 'Error deleting course');
      }
    }
  };

  return (
    <div className="animate-slide-in space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Courses</h1>
          <p className="text-gray-500 mt-1">Configure degrees and their respective departments</p>
        </div>
        <button 
          onClick={() => { setCurrentCourse({ id: null, name: '', department_id: '' }); setShowModal(true); }}
          className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2 transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Course
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <p className="p-4 text-gray-500">Loading courses...</p>
        ) : courses.length === 0 ? (
          <div className="col-span-3 p-12 text-center bg-white rounded-2xl border border-dashed border-gray-300">
            <Book className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No courses yet</h3>
            <p className="text-gray-500">Get started by creating a new course program.</p>
          </div>
        ) : (
          courses.map(course => (
            <div key={course.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow group">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                    <Book className="w-6 h-6" />
                  </div>
                  <div className="flex gap-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setCurrentCourse({ id: course.id, name: course.name, department_id: course.department_id }); setShowModal(true); }}>
                      <Edit className="w-4 h-4 cursor-pointer hover:text-primary transition-colors" />
                    </button>
                    <button onClick={() => handleDelete(course.id)}>
                      <Trash2 className="w-4 h-4 cursor-pointer hover:text-red-500 transition-colors" />
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-900">{course.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{course.Department?.name || 'No Dept'}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 animate-slide-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{currentCourse.id ? 'Edit Course' : 'Add Course'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  value={currentCourse.name}
                  onChange={(e) => setCurrentCourse({ ...currentCourse, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  value={currentCourse.department_id}
                  onChange={(e) => setCurrentCourse({ ...currentCourse, department_id: e.target.value })}
                >
                  <option value="">Select a department...</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
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

export default ManageCourses;
