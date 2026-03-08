import React, { useEffect, useState } from 'react';
import { BookMarked, FileCode2, NotebookPen, Quote } from 'lucide-react';
import api from '../../utils/axios';

const StudentDashboardHome = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/student/dashboard')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse">Loading dashboard...</div>;
  if (!data) return <div>Error loading dashboard data.</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome Back, Student</h1>
        <p className="text-gray-500 mt-1">Here is your learning overview for today.</p>
        <p className="text-sm font-medium text-blue-600 bg-blue-50 inline-flex px-3 py-1 rounded-full mt-2">
          {data.course_name} — {data.class_name}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-110 transition-transform" />
          <div className="flex justify-between items-start relative">
            <div>
              <p className="text-sm font-semibold text-gray-500 mb-1">My Subjects</p>
              <h3 className="text-3xl font-black text-gray-900">{data.stats.totalSubjects}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <BookMarked className="w-6 h-6" />
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 mt-4 relative">
            Enrolled automatically via class
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-50 rounded-full group-hover:scale-110 transition-transform" />
          <div className="flex justify-between items-start relative">
            <div>
              <p className="text-sm font-semibold text-gray-500 mb-1">Active Assignments</p>
              <h3 className="text-3xl font-black text-gray-900">{data.stats.activeAssignments}</h3>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <FileCode2 className="w-6 h-6" />
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 mt-4 relative">
            To be submitted via Windows App
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform" />
          <div className="flex justify-between items-start relative">
            <div>
              <p className="text-sm font-semibold text-gray-500 mb-1">Published Notes</p>
              <h3 className="text-3xl font-black text-gray-900">{data.stats.publishedNotes}</h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <NotebookPen className="w-6 h-6" />
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 mt-4 relative">
            Study material from teachers
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute -right-20 -bottom-20 w-64 h-64 border-4 border-blue-500 rounded-full opacity-20"></div>
        <div className="absolute -right-10 -bottom-10 w-48 h-48 border-4 border-blue-400 rounded-full opacity-20"></div>
        <Quote className="w-10 h-10 text-blue-300 opacity-50 mb-3" />
        <h2 className="text-xl md:text-2xl font-bold mb-2 relative z-10 leading-snug max-w-2xl">
          "Programming isn't about what you know; it's about what you can figure out."
        </h2>
        <p className="text-blue-100 font-medium z-10 relative">
          Open the CodeGurukul Windows App to start coding your lab assignments today!
        </p>
      </div>

    </div>
  );
};

export default StudentDashboardHome;
