import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.brosync.app',
  appName: 'BroSync',
  webDir: 'dist',
  server: {
    // Live Over-The-Air (OTA) production URL
    // Any changes pushed to Vercel instantly update in the APK without requiring users to re-install!
    url: 'https://brosync.vercel.app',
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
