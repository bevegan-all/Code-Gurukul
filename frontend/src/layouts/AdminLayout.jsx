import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import DashboardHome from '../pages/admin/DashboardHome';
import ManageDepartments from '../pages/admin/ManageDepartments';
import ManageCourses from '../pages/admin/ManageCourses';
import ManageClasses from '../pages/admin/ManageClasses';
import ManageSubjects from '../pages/admin/ManageSubjects';
import ManageTeachers from '../pages/admin/ManageTeachers';
import ManageStudents from '../pages/admin/ManageStudents';
import Leaderboard from '../pages/admin/Leaderboard';
import AdminSettings from '../pages/admin/AdminSettings';

const AdminLayout = () => {
  return (
    <div className="flex bg-background min-h-screen">
      <Sidebar />
      {/* overflow-hidden here prevents horizontal scroll from shifting the header */}
      <div className="flex-1 ml-64 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 p-8 bg-gray-50/50 overflow-y-auto min-w-0">
          <Routes>
            <Route path="/" element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardHome />} />
            <Route path="departments" element={<ManageDepartments />} />
            <Route path="courses" element={<ManageCourses />} />
            <Route path="classes" element={<ManageClasses />} />
            <Route path="subjects" element={<ManageSubjects />} />
            <Route path="teachers" element={<ManageTeachers />} />
            <Route path="students" element={<ManageStudents />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="settings" element={<AdminSettings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
