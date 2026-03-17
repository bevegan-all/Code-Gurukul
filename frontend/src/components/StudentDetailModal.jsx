import React, { useState, useEffect } from 'react';
import { X, FileCode2, BookOpen, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../utils/axios';

const StudentDetailModal = ({ studentId, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingReport, setSendingReport] = useState(false);
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' }

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    api.get(`/teacher/students/${studentId}/full-details`)
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [studentId]);

  const handleSendReport = async (targetEmail) => {
    if (!data) return;
    setSendingReport(true);
    try {
      await api.post('/teacher/send-student-report', {
        student_id: data.profile.user_id,
        parent_email: targetEmail,
        studentData: data.profile
      });
      showToast('Report sent successfully to ' + targetEmail);
    } catch (err) {
      showToast('Failed to send report', 'error');
    } finally {
      setSendingReport(false);
    }
  };

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white p-8 rounded-2xl shadow-xl flex items-center gap-4">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="font-bold text-gray-700">Loading student record...</span>
      </div>
    </div>
  );

  const { profile, assignments, quizzes, attendance, stats } = data;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-10">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-8 border-b border-gray-100 flex justify-between items-start bg-gradient-to-br from-white to-gray-50/50">
          <div className="flex gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white text-3xl font-extrabold shadow-lg shadow-purple-200">
              {profile.name?.charAt(0)}
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{profile.name}</h2>
              <p className="text-gray-500 font-semibold mt-1 flex items-center gap-2">
                <span className="bg-gray-100 px-2.5 py-0.5 rounded-lg text-gray-700">Roll: {profile.roll_no || 'N/A'}</span>
                <span>•</span>
                <span className="text-purple-600">{profile.class_name}</span>
              </p>
              <div className="flex gap-4 mt-3 text-sm">
                <div className="flex items-center gap-1.5 text-gray-400">
                  <span className="font-medium">{profile.email}</span>
                </div>
                {profile.parent_email && (
                  <div className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full text-xs font-bold">
                    Parent: {profile.parent_email}
                  </div>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all duration-200 text-gray-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-xl text-purple-600"><FileCode2 className="w-5 h-5" /></div>
                <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Assignments</span>
              </div>
              <div className="text-4xl font-black text-gray-900 leading-none">
                {Number(stats.avgAssignment).toFixed(1)}
                <span className="text-sm font-bold text-gray-300 ml-2">% Accuracy</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-xl text-blue-600"><BookOpen className="w-5 h-5" /></div>
                <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Quizzes</span>
              </div>
              <div className="text-4xl font-black text-gray-900 leading-none">
                {Number(stats.avgQuiz).toFixed(1)}
                <span className="text-sm font-bold text-gray-300 ml-2">% Accuracy</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600"><Clock className="w-5 h-5" /></div>
                <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Attendance</span>
              </div>
              <div className="text-4xl font-black text-gray-900 leading-none">
                {stats.attPercentage}
                <span className="text-sm font-bold text-gray-300 ml-1">%</span>
                <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-tighter font-bold">
                  {stats.presentSessions} of {stats.totalSessions} present
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Scores Table */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-gray-800 flex items-center gap-3">
                  <div className="w-2 h-8 bg-purple-600 rounded-full"></div>
                  Academic History
                </h3>
              </div>
              <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left px-5 py-3 font-black uppercase tracking-wider">Subject</th>
                      <th className="text-center px-5 py-3 font-black uppercase tracking-wider">Assignments</th>
                      <th className="text-right px-5 py-3 font-black uppercase tracking-wider">Quizzes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {stats.academicStats && stats.academicStats.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-5 py-3 text-gray-700 font-bold">{item.subject_name}</td>
                        <td className="px-5 py-3 text-center font-black text-gray-800">{Number(item.assignment_accuracy || 0).toFixed(1)}%</td>
                        <td className="px-5 py-3 text-right font-black text-gray-800">{Number(item.quiz_accuracy || 0).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Attendance Records */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-gray-800 flex items-center gap-3">
                  <div className="w-2 h-8 bg-emerald-500 rounded-full"></div>
                  Student Attendance
                </h3>
              </div>
                {/* Summary Table */}
                {stats.summaryStats && stats.summaryStats.length > 0 && (
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-3xl overflow-hidden mb-6">
                    <table className="w-full text-[11px]">
                      <thead className="bg-emerald-100/50 text-emerald-800 uppercase font-black tracking-widest">
                        <tr>
                          <th className="px-5 py-3 text-left">Subject & Lab</th>
                          <th className="px-5 py-3 text-right">Attendance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-emerald-100">
                        {stats.summaryStats.map((s, idx) => (
                          <tr key={idx}>
                            <td className="px-5 py-3">
                              <div className="font-bold text-gray-700">{s.subject_name}</div>
                              <div className="text-[9px] text-emerald-500 font-medium">{s.lab_name}</div>
                            </td>
                            <td className="px-5 py-3 text-right font-black text-gray-800">
                              {s.present} / {s.total} <span className="ml-2 text-[9px] text-emerald-600 bg-white px-1.5 py-0.5 rounded-md shadow-sm">{Math.round((s.present/s.total)*100)}%</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4 ml-1">Recent Sessions</h4>
                {attendance && attendance.length > 0 ? attendance.map((att, i) => (
                  <div key={i} className="group flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-emerald-200 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                        att.status === 'present' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'
                      }`}>
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-700">{att.subject_name}</div>
                        <div className="text-[10px] text-gray-400 font-medium">
                          {new Date(att.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })} • {att.lab_name}
                        </div>
                      </div>
                    </div>
                    <div className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                      att.status === 'present' ? 'text-emerald-500 bg-emerald-50' : 'text-rose-500 bg-rose-50'
                    }`}>
                      {att.status}
                    </div>
                  </div>
                )) : (
                  <div className="p-10 border border-dashed border-gray-200 rounded-3xl text-center text-gray-400 italic">No attendance record found.</div>
                )}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="p-8 border-t border-gray-100 bg-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button 
              disabled={sendingReport}
              onClick={() => handleSendReport(profile.email)}
              className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl text-sm font-bold hover:bg-gray-50 disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2"
            >
              Send PDF to Student
            </button>
            {profile.parent_email && (
              <button 
                disabled={sendingReport}
                onClick={() => handleSendReport(profile.parent_email)}
                className="px-6 py-3 bg-purple-600 text-white rounded-2xl text-sm font-bold hover:bg-purple-700 hover:shadow-lg hover:shadow-purple-200 disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2"
              >
                Send to Parent
              </button>
            )}
          </div>
          {sendingReport && (
            <div className="flex items-center gap-3 text-purple-600">
               <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
               <span className="text-xs font-black uppercase tracking-widest">Broadcasting Report...</span>
            </div>
          )}
        </div>
      </div>

      {/* Animated Toast Pop */}
      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border ${
            toast.type === 'error' ? 'bg-white border-red-100 text-red-600' : 'bg-emerald-600 border-emerald-500 text-white'
          }`}>
            <div className={`p-2 rounded-xl ${toast.type === 'error' ? 'bg-red-50' : 'bg-white/20'}`}>
              {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
            <div>
              <p className="text-sm font-black tracking-tight">{toast.type === 'error' ? 'Error' : 'Success'}</p>
              <p className="text-xs font-semibold opacity-90">{toast.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDetailModal;
