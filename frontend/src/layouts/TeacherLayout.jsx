import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import TeacherSidebar from '../components/TeacherSidebar';
import Header from '../components/Header';
import TeacherDashboardHome from '../pages/teacher/TeacherDashboardHome';
import MyClasses from '../pages/teacher/MyClasses';
import MySubjects from '../pages/teacher/MySubjects';
import SubjectDetail from '../pages/teacher/SubjectDetail';
import MyStudents from '../pages/teacher/MyStudents';
import Assignments from '../pages/teacher/Assignments';
import Quizzes from '../pages/teacher/Quizzes';
import Notes from '../pages/teacher/Notes';
import TeacherTimetable from '../pages/teacher/TeacherTimetable';

import Monitor from '../pages/teacher/Monitor';
import Leaderboard from '../pages/teacher/Leaderboard';

const TeacherLayout = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      <TeacherSidebar />
      <div className="flex-1 ml-64 flex flex-col overflow-hidden">
        <Header role="Teacher" />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<TeacherDashboardHome />} />
            <Route path="timetable" element={<TeacherTimetable />} />
            <Route path="subjects" element={<MySubjects />} />
            <Route path="subjects/:subjectId" element={<SubjectDetail />} />
            <Route path="classes" element={<MyClasses />} />
            <Route path="students" element={<MyStudents />} />
            <Route path="assignments" element={<Assignments />} />
            <Route path="quizzes" element={<Quizzes />} />
            <Route path="notes" element={<Notes />} />
            <Route path="monitor" element={<Monitor />} />
            <Route path="leaderboard" element={<Leaderboard />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default TeacherLayout;
