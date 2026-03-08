import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import StudentSidebar from '../components/StudentSidebar';
import Header from '../components/Header';
import StudentDashboardHome from '../pages/student/StudentDashboardHome';
import MySubjects from '../pages/student/MySubjects';
import SubjectDetail from '../pages/student/SubjectDetail';
import Assignments from '../pages/student/Assignments';
import Notes from '../pages/student/Notes';
import NoteDetail from '../pages/student/NoteDetail';
import Leaderboard from '../pages/student/Leaderboard';
import AssignmentDetail from '../pages/student/AssignmentDetail';

const StudentLayout = () => {
  return (
    <div className="flex h-screen bg-slate-50">
      <StudentSidebar />
      <div className="flex-1 ml-64 flex flex-col overflow-hidden">
        <Header role="Student" />
        <main className="flex-1 overflow-y-auto p-6 text-gray-800">
          <Routes>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<StudentDashboardHome />} />
            <Route path="subjects" element={<MySubjects />} />
            <Route path="subjects/:subjectId" element={<SubjectDetail />} />
            <Route path="assignments" element={<Assignments />} />
            <Route path="assignments/:assignmentId" element={<AssignmentDetail />} />
            <Route path="notes" element={<Notes />} />
            <Route path="notes/:noteId" element={<NoteDetail />} />
            <Route path="leaderboard" element={<Leaderboard />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default StudentLayout;
