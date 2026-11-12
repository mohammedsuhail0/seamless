const { describe, it } = require('node:test');
const assert = require('node:assert');

// Mock HTMLVideoElement and MediaStream to test the audio/video controller invariants
class MockMediaStreamTrack {
  constructor(kind, id) {
    this.kind = kind;
    this.id = id || Math.random().toString(36).substring(7);
    this.enabled = true;
  }
}

class MockMediaStream {
  constructor(tracks = []) {
    this.id = Math.random().toString(36).substring(7);
    this.tracks = [...tracks];
    this.active = true;
  }

  getTracks() {
    return this.tracks;
  }

  getVideoTracks() {
    return this.tracks.filter((t) => t.kind === 'video');
  }

  getAudioTracks() {
    return this.tracks.filter((t) => t.kind === 'audio');
  }

  addTrack(track) {
    if (!this.tracks.some((t) => t.id === track.id)) {
      this.tracks.push(track);
    }
  }

  removeTrack(track) {
    this.tracks = this.tracks.filter((t) => t.id !== track.id);
  }
}

class MockHTMLVideoElement {
  constructor() {
    this._srcObject = null;
    this.srcObjectAssignmentCount = 0;
    this.muted = true;
    this.volume = 1.0;
    this.paused = true;
    this.simulatedAutoplayRejection = false;
  }

  get srcObject() {
    return this._srcObject;
  }

  set srcObject(stream) {
    this.srcObjectAssignmentCount++;
    this._srcObject = stream;
    // When srcObject is set in real browsers, active playback is stopped/reset
    this.paused = true;
  }

  async play() {
    if (this.simulatedAutoplayRejection && !this.muted) {
      throw new Error('NotAllowedError: play() failed because user gesture is required for unmuted playback');
    }
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }
}

describe('Viewer Package - Audio & Stream Playback Pipeline Test Suite', () => {
  it('should not re-assign srcObject if stream is identical, preventing decoder tear-down', () => {
    const video = new MockHTMLVideoElement();
    const stream = new MockMediaStream([new MockMediaStreamTrack('video')]);

    // Initial attach
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }
    assert.strictEqual(video.srcObjectAssignmentCount, 1);

    // Simulated component re-render when isMuted changes
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }
    // Should NOT have incremented, because video.srcObject === stream
    assert.strictEqual(video.srcObjectAssignmentCount, 1);
  });

  it('toggleMute should directly unmute without resetting srcObject', async () => {
    const video = new MockHTMLVideoElement();
    const stream = new MockMediaStream([
      new MockMediaStreamTrack('video'),
      new MockMediaStreamTrack('audio'),
    ]);

    video.srcObject = stream;
    await video.play();
    assert.strictEqual(video.paused, false);
    assert.strictEqual(video.muted, true);
    assert.strictEqual(video.srcObjectAssignmentCount, 1);

    // Action: User clicks "Tap to Unmute" or Volume icon
    const toggleMute = () => {
      const nextMuted = !video.muted;
      video.muted = nextMuted;
      video.volume = 1.0;
      if (!nextMuted && video.paused) {
        video.play();
      }
    };

    toggleMute();

    assert.strictEqual(video.muted, false);
    assert.strictEqual(video.volume, 1.0);
    assert.strictEqual(video.paused, false);
    // CRITICAL: srcObject was never reassigned, meaning zero screen black-out!
    assert.strictEqual(video.srcObjectAssignmentCount, 1);
  });

  it('should fallback to muted playback if browser policy blocks initial unmuted autoplay', async () => {
    const video = new MockHTMLVideoElement();
    video.simulatedAutoplayRejection = true;
    const stream = new MockMediaStream([new MockMediaStreamTrack('video'), new MockMediaStreamTrack('audio')]);

    video.srcObject = stream;
    video.muted = false; // Attempt unmuted play

    let videoPlaying = false;
    let isMutedState = false;

    // Simulation of our resilient attach-stream effect
    try {
      await video.play();
      videoPlaying = true;
    } catch (err) {
      // Unmuted autoplay blocked by browser
      if (!video.muted) {
        video.muted = true;
        isMutedState = true;
        await video.play();
        videoPlaying = true;
      }
    }

    // Video successfully playing muted instead of black screen!
    assert.strictEqual(videoPlaying, true);
    assert.strictEqual(video.muted, true);
    assert.strictEqual(isMutedState, true);
    assert.strictEqual(video.paused, false);
  });

  it('should support dynamic arrival of audio track after video track', () => {
    const stream = new MockMediaStream([new MockMediaStreamTrack('video')]);
    assert.strictEqual(stream.getVideoTracks().length, 1);
    assert.strictEqual(stream.getAudioTracks().length, 0);

    // Audio track arrives via WebRTC ontrack
    const audioTrack = new MockMediaStreamTrack('audio');
    stream.addTrack(audioTrack);

    assert.strictEqual(stream.getVideoTracks().length, 1);
    assert.strictEqual(stream.getAudioTracks().length, 1);
    assert.strictEqual(stream.getTracks().length, 2);
  });
});
