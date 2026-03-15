import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Star, Search, Filter, ArrowUpDown } from 'lucide-react';
import api from '../../utils/axios';

const n = (v) => parseFloat(v || 0);

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [search, setSearch]           = useState('');
  const [filters, setFilters]         = useState({
    classId: '',
    taskType: 'both',
    sortBy: 'accuracy'
  });
  const [classes, setClasses]         = useState([]);

  useEffect(() => { 
    // Fetch classes for filter if needed, but for now we'll extract from list or fetch separately
    api.get('/teacher/dashboard-stats').then(res => {
      if (res.data.myClasses) {
        const uniqueClasses = [];
        const seen = new Set();
        (res.data.myClasses || []).forEach(c => {
          if (c.class_id && c.Class?.name && !seen.has(c.class_id)) {
            seen.add(c.class_id);
            uniqueClasses.push({ id: c.class_id, name: c.Class.name });
          }
        });
        setClasses(uniqueClasses);
      }
    });
  }, []);

  useEffect(() => { fetchData(); }, [filters]);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    const params = {
      taskType: filters.taskType,
      sortBy: filters.sortBy
    };
    if (filters.classId) params.classId = filters.classId;

    api.get('/teacher/leaderboard', { params })
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

  return (
    <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="text-center">
        <Trophy className="w-14 h-14 text-yellow-500 mx-auto mb-3 drop-shadow-md" />
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Student Leaderboard</h2>
        <p className="text-slate-500 mt-1 font-medium italic">Track your students' ranks by marks and accuracy</p>
      </div>

      {/* Main Filters */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or roll no..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
            />
          </div>
          <select
            value={filters.classId}
            onChange={e => setFilters(prev => ({ ...prev, classId: e.target.value }))}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
          >
            <option value="">All My Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button
            onClick={fetchData}
            className="px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Accuracy & Task Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-50">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Task Type</label>
            <div className="flex bg-slate-50 p-1 rounded-xl">
              {['both', 'lab', 'quiz'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilters(prev => ({ ...prev, taskType: type }))}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                    filters.taskType === type 
                      ? 'bg-white text-purple-600 shadow-sm border border-purple-50' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {type === 'both' ? 'All' : type === 'lab' ? 'Labs' : 'Quizzes'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Order By</label>
            <div className="flex bg-slate-50 p-1 rounded-xl">
              {['accuracy', 'total_score'].map((sort) => (
                <button
                  key={sort}
                  onClick={() => setFilters(prev => ({ ...prev, sortBy: sort }))}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                    filters.sortBy === sort 
                      ? 'bg-white text-purple-600 shadow-sm border border-purple-50' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                   {sort === 'accuracy' ? 'Accuracy' : 'Total Marks'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex justify-center p-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
        </div>
      )}

      {!loading && error && (
        <div className="bg-white border rounded-3xl p-12 text-center shadow-sm">
          <p className="text-rose-500 font-semibold">{error}</p>
          <button onClick={fetchData} className="mt-3 text-sm text-purple-600 underline">Retry</button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="bg-white border rounded-3xl p-16 text-center shadow-sm">
          <Trophy className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-slate-700">No Data Yet</h3>
          <p className="text-slate-500 mt-2">Check back after students submit tasks.</p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <>
          {/* Table header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <div className="col-span-1">Rank</div>
            <div className="col-span-5">Student</div>
            <div className="col-span-3 text-center">Accuracy</div>
            <div className="col-span-3 text-right">Total Score</div>
          </div>

          <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-lg divide-y divide-slate-100">
            {filtered.map((entry, idx) => {
              const accuracy = n(entry.accuracy);
              return (
                <div
                  key={entry.student_id || idx}
                  className={`grid grid-cols-12 gap-4 items-center px-6 py-4 hover:bg-slate-50 transition-colors ${
                    idx === 0 ? 'bg-amber-50/30' : ''
                  }`}
                >
                  {/* Rank */}
                  <div className="col-span-1 flex items-center justify-center font-black text-slate-300">
                    {idx === 0 ? <Medal size={28} className="text-yellow-500 drop-shadow-sm" /> :
                     idx === 1 ? <Medal size={24} className="text-slate-300 drop-shadow-sm" /> :
                     idx === 2 ? <Medal size={20} className="text-amber-600 drop-shadow-sm" /> :
                     <span className="text-sm font-bold">#{idx + 1}</span>}
                  </div>

                  {/* Name */}
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 shadow-sm text-sm flex-shrink-0 border border-white">
                      {entry.student_name?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{entry.student_name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{entry.class_name || 'No Class'}</p>
                    </div>
                  </div>

                  {/* Accuracy */}
                  <div className="col-span-3 flex flex-col items-center">
                    <span className={`text-sm font-bold ${
                       accuracy >= 90 ? 'text-green-600' :
                       accuracy >= 75 ? 'text-blue-600' :
                       accuracy >= 50 ? 'text-orange-600' : 'text-rose-600'
                    }`}>
                      {accuracy.toFixed(1)}%
                    </span>
                    <div className="w-16 h-1 mt-1 font-medium bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-700 ${
                          accuracy >= 90 ? 'bg-green-500' :
                          accuracy >= 75 ? 'bg-blue-500' :
                          accuracy >= 50 ? 'bg-orange-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${accuracy}%` }}
                      />
                    </div>
                  </div>

                  {/* Score */}
                  <div className="col-span-3 text-right">
                    <div className="text-lg font-black text-slate-800 flex items-center gap-1 justify-end">
                      {n(entry.total_score).toLocaleString()}
                      <Star size={14} className="text-yellow-500 fill-current" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
