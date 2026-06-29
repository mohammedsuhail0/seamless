// Agent: 💻 Agent D (Desktop Preload Bridge)
// File: packages/desktop/src/preload/preload.ts

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('browsync', {
  getServerUrl: () => ipcRenderer.invoke('host:get-server-url'),
  joinRoom: (payload: { roomCode: string; displayName: string; token?: string }) => ipcRenderer.send('host:join-room', payload),
  sendRtcOffer: (targetUserId: string, sdp: any) => ipcRenderer.send('host:rtc-offer', { targetUserId, sdp }),
  sendIceCandidate: (targetUserId: string, candidate: any) =>
    ipcRenderer.send('host:rtc-ice-candidate', { targetUserId, candidate }),
  onSocketConnected: (callback: (event: any, payload: any) => void) => ipcRenderer.on('host:socket-connected', callback),
  onRoomJoined: (callback: (event: any, payload: any) => void) => ipcRenderer.on('host:room-joined', callback),
  onPresenceSync: (callback: (event: any, payload: any) => void) => ipcRenderer.on('host:presence-sync', callback),
  onRoomError: (callback: (event: any, payload: any) => void) => ipcRenderer.on('host:room-error', callback),
  onRtcAnswer: (callback: (event: any, payload: any) => void) => ipcRenderer.on('host:rtc-answer', callback),
  onRtcIceCandidate: (callback: (event: any, payload: any) => void) => ipcRenderer.on('host:rtc-ice-candidate', callback),
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
  injectInput: (event: any) => ipcRenderer.send('host:inject-input', event),
});
