// File: packages/server/src/utils/cookie.ts
// Helper to set and clear secure HttpOnly authentication cookies

import { Response } from 'express';
import { ENV } from '../config/env';

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const isProd = ENV.IS_PRODUCTION;
  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
  };

  res.cookie('brosync_access_token', accessToken, {
    ...cookieOptions,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });

  res.cookie('brosync_refresh_token', refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export function clearAuthCookies(res: Response) {
  const options = { path: '/' };
  res.clearCookie('brosync_access_token', options);
  res.clearCookie('brosync_refresh_token', options);
  res.clearCookie('browsync_access_token', options);
  res.clearCookie('browsync_refresh_token', options);
}
