import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Play, CheckCircle, Lock, AlertCircle, Terminal } from 'lucide-react';
import { SOCKET_URL } from '../config';

const ExternalTools = () => {
  const [user] = useState(JSON.parse(localStorage.getItem('user')) || {});
  const [apps, setApps] = useState([
    { id: 'android-studio', name: 'Android Studio', installed: false, granted: false },
    { id: 'blender', name: 'Blender 3D', installed: false, granted: false },
    { id: 'mongodb-compass', name: 'MongoDB Compass', installed: false, granted: false }
  ]);
  const [launching, setLaunching] = useState(null);
  const [runningAppId, setRunningAppId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if apps are actually installed on the system
    const checkInstallations = async () => {
      if (!window.electronAPI) return;
      const updatedApps = await Promise.all(apps.map(async (app) => {
        const path = await window.electronAPI.checkExternalApp(app.id);
        return { ...app, installed: !!path };
      }));
      setApps(updatedApps);
    };

    checkInstallations();

    // Poll running status
    const pollRunningApp = async () => {
      if (window.electronAPI && window.electronAPI.getRunningExternalApp) {
        const current = await window.electronAPI.getRunningExternalApp();
        setRunningAppId(current);
      }
    };
    
    pollRunningApp();
    const interval = setInterval(pollRunningApp, 1000);

    // Connect socket to listen for grants
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      extraHeaders: { 'ngrok-skip-browser-warning': 'true' }
    });

    socket.on('connect', () => {
      // Re-register online status to ensure room joining
      socket.emit('student:online', {
        studentId: user.id,
        classId: user.class_id
      });
    });

    socket.on('lab:grant_app', (data) => {
      if (data.studentId !== user.id && !data.global) return;
      
      setApps(prevApps => prevApps.map(a => 
        a.id === data.appId ? { ...a, granted: true } : a
      ));
    });

    socket.on('lab:revoke_app', (data) => {
      if (data.studentId !== user.id && !data.global) return;

      setApps(prevApps => prevApps.map(a => 
        a.id === data.appId ? { ...a, granted: false } : a
      ));
    });

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, user.class_id]);

  const handleLaunch = async (appId) => {
    if (!window.electronAPI) return;
    
    setLaunching(appId);
    setError(null);
    
    try {
      const result = await window.electronAPI.launchExternalApp(appId);
      if (!result.success) {
        setError(result.error || 'Failed to launch application');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLaunching(null);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">External Tools</h1>
        <p className="text-slate-500 mt-2 text-lg">
          Access specific professional software locally while remaining within the secure exam environment. 
          Your teacher must grant access for an application to unlock.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-bold">Launch Failed</h4>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {apps.map((app) => (
          <div 
            key={app.id} 
            className={`
              relative overflow-hidden rounded-2xl border-2 transition-all duration-300
              ${app.granted ? 'bg-white border-indigo-200 shadow-xl shadow-indigo-100/50 hover:-translate-y-1 hover:border-indigo-400' 
                : 'bg-slate-50 border-slate-200 opacity-75'}
            `}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${app.granted ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
                  <Terminal size={24} strokeWidth={2.5} />
                </div>
                {app.installed ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                    <CheckCircle size={14} /> Installed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full border border-slate-200">
                    Not Found
                  </span>
                )}
              </div>
              
              <h3 className={`text-xl font-bold mb-1 ${app.granted ? 'text-slate-900' : 'text-slate-500'}`}>
                {app.name}
              </h3>
              <p className="text-sm text-slate-500 line-clamp-2">
                Launch {app.name} seamlessly within the sandbox enclosure.
              </p>
            </div>

            <div className={`p-4 border-t ${app.granted ? 'border-indigo-50 bg-indigo-50/30' : 'border-slate-100 bg-slate-100'}`}>
              {app.granted ? (
                <button
                  onClick={() => handleLaunch(app.id)}
                  disabled={!app.installed || launching === app.id}
                  className={`
                    w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all
                    ${app.installed 
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg focus:ring-4 focus:ring-indigo-100'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
                  `}
                >
                  {launching === app.id ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <Play size={18} fill="currentColor" /> 
                      {app.installed 
                        ? (runningAppId === app.id ? 'Launch in Full Screen' : 'Launch Environment') 
                        : 'App Required'}
                    </>
                  )}
                </button>
              ) : (
                <div className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold bg-slate-200 text-slate-500">
                  <Lock size={18} /> Locked by Teacher
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExternalTools;
