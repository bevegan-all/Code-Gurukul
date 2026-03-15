import React, { useState, useEffect, useCallback, useRef } from 'react';
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

  // Focus ref for question heading — move focus when question changes
  const questionHeadingRef = useRef(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await api.get(`/student/quizzes/${id}`);
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

  // Move keyboard focus to question heading when question changes
  useEffect(() => {
    if (questionHeadingRef.current) {
      questionHeadingRef.current.focus();
    }
  }, [currentQuestionIndex]);

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

  // Keyboard navigation for option lists
  const handleOptionKeyDown = (e, questionId, optionId, type, options, currentIdx) => {
    const isSelected = (answers[questionId] || []).includes(optionId);
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleOptionSelect(questionId, optionId, type);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      const nextEl = document.getElementById(`opt-${questionId}-${options[Math.min(currentIdx + 1, options.length - 1)].id}`);
      nextEl?.focus();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevEl = document.getElementById(`opt-${questionId}-${options[Math.max(currentIdx - 1, 0)].id}`);
      prevEl?.focus();
    }
  };

  if (loading && !quiz) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50" role="status" aria-label="Loading quiz">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" aria-hidden="true"></div>
        <span className="sr-only">Loading quiz…</span>
      </div>
    );
  }

  if (error && !quiz) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-slate-50 gap-4" role="alert">
        <AlertTriangle size={48} className="text-red-500" aria-hidden="true" />
        <h2 className="text-2xl font-bold text-slate-800">Error</h2>
        <p className="text-slate-600">{error}</p>
        <button 
          onClick={() => navigate('/app/quizzes')}
          className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
          aria-label="Return to quizzes list"
        >
          Back to Quizzes
        </button>
      </div>
    );
  }

  if (submitted && score) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-slate-50 p-6">
        <div
          className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-lg text-center border border-slate-100"
          role="alert"
          aria-label={`Quiz completed. Your score is ${score.score}. You answered ${score.correctCount} out of ${score.totalQuestions} questions correctly.`}
        >
          <CheckCircle size={64} className="text-green-500 mx-auto mb-6" aria-hidden="true" />
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Quiz Completed!</h2>
          <p className="text-slate-600 mb-8">Your answers have been securely submitted.</p>
          
          <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-100">
            <div className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Score</div>
            <div className="text-5xl font-black text-slate-900 mb-2" aria-hidden="true">{score.score}</div>
            <div className="text-slate-500 font-medium" aria-hidden="true">
              {score.correctCount} / {score.totalQuestions} Correct
            </div>
          </div>

          <button 
            onClick={() => navigate('/app/quizzes')}
            className="w-full px-6 py-4 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-bold text-lg transition-colors"
            aria-label="Return to quizzes dashboard"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!quiz.QuizQuestions || quiz.QuizQuestions.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-slate-50 gap-4" role="status">
        <p>This quiz has no questions.</p>
        <button className="px-4 py-2 bg-slate-200 rounded" onClick={() => navigate('/app/quizzes')}>Back</button>
      </div>
    );
  }

  const currentQuestion = quiz.QuizQuestions[currentQuestionIndex];
  const isSingleSelect = currentQuestion.question_type !== 'multiple';
  const optionRole = isSingleSelect ? 'radio' : 'checkbox';
  const groupRole = isSingleSelect ? 'radiogroup' : 'group';
  const totalQuestions = quiz.QuizQuestions.length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Quiz Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm" role="banner">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600 flex items-center justify-center" aria-hidden="true">
            <ShieldCheck size={20} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">{quiz.title}</h1>
            <p className="text-xs text-slate-500 font-medium tracking-wide uppercase mt-0.5">Secure Testing Mode</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center" aria-label={`Question ${currentQuestionIndex + 1} of ${totalQuestions}`}>
             <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1" aria-hidden="true">Progress</div>
             <div className="text-sm font-bold text-slate-800" aria-hidden="true">
               {currentQuestionIndex + 1} / {totalQuestions}
             </div>
          </div>
          
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${timeLeft < 60 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
            aria-live={timeLeft < 60 ? 'assertive' : 'off'}
            aria-label={`Time remaining: ${formatTime(timeLeft)}${timeLeft < 60 ? '. Warning: less than one minute left' : ''}`}
          >
            <Clock size={16} className={timeLeft < 60 ? 'animate-pulse' : ''} aria-hidden="true" />
            <span className="font-mono font-bold text-lg" aria-hidden="true">{formatTime(timeLeft)}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 flex flex-col">
        
        {/* Progress Bar */}
        <div
          className="w-full bg-slate-200 h-2 rounded-full mb-8 overflow-hidden"
          role="progressbar"
          aria-valuenow={currentQuestionIndex}
          aria-valuemin={0}
          aria-valuemax={totalQuestions}
          aria-label={`Quiz progress: question ${currentQuestionIndex + 1} of ${totalQuestions}`}
        >
          <div 
            className="bg-blue-600 h-full transition-all duration-300 ease-out"
            style={{ width: `${(currentQuestionIndex / totalQuestions) * 100}%` }}
          ></div>
        </div>

        {/* Question Card — aria-live so NVDA reads new question on navigation */}
        <div
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-10 mb-8 flex-1"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="flex items-start gap-4 mb-8">
            <div className="flex-shrink-0 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm" aria-hidden="true">
              {currentQuestionIndex + 1}
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <div className="flex items-center gap-2">
                <h2
                  ref={questionHeadingRef}
                  tabIndex={0}
                  className="text-xl md:text-2xl font-bold text-slate-800 leading-snug focus:outline-2 focus:outline-blue-500 focus:outline-offset-2 rounded"
                >
                  {currentQuestion.question_text}
                </h2>
                {currentQuestion.question_type === 'multiple' && (
                  <span className="bg-purple-100 text-purple-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                    Multiple Choice
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {isSingleSelect ? 'Select one correct answer' : 'Select all correct answers'} — 1 Mark
              </p>
            </div>
          </div>

          {/* Options */}
          <div
            role={groupRole}
            aria-labelledby={`q-label-${currentQuestion.id}`}
            aria-required="true"
            className="space-y-3"
          >
            <span id={`q-label-${currentQuestion.id}`} className="sr-only">
              {currentQuestion.question_text}. {isSingleSelect ? 'Select one answer.' : 'Select all that apply.'}
            </span>
            {currentQuestion.QuizOptions.map((opt, optIdx) => {
              const isSelected = (answers[currentQuestion.id] || []).includes(opt.id);
              return (
                <div 
                  key={opt.id}
                  id={`opt-${currentQuestion.id}-${opt.id}`}
                  role={optionRole}
                  aria-checked={isSelected}
                  tabIndex={0}
                  onClick={() => handleOptionSelect(currentQuestion.id, opt.id, currentQuestion.question_type)}
                  onKeyDown={(e) => handleOptionKeyDown(e, currentQuestion.id, opt.id, currentQuestion.question_type, currentQuestion.QuizOptions, optIdx)}
                  className={`w-full p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-4 group ${isSelected ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                >
                  <div className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center border transition-colors ${
                    isSingleSelect ? 'rounded-full' : 'rounded'
                  } ${
                    isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-transparent group-hover:border-slate-400'
                  }`} aria-hidden="true">
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
            aria-label={`Go to previous question (question ${Math.max(1, currentQuestionIndex)})`}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={20} aria-hidden="true" /> Previous
          </button>

          {currentQuestionIndex < totalQuestions - 1 ? (
             <button 
              onClick={() => setCurrentQuestionIndex(prev => Math.min(totalQuestions - 1, prev + 1))}
              aria-label={`Go to next question (question ${currentQuestionIndex + 2} of ${totalQuestions})`}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
             >
               Next <ChevronRight size={20} aria-hidden="true" />
             </button>
          ) : (
             <button 
              onClick={handleSubmit}
              disabled={loading}
              aria-busy={loading}
              aria-label={loading ? 'Submitting quiz, please wait' : 'Submit quiz and see results'}
              className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20 disabled:opacity-75"
             >
               {loading ? 'Submitting...' : 'Submit Quiz'} <CheckCircle size={20} aria-hidden="true" />
             </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default QuizTaker;
