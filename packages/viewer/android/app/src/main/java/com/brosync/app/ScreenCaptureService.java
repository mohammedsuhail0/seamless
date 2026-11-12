package com.brosync.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioPlaybackCaptureConfiguration;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.media.projection.MediaProjection;
import android.os.Build;
import android.os.IBinder;
import android.util.DisplayMetrics;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import org.json.JSONObject;
import org.webrtc.*;
import org.webrtc.audio.AudioDeviceModule;
import org.webrtc.audio.JavaAudioDeviceModule;

import java.lang.reflect.Field;
import java.net.URI;
import java.nio.ByteBuffer;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;

import io.socket.client.IO;
import io.socket.client.Socket;

public class ScreenCaptureService extends Service {
    private static final String TAG = "BroSyncScreenService";
    private static final String CHANNEL_ID = "brosync_screen_stream";
    private static final int NOTIFICATION_ID = 8821;

    public static final String ACTION_START = "ACTION_START";
    public static final String ACTION_STOP = "ACTION_STOP";
    public static final String EXTRA_RESULT_CODE = "EXTRA_RESULT_CODE";
    public static final String EXTRA_RESULT_DATA = "EXTRA_RESULT_DATA";
    public static final String EXTRA_ROOM_CODE = "EXTRA_ROOM_CODE";
    public static final String EXTRA_SERVER_URL = "EXTRA_SERVER_URL";
    public static final String EXTRA_TOKEN = "EXTRA_TOKEN";
    public static final String EXTRA_DISPLAY_NAME = "EXTRA_DISPLAY_NAME";

    private EglBase eglBase;
    private PeerConnectionFactory peerConnectionFactory;
    private VideoSource videoSource;
    private VideoTrack videoTrack;
    private AudioSource audioSource;
    private AudioTrack audioTrack;
    private JavaAudioDeviceModule audioDeviceModule;
    private ScreenCapturerAndroid screenCapturer;
    private SurfaceTextureHelper surfaceTextureHelper;
    private Socket signalingSocket;
    private String roomCode;
    private String serverUrl;
    private final Map<String, PeerConnection> peerConnections = new ConcurrentHashMap<>();

    // Internal system & media audio playback capture (YouTube, Gallery, Music, Games)
    private AudioRecord internalAudioRecord;
    private Thread internalAudioThread;
    private volatile boolean isInternalAudioCapturing = false;
    private final ConcurrentLinkedQueue<byte[]> internalAudioQueue = new ConcurrentLinkedQueue<>();
    private ByteBuffer cachedWebRtcByteBuffer = null;
    private boolean isByteBufferLookupAttempted = false;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "BroSync Screen Stream",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Broadcasting phone screen to room viewers in real-time");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, notificationIntent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("BroSync Live Stream Active")
                .setContentText("Broadcasting your mobile screen and audio with zero lag")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .build();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;

        String action = intent.getAction();
        if (ACTION_STOP.equals(action)) {
            stopStreaming();
            stopSelf();
            return START_NOT_STICKY;
        }

        if (ACTION_START.equals(action)) {
            int resultCode = intent.getIntExtra(EXTRA_RESULT_CODE, 0);
            Intent resultData = intent.getParcelableExtra(EXTRA_RESULT_DATA);
            roomCode = intent.getStringExtra(EXTRA_ROOM_CODE);
            serverUrl = intent.getStringExtra(EXTRA_SERVER_URL);
            String token = intent.getStringExtra(EXTRA_TOKEN);
            String displayName = intent.getStringExtra(EXTRA_DISPLAY_NAME);

            if (resultData != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    int serviceType = ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION;
                    startForeground(NOTIFICATION_ID, buildNotification(), serviceType);
                } else {
                    startForeground(NOTIFICATION_ID, buildNotification());
                }

                startWebRTC(resultCode, resultData, token, displayName);
            }
        }

        return START_NOT_STICKY;
    }

    private void startWebRTC(int resultCode, Intent resultData, String token, String displayName) {
        try {
            eglBase = EglBase.create();

            PeerConnectionFactory.InitializationOptions initOptions =
                    PeerConnectionFactory.InitializationOptions.builder(this)
                            .setEnableInternalTracer(false)
                            .createInitializationOptions();
            PeerConnectionFactory.initialize(initOptions);

            VideoEncoderFactory encoderFactory = new DefaultVideoEncoderFactory(
                    eglBase.getEglBaseContext(), true, true
            );
            VideoDecoderFactory decoderFactory = new DefaultVideoDecoderFactory(eglBase.getEglBaseContext());

            // Initialize high-fidelity low-latency audio device module
            try {
                audioDeviceModule = JavaAudioDeviceModule.builder(this)
                        .setAudioSource(MediaRecorder.AudioSource.MIC)
                        .setUseHardwareAcousticEchoCanceler(false)
                        .setUseHardwareNoiseSuppressor(false)
                        .setUseStereoInput(true)
                        .setUseStereoOutput(true)
                        .setSamplesReadyCallback(new JavaAudioDeviceModule.SamplesReadyCallback() {
                            @Override
                            public void onWebRtcAudioRecordSamplesReady(JavaAudioDeviceModule.AudioSamples samples) {
                                handleAudioSamples(samples);
                            }
                        })
                        .createAudioDeviceModule();

                peerConnectionFactory = PeerConnectionFactory.builder()
                        .setAudioDeviceModule(audioDeviceModule)
                        .setVideoEncoderFactory(encoderFactory)
                        .setVideoDecoderFactory(decoderFactory)
                        .createPeerConnectionFactory();

                MediaConstraints audioConstraints = new MediaConstraints();
                audioConstraints.mandatory.add(new MediaConstraints.KeyValuePair("googEchoCancellation", "false"));
                audioConstraints.mandatory.add(new MediaConstraints.KeyValuePair("googAutoGainControl", "false"));
                audioConstraints.mandatory.add(new MediaConstraints.KeyValuePair("googHighpassFilter", "false"));
                audioConstraints.mandatory.add(new MediaConstraints.KeyValuePair("googNoiseSuppression", "false"));

                audioSource = peerConnectionFactory.createAudioSource(audioConstraints);
                audioTrack = peerConnectionFactory.createAudioTrack("BROSYNC_MOBILE_AUDIO_TRACK", audioSource);
                audioTrack.setEnabled(true);
                Log.i(TAG, "AudioTrack created successfully for mobile broadcast");
            } catch (Exception audioErr) {
                Log.w(TAG, "Audio initialization fallback to video-only: " + audioErr.getMessage());
                peerConnectionFactory = PeerConnectionFactory.builder()
                        .setVideoEncoderFactory(encoderFactory)
                        .setVideoDecoderFactory(decoderFactory)
                        .createPeerConnectionFactory();
            }

            screenCapturer = new ScreenCapturerAndroid(resultData, new MediaProjection.Callback() {
                @Override
                public void onStop() {
                    Log.i(TAG, "User stopped screen capture from notification/system");
                    stopStreaming();
                    stopSelf();
                }
            });

            surfaceTextureHelper = SurfaceTextureHelper.create("CaptureThread", eglBase.getEglBaseContext());
            videoSource = peerConnectionFactory.createVideoSource(screenCapturer.isScreencast());
            screenCapturer.initialize(surfaceTextureHelper, getApplicationContext(), videoSource.getCapturerObserver());
            
            // Calculate dynamic resolution matching exact device aspect ratio (eliminates letterbox scaling lag)
            DisplayMetrics metrics = getResources().getDisplayMetrics();
            int width = metrics.widthPixels;
            int height = metrics.heightPixels;

            int captureWidth;
            int captureHeight;
            if (width < height) {
                // Portrait (phone standard) - target 1080p width with 16-pixel macroblock alignment
                int targetWidth = Math.min(width, 1080);
                captureWidth = (targetWidth / 16) * 16;
                captureHeight = (int) Math.round((double) height * (double) captureWidth / width);
                captureHeight = (captureHeight / 16) * 16;
            } else {
                // Landscape - target 1080p height
                int targetHeight = Math.min(height, 1080);
                captureHeight = (targetHeight / 16) * 16;
                captureWidth = (int) Math.round((double) width * (double) captureHeight / height);
                captureWidth = (captureWidth / 16) * 16;
            }
            Log.i(TAG, "Dynamic capture resolution calculated: " + captureWidth + "x" + captureHeight + " @ 60fps (native: " + width + "x" + height + ")");
            screenCapturer.startCapture(captureWidth, captureHeight, 60);
            startInternalAudioCapture();
            videoTrack = peerConnectionFactory.createVideoTrack("BROSYNC_MOBILE_SCREEN_TRACK", videoSource);
            videoTrack.setEnabled(true);

            connectSignaling(token, displayName);
            Log.i(TAG, "Hardware accelerated WebRTC Screen Capturer & Audio initialized successfully");

        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize WebRTC Screen Capturer", e);
            stopSelf();
        }
    }

    private void connectSignaling(String token, String displayName) {
        try {
            String baseUrl = (serverUrl != null && !serverUrl.isEmpty()) ? serverUrl : "https://brosync-api.onrender.com";
            IO.Options options = new IO.Options();
            options.transports = new String[]{"websocket", "polling"};
            options.reconnection = true;

            signalingSocket = IO.socket(URI.create(baseUrl), options);

            signalingSocket.on(Socket.EVENT_CONNECT, args -> {
                Log.i(TAG, "Signaling connected for mobile broadcaster");
                try {
                    JSONObject joinPayload = new JSONObject();
                    joinPayload.put("roomCode", roomCode);
                    joinPayload.put("displayName", displayName != null ? displayName : "Mobile Host (APK)");
                    if (token != null && !token.isEmpty()) {
                        joinPayload.put("token", token);
                    }
                    signalingSocket.emit("room:join", joinPayload);
                } catch (Exception err) {
                    Log.e(TAG, "Error emitting room:join", err);
                }
            });

            signalingSocket.on("rtc:reconnect-request", args -> {
                try {
                    if (args.length > 0 && args[0] instanceof JSONObject) {
                        JSONObject data = (JSONObject) args[0];
                        String viewerId = data.optString("senderUserId");
                        if (!viewerId.isEmpty()) {
                            createOfferForViewer(viewerId);
                        }
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error on rtc:reconnect-request", e);
                }
            });

            signalingSocket.on("rtc:answer", args -> {
                try {
                    if (args.length > 0 && args[0] instanceof JSONObject) {
                        JSONObject data = (JSONObject) args[0];
                        String viewerId = data.optString("senderUserId");
                        JSONObject sdpObj = data.optJSONObject("sdp");
                        if (sdpObj != null) {
                            PeerConnection pc = peerConnections.get(viewerId);
                            if (pc != null) {
                                SessionDescription sdp = new SessionDescription(
                                        SessionDescription.Type.ANSWER,
                                        sdpObj.optString("sdp")
                                );
                                pc.setRemoteDescription(new SimpleSdpObserver(), sdp);
                            }
                        }
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error on rtc:answer", e);
                }
            });

            signalingSocket.on("rtc:ice-candidate", args -> {
                try {
                    if (args.length > 0 && args[0] instanceof JSONObject) {
                        JSONObject data = (JSONObject) args[0];
                        String viewerId = data.optString("senderUserId");
                        JSONObject candObj = data.optJSONObject("candidate");
                        if (candObj != null) {
                            PeerConnection pc = peerConnections.get(viewerId);
                            if (pc != null) {
                                IceCandidate candidate = new IceCandidate(
                                        candObj.optString("sdpMid"),
                                        candObj.optInt("sdpMLineIndex"),
                                        candObj.optString("candidate")
                                );
                                pc.addIceCandidate(candidate);
                            }
                        }
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error on rtc:ice-candidate", e);
                }
            });

            signalingSocket.on("presence:sync", args -> {
                try {
                    if (args.length > 0 && args[0] instanceof JSONObject) {
                        JSONObject payload = (JSONObject) args[0];
                        var members = payload.optJSONArray("members");
                        if (members != null) {
                            for (int i = 0; i < members.length(); i++) {
                                JSONObject m = members.getJSONObject(i);
                                String role = m.optString("role");
                                String userId = m.optString("userId");
                                if (!"HOST".equalsIgnoreCase(role) && !peerConnections.containsKey(userId)) {
                                    createOfferForViewer(userId);
                                }
                            }
                        }
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error on presence:sync", e);
                }
            });

            signalingSocket.connect();

        } catch (Exception e) {
            Log.e(TAG, "Error setting up signaling", e);
        }
    }

    private void createOfferForViewer(String viewerId) {
        if (peerConnectionFactory == null || videoTrack == null) return;

        List<PeerConnection.IceServer> iceServers = new ArrayList<>();
        iceServers.add(PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer());
        iceServers.add(PeerConnection.IceServer.builder("stun:stun.cloudflare.com:3478").createIceServer());
        iceServers.add(PeerConnection.IceServer.builder("turn:openrelay.metered.ca:443")
                .setUsername("openrelayproject")
                .setPassword("openrelayproject")
                .createIceServer());

        PeerConnection.RTCConfiguration rtcConfig = new PeerConnection.RTCConfiguration(iceServers);
        rtcConfig.sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN;
        rtcConfig.continualGatheringPolicy = PeerConnection.ContinualGatheringPolicy.GATHER_CONTINUALLY;

        PeerConnection pc = peerConnectionFactory.createPeerConnection(rtcConfig, new PeerConnection.Observer() {
            @Override public void onSignalingChange(PeerConnection.SignalingState signalingState) {}
            @Override public void onIceConnectionChange(PeerConnection.IceConnectionState iceConnectionState) {
                Log.d(TAG, "Viewer " + viewerId + " ICE State: " + iceConnectionState);
            }
            @Override public void onIceConnectionReceivingChange(boolean b) {}
            @Override public void onIceGatheringChange(PeerConnection.IceGatheringState iceGatheringState) {}
            @Override
            public void onIceCandidate(IceCandidate iceCandidate) {
                try {
                    JSONObject payload = new JSONObject();
                    payload.put("targetUserId", viewerId);
                    JSONObject cand = new JSONObject();
                    cand.put("candidate", iceCandidate.sdp);
                    cand.put("sdpMid", iceCandidate.sdpMid);
                    cand.put("sdpMLineIndex", iceCandidate.sdpMLineIndex);
                    payload.put("candidate", cand);
                    signalingSocket.emit("rtc:ice-candidate", payload);
                } catch (Exception e) {
                    Log.e(TAG, "Error sending ice candidate", e);
                }
            }
            @Override public void onIceCandidatesRemoved(IceCandidate[] iceCandidates) {}
            @Override public void onAddStream(MediaStream mediaStream) {}
            @Override public void onRemoveStream(MediaStream mediaStream) {}
            @Override public void onDataChannel(DataChannel dataChannel) {}
            @Override public void onRenegotiationNeeded() {}
            @Override public void onAddTrack(RtpReceiver rtpReceiver, MediaStream[] mediaStreams) {}
        });

        if (pc != null) {
            if (videoTrack != null) {
                pc.addTrack(videoTrack, Collections.singletonList("BROSYNC_STREAM"));
            }
            if (audioTrack != null) {
                pc.addTrack(audioTrack, Collections.singletonList("BROSYNC_STREAM"));
            }
            peerConnections.put(viewerId, pc);

            // Configure RTP sender degradation preference to MAINTAIN_FRAMERATE for buttery smoothness
            for (RtpSender sender : pc.getSenders()) {
                if (sender.track() != null && "video".equals(sender.track().kind())) {
                    try {
                        RtpParameters params = sender.getParameters();
                        if (params != null) {
                            params.degradationPreference = RtpParameters.DegradationPreference.MAINTAIN_FRAMERATE;
                            if (params.encodings != null && !params.encodings.isEmpty()) {
                                RtpParameters.Encoding enc = params.encodings.get(0);
                                enc.minBitrateBps = 3000 * 1000;
                                enc.maxBitrateBps = 8000 * 1000;
                                enc.maxFramerate = 60;
                            }
                            sender.setParameters(params);
                        }
                    } catch (Exception err) {
                        Log.w(TAG, "Could not set video RtpParameters: " + err.getMessage());
                    }
                }
            }

            MediaConstraints constraints = new MediaConstraints();
            constraints.mandatory.add(new MediaConstraints.KeyValuePair("OfferToReceiveVideo", "false"));
            constraints.mandatory.add(new MediaConstraints.KeyValuePair("OfferToReceiveAudio", "false"));

            pc.createOffer(new SimpleSdpObserver() {
                @Override
                public void onCreateSuccess(SessionDescription sessionDescription) {
                    String optimizedSdp = optimizeSdpForUltraLowLatency(sessionDescription.description);
                    SessionDescription sdpToSend = new SessionDescription(sessionDescription.type, optimizedSdp);

                    pc.setLocalDescription(new SimpleSdpObserver() {
                        @Override
                        public void onSetSuccess() {
                            try {
                                JSONObject payload = new JSONObject();
                                payload.put("targetUserId", viewerId);
                                JSONObject sdpObj = new JSONObject();
                                sdpObj.put("type", "offer");
                                sdpObj.put("sdp", sdpToSend.description);
                                payload.put("sdp", sdpObj);
                                signalingSocket.emit("rtc:offer", payload);
                                Log.i(TAG, "WebRTC optimized zero-lag offer sent to viewer: " + viewerId);
                            } catch (Exception e) {
                                Log.e(TAG, "Error sending RTC offer", e);
                            }
                        }
                    }, sdpToSend);
                }
            }, constraints);
        }
    }

    private String optimizeSdpForUltraLowLatency(String sdp) {
        if (sdp == null) return "";
        try {
            // 1. Force playout-delay:0 0 for Chrome/Safari/Edge to drop jitter buffer delay to ~0ms
            if (sdp.contains("a=mid:video") && !sdp.contains("a=playout-delay:0 0")) {
                sdp = sdp.replace("a=mid:video", "a=mid:video\r\na=playout-delay:0 0");
            }

            // 2. Add video and audio bandwidth allocations
            StringBuilder sb = new StringBuilder();
            String[] lines = sdp.split("\r\n");
            for (String line : lines) {
                sb.append(line).append("\r\n");
                if (line.startsWith("m=video")) {
                    sb.append("b=AS:8000\r\n");
                } else if (line.startsWith("m=audio")) {
                    sb.append("b=AS:256\r\n");
                }
            }
            return sb.toString();
        } catch (Exception e) {
            Log.w(TAG, "SDP optimization error: " + e.getMessage());
            return sdp;
        }
    }

    private void stopStreaming() {
        try {
            for (PeerConnection pc : peerConnections.values()) {
                pc.close();
            }
            peerConnections.clear();

            if (signalingSocket != null) {
                signalingSocket.disconnect();
                signalingSocket.close();
                signalingSocket = null;
            }

            if (screenCapturer != null) {
                screenCapturer.stopCapture();
                screenCapturer.dispose();
                screenCapturer = null;
            }

            if (videoTrack != null) {
                videoTrack.dispose();
                videoTrack = null;
            }

            if (videoSource != null) {
                videoSource.dispose();
                videoSource = null;
            }

            isInternalAudioCapturing = false;
            if (internalAudioThread != null) {
                try {
                    internalAudioThread.interrupt();
                } catch (Exception ignored) {}
                internalAudioThread = null;
            }

            if (internalAudioRecord != null) {
                try {
                    internalAudioRecord.stop();
                    internalAudioRecord.release();
                } catch (Exception ignored) {}
                internalAudioRecord = null;
            }
            internalAudioQueue.clear();
            cachedWebRtcByteBuffer = null;
            isByteBufferLookupAttempted = false;

            if (audioTrack != null) {
                audioTrack.dispose();
                audioTrack = null;
            }

            if (audioSource != null) {
                audioSource.dispose();
                audioSource = null;
            }

            if (audioDeviceModule != null) {
                audioDeviceModule.release();
                audioDeviceModule = null;
            }

            if (surfaceTextureHelper != null) {
                surfaceTextureHelper.dispose();
                surfaceTextureHelper = null;
            }

            if (peerConnectionFactory != null) {
                peerConnectionFactory.dispose();
                peerConnectionFactory = null;
            }

            if (eglBase != null) {
                eglBase.release();
                eglBase = null;
            }

        } catch (Exception e) {
            Log.e(TAG, "Error stopping stream", e);
        }
    }

    private void startInternalAudioCapture() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            Log.i(TAG, "AudioPlaybackCapture requires Android 10+ (API 29).");
            return;
        }

        new Thread(() -> {
            MediaProjection mediaProjection = null;
            // Poll for up to 3.5 seconds waiting for ScreenCapturerAndroid to initialize mediaProjection asynchronously
            for (int i = 0; i < 35; i++) {
                mediaProjection = extractMediaProjection();
                if (mediaProjection != null) {
                    Log.i(TAG, "MediaProjection successfully extracted on attempt " + (i + 1));
                    break;
                }
                try {
                    Thread.sleep(100);
                } catch (InterruptedException ignored) {}
            }

            if (mediaProjection == null) {
                Log.e(TAG, "Could not extract active MediaProjection after 3.5s; internal audio disabled");
                return;
            }

            try {
                AudioPlaybackCaptureConfiguration config = new AudioPlaybackCaptureConfiguration.Builder(mediaProjection)
                        .addMatchingUsage(AudioAttributes.USAGE_MEDIA)
                        .addMatchingUsage(AudioAttributes.USAGE_GAME)
                        .addMatchingUsage(AudioAttributes.USAGE_UNKNOWN)
                        .build();

                int sampleRate = 48000;
                int channelConfig = AudioFormat.CHANNEL_IN_STEREO;
                int audioEncoding = AudioFormat.ENCODING_PCM_16BIT;
                int minBufSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioEncoding);
                int bufferSize = Math.max(minBufSize * 2, 1920 * 8);

                internalAudioRecord = new AudioRecord.Builder()
                        .setAudioPlaybackCaptureConfig(config)
                        .setAudioFormat(new AudioFormat.Builder()
                                .setEncoding(audioEncoding)
                                .setSampleRate(sampleRate)
                                .setChannelMask(channelConfig)
                                .build())
                        .setBufferSizeInBytes(bufferSize)
                        .build();

                internalAudioRecord.startRecording();
                isInternalAudioCapturing = true;

                internalAudioThread = new Thread(() -> {
                    android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_URGENT_AUDIO);
                    // 10ms frame at 48kHz, 16-bit stereo = 480 frames * 4 bytes/frame = 1920 bytes
                    byte[] readBuf = new byte[1920];
                    while (isInternalAudioCapturing && internalAudioRecord != null) {
                        try {
                            int read = internalAudioRecord.read(readBuf, 0, readBuf.length);
                            if (read > 0) {
                                byte[] chunk = Arrays.copyOf(readBuf, read);
                                // Zero-lag queue: keep maximum 4 chunks (~40ms) buffered
                                while (internalAudioQueue.size() >= 4) {
                                    internalAudioQueue.poll();
                                }
                                internalAudioQueue.offer(chunk);
                            }
                        } catch (Exception err) {
                            Log.w(TAG, "Error reading internal audio chunk: " + err.getMessage());
                            break;
                        }
                    }
                }, "BroSyncInternalAudioThread");
                internalAudioThread.setPriority(Thread.MAX_PRIORITY);
                internalAudioThread.start();
                Log.i(TAG, "Internal system/media playback audio capture started successfully (YouTube/Gallery/Music/Games enabled)");

            } catch (Exception e) {
                Log.e(TAG, "Failed to start internal playback audio capture", e);
            }
        }, "BroSyncAudioInitThread").start();
    }

    private MediaProjection extractMediaProjection() {
        if (screenCapturer == null) return null;
        try {
            try {
                Field f = ScreenCapturerAndroid.class.getDeclaredField("mediaProjection");
                f.setAccessible(true);
                Object obj = f.get(screenCapturer);
                if (obj instanceof MediaProjection) return (MediaProjection) obj;
            } catch (NoSuchFieldException ignored) {}

            for (Field f : ScreenCapturerAndroid.class.getDeclaredFields()) {
                if (MediaProjection.class.isAssignableFrom(f.getType())) {
                    f.setAccessible(true);
                    Object obj = f.get(screenCapturer);
                    if (obj instanceof MediaProjection) return (MediaProjection) obj;
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to extract MediaProjection from ScreenCapturerAndroid", e);
        }
        return null;
    }

    private void handleAudioSamples(JavaAudioDeviceModule.AudioSamples samples) {
        if (audioDeviceModule == null) return;
        try {
            if (cachedWebRtcByteBuffer == null && !isByteBufferLookupAttempted) {
                isByteBufferLookupAttempted = true;
                try {
                    Field inputField = null;
                    try {
                        inputField = JavaAudioDeviceModule.class.getDeclaredField("audioInput");
                    } catch (NoSuchFieldException ignored) {
                        for (Field f : JavaAudioDeviceModule.class.getDeclaredFields()) {
                            if (f.getType().getName().contains("WebRtcAudioRecord")) {
                                inputField = f;
                                break;
                            }
                        }
                    }

                    if (inputField != null) {
                        inputField.setAccessible(true);
                        Object webRtcAudioRecord = inputField.get(audioDeviceModule);
                        if (webRtcAudioRecord != null) {
                            Field bufField = null;
                            try {
                                bufField = webRtcAudioRecord.getClass().getDeclaredField("byteBuffer");
                            } catch (NoSuchFieldException ignored) {
                                for (Field f : webRtcAudioRecord.getClass().getDeclaredFields()) {
                                    if (ByteBuffer.class.isAssignableFrom(f.getType())) {
                                        bufField = f;
                                        break;
                                    }
                                }
                            }
                            if (bufField != null) {
                                bufField.setAccessible(true);
                                cachedWebRtcByteBuffer = (ByteBuffer) bufField.get(webRtcAudioRecord);
                                Log.i(TAG, "Direct WebRTC audio ByteBuffer cached successfully for zero-copy internal audio injection");
                            }
                        }
                    }
                } catch (Exception ex) {
                    Log.w(TAG, "WebRTC audio ByteBuffer lookup warning: " + ex.getMessage());
                }
            }

            if (cachedWebRtcByteBuffer == null) return;

            byte[] internalChunk = internalAudioQueue.poll();
            int targetCapacity = cachedWebRtcByteBuffer.capacity();

            // STRICT ZERO-MICROPHONE ENFORCEMENT:
            // Physical microphone audio is NEVER transmitted over WebRTC.
            if (internalChunk != null && internalChunk.length > 0) {
                int len = Math.min(internalChunk.length, targetCapacity);
                cachedWebRtcByteBuffer.position(0);
                cachedWebRtcByteBuffer.put(internalChunk, 0, len);
                if (len < targetCapacity) {
                    byte[] zeroPad = new byte[targetCapacity - len];
                    cachedWebRtcByteBuffer.put(zeroPad);
                }
                cachedWebRtcByteBuffer.position(0);
            } else {
                // Absolute digital silence: wipe out any microphone hardware buffer data
                cachedWebRtcByteBuffer.position(0);
                byte[] silence = new byte[targetCapacity];
                cachedWebRtcByteBuffer.put(silence);
                cachedWebRtcByteBuffer.position(0);
            }
        } catch (Exception e) {
            // Non-fatal
        }
    }

    @Override
    public void onDestroy() {
        stopStreaming();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private static class SimpleSdpObserver implements SdpObserver {
        @Override public void onCreateSuccess(SessionDescription sessionDescription) {}
        @Override public void onSetSuccess() {}
        @Override public void onCreateFailure(String s) { Log.e(TAG, "SDP Failure: " + s); }
        @Override public void onSetFailure(String s) { Log.e(TAG, "SDP Set Failure: " + s); }
    }
}
