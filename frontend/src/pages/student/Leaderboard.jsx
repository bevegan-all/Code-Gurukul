import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Crown } from 'lucide-react';
import api from '../../utils/axios';

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/student/leaderboard')
      .then(res => setLeaderboard(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-gray-400">Loading leaderboard...</div>;

  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" /> Class Leaderboard
        </h1>
        <p className="text-gray-500 mt-1">Ranking based on AI-graded marks from submitted lab assignments.</p>
      </div>

      <div className="max-w-4xl bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 bg-gray-50 px-6 py-4 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-widest">
          <div className="col-span-2 text-center">Rank</div>
          <div className="col-span-7">Student Name</div>
          <div className="col-span-3 text-right">Total Score</div>
        </div>

        <div className="divide-y divide-gray-50">
          {leaderboard.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No submissions found for your class yet.</div>
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
                  <div className="col-span-2 flex justify-center">
                    {isTop3 ? (
                      <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shadow-sm ${badgeColor}`}>
                        <RankIcon className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-50 text-gray-500 font-bold flex items-center justify-center font-mono">
                        #{rank}
                      </div>
                    )}
                  </div>
                  <div className="col-span-7 font-semibold text-gray-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-sm font-bold capitalize">
                      {student.student_name[0]}
                    </div>
                    {student.student_name}
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
