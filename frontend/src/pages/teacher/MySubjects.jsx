import React, { useEffect, useState } from 'react';
import { BookMarked, ChevronRight, FileCode2, BookOpen, NotebookPen, GraduationCap } from 'lucide-react';
import api from '../../utils/axios';
import { useNavigate } from 'react-router-dom';

const MySubjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/teacher/my-subjects')
      .then(r => setSubjects(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const majors = subjects.filter(s => s.type === 'major');
  const minors = subjects.filter(s => s.type === 'minor');

  const SubjectCard = ({ s, isMajor }) => (
    <button
      onClick={() => navigate(`/teacher/subjects/${s.subject_id}`)}
      className={`w-full text-left bg-white rounded-2xl border shadow-sm p-5 hover:shadow-md transition-all group cursor-pointer ${isMajor ? 'border-gray-100 hover:border-purple-200' : 'border-gray-100 hover:border-blue-200'}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-xl ${isMajor ? 'bg-purple-50' : 'bg-blue-50'}`}>
          <BookMarked className={`w-5 h-5 ${isMajor ? 'text-purple-600' : 'text-blue-500'}`} />
        </div>
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${isMajor ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
          {isMajor ? 'Major' : 'Minor'}
        </span>
      </div>
      <h3 className="font-bold text-gray-900 text-base">{s.subject_name}</h3>
      {s.class_name && <p className="text-sm text-gray-500 mt-1">Class: <span className="font-medium text-gray-700">{s.class_name}</span></p>}

      {/* Quick stats row */}
      <div className="mt-4 pt-3 border-t border-gray-50 flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1"><FileCode2 className="w-3 h-3" /> Assignments</span>
        <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> Quizzes</span>
        <span className="flex items-center gap-1"><NotebookPen className="w-3 h-3" /> Notes</span>
      </div>
      <div className={`mt-3 flex items-center gap-1 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity ${isMajor ? 'text-purple-600' : 'text-blue-600'}`}>
        Open subject <ChevronRight className="w-3.5 h-3.5" />
      </div>
    </button>
  );

  if (loading) return <div className="p-8 text-gray-500">Loading subjects...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Subjects</h1>
        <p className="text-gray-500 mt-1">Click a subject to manage its assignments, quizzes, notes and students.</p>
      </div>

      {subjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <BookMarked className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No subjects assigned yet.</p>
          <p className="text-gray-400 text-sm mt-1">Contact the admin to assign subjects to your account.</p>
        </div>
      ) : (
        <>
          {majors.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Major Subjects</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {majors.map(s => <SubjectCard key={s.id} s={s} isMajor={true} />)}
              </div>
            </div>
          )}
          {minors.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Minor / Elective Subjects</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {minors.map(s => <SubjectCard key={s.id} s={s} isMajor={false} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MySubjects;
