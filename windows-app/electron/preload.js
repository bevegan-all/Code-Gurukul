import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  quitApp: () => ipcRenderer.send('quit-app'),
  onChatbotToggle: (callback) => ipcRenderer.on('toggle-chatbot', callback),
});
