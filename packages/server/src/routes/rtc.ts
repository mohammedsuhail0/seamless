// Agent: 🖥️ Agent B (Server)
// File: packages/server/src/routes/rtc.ts

import { Router } from 'express';
import { createRateLimiter } from '../middleware/rate-limit';

const router = Router();

const rtcLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  endpoint: 'rtc_ice_config',
});

const PUBLIC_TURN_URLS = [
  'turn:openrelay.metered.ca:80',
  'turn:openrelay.metered.ca:443',
  'turn:openrelay.metered.ca:443?transport=tcp',
  'turns:openrelay.metered.ca:443?transport=tcp',
];
const PUBLIC_TURN_USERNAME = 'openrelayproject';
const PUBLIC_TURN_CREDENTIAL = 'openrelayproject';

function parseTurnUrls(value?: string): string[] {
  return String(value || '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);
}

router.get('/ice-config', rtcLimiter, (_req, res) => {
  const configuredTurnUrls = parseTurnUrls(process.env.TURN_URLS || process.env.VITE_TURN_URLS);
  const hasConfiguredTurn = configuredTurnUrls.length > 0 && !!(process.env.TURN_USERNAME || process.env.VITE_TURN_USERNAME) && !!(process.env.TURN_CREDENTIAL || process.env.VITE_TURN_CREDENTIAL);
  const turnUrls = hasConfiguredTurn ? configuredTurnUrls : PUBLIC_TURN_URLS;
  const username = hasConfiguredTurn ? (process.env.TURN_USERNAME || process.env.VITE_TURN_USERNAME) : PUBLIC_TURN_USERNAME;
  const credential = hasConfiguredTurn ? (process.env.TURN_CREDENTIAL || process.env.VITE_TURN_CREDENTIAL) : PUBLIC_TURN_CREDENTIAL;
  const forceTurn = (process.env.FORCE_TURN || process.env.VITE_FORCE_TURN) === 'true';

  const iceServers: RTCIceServer[] = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
    { urls: ['stun:stun.cloudflare.com:3478'] },
  ];

  iceServers.push({
    urls: turnUrls,
    username,
    credential,
  });

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  return res.status(200).json({
    iceServers,
    iceTransportPolicy: forceTurn ? 'relay' : 'all',
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    turnConfigured: hasConfiguredTurn,
    usingPublicTurnFallback: !hasConfiguredTurn,
  });
});

export default router;
