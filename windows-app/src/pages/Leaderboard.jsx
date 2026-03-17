import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, Star, Search, Filter, ArrowUpDown } from 'lucide-react';
import StudentHeader from '../components/StudentHeader';
import api from '../api';

const n = (v) => parseFloat(v || 0);

export default function Leaderboard() {
  const [user] = useState(JSON.parse(localStorage.getItem('user')) || {});
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState({ departments: [], courses: [], classes: [], subjects: [], studentClass: null });
  const [filters, setFilters] = useState({
    departmentId: '',
    courseId: '',
    classId: 'default', // Default to current student class
    subjectId: '',
    taskType: 'both',
    sortBy: 'accuracy'
  });

  useEffect(() => {
    // Fetch filter metadata
    api.get('/student/leaderboard-filters')
      .then(res => setMetadata(res.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = () => {
    setLoading(true);
    const params = {};
    if (filters.departmentId) params.departmentId = filters.departmentId;
    if (filters.courseId) params.courseId = filters.courseId;
    if (filters.classId) params.classId = filters.classId;
    if (filters.subjectId) params.subjectId = filters.subjectId;
    if (filters.taskType) params.taskType = filters.taskType;
    if (filters.sortBy) params.sortBy = filters.sortBy;
    
    // Explicitly handle "Overall" if everything is empty and not default class
    if (!filters.departmentId && !filters.courseId && !filters.classId) {
      params.isGlobal = 'true';
    }

    api.get('/student/leaderboard', { params })
      .then(res => setLeaderboard(Array.isArray(res.data) ? res.data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => {
      const newFilters = { ...prev, [name]: value };
      
      // Reset dependent filters if hierarchy changes
      if (name === 'departmentId') {
        newFilters.courseId = '';
        newFilters.classId = '';
      } else if (name === 'courseId') {
        newFilters.classId = '';
      }
      return newFilters;
    });
  };

  const filteredCourses = (metadata.courses || []).filter(c => !filters.departmentId || String(c.department_id) === String(filters.departmentId));
  const filteredClasses = (metadata.classes || []).filter(c => !filters.courseId || String(c.course_id) === String(filters.courseId));

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      <StudentHeader user={user} title="Leaderboard" subtitle="See how you rank in your assignments and quizzes" />
      
      <div className="p-6 max-w-5xl mx-auto w-full flex-1 overflow-y-auto space-y-6 custom-scrollbar pb-20">
        <div className="text-center mb-4 pt-4">
          <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4 drop-shadow-md" />
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Top Coders</h2>
          <p className="text-slate-500 mt-2 font-medium">Rankings based on total AI graded marks and accuracy</p>
        </div>

        {/* Filters Section */}
        <div className="space-y-4">
          {/* Main Filter Dropdowns */}
          <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="lb-dept" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Department</label>
              <select 
                id="lb-dept"
                name="departmentId" 
                value={filters.departmentId} 
                onChange={handleFilterChange}
                aria-label="Filter by department"
                className="w-full bg-slate-50 border border-slate-100 text-slate-700 text-sm rounded-2xl px-3 py-3 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all cursor-pointer"
              >
                <option value="">Overall (All Depts)</option>
                {(metadata.departments || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="lb-course" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Course</label>
              <select 
                id="lb-course"
                name="courseId" 
                value={filters.courseId} 
                onChange={handleFilterChange}
                aria-label="Filter by course"
                className="w-full bg-slate-50 border border-slate-100 text-slate-700 text-sm rounded-2xl px-3 py-3 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all cursor-pointer"
              >
                <option value="">All Courses</option>
                {filteredCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="lb-class" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Class</label>
              <select 
                id="lb-class"
                name="classId" 
                value={filters.classId} 
                onChange={handleFilterChange}
                aria-label="Filter by class"
                className="w-full bg-slate-50 border border-slate-100 text-slate-700 text-sm rounded-2xl px-3 py-3 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all cursor-pointer"
              >
                <option value="default">{metadata.studentClass?.name || 'My Class'}</option>
                <option value="">All Classes</option>
                {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="lb-subject" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Subject</label>
              <select 
                id="lb-subject"
                name="subjectId" 
                value={filters.subjectId} 
                onChange={handleFilterChange}
                aria-label="Filter by subject"
                className="w-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-semibold rounded-2xl px-3 py-3 outline-none focus:ring-4 focus:ring-indigo-100/20 transition-all cursor-pointer"
              >
                <option value="">All Subjects Combined</option>
                {(metadata.subjects || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Toggle Filters */}
          <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Task Source</label>
              <div className="flex bg-slate-50 p-1.5 rounded-2xl" role="group" aria-label="Filter by task source">
                {['both', 'lab', 'quiz'].map((type) => (
                  <button
                    key={type}
                    onClick={() => handleFilterChange({ target: { name: 'taskType', value: type } })}
                    aria-pressed={filters.taskType === type}
                    aria-label={`Show ${type === 'both' ? 'all tasks' : type === 'lab' ? 'lab assignments only' : 'quizzes only'}`}
                    className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all ${
                      filters.taskType === type 
                        ? 'bg-white text-indigo-600 shadow-sm border border-indigo-50' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {type === 'both' ? 'All Tasks' : type === 'lab' ? 'Lab Assignments' : 'Quizzes'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Rank By</label>
              <div className="flex bg-slate-50 p-1.5 rounded-2xl" role="group" aria-label="Sort rankings by">
                {['accuracy', 'marks'].map((sort) => (
                  <button
                    key={sort}
                    onClick={() => handleFilterChange({ target: { name: 'sortBy', value: sort } })}
                    aria-pressed={filters.sortBy === sort}
                    aria-label={`Sort by ${sort === 'accuracy' ? 'accuracy percentage' : 'total marks'}`}
                    className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all ${
                      filters.sortBy === sort 
                        ? 'bg-white text-indigo-600 shadow-sm border border-indigo-50' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {sort === 'accuracy' ? 'Accuracy (%)' : 'Total Marks'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex items-center justify-center p-20 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 font-bold animate-pulse">Syncing Rankings...</p>
            </div>
          </div>
        ) : leaderboard.length > 0 ? (
          <div className="space-y-4">
            {/* Header Legend */}
            <div className="grid grid-cols-12 gap-4 px-8 py-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              <div className="col-span-1 text-center">Rank</div>
              <div className="col-span-1 flex justify-center"></div>
              <div className="col-span-4">Student Name</div>
              <div className="col-span-3 text-center">Accuracy</div>
              <div className="col-span-3 text-right">Total Marks</div>
            </div>

            <div className="bg-white rounded-[3rem] overflow-hidden border border-slate-200 shadow-2xl divide-y divide-slate-50 animate-in fade-in slide-in-from-bottom-6 duration-700">
              {leaderboard.map((entry, idx) => {
                const rank = idx + 1;
                const isTop3 = rank <= 3;
                const isUser = entry.student_name === user.name || entry.student_id === user.id;
                const accuracy = n(entry.accuracy);

                return (
                  <div 
                    key={entry.student_id || idx} 
                    role="row"
                    aria-label={`Rank ${rank}${isUser ? ', this is you' : ''}: ${entry.student_name}, class ${entry.class_name || 'unknown'}, accuracy ${n(entry.accuracy).toFixed(1)}%, total marks ${n(entry.total_score).toLocaleString()}`}
                    className={`grid grid-cols-12 items-center gap-4 px-8 py-5 hover:bg-slate-50 transition-all duration-300 ${isUser ? 'bg-indigo-50/40 relative z-10' : ''}`}
                  >
                    {/* Rank Indicator */}
                    <div className="col-span-1 flex items-center justify-center font-black text-xl text-slate-300" aria-hidden="true">
                      {rank === 1 ? <Crown size={32} className="text-yellow-500 fill-yellow-500/20 drop-shadow-sm" aria-hidden="true" /> : 
                       rank === 2 ? <Medal size={28} className="text-slate-300 drop-shadow-sm" aria-hidden="true" /> :
                       rank === 3 ? <Medal size={24} className="text-amber-600 drop-shadow-sm" aria-hidden="true" /> : 
                       <span className="text-sm font-bold opacity-60" aria-hidden="true">#{rank}</span>}
                    </div>

                    {/* Avatar */}
                    <div className="col-span-1 flex justify-center" aria-hidden="true">
                      {(entry.profile_image || entry.profileImage || entry.student_image || entry.gravatar_hash) ? (
                        <img 
                          src={entry.profile_image || entry.profileImage || entry.student_image || `https://www.gravatar.com/avatar/${entry.gravatar_hash}?d=identicon`} 
                          alt="" 
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-2xl object-cover shadow-sm transition-transform hover:rotate-3"
                        />
                      ) : (
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-transform hover:rotate-3 ${isUser ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500'}`}>
                          {entry.student_name?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>
                    
                    {/* Name */}
                    <div className="col-span-4 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-black tracking-tight truncate ${isUser ? 'text-indigo-900 text-lg' : 'text-slate-800'}`}>
                          {entry.student_name}
                        </span>
                        {isUser && <span className="flex-shrink-0 bg-indigo-600 text-white text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider shadow-sm">YOU</span>}
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{entry.class_name || 'Class Unknown'}</p>
                    </div>

                    {/* Accuracy Section */}
                    <div className="col-span-3 flex flex-col items-center">
                      <div className={`text-base font-black ${
                         accuracy >= 90 ? 'text-green-600' : 
                         accuracy >= 75 ? 'text-blue-600' : 
                         accuracy >= 50 ? 'text-amber-600' : 'text-rose-600'
                      }`}>
                        {accuracy.toFixed(1)}%
                      </div>
                      <div className="w-20 h-1.5 mt-2 bg-slate-100 rounded-full overflow-hidden shadow-inner font-normal">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ease-out font-normal ${
                            accuracy >= 90 ? 'bg-green-500' : 
                            accuracy >= 75 ? 'bg-blue-500' : 
                            accuracy >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${accuracy}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Score Section */}
                    <div className="col-span-3 text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className={`text-2xl font-black ${isUser ? 'text-indigo-600' : 'text-slate-800'}`}>
                          {n(entry.total_score).toLocaleString()}
                        </span>
                        <Star size={18} className={`${isUser ? 'text-indigo-500 fill-indigo-500' : 'text-yellow-500 fill-yellow-500'} transition-all`} />
                      </div>
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Total Marks</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-24 text-center shadow-inner">
            <Trophy className="w-20 h-20 text-slate-100 mx-auto mb-6" />
            <h3 className="text-2xl font-black text-slate-400 tracking-tight">The Board is Empty</h3>
            <p className="text-slate-400 mt-2 font-medium max-w-xs mx-auto">Complete assignments or quizzes to secure your spot among the top coders!</p>
            <button 
              onClick={fetchData} 
              className="mt-6 text-sm font-black text-indigo-600 hover:text-indigo-700 underline underline-offset-4"
            >
              Refresh Rankings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

