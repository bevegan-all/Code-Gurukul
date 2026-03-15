import { useState, useEffect } from 'react';
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
import RestrictionManager from './components/RestrictionManager';

function App() {
  // Lockdown overlay — covers the whole screen the instant the OS steals focus.
  // This prevents the white-screen flash from Win+D, Alt+Tab, etc.
  // The main Electron process sends 'window-blur' / 'window-focus' IPC events.
  const [showLockOverlay, setShowLockOverlay] = useState(false);

  useEffect(() => {
    if (!window.electronAPI) return;

    // Show the dark overlay the moment focus leaves the window
    const unsubBlur = window.electronAPI.onWindowBlur?.(() => {
      setShowLockOverlay(true);
    });

    // Remove the overlay once the window has focus back
    const unsubFocus = window.electronAPI.onWindowFocus?.(() => {
      setShowLockOverlay(false);
    });

    return () => {
      // ipcRenderer.on returns a removeListener in newer Electron versions
      if (typeof unsubBlur === 'function') unsubBlur();
      if (typeof unsubFocus === 'function') unsubFocus();
    };
  }, []);


  const handleExit = () => {
    if (window.electronAPI && window.electronAPI.quitApp) {
      window.electronAPI.quitApp();
    } else {
      console.warn('Exit app called, but not running in Electron');
    }
  };

  return (
    <>
      {/*
        Lockdown Overlay — renders immediately when the Electron window loses focus.
        Sits above everything (z-index 100000) so Win+D, Alt+Tab etc show a dark
        screen instead of a white flash. Removed as soon as focus returns.
        Only active in Electron (window.electronAPI exists).
      */}
      {showLockOverlay && window.electronAPI && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#0f172a',
            zIndex: 100000,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        />
      )}

      <RestrictionManager />
      {/* Global Exit Button for Kiosk Lockdown (positioned absolutely to the right) */}
      <button
        onClick={handleExit}
        className="fixed top-3 right-3 z-[9999] bg-red-50 hover:bg-red-600 text-red-600 hover:text-white p-1.5 rounded-full transition-all border border-red-100 hover:border-red-600 flex items-center justify-center shadow-sm group"
        title="Exit Application"
        aria-label="Exit Application"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

