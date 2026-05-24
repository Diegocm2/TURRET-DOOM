const { contextBridge, ipcRenderer } = require('electron');

window.addEventListener('error', (event) => {
  console.error('Renderer uncaught error:', event.message, event.filename, event.lineno, event.colno, event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Renderer unhandledrejection:', event.reason);
});

contextBridge.exposeInMainWorld('electronDebug', {
  ping: () => 'pong'
});

contextBridge.exposeInMainWorld('electronApp', {
  close: () => ipcRenderer.send('close-app'),
}); 