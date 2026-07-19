// Agent: 🖥️ Agent B (Server)
// File: packages/server/src/routes/rtc.ts

import { Router } from 'express';

const router = Router();

function parseTurnUrls(value?: string): string[] {
  return String(value || '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);
}

router.get('/ice-config', (_req, res) => {
  const turnUrls = parseTurnUrls(process.env.TURN_URLS || process.env.VITE_TURN_URLS);
  const username = process.env.TURN_USERNAME || process.env.VITE_TURN_USERNAME;
  const credential = process.env.TURN_CREDENTIAL || process.env.VITE_TURN_CREDENTIAL;
  const forceTurn = (process.env.FORCE_TURN || process.env.VITE_FORCE_TURN) === 'true';

  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  if (turnUrls.length > 0 && username && credential) {
    iceServers.push({
      urls: turnUrls,
      username,
      credential,
    });
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    iceServers,
    iceTransportPolicy: forceTurn ? 'relay' : 'all',
    turnConfigured: turnUrls.length > 0 && !!username && !!credential,
  });
});

export default router;
