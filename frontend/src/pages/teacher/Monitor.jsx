import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../../utils/axios';
import { Activity, X, MonitorPlay, CheckCircle, Clock, Maximize2, Minimize2 } from 'lucide-react';

const Monitor = () => {
  const [onlineStudents, setOnlineStudents] = useState(new Map());
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentHistory, setStudentHistory] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [liveScreenSrc, setLiveScreenSrc] = useState(null);
  const [isScreenMonitoring, setIsScreenMonitoring] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentLabSlot, setCurrentLabSlot] = useState(null);
  const [labStudents, setLabStudents] = useState(new Set());
  const [allSlotStudents, setAllSlotStudents] = useState([]); // Full student objects for offline list
  const [useCurrentSlotOnly, setUseCurrentSlotOnly] = useState(false);
  const [alerts, setAlerts] = useState([]); // List of {id, name, type: 'idle'}

  const socketRef = useRef(null);
  const screenRefreshInterval = useRef(null);
  const selectedStudentRef = useRef(null);
  const fullscreenRef = useRef(null);

  useEffect(() => {
    selectedStudentRef.current = selectedStudent;
  }, [selectedStudent]);

  useEffect(() => {
    // Derive socket URL from API URL (strip /api suffix) so it works via ngrok too
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const SOCKET_URL = apiBase.replace(/\/api$/, '');
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      extraHeaders: { 'ngrok-skip-browser-warning': 'true' },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      // Fetch all classes to join their monitor rooms
      api.get('/teacher/my-subjects').then((res) => {
        const classIds = [...new Set(res.data.filter(s => s.class_id).map(s => s.class_id))];
        classIds.forEach((classId) => socket.emit('join_teacher_monitor', { classId }));
      }).catch(err => console.error('Could not fetch classes for monitor', err));

      // Fetch current active lab slot
      api.get('/teacher/current-lab').then(res => {
        if (res.data) {
          setCurrentLabSlot(res.data);
          setUseCurrentSlotOnly(true);
          const { subject_id, lab_id } = res.data;
          api.get(`/teacher/my-students-by-subject/${subject_id}`, { params: { lab_id } })
            .then(sres => {
              setLabStudents(new Set(sres.data.map(s => s.id)));
              setAllSlotStudents(sres.data);
            });
        }
      }).catch(console.error);
    });

    const handleActivity = (data) => {
      const studentId = String(data.studentId);
      setOnlineStudents(prev => {
        const next = new Map(prev);
        const old = next.get(studentId);
        let idleSince = old?.idleSince;
        
        const currentActivity = data.activity || 'Active';

        if (currentActivity === 'Idle' && old?.activity !== 'Idle') {
          idleSince = Date.now();
        } else if (currentActivity === 'Active' || currentActivity === 'Offline') {
          idleSince = null;
          // Clear alerts if they become active OR go offline
          setAlerts(prevA => prevA.filter(a => String(a.id) !== studentId));
        }
        
        if (selectedStudentRef.current && String(selectedStudentRef.current.studentId) === studentId && currentActivity === 'Offline') {
          setIsScreenMonitoring(false);
          setLiveScreenSrc(null);
        }

        next.set(studentId, { 
          ...data, 
          studentId,
          activity: currentActivity, 
          lastSeen: Date.now(), 
          idleSince 
        });
        return next;
      });
    };

    socket.on('student:online', handleActivity);
    socket.on('student:ping', handleActivity);
    socket.on('student:activity', handleActivity);

    socket.on('student:screen_stream', (data) => {
      const current = selectedStudentRef.current;
      if (current && String(data.studentId) === String(current.studentId)) {
        setLiveScreenSrc(data.screenBase64);
      }
    });

    const idleCheck = setInterval(() => {
      const now = Date.now();
      setOnlineStudents(prev => {
        const next = new Map(prev);
        let changed = false;
        for (const [id, data] of next.entries()) {
          // Timeout Disconnect (30s)
          if (now - data.lastSeen > 30000 && data.activity !== 'Offline') {
            next.set(id, { ...data, activity: 'Offline', action: 'Disconnected', idleSince: null });
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 5000);

    return () => {
      socket.disconnect();
      clearInterval(idleCheck);
      clearInterval(screenRefreshInterval.current);
    };
  }, []);

  // Dedicated Effect for Alerting
  useEffect(() => {
    const alertInterval = setInterval(() => {
      const now = Date.now();
      onlineStudents.forEach((data, id) => {
        if (data.activity === 'Idle' && data.idleSince && (now - data.idleSince > 10000)) {
          setAlerts(prevA => {
            if (prevA.some(a => String(a.id) === String(id))) return prevA;
            return [...prevA, { id: String(id), name: data.studentName || `Student #${id}`, type: 'idle' }];
          });
        }
      });
    }, 5000);
    return () => clearInterval(alertInterval);
  }, [onlineStudents]);

  const handleStudentClick = async (studentId, data) => {
    // Stop watching previous student
    if (isScreenMonitoring && selectedStudentRef.current) {
      socketRef.current?.emit('teacher:stop_watching', { studentId: selectedStudentRef.current.studentId });
      setIsScreenMonitoring(false);
    }
    setSelectedStudent({ studentId, ...data });
    setStudentHistory(null);
    setIsLoadingHistory(true);
    setLiveScreenSrc(null);
    try {
      const res = await api.get(`/teacher/students/${studentId}/history`);
      setStudentHistory(res.data);
    } catch (error) {
      console.error('Failed to load history', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const toggleScreenMonitor = () => {
    if (!selectedStudentRef.current) return;
    const studentId = selectedStudentRef.current.studentId;
    if (isScreenMonitoring) {
      setIsScreenMonitoring(false);
      setLiveScreenSrc(null);
      setIsFullscreen(false);
      socketRef.current?.emit('teacher:stop_watching', { studentId });
    } else {
      setIsScreenMonitoring(true);
      setLiveScreenSrc(null);
      socketRef.current?.emit('teacher:start_watching', { studentId });
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      fullscreenRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleToggleRestriction = async () => {
    if (!currentLabSlot) return;
    const newVal = !currentLabSlot.is_unrestricted;
    try {
      const res = await api.post('/teacher/toggle-restriction', {
        slotId: currentLabSlot.id,
        type: currentLabSlot.type,
        isUnrestricted: newVal
      });
      if (res.data.success) {
        setCurrentLabSlot(prev => ({ ...prev, is_unrestricted: newVal }));
      }
    } catch (error) {
      console.error('Failed to toggle restriction', error);
    }
  };

  // Handle ESC key exiting fullscreen
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const studentsList = Array.from(onlineStudents.values()).sort((a, b) => b.lastSeen - a.lastSeen);
  
  // MERGE LOGIC: Show all students if in current slot mode
  let filteredStudents = [];
  if (useCurrentSlotOnly && currentLabSlot) {
    // Start with all students assigned to this lab
    filteredStudents = allSlotStudents.map(student => {
      const liveData = onlineStudents.get(String(student.id));
      if (liveData) return liveData;
      
      // Fallback for offline students
      return {
        studentId: student.id,
        studentName: student.name,
        rollNo: student.roll_no,
        activity: 'Offline',
        action: 'Disconnected',
        lastSeen: 0
      };
    });
    // Sort: Online first
    filteredStudents.sort((a, b) => (b.activity === 'Offline' ? -1 : 1) - (a.activity === 'Offline' ? -1 : 1));
  } else {
    filteredStudents = studentsList;
  }

  const statusColor = (activity) => {
    if (activity === 'Active') return 'bg-emerald-500';
    if (activity === 'Idle') return 'bg-amber-400';
    return 'bg-slate-400';
  };

  const statusBg = (activity) => {
    if (activity === 'Active') return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (activity === 'Idle') return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-slate-500 bg-slate-100 border-slate-200';
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-100px)]">
      {/* Left: Student Grid */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Activity className="text-emerald-500" /> Live Lab Monitor
          </h2>
          {currentLabSlot && (
            <div className="flex items-center gap-3">
              <label 
                className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border transition-all ${
                  currentLabSlot.is_unrestricted 
                    ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm' 
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
                title={currentLabSlot.is_unrestricted ? 'Students are FREE' : 'Students are RESTRICTED'}
              >
                <div className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={!!currentLabSlot.is_unrestricted} 
                    onChange={handleToggleRestriction}
                  />
                  <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500"></div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Unrestrict</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors hover:bg-slate-100">
                <input 
                  type="checkbox" 
                  checked={useCurrentSlotOnly} 
                  onChange={e => setUseCurrentSlotOnly(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500"
                />
                <span className="text-xs font-bold text-slate-600">Current Slot ({currentLabSlot.subject_name})</span>
              </label>
            </div>
          )}
        </div>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {alerts.map(alert => (
              <div key={alert.id} className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl flex items-center justify-between animate-bounce shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-900">Inactivity Alert!</p>
                    <p className="text-xs text-amber-700"><b>{alert.name}</b> has been idle for more than 10 seconds.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
                  className="p-1 hover:bg-amber-100 rounded-lg text-amber-500"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {filteredStudents.length === 0 ? (
          <div className="text-center p-12 bg-slate-50 rounded-lg border border-slate-100">
            <div className="animate-pulse w-12 h-12 bg-slate-200 rounded-full mx-auto mb-3 flex items-center justify-center">
              <MonitorPlay className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium text-lg">
              {useCurrentSlotOnly ? 'No students online in this slot' : 'Waiting for students...'}
            </p>
            <p className="text-slate-400 text-sm mt-1">Students appear automatically when they open the App.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map((st) => (
              <div
                key={st.studentId}
                onClick={() => handleStudentClick(st.studentId, st)}
                className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                  selectedStudent?.studentId === st.studentId
                    ? 'border-emerald-500 bg-emerald-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {/* Top row: name + status badge */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-bold text-slate-800 text-sm truncate">
                    {st.studentName || `Student #${st.studentId}`}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold shrink-0 ${statusBg(st.activity)}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusColor(st.activity)} ${st.activity === 'Active' ? 'animate-pulse' : ''}`} />
                    {st.activity}
                  </span>
                </div>
                {/* Roll + Action */}
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <MonitorPlay size={12} /> {st.action || 'Idle'}
                  </span>
                  {st.rollNo && <span className="font-mono text-slate-500">{st.rollNo}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Student Detail Panel */}
      {selectedStudent && (
        <div className="w-full md:w-[480px] bg-slate-50 rounded-xl shadow-lg border border-slate-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center shrink-0">
            <div className="min-w-0">
              <h3 className="font-bold text-base truncate">
                {studentHistory?.profile?.name || selectedStudent?.studentName || `Student #${selectedStudent.studentId}`}
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Roll: {studentHistory?.profile?.roll_no || selectedStudent?.rollNo || '—'} &nbsp;•&nbsp; {studentHistory?.profile?.class_name || '—'}
              </p>
            </div>
            <button
              onClick={() => {
                if (isScreenMonitoring) socketRef.current?.emit('teacher:stop_watching', { studentId: selectedStudent.studentId });
                setSelectedStudent(null);
                setIsScreenMonitoring(false);
                setLiveScreenSrc(null);
              }}
              className="p-2 hover:bg-slate-800 rounded-lg ml-3 shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* ── LIVE VIDEO PLAYER ── */}
            <div
              ref={fullscreenRef}
              className="relative bg-black group"
              style={{ aspectRatio: isFullscreen ? 'auto' : '16/9', height: isFullscreen ? '100vh' : undefined }}
            >
              {liveScreenSrc ? (
                <>
                  <img
                    src={liveScreenSrc}
                    alt="Live Student Screen"
                    className="w-full h-full object-contain cursor-zoom-in"
                    onClick={toggleFullscreen}
                  />

                  {/* LIVE badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    LIVE
                  </div>

                  {/* Controls overlay — appears on hover */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="flex items-center gap-2 text-white text-xs">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      Live — updates every 0.5s
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleScreenMonitor}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Stop
                      </button>
                      <button
                        onClick={toggleFullscreen}
                        className="bg-white/20 hover:bg-white/30 text-white p-1.5 rounded-lg transition-colors"
                        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                      >
                        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                      </button>
                    </div>
                  </div>
                </>
              ) : isScreenMonitoring ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900">
                  <div className="animate-spin w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
                  <span className="text-slate-400 text-sm">Connecting to student screen...</span>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900 cursor-pointer" onClick={toggleScreenMonitor}>
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                    <MonitorPlay size={28} className="text-emerald-400" />
                  </div>
                  <p className="text-slate-300 text-sm font-medium">Click to start watching</p>
                </div>
              )}
            </div>

            {/* Start/Stop button below player when not in fullscreen */}
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MonitorPlay size={15} className="text-emerald-500" />
                <span className="font-semibold">Live Native Screen</span>
              </div>
              <button
                onClick={toggleScreenMonitor}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isScreenMonitoring
                    ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-200'
                    : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200'
                }`}
              >
                {isScreenMonitoring ? 'Stop Watching' : 'Start Watching'}
              </button>
            </div>

            {/* History */}
            <div className="p-5 space-y-5">
              {isLoadingHistory ? (
                <div className="flex justify-center items-center h-24">
                  <div className="animate-spin w-7 h-7 border-4 border-emerald-500 border-t-transparent rounded-full" />
                </div>
              ) : (
                <>
                  {/* Assignments */}
                  <div>
                    <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm">
                      <CheckCircle size={15} className="text-blue-500" /> Recent Assignments
                    </h4>
                    {studentHistory?.assignments?.length > 0 ? (
                      <div className="space-y-2">
                        {studentHistory.assignments.map((doc, idx) => (
                          <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 text-sm">
                            <p className="font-medium text-slate-700 leading-snug line-clamp-2">{doc.question_text}</p>
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-xs font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">
                                {doc.ai_marks} / 10
                              </span>
                              <span className="text-xs text-slate-400">{new Date(doc.submitted_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm italic p-3 bg-white rounded-lg border border-slate-200">No recent assignments.</p>
                    )}
                  </div>

                  {/* Quizzes */}
                  <div>
                    <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm">
                      <Clock size={15} className="text-purple-500" /> Recent Quizzes
                    </h4>
                    {studentHistory?.quizzes?.length > 0 ? (
                      <div className="space-y-2">
                        {studentHistory.quizzes.map((doc, idx) => (
                          <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 text-sm flex justify-between items-center gap-3">
                            <p className="font-medium text-slate-700 truncate">{doc.title}</p>
                            <span className="text-xs font-bold px-2 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-100 shrink-0">
                              {doc.total_marks}%
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm italic p-3 bg-white rounded-lg border border-slate-200">No recent quizzes.</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Monitor;
