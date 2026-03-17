import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookMarked, FileCode2, NotebookPen, Quote } from 'lucide-react';
import api from '../../utils/axios';

const StudentDashboardHome = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/student/dashboard'),
      api.get('/student/attendance')
    ]).then(([dashRes, attRes]) => {
      setData(dashRes.data);
      setAttendance(attRes.data);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-8 space-y-4">
      <div className="h-8 bg-gray-100 rounded-lg w-1/4 animate-pulse"></div>
      <div className="grid grid-cols-3 gap-6">
        <div className="h-32 bg-gray-100 rounded-2xl animate-pulse"></div>
        <div className="h-32 bg-gray-100 rounded-2xl animate-pulse"></div>
        <div className="h-32 bg-gray-100 rounded-2xl animate-pulse"></div>
      </div>
      <div className="h-64 bg-gray-100 rounded-2xl animate-pulse"></div>
    </div>
  );

  if (!data) return <div className="p-8 text-center text-rose-500 font-bold">Error loading dashboard data. Please try again later.</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Welcome Back, {data.name || 'Student'}</h1>
          <p className="text-gray-500 mt-1 font-medium italic">"Your future is created by what you do today, not tomorrow."</p>
        </div>
        <div className="px-5 py-2.5 bg-white border border-blue-100 shadow-sm rounded-2xl flex items-center gap-3">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
          <span className="text-sm font-bold text-blue-700 uppercase tracking-wider">
            {data.course_name} <span className="mx-2 text-gray-300">|</span> {data.class_name}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          onClick={() => navigate('/student/subjects')}
          className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all cursor-pointer"
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-125 transition-transform duration-500" />
          <div className="flex justify-between items-start relative">
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">My Subjects</p>
              <h3 className="text-4xl font-black text-gray-900">{data.stats.totalSubjects}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-inner">
              <BookMarked className="w-6 h-6" />
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 mt-6 relative uppercase tracking-tighter">
             Active enrollment in current year
          </p>
        </div>

        <div 
          onClick={() => navigate('/student/assignments')}
          className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all cursor-pointer"
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-50 rounded-full group-hover:scale-125 transition-transform duration-500" />
          <div className="flex justify-between items-start relative">
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Active Labs</p>
              <h3 className="text-4xl font-black text-gray-900">{data.stats.activeAssignments}</h3>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl shadow-inner">
              <FileCode2 className="w-6 h-6" />
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-[10px] font-black text-purple-600 mt-6 relative uppercase tracking-tighter">
            Pending lab assignment tasks
          </p>
        </div>

        <div 
          onClick={() => navigate('/student/notes')}
          className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all cursor-pointer"
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-125 transition-transform duration-500" />
          <div className="flex justify-between items-start relative">
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Materials</p>
              <h3 className="text-4xl font-black text-gray-900">{data.stats.publishedNotes}</h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shadow-inner">
              <NotebookPen className="w-6 h-6" />
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 mt-6 relative uppercase tracking-tighter">
            New study resources available
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Attendance Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm relative group overflow-hidden">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Academic Attendance</h2>
              <p className="text-xs text-gray-400 font-bold uppercase mt-1 tracking-widest">Live Presence Statistics</p>
            </div>
            <div className="flex gap-2">
               <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 border border-gray-100 px-3 py-1.5 rounded-xl uppercase">
                 <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                 Present %
               </div>
            </div>
          </div>

          <div className="flex items-end justify-between h-48 gap-4 px-2">
            {attendance.length > 0 ? attendance.map((item, idx) => {
              const perc = item.total > 0 ? Math.round((item.present / item.total) * 100) : 0;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-4 group/bar h-full justify-end">
                  <div className="relative w-full flex flex-col items-center justify-end h-full group">
                     {/* Tooltip */}
                     <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] font-black px-2 py-1 rounded-lg pointer-events-none mb-2 z-10 whitespace-nowrap uppercase tracking-widest">
                       {item.present}/{item.total} Days
                     </div>
                     {/* Bar Background */}
                     <div className="w-full bg-gray-50 rounded-t-2xl h-full absolute bottom-0 border-x border-t border-gray-100/50"></div>
                     {/* Active Bar */}
                     <div 
                       className="w-full bg-gradient-to-t from-blue-700 to-blue-400 rounded-t-2xl transition-all duration-1000 ease-out relative shadow-lg shadow-blue-100 group-hover:from-blue-600 group-hover:to-blue-300"
                       style={{ height: `${perc}%` }}
                     >
                       <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-black text-white drop-shadow-sm">
                         {perc}%
                       </div>
                     </div>
                  </div>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-tighter truncate w-full text-center" title={item.subject_name}>
                    {item.subject_name.length > 10 ? item.subject_name.substring(0, 8) + '...' : item.subject_name}
                  </p>
                </div>
              );
            }) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-3">
                 <div className="p-4 bg-gray-50 rounded-full"><BookMarked className="w-10 h-10" /></div>
                 <p className="text-xs font-bold uppercase tracking-widest">No attendance data yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Motivation Card */}
        <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-950 rounded-3xl p-8 text-white shadow-xl shadow-blue-100 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 border-[20px] border-blue-600/20 rounded-full"></div>
          <div className="absolute -right-10 -bottom-10 w-64 h-64 border-[15px] border-blue-500/10 rounded-full"></div>
          
          <div className="relative z-10">
            <Quote className="w-12 h-12 text-blue-300/30 mb-6" />
            <h2 className="text-2xl font-black mb-4 leading-tight uppercase italic tracking-tight">
              "Programming is the closest thing we have to magic."
            </h2>
            <div className="w-12 h-1.5 bg-blue-400 rounded-full mb-8"></div>
          </div>
          
          <div className="relative z-10 bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 group cursor-default">
             <p className="text-sm font-bold text-blue-50 mb-1 group-hover:text-white transition-colors">Lab Ready</p>
             <p className="text-xs text-blue-200/80 leading-relaxed font-medium">Use the CodeGurukul portal to submit your assignments and view your AI-evaluated marks in real-time.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboardHome;
