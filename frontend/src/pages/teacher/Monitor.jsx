import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import api from '../../utils/axios';
import { Activity, X, MonitorPlay, CheckCircle, Clock, Maximize2, Minimize2, Users, Zap, CheckSquare, Square } from 'lucide-react';

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

  // Attendance modals
  const [showManualAttModal, setShowManualAttModal] = useState(false);
  const [showAutoAttModal, setShowAutoAttModal] = useState(false);
  const [manualAttStatus, setManualAttStatus] = useState({}); // { [studentId]: 'present'|'absent' }
  const [attSaving, setAttSaving] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', msg: string }

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
      console.log('Teacher connected to monitor socket');

      // Fetch all classes to join their monitor rooms
      api.get('/teacher/my-subjects').then((res) => {
        const classIds = [...new Set(res.data.filter(s => s.class_id).map(s => s.class_id))];
        classIds.forEach((classId) => {
          socket.emit('join_teacher_monitor', { classId });
          socket.emit('teacher:request_status', { classId });
        });
      }).catch(err => console.error('Could not fetch classes for monitor', err));

      // Fetch current active lab slot
      api.get('/teacher/current-lab').then(res => {
        if (res.data) {
          console.log('[Monitor] Current lab slot found:', res.data.subject_name);
          setCurrentLabSlot(res.data);
          setUseCurrentSlotOnly(true);
          const { subject_id, lab_id } = res.data;
          api.get(`/teacher/my-students-by-subject/${subject_id}`, { params: { lab_id } })
            .then(sres => {
              setLabStudents(new Set(sres.data.map(s => s.id)));
              setAllSlotStudents(sres.data);
              const classIds = [...new Set(sres.data.map(s => s.class_id).filter(Boolean))];
              classIds.forEach(id => {
                socket.emit('join_teacher_monitor', { classId: id });
                socket.emit('teacher:request_status', { classId: id });
              });
            }).catch(e => console.error('[Monitor] Failed to fetch slot students', e));
        } else {
          console.log('[Monitor] No active lab slot found for this time.');
          // If no specific slot, maybe request from all my classes
          socket.emit('teacher:request_status', {});
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

  const showToast = useCallback((type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const openManualAtt = () => {
    if (!currentLabSlot) return showToast('error', 'No active lab session detected.');
    if (allSlotStudents.length === 0) return showToast('error', 'No students assigned to this lab slot.');
    // Default all to absent
    const initial = {};
    allSlotStudents.forEach(s => { initial[s.id] = 'absent'; });
    setManualAttStatus(initial);
    setShowManualAttModal(true);
  };

  const openAutoAtt = () => {
    if (!currentLabSlot) return showToast('error', 'No active lab session detected.');
    if (allSlotStudents.length === 0) return showToast('error', 'No students assigned to this lab slot.');
    setShowAutoAttModal(true);
  };

  const submitManualAtt = async () => {
    setAttSaving(true);
    const labId = currentLabSlot.lab_id || currentLabSlot.minor_lab_id;
    const isMinor = currentLabSlot.type === 'minor';
    const students = allSlotStudents.map(s => ({ id: s.id, present: manualAttStatus[s.id] === 'present' }));
    try {
      await api.post('/teacher/attendance/take', {
        subjectId: currentLabSlot.subject_id,
        labId: labId || null,
        isMinor,
        date: new Date().toLocaleDateString('en-CA'),
        students
      });
      const presentCount = students.filter(s => s.present).length;
      showToast('success', `Attendance saved! ${presentCount} present, ${students.length - presentCount} absent.`);
      setShowManualAttModal(false);
    } catch (e) {
      showToast('error', 'Failed to save: ' + (e.response?.data?.error || e.message));
    } finally {
      setAttSaving(false);
    }
  };

  const submitAutoAtt = async () => {
    setAttSaving(true);
    const labId = currentLabSlot.lab_id || currentLabSlot.minor_lab_id;
    const isMinor = currentLabSlot.type === 'minor';
    const students = allSlotStudents.map(s => {
      const liveStatus = onlineStudents.get(String(s.id))?.activity;
      return { id: s.id, present: (liveStatus === 'Active' || liveStatus === 'Idle') };
    });
    try {
      await api.post('/teacher/attendance/take', {
        subjectId: currentLabSlot.subject_id,
        labId: labId || null,
        isMinor,
        date: new Date().toLocaleDateString('en-CA'),
        students
      });
      const presentCount = students.filter(s => s.present).length;
      showToast('success', `Auto-Attendance saved! ${presentCount} present, ${students.length - presentCount} absent.`);
      setShowAutoAttModal(false);
    } catch (e) {
      showToast('error', 'Failed to save: ' + (e.response?.data?.error || e.message));
    } finally {
      setAttSaving(false);
    }
  };


  // Auto attendance preview counts
  const autoOnlineCount = allSlotStudents.filter(s => {
    const liveStatus = onlineStudents.get(String(s.id))?.activity;
    return liveStatus === 'Active' || liveStatus === 'Idle';
  }).length;
  const autoOfflineCount = allSlotStudents.length - autoOnlineCount;

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-100px)] relative">
      {/* Left: Student Grid */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Activity className="text-emerald-500" /> Live Lab Monitor
          </h2>
          {currentLabSlot && (
            <div className="flex flex-col gap-2 items-end">
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    const classId = currentLabSlot.class_id;
                    socketRef.current?.emit('teacher:request_status', { classId });
                    showToast('success', 'Requesting latest status from all students...');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-blue-200 transition-colors"
                  title="Force refresh student online/offline status"
                >
                  <Activity size={12} /> Refresh Status
                </button>
                <button onClick={openManualAtt} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-purple-200 transition-colors">
                  <Users size={12} /> Manual
                </button>
                <button onClick={openAutoAtt} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-emerald-200 transition-colors">
                  <Zap size={12} /> Auto
                </button>
              </div>
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
                            <p className="font-medium text-slate-700 leading-snug line-clamp-2">{doc.name}</p>
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-xs font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">
                                {doc.score} / {doc.max_score || 10}
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
                            <p className="font-medium text-slate-700 truncate">{doc.name}</p>
                            <span className="text-xs font-bold px-2 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-100 shrink-0">
                              {doc.score} / {doc.max_score}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm italic p-3 bg-white rounded-lg border border-slate-200">No recent quizzes.</p>
                    )}
                  </div>

                  {/* Sessions Activity */}
                  <div>
                    <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm">
                      <Activity size={15} className="text-emerald-500" /> Today's Activity (Logins)
                    </h4>
                    {studentHistory?.sessions?.length > 0 ? (
                      <div className="space-y-2">
                        {studentHistory.sessions.map((s, idx) => (
                          <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 text-xs flex justify-between items-center bg-gray-50/50">
                            <div>
                               <p className="font-semibold text-gray-800">Student App Connection</p>
                               <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">
                                  {new Date(s.login_time).toLocaleTimeString()}
                               </span>
                            </div>
                            {s.logout_time ? (
                               <span className="bg-emerald-100 text-emerald-700 font-bold px-2 py-1 rounded text-[10px]">Logged out: {new Date(s.logout_time).toLocaleTimeString()}</span>
                            ) : (
                               <span className="bg-amber-100 text-amber-700 font-bold px-2 py-1 rounded text-[10px] animate-pulse whitespace-nowrap">Online Now</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm italic p-3 bg-white rounded-lg border border-slate-200">No app login history today.</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ── MANUAL ATTENDANCE MODAL ── */}
      {showManualAttModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Users size={18} className="text-purple-600" /> Manual Attendance
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {currentLabSlot?.subject_name} &bull; {new Date().toLocaleDateString('en-GB')}
                </p>
              </div>
              <button onClick={() => setShowManualAttModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            {/* Stats bar */}
            <div className="flex gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-bold">
              <span className="text-emerald-600">Present: {Object.values(manualAttStatus).filter(s => s === 'present').length}</span>
              <span className="text-rose-500">Absent: {Object.values(manualAttStatus).filter(s => s === 'absent').length}</span>
              <span className="text-gray-400 ml-auto">Total: {allSlotStudents.length}</span>
            </div>

            {/* Table */}
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/80 sticky top-0 z-10">
                  <tr className="text-xs uppercase text-gray-400 tracking-wider font-semibold">
                    <th className="px-5 py-3 text-left">Roll No</th>
                    <th className="px-5 py-3 text-left">Name</th>
                    <th className="px-5 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {allSlotStudents
                    .slice().sort((a, b) => (a.roll_no || '').localeCompare(b.roll_no || ''))
                    .map(student => (
                    <tr key={student.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3 text-gray-400 font-medium text-xs">{student.roll_no || '—'}</td>
                      <td className="px-5 py-3 font-semibold text-gray-800">{student.name}</td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => setManualAttStatus(prev => ({ ...prev, [student.id]: prev[student.id] === 'present' ? 'absent' : 'present' }))}
                          className={`inline-flex items-center gap-1.5 w-28 justify-center py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                            manualAttStatus[student.id] === 'present'
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-rose-50 text-rose-500 hover:bg-rose-100'
                          }`}
                        >
                          {manualAttStatus[student.id] === 'present'
                            ? <><CheckSquare size={12} /> Present</>
                            : <><Square size={12} /> Absent</>}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
              <button onClick={() => setShowManualAttModal(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
              <div className="flex gap-2">
                <button
                  onClick={() => { const all = {}; allSlotStudents.forEach(s => { all[s.id] = 'present'; }); setManualAttStatus(all); }}
                  className="px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                >Mark All Present</button>
                <button
                  onClick={submitManualAtt}
                  disabled={attSaving}
                  className="px-5 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {attSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle size={15} />}
                  Save Attendance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── AUTO ATTENDANCE MODAL ── */}
      {showAutoAttModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-white">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Zap size={18} className="text-emerald-600" /> Auto Attendance
              </h3>
              <button onClick={() => setShowAutoAttModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600">Attendance will be taken based on <strong>current online status</strong> of students in this lab slot.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                  <div className="text-3xl font-extrabold text-emerald-600">{autoOnlineCount}</div>
                  <div className="text-xs font-bold text-emerald-500 uppercase tracking-wider mt-1">Will be Present</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Online / Idle</div>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-center">
                  <div className="text-3xl font-extrabold text-rose-500">{autoOfflineCount}</div>
                  <div className="text-xs font-bold text-rose-400 uppercase tracking-wider mt-1">Will be Absent</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Offline</div>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700 font-medium">
                ⚠️ This will override any existing attendance record for today's session.
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowAutoAttModal(false)} className="flex-1 py-2 text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
              <button
                onClick={submitAutoAtt}
                disabled={attSaving}
                className="flex-1 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {attSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Zap size={15} />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-bold animate-in slide-in-from-bottom-4 duration-300 ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <X size={18} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default Monitor;
