import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { ChevronRight, ChevronLeft, CheckCircle, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';

const QuizTaker = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const token = localStorage.getItem('token');
        // ngrok-skip-browser-warning for dev
        const res = await api.get(`/student/quizzes/${id}`);
        
        console.log("Quiz Data Received:", res.data); // Debug

        setQuiz(res.data);
        if (res.data.time_limit_minutes) {
          setTimeLeft(res.data.time_limit_minutes * 60);
        }
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.error || 'Failed to load quiz');
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [id]);

  useEffect(() => {
    if (timeLeft > 0 && !submitted && !loading && quiz) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft, submitted, loading, quiz]);

  const handleOptionSelect = (questionId, optionId, type) => {
    setAnswers(prev => {
      if (type === 'multiple') {
        const currentAnswers = prev[questionId] || [];
        if (currentAnswers.includes(optionId)) {
          return { ...prev, [questionId]: currentAnswers.filter(id => id !== optionId) };
        } else {
          return { ...prev, [questionId]: [...currentAnswers, optionId] };
        }
      } else {
        return { ...prev, [questionId]: [optionId] };
      }
    });
  };

  const handleSubmit = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.post(`/student/quizzes/${id}/submit`, { answers });
      setScore(res.data);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError('Failed to submit quiz');
    } finally {
      setLoading(false);
    }
  }, [answers, id]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading && !quiz) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (error && !quiz) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-slate-50 gap-4">
        <AlertTriangle size={48} className="text-red-500" />
        <h2 className="text-2xl font-bold text-slate-800">Error</h2>
        <p className="text-slate-600">{error}</p>
        <button 
          onClick={() => navigate('/app/quizzes')}
          className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
        >
          Back to Quizzes
        </button>
      </div>
    );
  }

  if (submitted && score) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-slate-50 p-6">
        <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-lg text-center border border-slate-100">
          <CheckCircle size={64} className="text-green-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Quiz Completed!</h2>
          <p className="text-slate-600 mb-8">Your answers have been securely submitted.</p>
          
          <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-100">
            <div className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Score</div>
            <div className="text-5xl font-black text-slate-900 mb-2">{score.score}%</div>
            <div className="text-slate-500 font-medium">
              {score.correctCount} / {score.totalQuestions} Correct
            </div>
          </div>

          <button 
            onClick={() => navigate('/app/quizzes')}
            className="w-full px-6 py-4 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-bold text-lg transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Ensure questions exist
  if (!quiz.QuizQuestions || quiz.QuizQuestions.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-slate-50 gap-4">
        <p>This quiz has no questions.</p>
        <button className="px-4 py-2 bg-slate-200 rounded" onClick={() => navigate('/app/quizzes')}>Back</button>
      </div>
    );
  }

  const currentQuestion = quiz.QuizQuestions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Quiz Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600 flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">{quiz.title}</h1>
            <p className="text-xs text-slate-500 font-medium tracking-wide uppercase mt-0.5">Secure Testing Mode</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center">
             <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Progress</div>
             <div className="text-sm font-bold text-slate-800">
               {currentQuestionIndex + 1} / {quiz.QuizQuestions.length}
             </div>
          </div>
          
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${timeLeft < 60 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
            <Clock size={16} className={timeLeft < 60 ? 'animate-pulse' : ''} />
            <span className="font-mono font-bold text-lg">{formatTime(timeLeft)}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 flex flex-col">
        
        {/* Progress Bar */}
        <div className="w-full bg-slate-200 h-2 rounded-full mb-8 overflow-hidden">
          <div 
            className="bg-blue-600 h-full transition-all duration-300 ease-out"
            style={{ width: `${((currentQuestionIndex) / quiz.QuizQuestions.length) * 100}%` }}
          ></div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-10 mb-8 flex-1">
          <div className="flex items-start gap-4 mb-8">
            <div className="flex-shrink-0 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm">
              {currentQuestionIndex + 1}
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800 leading-snug pt-0.5">
              {currentQuestion.question_text}
            </h2>
          </div>

          <div className="space-y-3">
            {currentQuestion.QuizOptions.map((opt) => {
              const isSelected = (answers[currentQuestion.id] || []).includes(opt.id);
              
              return (
                <div 
                  key={opt.id}
                  onClick={() => handleOptionSelect(currentQuestion.id, opt.id, currentQuestion.question_type)}
                  className={`w-full p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-4 group ${isSelected ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                >
                  <div className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center border transition-colors ${
                    currentQuestion.question_type === 'single' ? 'rounded-full' : 'rounded'
                  } ${
                    isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-transparent group-hover:border-slate-400'
                  }`}>
                    <CheckCircle size={14} className={isSelected ? 'block' : 'hidden'} strokeWidth={3} />
                  </div>
                  <span className={`text-lg ${isSelected ? 'text-slate-900 font-medium' : 'text-slate-700'}`}>
                    {opt.option_text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={20} /> Previous
          </button>

          {currentQuestionIndex < quiz.QuizQuestions.length - 1 ? (
             <button 
              onClick={() => setCurrentQuestionIndex(prev => Math.min(quiz.QuizQuestions.length - 1, prev + 1))}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
             >
               Next <ChevronRight size={20} />
             </button>
          ) : (
             <button 
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20 disabled:opacity-75"
             >
               {loading ? 'Submitting...' : 'Submit Quiz'} <CheckCircle size={20} />
             </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default QuizTaker;
