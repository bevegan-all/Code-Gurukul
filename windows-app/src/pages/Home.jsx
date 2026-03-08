import React, { useState, useEffect } from 'react';
import { BookOpen, FileCode2, NotebookPen, ClipboardList } from 'lucide-react';
import StudentHeader from '../components/StudentHeader';
import api from '../api';

export default function Home() {
  const [user] = useState(JSON.parse(localStorage.getItem('user')) || {});
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/student/dashboard')
      .then(res => setData(res.data))
      .catch(err => console.error('Dashboard fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <StudentHeader user={user} title="Student Overview" subtitle="Welcome back" />
      
      <div className="p-8 max-w-6xl mx-auto w-full flex-1">
        {loading ? (
          <div className="flex justify-center p-12">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : !data ? (
          <div>Error loading dashboard.</div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Welcome Back, {user.name}</h1>
              <p className="text-slate-500 mt-1">Here is your learning overview for today.</p>
              <p className="text-sm font-bold text-indigo-700 bg-indigo-100 inline-flex px-4 py-1.5 rounded-full mt-3 shadow-inner border border-indigo-200">
                {data.course_name || 'N/A'} — {data.class_name || 'N/A'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <p className="text-sm font-bold text-slate-500 mb-1 uppercase tracking-wider">My Subjects</p>
                    <h3 className="text-4xl font-black text-slate-900">{data.stats?.totalSubjects || 0}</h3>
                  </div>
                  <div className="p-4 bg-indigo-50 text-indigo-600 rounded-xl">
                    <BookOpen size={28} />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 text-sm font-semibold text-slate-500">
                  Assigned automatically via class enrollment
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <p className="text-sm font-bold text-slate-500 mb-1 uppercase tracking-wider">Active Assignments</p>
                    <h3 className="text-4xl font-black text-slate-900">{data.stats?.activeAssignments || 0}</h3>
                  </div>
                  <div className="p-4 bg-fuchsia-50 text-fuchsia-600 rounded-xl">
                    <FileCode2 size={28} />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 text-sm font-semibold text-fuchsia-600">
                  Ready to be submitted in the Sandbox Lab
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <p className="text-sm font-bold text-slate-500 mb-1 uppercase tracking-wider">Published Notes</p>
                    <h3 className="text-4xl font-black text-slate-900">{data.stats?.publishedNotes || 0}</h3>
                  </div>
                  <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl">
                    <NotebookPen size={28} />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 text-sm font-semibold text-emerald-600">
                  Latest study material from your professors
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <p className="text-sm font-bold text-slate-500 mb-1 uppercase tracking-wider">Active Quizzes</p>
                    <h3 className="text-4xl font-black text-slate-900">{data.stats?.activeQuizzes || 0}</h3>
                  </div>
                  <div className="p-4 bg-orange-50 text-orange-600 rounded-xl">
                    <ClipboardList size={28} />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 text-sm font-semibold text-orange-600">
                  Timed tests to evaluate your knowledge
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 rounded-3xl p-10 text-white shadow-xl relative overflow-hidden mt-8">
              <div className="absolute -right-20 -bottom-20 w-80 h-80 border-4 border-indigo-500 rounded-full opacity-20"></div>
              <h2 className="text-2xl md:text-3xl font-bold mb-3 relative z-10 leading-snug max-w-2xl drop-shadow-lg">
                Your Secure Sandbox Environment is Active.
              </h2>
              <p className="text-indigo-200 font-medium z-10 relative text-lg mb-6">
                Navigate to your assignments to launch the interactive code editor or take quizzes securely.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
