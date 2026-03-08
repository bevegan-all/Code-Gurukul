import React, { useState, useEffect } from 'react';
import { BookOpen, Users, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StudentHeader from '../components/StudentHeader';
import api from '../api';

export default function LearnMode() {
  const [user] = useState(JSON.parse(localStorage.getItem('user')) || {});
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/student/subjects')
      .then(res => setSubjects(Array.isArray(res.data) ? res.data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <StudentHeader user={user} title="Learn Mode" subtitle="Browse your enrolled subjects" />
      
      <div className="p-8 max-w-6xl mx-auto w-full flex-1">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Your Enrolled Subjects</h2>
          <p className="text-slate-500 mt-1">Select a subject to discover reading material, lecture notes and its specific lab assignments.</p>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : subjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {subjects.map(s => (
              <div 
                key={s.subject_id} 
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-lg transition-all group flex flex-col cursor-pointer hover:border-indigo-300"
                onClick={() => navigate(`/app/learn/${s.subject_id}`)}
              >
                <div className="p-3 bg-indigo-50 w-max rounded-xl text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                  <BookOpen size={30} />
                </div>
                
                <h3 className="font-bold text-xl text-slate-800 mb-2 group-hover:text-indigo-700 transition-colors">
                  {s.subject_name}
                </h3>
                
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
                  <Users size={16} /> Prof. {s.teacher_name}
                </div>
                
                <div className="mt-auto flex justify-between items-center border-t border-slate-100 pt-4">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${s.type === 'major' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                    {s.type}
                  </span>
                  
                  <ArrowRight size={20} className="text-slate-400 group-hover:text-indigo-600 transform group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border rounded-2xl p-12 text-center shadow-sm">
            <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-700">No Subjects Currently</h3>
            <p className="text-slate-500">You have no active enrolled subjects yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
