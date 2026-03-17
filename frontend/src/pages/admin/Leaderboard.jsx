import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Star, Search, Filter } from 'lucide-react';
import api from '../../utils/axios';

const n = (v) => parseFloat(v || 0);

export default function AdminLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [search, setSearch]           = useState('');
  const [filters, setFilters] = useState({
    taskType: 'both',
    sortBy: 'accuracy',
    departmentId: '',
    courseId: '',
    classId: ''
  });
  const [metadata, setMetadata] = useState({ departments: [], courses: [], classes: [] });

  useEffect(() => {
    api.get('/admin/leaderboard-filters')
      .then(res => setMetadata(res.data))
      .catch(console.error);
  }, []);

  useEffect(() => { fetchData(); }, [filters]);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    const params = {
      taskType: filters.taskType,
      sortBy: filters.sortBy
    };
    if (filters.departmentId) params.departmentId = filters.departmentId;
    if (filters.courseId) params.courseId = filters.courseId;
    if (filters.classId) params.classId = filters.classId;

    api.get('/admin/leaderboard', { params })
      .then(res => {
        const list = Array.isArray(res.data.students) ? res.data.students : [];
        setLeaderboard(list);
      })
      .catch(() => setError('Failed to load leaderboard. Please try again.'))
      .finally(() => setLoading(false));
  };

  const filtered = leaderboard
    .filter(s => !search ||
      s.student_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.roll_no?.toLowerCase().includes(search.toLowerCase())
    );

  const handleFilterChange = (name, value) => {
    setFilters(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'departmentId') {
        next.courseId = '';
        next.classId = '';
      } else if (name === 'courseId') {
        next.classId = '';
      }
      return next;
    });
  };

  const filteredCourses = metadata.courses.filter(c => !filters.departmentId || String(c.department_id) === String(filters.departmentId));
  const filteredClasses = metadata.classes.filter(c => !filters.courseId || String(c.course_id) === String(filters.courseId));

  return (
    <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="text-center">
        <Trophy className="w-14 h-14 text-yellow-500 mx-auto mb-3 drop-shadow-md" />
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Admin Leaderboard</h2>
        <p className="text-slate-500 mt-1 font-medium">Global student rankings by marks and accuracy</p>
      </div>

      {/* Advanced Filters Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[250px]">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-slate-50/30"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <select
              value={filters.departmentId}
              onChange={e => handleFilterChange('departmentId', e.target.value)}
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">All Departments</option>
              {metadata.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>

            <select
              value={filters.courseId}
              onChange={e => handleFilterChange('courseId', e.target.value)}
              disabled={!filters.departmentId && metadata.departments.length > 0}
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50"
            >
              <option value="">All Courses</option>
              {filteredCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <select
              value={filters.classId}
              onChange={e => handleFilterChange('classId', e.target.value)}
              disabled={!filters.courseId && metadata.courses.length > 0}
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50"
            >
              <option value="">All Classes</option>
              {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <button
              onClick={fetchData}
              className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95"
            >
              Refresh Data
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-slate-50">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Task Source</label>
            <div className="flex bg-slate-100/50 p-1 rounded-2xl">
              {['both', 'lab', 'quiz'].map((type) => (
                <button
                  key={type}
                  onClick={() => handleFilterChange('taskType', type)}
                  className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all ${
                    filters.taskType === type 
                      ? 'bg-white text-indigo-600 shadow-sm border border-indigo-50' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {type === 'both' ? 'All Tasks' : type === 'lab' ? 'Labs Only' : 'Quizzes Only'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Prioritize By</label>
            <div className="flex bg-slate-100/50 p-1 rounded-2xl">
              {['accuracy', 'total_score'].map((sort) => (
                <button
                  key={sort}
                  onClick={() => handleFilterChange('sortBy', sort)}
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
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent" />
          <p className="text-slate-400 font-medium animate-pulse">Calculating Global Ranks...</p>
        </div>
      ) : error ? (
        <div className="bg-white border rounded-3xl p-12 text-center shadow-sm">
          <p className="text-rose-500 font-semibold">{error}</p>
          <button onClick={fetchData} className="mt-3 text-sm text-indigo-600 underline font-bold">Try Reconnecting</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border rounded-3xl p-20 text-center shadow-sm">
          <Trophy className="w-16 h-16 text-slate-100 mx-auto mb-4" />
          <h3 className="text-2xl font-black text-slate-700">No Performances Found</h3>
          <p className="text-slate-400 mt-2 max-w-xs mx-auto text-sm">Either no students exist or they haven't started any tasks yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Table Legend */}
          <div className="grid grid-cols-12 gap-4 px-8 py-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            <div className="col-span-1">Rank</div>
            <div className="col-span-5">Student / Class</div>
            <div className="col-span-3 text-center">Accuracy</div>
            <div className="col-span-3 text-right">Total Marks</div>
          </div>

          <div className="bg-white rounded-[2rem] overflow-hidden border border-slate-200 shadow-xl divide-y divide-slate-100">
            {filtered.map((entry, idx) => {
              const accuracy = n(entry.accuracy);
              return (
                <div
                  key={entry.student_id || idx}
                  className={`grid grid-cols-12 gap-4 items-center px-8 py-5 hover:bg-slate-50 transition-all active:scale-[0.99] cursor-default ${
                    idx === 0 ? 'bg-indigo-50/20' : ''
                  }`}
                >
                  {/* Rank Display */}
                  <div className="col-span-1 flex items-center">
                    {idx === 0 && <Crown className="w-8 h-8 text-yellow-500 fill-yellow-500/20 drop-shadow-sm" />}
                    {idx === 1 && <Medal className="w-7 h-7 text-slate-400" />}
                    {idx === 2 && <Medal className="w-6 h-6 text-amber-600" />}
                    {idx > 2 && <span className="text-lg font-black text-slate-300 font-mono">#{idx + 1}</span>}
                  </div>

                  {/* Student Details */}
                  <div className="col-span-5 flex items-center gap-4 min-w-0">
                    {(entry.profile_image || entry.profileImage || entry.student_image || entry.gravatar_hash) ? (
                      <img 
                        src={entry.profile_image || entry.profileImage || entry.student_image || `https://www.gravatar.com/avatar/${entry.gravatar_hash}?d=identicon`} 
                        alt="" 
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-2xl object-cover shadow-sm border border-slate-100 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center font-black text-indigo-600 text-lg flex-shrink-0">
                        {entry.student_name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-black text-slate-800 text-base truncate tracking-tight">{entry.student_name}</p>
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{entry.class_name || 'No Class Assigned'}</p>
                    </div>
                  </div>

                  {/* Accuracy Metric */}
                  <div className="col-span-3 flex flex-col items-center">
                    <span className={`text-base font-black ${
                       accuracy >= 90 ? 'text-green-600' :
                       accuracy >= 75 ? 'text-blue-600' :
                       accuracy >= 50 ? 'text-orange-600' : 'text-rose-600'
                    }`}>
                      {accuracy.toFixed(1)}%
                    </span>
                    <div className="w-20 h-1.5 mt-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${
                          accuracy >= 90 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' :
                          accuracy >= 75 ? 'bg-blue-500' :
                          accuracy >= 50 ? 'bg-orange-500' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                        }`}
                        style={{ width: `${accuracy}%` }}
                      />
                    </div>
                  </div>

                  {/* Marks Score */}
                  <div className="col-span-3 text-right">
                    <span className="text-2xl font-black text-slate-800 tracking-tighter">
                      {n(entry.total_score).toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 ml-1.5 uppercase">pts</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Re-using local icon if needed or import Crown
function Crown({ className, ...props }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
      {...props}
    >
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
    </svg>
  );
}
