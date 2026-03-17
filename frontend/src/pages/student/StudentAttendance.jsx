import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, XCircle, Clock, BookOpen, ChevronRight } from 'lucide-react';
import api from '../../utils/axios';

const StudentAttendance = () => {
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
      console.error(err);
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
      console.error(err);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading attendance records...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-4">Attendance Overview</h1>
          <p className="text-gray-500 mt-1 pl-5">Track your presence across all subjects.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((item) => {
          const percentage = item.total > 0 ? Math.round((item.present / item.total) * 100) : 0;
          const colorClass = percentage >= 75 ? 'text-emerald-600 bg-emerald-50' : percentage >= 50 ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50';
          const strokeColor = percentage >= 75 ? '#10b981' : percentage >= 50 ? '#f59e0b' : '#f43f5e';

          return (
            <div 
              key={item.subject_id}
              onClick={() => fetchDetails(item.subject_id, item.subject_name)}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 rounded-xl transition-colors">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${colorClass}`}>
                  {percentage}% Attendance
                </div>
              </div>

              <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-700 transition-colors uppercase truncate" title={item.subject_name}>
                {item.subject_name}
              </h3>
              <p className="text-xs text-gray-400 font-medium capitalize mb-4">{item.type} Subject</p>

              <div className="space-y-3">
                <div className="flex justify-between text-xs font-bold text-gray-500">
                  <span>Progress</span>
                  <span>{item.present} / {item.total} Sessions</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-1000" 
                    style={{ width: `${percentage}%`, backgroundColor: strokeColor }}
                  />
                </div>
              </div>

              <button className="w-full mt-6 py-2 bg-gray-50 hover:bg-blue-600 hover:text-white text-gray-600 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 group-hover:translate-y-[-2px]">
                View History <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {details && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xl font-black text-gray-900 uppercase">{selectedSubject}</h2>
                <p className="text-xs text-gray-500 font-bold tracking-wider mt-0.5 uppercase">Detailed Attendance History</p>
              </div>
              <button 
                onClick={() => setDetails(null)}
                className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-gray-600 shadow-sm"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto p-4 flex-1">
              <div className="space-y-3">
                {details.length === 0 ? (
                  <div className="text-center py-10">
                    <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No attendance records found for this subject.</p>
                  </div>
                ) : (
                  details.map((record, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-4 bg-gray-50/50 border border-gray-100 rounded-2xl hover:bg-white hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${record.status === 'present' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                          {record.status === 'present' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-black text-gray-900 text-sm uppercase">
                            {new Date(record.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                          <div className="flex gap-2 text-[10px] mt-0.5">
                            <span className="bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-500 font-bold uppercase">Teacher: {record.teacher_name}</span>
                            <span className="bg-white px-2 py-0.5 rounded border border-gray-200 text-blue-500 font-bold uppercase">Lab: {record.lab_name || record.minor_lab_name || 'Classroom'}</span>
                          </div>
                        </div>
                      </div>
                      <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${record.status === 'present' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white shadow-lg shadow-rose-100'}`}>
                        {record.status}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50/50 rounded-b-3xl">
              <button 
                onClick={() => setDetails(null)}
                className="w-full py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-colors shadow-sm"
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

export default StudentAttendance;
