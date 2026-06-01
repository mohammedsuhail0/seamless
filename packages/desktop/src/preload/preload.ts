// Agent: 💻 Agent D (Desktop Preload Bridge)
// File: packages/desktop/src/preload/preload.ts

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('browsync', {
  getSources: () => ipcRenderer.invoke('capture:sources'),
  selectSource: (sourceId: string) => ipcRenderer.send('capture:select-source', sourceId),
  onControlRequest: (callback: (event: any, payload: any) => void) => {
    ipcRenderer.on('control:request-received', callback);
  },
  onControlReleased: (callback: (event: any, payload: any) => void) => {
    ipcRenderer.on('control:released', callback);
  },
  grantControl: (roomId: string, viewerId: string) => ipcRenderer.send('control:grant', { roomId, viewerId }),
  denyControl: (roomId: string, viewerId: string) => ipcRenderer.send('control:deny', { roomId, viewerId }),
  revokeControl: (roomId: string) => ipcRenderer.send('control:revoke', { roomId }),
  onInputEvent: (callback: (event: any, payload: any) => void) => {
    ipcRenderer.on('input:event', callback);
  },
});
