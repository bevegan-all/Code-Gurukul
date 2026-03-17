import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Crown, Filter } from 'lucide-react';
import api from '../../utils/axios';

const Leaderboard = () => {
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
      .then(res => setLeaderboard(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters]);

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

  const filteredCourses = metadata.courses.filter(c => !filters.departmentId || String(c.department_id) === String(filters.departmentId));
  const filteredClasses = metadata.classes.filter(c => !filters.courseId || String(c.course_id) === String(filters.courseId));

  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" /> Leaderboard
        </h1>
        <p className="text-gray-500 mt-1">Ranking based on AI-graded marks from submitted lab assignments and quizzes.</p>
      </div>

      {/* Simplified Filter Bar */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Department</label>
          <select 
            name="departmentId" 
            value={filters.departmentId} 
            onChange={handleFilterChange}
            className="w-full bg-gray-50 border border-gray-100 text-gray-700 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50 transition-all cursor-pointer"
          >
            <option value="">Overall (All Depts)</option>
            {metadata.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Course</label>
          <select 
            name="courseId" 
            value={filters.courseId} 
            onChange={handleFilterChange}
            className="w-full bg-gray-50 border border-gray-100 text-gray-700 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50 transition-all cursor-pointer"
          >
            <option value="">All Courses</option>
            {filteredCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Class</label>
          <select 
            name="classId" 
            value={filters.classId} 
            onChange={handleFilterChange}
            className="w-full bg-gray-50 border border-gray-100 text-gray-700 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50 transition-all cursor-pointer"
          >
            <option value="default">{metadata.studentClass?.name || 'My Class'}</option>
            <option value="">All Classes</option>
            {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Subject</label>
          <select 
            name="subjectId" 
            value={filters.subjectId} 
            onChange={handleFilterChange}
            className="w-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-semibold rounded-xl px-3 py-2.5 outline-none focus:ring-4 focus:ring-blue-100/20 transition-all cursor-pointer"
          >
            <option value="">Total Score (All Subjects)</option>
            {metadata.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Task Source</label>
          <div className="flex bg-gray-50 p-1 rounded-xl">
            {['both', 'lab', 'quiz'].map((type) => (
              <button
                key={type}
                onClick={() => handleFilterChange({ target: { name: 'taskType', value: type } })}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
                  filters.taskType === type 
                    ? 'bg-white text-blue-600 shadow-sm border border-blue-50' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {type === 'both' ? 'All Tasks' : type === 'lab' ? 'Lab Assignments' : 'Quizzes'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Rank By</label>
          <div className="flex bg-gray-50 p-1 rounded-xl">
            {['accuracy', 'marks'].map((sort) => (
              <button
                key={sort}
                onClick={() => handleFilterChange({ target: { name: 'sortBy', value: sort } })}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
                  filters.sortBy === sort 
                    ? 'bg-white text-blue-600 shadow-sm border border-blue-50' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {sort === 'accuracy' ? 'Accuracy (%)' : 'Total Marks'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 bg-gray-50 px-6 py-4 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-widest">
          <div className="col-span-1 text-center">Rank</div>
          <div className="col-span-5">Student Name</div>
          <div className="col-span-3 text-center">Accuracy</div>
          <div className="col-span-3 text-right">Total Marks</div>
        </div>

        <div className="divide-y divide-gray-50 min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
              Updating leaderboard...
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="p-20 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-gray-200" />
              </div>
              <p className="text-gray-400 font-medium font-semibold text-gray-600">No data found</p>
              <p className="text-sm text-gray-400">No students found matching these filters with submissions.</p>
            </div>
          ) : (
            leaderboard.map((student, index) => {
              const rank = index + 1;
              const isTop3 = rank <= 3;
              let RankIcon;
              let badgeColor;
              
              if (rank === 1) { RankIcon = Crown; badgeColor = 'bg-yellow-100 text-yellow-600 border-yellow-200'; }
              else if (rank === 2) { RankIcon = Medal; badgeColor = 'bg-gray-100 text-gray-600 border-gray-200'; }
              else if (rank === 3) { RankIcon = Medal; badgeColor = 'bg-orange-100 text-orange-600 border-orange-200'; }

              return (
                <div key={student.student_id} className={`grid grid-cols-12 px-6 py-4 items-center hover:bg-gray-50/50 transition-colors ${rank === 1 ? 'bg-yellow-50/10' : ''}`}>
                  <div className="col-span-1 flex justify-center text-sm font-mono font-bold text-gray-400">
                    {isTop3 ? (
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shadow-sm ${badgeColor}`}>
                        <RankIcon className="w-4 h-4" />
                      </div>
                    ) : (
                      <span>#{rank}</span>
                    )}
                  </div>
                  <div className="col-span-5 font-semibold text-gray-800 flex items-center gap-3">
                    {(student.profile_image || student.profileImage || student.student_image || student.gravatar_hash) ? (
                      <img 
                        src={student.profile_image || student.profileImage || student.student_image || `https://www.gravatar.com/avatar/${student.gravatar_hash}?d=identicon`} 
                        alt="" 
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-full object-cover border border-gray-100"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-sm font-bold capitalize">
                        {student.student_name[0]}
                      </div>
                    )}
                    <span className="truncate">{student.student_name}</span>
                  </div>
                  <div className="col-span-3 flex justify-center">
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900 leading-none">
                        {Number(student.accuracy).toFixed(1)}%
                      </div>
                      <div className="mt-1.5 w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            student.accuracy >= 90 ? 'bg-green-500' : 
                            student.accuracy >= 75 ? 'bg-blue-500' : 
                            student.accuracy >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${student.accuracy}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="col-span-3 text-right font-bold text-lg text-blue-600 font-mono">
                    {Number(student.total_score).toLocaleString()}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;

