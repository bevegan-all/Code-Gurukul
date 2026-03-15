import React, { useState, useEffect } from 'react';
import { X, FileCode2, BookOpen, Clock } from 'lucide-react';
import api from '../utils/axios';

const StudentDetailModal = ({ studentId, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingReport, setSendingReport] = useState(false);

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
        studentData: data.profile,
        assignmentData: { avg_marks: data.stats.avgAssignment },
        quizData: { avg_marks: data.stats.avgQuiz }
      });
      alert('Report sent successfully to ' + targetEmail);
    } catch (err) {
      alert('Failed to send report');
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

  const { profile, assignments, quizzes, sessions, stats } = data;

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
                <span className="text-sm font-bold text-gray-300 ml-2">avg / 10</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-xl text-blue-600"><BookOpen className="w-5 h-5" /></div>
                <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Quizzes</span>
              </div>
              <div className="text-4xl font-black text-gray-900 leading-none">
                {Number(stats.avgQuiz).toFixed(0)}
                <span className="text-sm font-bold text-gray-300 ml-2">avg / 100</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600"><Clock className="w-5 h-5" /></div>
                <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Attendance</span>
              </div>
              <div className="text-4xl font-black text-gray-900 leading-none">
                {stats.totalSessions}
                <span className="text-sm font-bold text-gray-300 ml-2">sessions</span>
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
                <table className="w-full text-sm">
                  <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-black tracking-widest">
                    <tr>
                      <th className="px-6 py-4 text-left">Internal Assessment</th>
                      <th className="px-6 py-4 text-right">Credits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-medium">
                    {assignments.length > 0 ? assignments.map(a => (
                      <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-gray-800">{a.title}</div>
                          <div className="text-[10px] text-purple-400 uppercase font-bold mt-1">Lab Assignment • {a.compiler_required}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`px-2.5 py-1 rounded-lg font-bold ${a.total_score > (a.max_score * 0.7) ? 'text-emerald-600 bg-emerald-50' : 'text-purple-600 bg-purple-50'}`}>
                            {a.total_score} <span className="text-[10px] opacity-60">/ {a.max_score || 10}</span>
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="2" className="px-6 py-10 text-center text-gray-400 italic">No assignments attempted yet.</td></tr>
                    )}
                    {quizzes.map(q => (
                      <tr key={q.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-gray-800">{q.title}</div>
                          <div className="text-[10px] text-blue-400 uppercase font-bold mt-1">Online MCQ Quiz</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`px-2.5 py-1 rounded-lg font-bold ${q.score > 70 ? 'text-emerald-600 bg-emerald-50' : 'text-blue-600 bg-blue-50'}`}>
                            {q.score} <span className="text-[10px] opacity-60">/ {q.max_marks}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Login Logs */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-gray-800 flex items-center gap-3">
                  <div className="w-2 h-8 bg-emerald-500 rounded-full"></div>
                  Recent Connectivity
                </h3>
              </div>
              <div className="space-y-3">
                {sessions.length > 0 ? sessions.map((s, i) => (
                  <div key={i} className="group flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-emerald-200 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
                        <Clock className="w-5 h-5 text-gray-400 group-hover:text-emerald-500" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-700">App Session</div>
                        <div className="text-[10px] text-gray-400 font-medium">
                          {new Date(s.login_time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                      </div>
                    </div>
                    {s.logout_time ? (
                      <div className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">Closed Cleanly</div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-wider">Active Now</span>
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="p-10 border border-dashed border-gray-200 rounded-3xl text-center text-gray-400 italic">No session history found.</div>
                )}
              </div>
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
    </div>
  );
};

export default StudentDetailModal;
