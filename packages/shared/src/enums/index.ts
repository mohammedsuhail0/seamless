// Agent: 🔧 Agent A (Shared Package)
// File: packages/shared/src/enums/index.ts

export enum QualityPreset {
  AUTO = 'AUTO',
  HD_720 = 'HD_720',
  FHD_1080 = 'FHD_1080',
}

export enum RoomStatus {
  WAITING = 'WAITING', // Room created, host not yet streaming
  ACTIVE = 'ACTIVE',   // Host is streaming
  CLOSED = 'CLOSED',   // Session ended
}

export enum MemberRole {
  HOST = 'HOST',
  VIEWER = 'VIEWER',
  GUEST = 'GUEST',
}
