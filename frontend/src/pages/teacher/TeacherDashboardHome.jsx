import React, { useEffect, useState } from 'react';
import { Users, BookOpen, GraduationCap, FileCode2, Clock, Activity, ArrowRight, BookMarked, NotebookPen } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../utils/axios';

const TeacherDashboardHome = () => {
  const [stats, setStats] = useState({
    subjects: 0,
    classes: 0,
    students: 0,
    activeAssignments: 0,
    myClasses: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/teacher/dashboard-stats');
        setStats(res.data);
      } catch (err) {
        console.error('Failed to fetch teacher dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const cards = [
    { title: 'My Subjects', value: stats.subjects, icon: BookMarked, color: 'bg-purple-500', trend: 'Assigned', path: '/teacher/subjects' },
    { title: 'My Classes', value: stats.classes, icon: Users, color: 'bg-blue-500', trend: 'Schedules', path: '/teacher/classes' },
    { title: 'Total Students', value: stats.students, icon: GraduationCap, color: 'bg-emerald-500', trend: 'Under my instruction', path: '/teacher/students' },
    { title: 'Active Labs', value: stats.activeAssignments, icon: FileCode2, color: 'bg-orange-500', trend: 'Awaiting grading', path: '/teacher/assignments' },
  ];

  if (loading) return <div className="p-8 text-gray-500">Loading your workspace...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome Back, Instructor</h1>
          <p className="text-gray-500 mt-1">Here is your teaching overview for today.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => (
          <Link to={card.path} key={index} className="block group">
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 h-full flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">{card.title}</p>
                  <h3 className="text-3xl font-bold text-gray-900 mt-2">{card.value}</h3>
                </div>
                <div className={`p-3 rounded-xl ${card.color} bg-opacity-10 text-white`}>
                  <card.icon className={`w-6 h-6 ${card.color.replace('bg-', 'text-')}`} />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-500">
                  <Activity className="w-4 h-4 mr-1 text-emerald-500" />
                  <span>{card.trend}</span>
                </div>
                <span className="text-sm font-medium text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  View <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        
        {/* Quick Actions / Active Labs */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-bold text-gray-900">Your Assigned Classes</h2>
            </div>
            <Link to="/teacher/classes" className="text-sm font-medium text-purple-600 hover:text-purple-700">View All</Link>
          </div>
          
          <div className="space-y-4">
            {stats.myClasses && stats.myClasses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {stats.myClasses.map((ts) => (
                    <div key={ts.id} className="p-4 rounded-xl border border-gray-100 hover:border-purple-200 hover:shadow-sm transition-all bg-gray-50/50">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{ts.subject_name || ts.Subject?.name || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">{ts.class_name || ts.Class?.name || 'Unknown Class'}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-lg ${ts.Subject?.type === 'major' || ts.type === 'major' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {ts.Subject?.type || ts.type || 'subject'}
                        </span>
                      </div>
                    </div>
                 ))}
              </div>
            ) : (
              <div className="py-12 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                No classes assigned to you yet.
              </div>
            )}
          </div>
        </div>

        {/* Live Status Overview */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Live Lab Monitor</h2>
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Get real-time insights into your students' active coding sessions and idle statuses during labs.
          </p>
          <div className="space-y-4">
            {/* Minimal mockup representing system readiness */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center">
              <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-600">No active lab sessions to monitor right now.</p>
              <Link to="/teacher/monitor" className="mt-4 block text-sm font-medium text-purple-600 hover:underline">Go to Monitor Center</Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TeacherDashboardHome;
