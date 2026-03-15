import React, { useEffect, useState } from 'react';
import { Users, Search } from 'lucide-react';
import api from '../../utils/axios';

const MyClasses = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/teacher/my-subjects')
      .then(r => setSubjects(r.data.filter(s => s.type === 'major' || s.type === 'vsc')))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Group by class
  const byClass = subjects.reduce((acc, s) => {
    const key = s.class_name || 'Unknown';
    acc[key] = acc[key] || { class_id: s.class_id, class_name: s.class_name, subjects: [] };
    acc[key].subjects.push(s.subject_name);
    return acc;
  }, {});

  if (loading) return <div className="p-8 text-gray-500">Loading classes...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Classes</h1>
        <p className="text-gray-500 mt-1">Classes where you are the assigned instructor.</p>
      </div>

      {Object.keys(byClass).length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No classes assigned yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Object.values(byClass).map(cls => (
            <div key={cls.class_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md hover:border-purple-200 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{cls.class_name}</h3>
                  <p className="text-xs text-gray-400">{cls.subjects.length} subject{cls.subjects.length !== 1 ? 's' : ''} assigned</p>
                </div>
              </div>
              <div className="space-y-2">
                {cls.subjects.map((sub, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                    {sub}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyClasses;
