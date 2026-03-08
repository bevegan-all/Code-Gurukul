import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LabWorkspace from './pages/LabWorkspace';
import StudentLayout from './layouts/StudentLayout';
import Home from './pages/Home';
import LearnMode from './pages/LearnMode';
import LearnModeDetail from './pages/LearnModeDetail';
import Notes from './pages/Notes';
import NoteDetail from './pages/NoteDetail';
import Quizzes from './pages/Quizzes';
import QuizTaker from './pages/QuizTaker';
import Leaderboard from './pages/Leaderboard';
import FreeSandbox from './pages/FreeSandbox';
function App() {
  const handleExit = () => {
    if (window.electronAPI && window.electronAPI.quitApp) {
      window.electronAPI.quitApp();
    } else {
      console.warn('Exit app called, but not running in Electron');
    }
  };

  return (
    <>
      {/* Global Exit Button for Kiosk Lockdown (positioned absolutely to the right) */}
      <button 
        onClick={handleExit}
        className="fixed top-4 right-4 z-[9999] bg-red-100 hover:bg-red-600 text-red-600 hover:text-white p-3 rounded-full transition-all border border-red-200 hover:border-red-600 flex items-center justify-center shadow-md group"
        title="Exit Application"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
          <line x1="12" y1="2" x2="12" y2="12"></line>
        </svg>
      </button>

      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* Main Application with Sidebar */}
        <Route path="/app" element={<StudentLayout />}>
           <Route path="home" element={<Home />} />
           <Route path="learn" element={<LearnMode />} />
           <Route path="learn/:id" element={<LearnModeDetail />} />
           <Route path="notes" element={<Notes />} />
           <Route path="notes/:id" element={<NoteDetail />} />
           <Route path="assignments" element={<Dashboard />} />
           <Route path="sandbox" element={<FreeSandbox />} />
           <Route path="quizzes" element={<Quizzes />} />
           <Route path="leaderboard" element={<Leaderboard />} />
        </Route>

        {/* Lab Workspace is Fullscreen, no sidebar */}
        <Route path="/lab/:id" element={<LabWorkspace />} />
        
        {/* Secure Quiz Taker is Fullscreen, no sidebar */}
        <Route path="/quiz/:id" element={<QuizTaker />} />
      </Routes>
    </>
  );
}

export default App;
