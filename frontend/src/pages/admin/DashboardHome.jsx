import React, { useEffect, useState } from 'react';
import { Users, BookOpen, GraduationCap, Building2, TrendingUp, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../utils/axios';

const DashboardHome = () => {
  const [stats, setStats] = useState({
    teachers: 0,
    students: 0,
    courses: 0,
    departments: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/dashboard-stats');
        setStats({
          teachers: res.data.teachers,
          students: res.data.students,
          courses: res.data.courses,
          departments: res.data.departments,
        });
        setChartData(res.data.chartData || []);
        setRecentActivity(res.data.recentActivity || []);
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const cards = [
    { title: 'Total Students', value: stats.students, icon: GraduationCap, color: 'bg-blue-500', trend: 'Active users', path: '/admin/students' },
    { title: 'Total Teachers', value: stats.teachers, icon: Users, color: 'bg-purple-500', trend: 'Registered faculty', path: '/admin/teachers' },
    { title: 'Total Courses', value: stats.courses, icon: BookOpen, color: 'bg-orange-500', trend: 'Curriculum', path: '/admin/courses' },
    { title: 'Departments', value: stats.departments, icon: Building2, color: 'bg-emerald-500', trend: 'Academic units', path: '/admin/departments' },
  ];

  if (loading) return <div className="p-8 text-gray-500">Loading dashboard data...</div>;

  return (
    <div className="animate-slide-in space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => (
          <Link key={idx} to={card.path} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md hover:border-blue-100 transition-all cursor-pointer relative overflow-hidden group">
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 ${card.color} group-hover:scale-110 transition-transform`}></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">{card.title}</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2">{card.value}</h3>
              </div>
              <div className={`p-3 rounded-xl ${card.color} text-white shadow-sm`}>
                <card.icon className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span>{card.trend}</span>
              </div>
              <span className="text-xs font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">View →</span>
            </div>
          </Link>
        ))}
      </div>

      {/* System Status & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
        
        {/* System Health */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              System Overview
            </h3>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">All Systems Operational</span>
          </div>
          <div className="p-6">
            <h4 className="text-sm font-semibold text-gray-500 mb-4">Students Enrolled per Course</h4>
            <div className="h-72 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#6B7280', fontSize: 12 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      cursor={{ fill: '#F3F4F6' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Bar dataKey="students" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 text-gray-500">
                  No student enrollment data available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity List */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-semibold text-gray-800">Recent Onboarding</h3>
          </div>
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {recentActivity.length > 0 ? recentActivity.map((activity, idx) => (
              <div key={activity.id} className="flex gap-4">
                <div className="mt-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-primary/20"></div>
                  {idx !== recentActivity.length - 1 && <div className="w-0.5 h-full bg-gray-100 mx-auto mt-2"></div>}
                </div>
                <div className="flex-1 pb-4">
                  <p className="text-sm font-medium text-gray-800">New Student Registered</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {activity.name} • {activity.department_name || 'No Dept'} • {new Date(activity.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-gray-500 text-center mt-10">No recent onboarding activity.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardHome;
