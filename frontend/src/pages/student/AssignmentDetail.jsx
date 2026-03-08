import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileCode2, Clock, Code, Lock } from 'lucide-react';
import api from '../../utils/axios';

const AssignmentDetail = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/student/assignments/${assignmentId}`)
      .then(res => setAssignment(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [assignmentId]);

  if (loading) return <div className="p-8 text-gray-400">Loading assignment details...</div>;
  if (!assignment) return <div className="p-8 text-red-500">Assignment not found.</div>;

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        <div className="p-8 md:p-10 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <FileCode2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Lab Assignment</span>
              <h1 className="text-3xl font-bold text-gray-900 mt-1">{assignment.title}</h1>
            </div>
          </div>

          <p className="text-gray-600 leading-relaxed mb-6">
            {assignment.description}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl font-medium text-sm text-gray-600">
              <Code className="w-4 h-4 text-blue-500" /> {assignment.compiler_required}
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl font-medium text-sm text-gray-600">
              <Clock className="w-4 h-4 text-orange-400" /> {assignment.time_limit_minutes || 'No limit'}
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl font-medium text-sm text-gray-600">
              Subject: <span className="text-gray-900">{assignment.subject_name}</span>
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl font-medium text-sm text-gray-600">
              By: <span className="text-gray-900">{assignment.teacher_name}</span>
            </span>
          </div>
        </div>

        {/* Windows App Banner */}
        <div className="bg-amber-50 p-6 border-b border-amber-100 flex items-start gap-4">
          <div className="p-2 bg-amber-100 text-amber-600 rounded-xl flex-shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-amber-800 text-sm mb-1">Testing & Submission Locked to Windows App</h3>
            <p className="text-amber-700 text-sm">You are currently viewing this assignment in Read-Only mode on the web portal. To actually write code, test algorithms, and submit your answers, launch the CodeGurukul Windows App on your computer and navigate to this assignment.</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900 pl-2">Questions Preview</h2>
        
        {assignment.sets?.map((set, sIdx) => (
          <div key={set.set_id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 overflow-hidden relative">
            <div className="absolute top-0 right-0 py-1.5 px-4 bg-gray-50 border-b border-l border-gray-100 rounded-bl-xl text-xs font-bold text-gray-500 uppercase tracking-widest">
              Set {sIdx + 1}
            </div>
            
            <h3 className="text-lg font-bold text-gray-800 mb-4">{set.set_title}</h3>
            
            <div className="space-y-4">
              {set.questions?.map((q, qIdx) => (
                <div key={q.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-start gap-3">
                    <span className="text-blue-500 font-bold text-base mt-0.5 flex-shrink-0">
                      Q{q.order_index ?? qIdx + 1}.
                    </span>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">{q.question_text}</p>
                  </div>
                </div>
              ))}
              {(!set.questions || set.questions.length === 0) && (
                <p className="text-sm text-gray-400 italic py-2">No questions defined for this set.</p>
              )}
            </div>
          </div>
        ))}
        {(!assignment.sets || assignment.sets.length === 0) && (
          <div className="text-center py-12 text-gray-400">
            No questions available or assignment is empty.
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignmentDetail;
