import React, { useEffect, useState } from 'react';
import { Users, Search, GraduationCap, Mail } from 'lucide-react';
import api from '../../utils/axios';
import StudentDetailModal from '../../components/StudentDetailModal';

const MyStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  useEffect(() => {
    api.get('/teacher/my-students')
      .then(r => setStudents(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = students.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.roll_no?.toLowerCase().includes(search.toLowerCase()) ||
    s.class_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Group by class
  const byClass = filtered.reduce((acc, s) => {
    const key = s.class_name || 'Unknown Class';
    acc[key] = acc[key] || [];
    acc[key].push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Students</h1>
          <p className="text-gray-500 mt-1">Students enrolled in your assigned classes.</p>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-2 text-sm font-semibold text-purple-700">
          {students.length} Total Students
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, email, roll no, class..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 pr-4 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
        />
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading students...</div>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <GraduationCap className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No students found in your classes.</p>
          <p className="text-gray-400 text-sm mt-1">Students need to be enrolled in your assigned classes by the admin.</p>
        </div>
      ) : (
        Object.entries(byClass).map(([className, classStudents]) => (
          <div key={className} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
              <div className="p-1.5 bg-purple-50 rounded-lg">
                <Users className="w-4 h-4 text-purple-600" />
              </div>
              <h2 className="font-bold text-gray-900">{className}</h2>
              <span className="ml-auto text-xs text-gray-400">{classStudents.length} students</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50/60 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">Name</th>
                  <th className="px-6 py-3 text-left font-semibold">Roll No</th>
                  <th className="px-6 py-3 text-left font-semibold">Email</th>
                  <th className="px-6 py-3 text-left font-semibold">Course</th>
                  <th className="px-6 py-3 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {classStudents.map(s => (
                  <tr 
                    key={s.id} 
                    className="hover:bg-purple-50/50 cursor-pointer transition-all active:scale-[0.99]"
                    onClick={() => setSelectedStudentId(s.id)}
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-semibold text-xs flex-shrink-0">
                          {s.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-gray-600">{s.roll_no || '—'}</td>
                    <td className="px-6 py-3.5">
                      <a href={`mailto:${s.email}`} className="text-blue-600 hover:underline flex items-center gap-1">
                        <Mail className="w-3 h-3" />{s.email}
                      </a>
                    </td>
                    <td className="px-6 py-3.5 text-gray-600">{s.course_name || '—'}</td>
                    <td className="px-6 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
      {selectedStudentId && <StudentDetailModal studentId={selectedStudentId} onClose={() => setSelectedStudentId(null)} />}
    </div>
  );
};

export default MyStudents;
