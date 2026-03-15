import React, { useEffect, useState } from 'react';
import { Users, BookOpen, GraduationCap, FileCode2, Clock, Activity, ArrowRight, BookMarked, NotebookPen, MonitorPlay } from 'lucide-react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../../utils/axios';
import StudentDetailModal from '../../components/StudentDetailModal';

const TeacherDashboardHome = () => {
  const [stats, setStats] = useState({
    subjects: 0,
    classes: 0,
    students: 0,
    activeAssignments: 0,
    myClasses: []
  });
  const [loading, setLoading] = useState(true);
  const [currentSlot, setCurrentSlot] = useState(null);
  const [slotStudents, setSlotStudents] = useState([]);
  const [onlineIds, setOnlineIds] = useState(new Set());
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/teacher/dashboard-stats');
        setStats(res.data);
        
        // Fetch current active lab
        const slotRes = await api.get('/teacher/current-lab');
        if (slotRes.data) {
          setCurrentSlot(slotRes.data);
          // Fetch all students for this slot to show in live monitor even if offline
          const sres = await api.get(`/teacher/my-students-by-subject/${slotRes.data.subject_id}`, { 
            params: { lab_id: slotRes.data.lab_id } 
          });
          setSlotStudents(sres.data);
        }
      } catch (err) {
        console.error('Failed to fetch teacher dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    if (!stats.myClasses.length) return;

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const SOCKET_URL = apiBase.replace(/\/api$/, '');
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      extraHeaders: { 'ngrok-skip-browser-warning': 'true' },
    });

    socket.on('connect', () => {
      const classIds = [...new Set(stats.myClasses.filter(c => c.class_id || c.Class?.id).map(c => c.class_id || c.Class?.id))];
      classIds.forEach(id => socket.emit('join_teacher_monitor', { classId: id }));
    });

    const updateOnline = (data) => {
      setOnlineIds(prev => {
        const next = new Set(prev);
        const sid = Number(data.studentId);
        if (!data.activity || data.activity !== 'Offline') {
          next.add(sid);
        } else {
          next.delete(sid);
        }
        return next;
      });
    };

    socket.on('student:online', updateOnline);
    socket.on('student:ping', updateOnline);
    socket.on('student:activity', updateOnline);

    return () => socket.disconnect();
  }, [stats.myClasses]);

  const onlineInSlot = slotStudents.filter(s => onlineIds.has(Number(s.id))).length;

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
                   {stats.myClasses.map((ts) => {
                      const isActive = currentSlot && 
                                     (ts.subject_id === currentSlot.subject_id || ts.Subject?.id === currentSlot.subject_id) && 
                                     (ts.class_id === currentSlot.class_id || ts.Class?.id === currentSlot.class_id);
                      return (
                        <div 
                          key={ts.id} 
                          className={`p-4 rounded-xl border transition-all relative ${
                            isActive 
                              ? 'border-purple-500 bg-purple-50 shadow-md ring-1 ring-purple-200' 
                              : 'border-gray-100 hover:border-purple-200 bg-gray-50/50'
                          }`}
                        >
                          {isActive && (
                            <div className="absolute -top-2 -right-2 flex h-6 w-12 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white shadow-lg animate-bounce">
                              LIVE
                            </div>
                          )}
                          <div className="flex items-start justify-between">
                            <div>
                              <p className={`font-semibold ${isActive ? 'text-purple-900' : 'text-gray-900'}`}>
                                {ts.subject_name || ts.Subject?.name || 'Unknown'}
                              </p>
                              <p className={`text-sm ${isActive ? 'text-purple-600' : 'text-gray-500'}`}>
                                {ts.class_name || ts.Class?.name || 'Unknown Class'}
                              </p>
                            </div>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-lg ${
                              ts.Subject?.type === 'major' || ts.type === 'major' 
                                ? 'bg-purple-100 text-purple-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {ts.Subject?.type || ts.type || 'subject'}
                            </span>
                          </div>
                        </div>
                      );
                   })}
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
            {currentSlot ? (
              <div className="space-y-3">
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Active Slot</p>
                    <p className="text-sm font-bold text-gray-900">{currentSlot.subject_name}</p>
                    <p className="text-xs text-gray-500">{currentSlot.lab_name} • {currentSlot.class_name}</p>
                  </div>
                  <button 
                    onClick={async () => {
                      const newVal = !currentSlot.is_unrestricted;
                      const res = await api.post('/teacher/toggle-restriction', {
                        slotId: currentSlot.id,
                        type: currentSlot.type,
                        isUnrestricted: newVal
                      });
                      if (res.data.success) setCurrentSlot(prev => ({ ...prev, is_unrestricted: newVal }));
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      currentSlot.is_unrestricted ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {currentSlot.is_unrestricted ? 'Unrestricted' : 'Restricted'}
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                    <p className="text-xl font-bold text-gray-900">{slotStudents.length}</p>
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Total Students</p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                    <p className="text-xl font-bold text-emerald-600">{onlineInSlot}</p>
                    <p className="text-[10px] text-emerald-500 uppercase font-bold">Online Now</p>
                  </div>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                   {slotStudents.filter(s => onlineIds.has(Number(s.id))).map(s => (
                     <div key={s.id} onClick={() => setSelectedStudentId(s.id)} className="flex items-center justify-between p-2 bg-white border border-gray-50 rounded-lg hover:border-purple-200 cursor-pointer transition-all">
                        <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                           <span className="text-xs font-bold text-gray-700">{s.name}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono">{s.roll_no}</span>
                     </div>
                   ))}
                </div>

                <Link 
                  to="/teacher/monitor" 
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-bold transition-all"
                >
                  <MonitorPlay className="w-4 h-4" />
                  Enter Monitor Center
                </Link>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center">
                <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No active lab sessions to monitor right now.</p>
                <Link to="/teacher/monitor" className="mt-4 block text-sm font-medium text-purple-600 hover:underline">Go to Monitor Center</Link>
              </div>
            )}
          </div>
        </div>

      </div>
      {selectedStudentId && <StudentDetailModal studentId={selectedStudentId} onClose={() => setSelectedStudentId(null)} />}
    </div>
  );
};

export default TeacherDashboardHome;
