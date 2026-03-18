import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  quitApp: () => ipcRenderer.send('quit-app'),
  onChatbotToggle: (callback) => ipcRenderer.on('toggle-chatbot', callback),
  getScreenCapture: () => ipcRenderer.invoke('get-screen-capture'),
  setRestrictionMode: (isUnrestricted) => ipcRenderer.send('set-restriction-mode', isUnrestricted),
  // IPC for lockdown overlay — main process tells renderer when focus is lost/gained
  onWindowBlur:  (callback) => ipcRenderer.on('window-blur',  callback),
  onWindowFocus: (callback) => ipcRenderer.on('window-focus', callback),
  checkExternalApp: (appId) => ipcRenderer.invoke('check-external-app', appId),
  launchExternalApp: (appId) => ipcRenderer.invoke('launch-external-app', appId),
  getRunningExternalApp: () => ipcRenderer.invoke('get-running-external-app')
});
