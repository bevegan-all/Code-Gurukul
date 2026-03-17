import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { toJpeg } from 'html-to-image';
import api from '../api';
import { SOCKET_URL } from '../config';
import { Unlock, X } from 'lucide-react';

const RestrictionManager = () => {
  const [showNotification, setShowNotification] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    const user = JSON.parse(userStr);

    // 1. Initial Restriction Check
    // Intentionally skipped to enforce strict lockdown on boot.
    // The teacher MUST manually click "Unrestrict" during the live session to unlock keys.

    // 2. Monitoring & Restriction Socket
    const socket = io(SOCKET_URL, { 
      transports: ['websocket', 'polling'],
      extraHeaders: { 'ngrok-skip-browser-warning': 'true' },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to socket server');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    let pingInterval = null;
    let screenshotInterval = null;
    let lastActivity = Date.now();
    let isCurrentlyIdle = false;
    let isWatching = false;

    // --- ACTIVITY TRACKING ---
    const updateActivity = () => {
      lastActivity = Date.now();
      if (isCurrentlyIdle) {
        isCurrentlyIdle = false;
        socket.emit('student:activity', {
          studentId: user.id,
          studentName: user.name,
          rollNo: user.roll_no,
          classId: user.class_id,
          activity: 'Active',
          action: 'Working'
        });
      }
    };

    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('mousedown', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('scroll', updateActivity, true);

    // --- SCREEN CAPTURE ---
    const captureAndSend = async () => {
      try {
        let dataUrl = null;
        if (window.electronAPI?.getScreenCapture) {
          dataUrl = await window.electronAPI.getScreenCapture();
        } 
        
        if (!dataUrl) {
          dataUrl = await toJpeg(document.documentElement, {
            quality: 0.4,
            pixelRatio: 0.5,
            skipFonts: true
          });
        }

        if (dataUrl) {
          socket.emit('student:screen_stream', {
            studentId: user.id,
            classId: user.class_id,
            screenBase64: dataUrl
          });
        }
      } catch (err) {
        console.error('Screen capture failed:', err.message);
      }
    };

    const captureLoop = async () => {
      if (!isWatching) return;
      await captureAndSend();
      screenshotInterval = setTimeout(captureLoop, 500);
    };

    // --- SOCKET LISTENERS ---
    socket.on('teacher:start_watching', () => {
      if (isWatching) return;
      isWatching = true;
      captureLoop();
    });

    socket.on('teacher:stop_watching', () => {
      isWatching = false;
      if (screenshotInterval) clearTimeout(screenshotInterval);
    });

    socket.on('teacher:request_status', () => {
      console.log('Teacher requested status, reporting online...');
      socket.emit('student:online', {
        studentId: user.id,
        studentName: user.name,
        rollNo: user.roll_no,
        classId: user.class_id,
        activity: isCurrentlyIdle ? 'Idle' : 'Active'
      });
    });

    socket.on('lab:restriction_status', (data) => {
      const unrestricted = !!data.isUnrestricted;
      if (window.electronAPI?.setRestrictionMode) {
        window.electronAPI.setRestrictionMode(unrestricted);
      }
      if (unrestricted) {
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 8000);
      } else {
        setShowNotification(false);
      }
    });

    socket.on('connect', () => {
      socket.emit('student:online', {
        studentId: user.id,
        studentName: user.name,
        rollNo: user.roll_no,
        classId: user.class_id,
        activity: isCurrentlyIdle ? 'Idle' : 'Active'
      });
      if (pingInterval) clearInterval(pingInterval);
      pingInterval = setInterval(() => {
        socket.emit('student:ping', { 
          studentId: user.id, 
          studentName: user.name, 
          rollNo: user.roll_no, 
          classId: user.class_id,
          activity: isCurrentlyIdle ? 'Idle' : 'Active'
        });
      }, 3000);
    });

    const activityCheckInterval = setInterval(() => {
      const now = Date.now();
      if (now - lastActivity > 5000 && !isCurrentlyIdle) {
        isCurrentlyIdle = true;
        socket.emit('student:activity', {
          studentId: user.id,
          studentName: user.name,
          rollNo: user.roll_no,
          classId: user.class_id,
          activity: 'Idle',
          action: 'Inactive'
        });
      }
    }, 2000);

    return () => {
      if (pingInterval) clearInterval(pingInterval);
      if (screenshotInterval) clearTimeout(screenshotInterval);
      clearInterval(activityCheckInterval);
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('mousedown', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('scroll', updateActivity, true);
      socket.disconnect();
    };
  }, []);

  if (!showNotification) return null;

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[10000] animate-in slide-in-from-top duration-700 ease-out">
      <div role="alert" aria-live="assertive" className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-2 border-amber-400 p-1 flex items-center gap-5 pr-8 min-w-[380px] overflow-hidden">
        <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 ml-1" aria-hidden="true">
          <Unlock size={28} strokeWidth={2.5} aria-hidden="true" />
        </div>
        <div className="flex-1 py-4">
          <h4 className="font-black text-slate-900 text-xl leading-none mb-1 uppercase tracking-tight">Access Granted</h4>
          <p className="text-slate-500 text-sm font-bold leading-tight">Teacher has unrestricted your session.<br/>You can now use other applications.</p>
        </div>
        <button 
          onClick={() => setShowNotification(false)} 
          className="bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 p-2 rounded-full transition-colors"
          aria-label="Dismiss access notification"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default RestrictionManager;
