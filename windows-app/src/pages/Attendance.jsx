import React, { useState, useEffect } from 'react';
import { BookOpen, Calendar, CheckCircle2, ChevronRight, XCircle, Clock } from 'lucide-react';
import StudentHeader from '../components/StudentHeader';
import api from '../api';

const Attendance = () => {
  const [user] = useState(JSON.parse(localStorage.getItem('user')) || {});
  const [stats, setStats] = useState([]);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/student/attendance');
      setStats(res.data);
    } catch (err) {
      console.error('Attendance stats fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async (subjectId, subjectName) => {
    setSelectedSubject(subjectName);
    try {
      const res = await api.get(`/student/attendance/${subjectId}`);
      setDetails(res.data);
    } catch (err) {
      console.error('Attendance details fetch error:', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <StudentHeader user={user} title="Academic Attendance" subtitle="View your presence" />
      
      <div className="p-8 max-w-6xl mx-auto w-full flex-1">
        {loading ? (
          <div className="flex justify-center p-12" role="status" aria-label="Loading attendance records">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" aria-hidden="true"></div>
            <span className="sr-only">Loading records…</span>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Attendance Overview</h1>
              <p className="text-slate-500 mt-1">Track your presence across all subjects assigned to your class.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              {stats.map((item) => {
                const percentage = item.total > 0 ? Math.round((item.present / item.total) * 100) : 0;
                const progressColor = percentage >= 75 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-rose-500';
                const textColor = percentage >= 75 ? 'text-emerald-700' : percentage >= 50 ? 'text-amber-700' : 'text-rose-700';
                const bgColor = percentage >= 75 ? 'bg-emerald-50' : percentage >= 50 ? 'bg-amber-50' : 'bg-rose-50';

                return (
                  <div 
                    key={item.subject_id}
                    onClick={() => fetchDetails(item.subject_id, item.subject_name)}
                    className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 rounded-xl transition-colors">
                        <BookOpen size={24} />
                      </div>
                      <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${bgColor} ${textColor}`}>
                        {percentage}% Present
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate mb-1" title={item.subject_name}>
                      {item.subject_name}
                    </h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-tight mb-6">
                      {item.type} Subject
                    </p>

                    <div className="mt-auto space-y-3">
                      <div className="flex justify-between text-xs font-bold text-slate-500">
                        <span>Academic Progress</span>
                        <span>{item.present} / {item.total} Done</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${progressColor}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>

                    <button className="w-full mt-6 py-2.5 bg-slate-900 text-white hover:bg-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-indigo-100">
                      View Records <ChevronRight size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {details && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{selectedSubject}</h2>
                <div className="flex items-center gap-2 text-indigo-600 mt-1">
                   <Clock size={12} />
                   <p className="text-[10px] font-black tracking-[0.15em] uppercase">Session History Detail</p>
                </div>
              </div>
              <button 
                onClick={() => setDetails(null)}
                className="p-3 hover:bg-white rounded-full transition-all text-slate-400 hover:text-rose-600 shadow-sm border border-transparent hover:border-slate-100"
              >
                <XCircle size={28} />
              </button>
            </div>

            <div className="overflow-y-auto p-6 flex-1 space-y-4">
              {details.length === 0 ? (
                <div className="text-center py-16">
                  <Calendar size={48} className="text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No activity records found.</p>
                </div>
              ) : (
                details.map((record, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-5 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-5">
                      <div className={`p-4 rounded-2xl ${record.status === 'present' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-rose-500 text-white shadow-lg shadow-rose-100'}`}>
                        {record.status === 'present' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-lg">
                          {new Date(record.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                        <div className="flex gap-2 mt-1.5 overflow-hidden">
                          <span className="bg-white px-3 py-1 rounded-lg border border-slate-200 text-slate-500 text-[10px] font-black uppercase whitespace-nowrap">Teacher: {record.teacher_name}</span>
                          <span className="bg-white px-3 py-1 rounded-lg border border-slate-200 text-indigo-500 text-[10px] font-black uppercase whitespace-nowrap">Lab: {record.lab_name || record.minor_lab_name || 'Classroom'}</span>
                        </div>
                      </div>
                    </div>
                    <div className={`px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-[0.1em] shadow-inner ${record.status === 'present' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {record.status}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/80">
              <button 
                onClick={() => setDetails(null)}
                className="w-full py-4 bg-white border-2 border-slate-200 text-slate-800 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
