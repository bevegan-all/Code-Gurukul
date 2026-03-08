import React, { useEffect, useState } from 'react';
import { BookMarked, ChevronRight, FileCode2, NotebookPen } from 'lucide-react';
import api from '../../utils/axios';
import { useNavigate } from 'react-router-dom';

const MySubjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/student/subjects')
      .then(res => setSubjects(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const majors = subjects.filter(s => s.type === 'major');
  const minors = subjects.filter(s => s.type === 'minor');

  const SubjectCard = ({ s, isMajor }) => (
    <button
      onClick={() => navigate(`/student/subjects/${s.subject_id}`)}
      className={`w-full text-left bg-white rounded-2xl border shadow-sm p-5 hover:shadow-md transition-all group cursor-pointer ${isMajor ? 'border-gray-100 hover:border-blue-200' : 'border-gray-100 hover:border-emerald-200'}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-xl ${isMajor ? 'bg-blue-50' : 'bg-emerald-50'}`}>
          <BookMarked className={`w-5 h-5 ${isMajor ? 'text-blue-600' : 'text-emerald-500'}`} />
        </div>
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${isMajor ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
          {isMajor ? 'Major' : 'Minor'}
        </span>
      </div>
      <h3 className="font-bold text-gray-900 text-base">{s.subject_name}</h3>
      <p className="text-sm text-gray-500 mt-1">Instructor: <span className="font-medium text-gray-700">{s.teacher_name}</span></p>

      {/* Quick stats row */}
      <div className="mt-4 pt-3 border-t border-gray-50 flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1"><FileCode2 className="w-3 h-3" /> Assignments</span>
        <span className="flex items-center gap-1"><NotebookPen className="w-3 h-3" /> Notes</span>
      </div>
      <div className={`mt-3 flex items-center gap-1 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity ${isMajor ? 'text-blue-600' : 'text-emerald-600'}`}>
        View materials <ChevronRight className="w-3.5 h-3.5" />
      </div>
    </button>
  );

  if (loading) return <div className="p-8 text-gray-500">Loading subjects...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Subjects</h1>
        <p className="text-gray-500 mt-1">View the subjects you are currently enrolled in and access your materials.</p>
      </div>

      {subjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <BookMarked className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No subjects found.</p>
          <p className="text-gray-400 text-sm mt-1">Contact your admin or teacher if this is a mistake.</p>
        </div>
      ) : (
        <>
          {majors.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Major Subjects</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {majors.map(s => <SubjectCard key={s.subject_id} s={s} isMajor={true} />)}
              </div>
            </div>
          )}
          {minors.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 mt-6">Minor / Elective Subjects</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {minors.map(s => <SubjectCard key={s.subject_id} s={s} isMajor={false} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MySubjects;
