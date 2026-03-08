import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Star } from 'lucide-react';
import StudentHeader from '../components/StudentHeader';
import api from '../api';

export default function Leaderboard() {
  const [user] = useState(JSON.parse(localStorage.getItem('user')) || {});
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/student/leaderboard')
      .then(res => setLeaderboard(Array.isArray(res.data) ? res.data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <StudentHeader user={user} title="Class Leaderboard" subtitle="See how you rank in your assignments" />
      
      <div className="p-8 max-w-4xl mx-auto w-full flex-1">
        <div className="text-center mb-10">
          <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4 drop-shadow-md" />
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Top Coders</h2>
          <p className="text-slate-500 mt-2 font-medium">Rankings based on total AI graded marks</p>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : leaderboard.length > 0 ? (
          <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
            {leaderboard.map((entry, idx) => (
              <div 
                key={entry.student_id} 
                className={`flex items-center gap-6 p-6 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors ${entry.student_name === user.name ? 'bg-indigo-50/50 hover:bg-indigo-50/80 border-l-4 border-l-indigo-500' : ''}`}
              >
                <div className="flex items-center justify-center w-12 font-black text-2xl text-slate-400">
                  {idx === 0 ? <Medal size={40} className="text-yellow-500 drop-shadow-md" /> : 
                   idx === 1 ? <Medal size={36} className="text-slate-300 drop-shadow-md" /> :
                   idx === 2 ? <Medal size={32} className="text-amber-600 drop-shadow-md" /> : 
                   `#${idx + 1}`}
                </div>
                
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 flex items-center justify-center font-bold text-slate-600 shadow-inner text-lg">
                  {entry.student_name.charAt(0)}
                </div>
                
                <div className="flex-1">
                  <h4 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    {entry.student_name}
                    {entry.student_name === user.name && <span className="bg-indigo-100 text-indigo-700 text-xs px-2.5 py-0.5 rounded-full font-bold">YOU</span>}
                  </h4>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-black text-slate-800 flex items-center gap-1.5 justify-end">
                    {entry.total_score} <Star size={20} className="text-yellow-500 fill-current" />
                  </div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Total Marks</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border rounded-3xl p-16 text-center shadow-sm">
            <h3 className="text-xl font-bold text-slate-700">No Data Yet</h3>
            <p className="text-slate-500 mt-2">Submit assignments to get on the board!</p>
          </div>
        )}
      </div>
    </div>
  );
}
