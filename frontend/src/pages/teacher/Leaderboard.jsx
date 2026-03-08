import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Star, Search } from 'lucide-react';
import api from '../../utils/axios';

const n = (v) => parseFloat(v || 0);

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [search, setSearch]           = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [classes, setClasses]         = useState([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    api.get('/leaderboard')
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : [];
        setLeaderboard(list);
        setClasses([...new Set(list.map(s => s.class_name).filter(Boolean))]);
      })
      .catch(() => setError('Failed to load leaderboard. Please try again.'))
      .finally(() => setLoading(false));
  };

  const filtered = leaderboard
    .filter(s => classFilter === 'all' || s.class_name === classFilter)
    .filter(s => !search ||
      s.student_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.roll_no?.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="p-6 max-w-4xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="text-center">
        <Trophy className="w-14 h-14 text-yellow-500 mx-auto mb-3 drop-shadow-md" />
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Student Leaderboard</h2>
        <p className="text-slate-500 mt-1 font-medium">Ranked by combined assignment + quiz marks</p>
      </div>

      {/* Filters */}
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
        {classes.length > 0 && (
          <select
            value={classFilter}
            onChange={e => setClassFilter(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
          >
            <option value="all">All Classes</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <button
          onClick={fetchData}
          className="px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors"
        >
          Refresh
        </button>
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
          <p className="text-slate-500 mt-2">Students need to submit assignments or take quizzes to appear here.</p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <>
          {/* Table header */}
          <div className="grid grid-cols-[56px_1fr_120px_90px] gap-4 px-6 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <div>Rank</div>
            <div>Student</div>
            <div>Class</div>
            <div className="text-right">Total Score</div>
          </div>

          <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-lg">
            {filtered.map((entry, idx) => (
              <div
                key={entry.student_id || idx}
                className={`grid grid-cols-[56px_1fr_120px_90px] gap-4 items-center px-6 py-5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors ${
                  idx === 0 ? 'bg-amber-50/60' : idx === 1 ? 'bg-slate-50/60' : idx === 2 ? 'bg-orange-50/40' : ''
                }`}
              >
                {/* Rank */}
                <div className="flex items-center justify-center font-black text-2xl text-slate-400">
                  {idx === 0 ? <Medal size={36} className="text-yellow-500 drop-shadow-md" /> :
                   idx === 1 ? <Medal size={32} className="text-slate-400 drop-shadow-md" /> :
                   idx === 2 ? <Medal size={28} className="text-amber-600 drop-shadow-md" /> :
                   <span className="text-base font-bold text-slate-400">#{idx + 1}</span>}
                </div>

                {/* Name + roll */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-purple-200 to-indigo-100 flex items-center justify-center font-bold text-purple-700 shadow-inner text-lg flex-shrink-0">
                    {entry.student_name?.charAt(0) || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-base truncate">{entry.student_name}</p>
                    {entry.roll_no && (
                      <p className="text-xs text-slate-400 font-mono">{entry.roll_no}</p>
                    )}
                  </div>
                </div>

                {/* Class */}
                <div>
                  <span className="text-xs px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-100 font-medium">
                    {entry.class_name || '—'}
                  </span>
                </div>

                {/* Score */}
                <div className="text-right">
                  <div className="text-2xl font-black text-slate-800 flex items-center gap-1.5 justify-end">
                    {n(entry.total_score).toFixed(0)}
                    <Star size={18} className="text-yellow-500 fill-current" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
