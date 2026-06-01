// Agent: 💻 Agent D (Desktop Capture Manager)
// File: packages/desktop/src/main/capture.ts

import { desktopCapturer } from 'electron';

export interface CaptureSource {
  id: string;
  name: string;
  thumbnailUrl: string;
}

/**
 * Returns list of active windows and displays available for screening
 */
export async function getScreenCaptureSources(): Promise<CaptureSource[]> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 150, height: 100 },
      fetchWindowIcons: false,
    });

    return sources.map((source: any) => ({
      id: source.id,
      name: source.name,
      thumbnailUrl: source.thumbnail.toDataURL(),
    }));
  } catch (err: any) {
    console.error('❌ Failed to fetch desktop capture sources:', err);
    return [];
  }
}
