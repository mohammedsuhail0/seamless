package com.brosync.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
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

import java.net.URI;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

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
    private String myUserId = null;
    private final Map<String, List<IceCandidate>> pendingIceCandidates = new ConcurrentHashMap<>();

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
            channel.setDescription("Broadcasting phone screen and audio to room viewers in real-time");
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
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        serviceType |= ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE;
                    }
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
                        .createAudioDeviceModule();

                peerConnectionFactory = PeerConnectionFactory.builder()
                        .setAudioDeviceModule(audioDeviceModule)
                        .setVideoEncoderFactory(encoderFactory)
                        .setVideoDecoderFactory(decoderFactory)
                        .createPeerConnectionFactory();

                MediaConstraints audioConstraints = new MediaConstraints();
                audioConstraints.mandatory.add(new MediaConstraints.KeyValuePair("googEchoCancellation", "false"));
                audioConstraints.mandatory.add(new MediaConstraints.KeyValuePair("googAutoGainControl", "true"));
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
            
            // Dynamic capture resolution matching native device aspect ratio (60fps, 16px macroblock aligned)
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
            IO.Options options = new IO.Options();
            options.transports = new String[]{"websocket"};
            options.reconnection = true;
            options.reconnectionAttempts = 50;
            options.reconnectionDelay = 1000;
            if (token != null && !token.isEmpty()) {
                options.auth = Collections.singletonMap("token", token);
            }

            signalingSocket = IO.socket(serverUrl, options);

            signalingSocket.on(Socket.EVENT_CONNECT, args -> {
                Log.i(TAG, "Signaling socket connected. Joining room: " + roomCode);
                try {
                    JSONObject joinData = new JSONObject();
                    joinData.put("roomCode", roomCode);
                    joinData.put("displayName", displayName != null ? displayName : "Host (Mobile)");
                    if (token != null && !token.isEmpty()) {
                        joinData.put("token", token);
                    }
                    signalingSocket.emit("room:join", joinData);
                } catch (Exception e) {
                    Log.e(TAG, "Error emitting room:join", e);
                }
            });

            // 1. When a viewer joins the room, immediately initiate WebRTC peer connection & offer
            signalingSocket.on("room:joined", args -> {
                if (args.length > 0 && args[0] instanceof JSONObject) {
                    JSONObject data = (JSONObject) args[0];
                    String joinedUserId = data.optString("userId");
                    String userRole = data.optString("role");

                    // Handle our own join confirmation
                    if (myUserId == null && data.has("roomCode")) {
                        myUserId = joinedUserId;
                        Log.i(TAG, "Confirmed our mobile host session. myUserId=" + myUserId);
                        return;
                    }

                    // A viewer joined
                    if (joinedUserId != null && !joinedUserId.isEmpty() && !joinedUserId.equals(myUserId)) {
                        if (!"HOST".equalsIgnoreCase(userRole)) {
                            Log.i(TAG, "Viewer joined room: " + joinedUserId + ". Initiating WebRTC peer connection...");
                            createPeerConnectionForViewer(joinedUserId);
                        }
                    }
                }
            });

            // 2. When presence:sync arrives, immediately connect to ALL existing viewers in the room
            signalingSocket.on("presence:sync", args -> {
                if (args.length > 0 && args[0] instanceof JSONObject) {
                    JSONObject data = (JSONObject) args[0];
                    org.json.JSONArray members = data.optJSONArray("members");
                    if (members != null) {
                        for (int i = 0; i < members.length(); i++) {
                            JSONObject m = members.optJSONObject(i);
                            if (m != null) {
                                String mUserId = m.optString("userId");
                                String mRole = m.optString("role");
                                if (mUserId != null && !mUserId.isEmpty() && !mUserId.equals(myUserId) && !"HOST".equalsIgnoreCase(mRole)) {
                                    Log.i(TAG, "Existing viewer found in presence:sync: " + mUserId + ". Initiating WebRTC peer connection...");
                                    createPeerConnectionForViewer(mUserId);
                                }
                            }
                        }
                    }
                }
            });

            // 3. When a viewer requests a fresh offer (e.g. page reload or tab switch)
            signalingSocket.on("rtc:reconnect-request", args -> {
                if (args.length > 0 && args[0] instanceof JSONObject) {
                    JSONObject data = (JSONObject) args[0];
                    String senderId = data.optString("senderUserId");
                    if (senderId != null && !senderId.isEmpty()) {
                        Log.i(TAG, "Viewer requested fresh WebRTC offer: " + senderId);
                        createPeerConnectionForViewer(senderId);
                    }
                }
            });

            // 4. When a viewer leaves the room, clean up their peer connection
            signalingSocket.on("room:left", args -> {
                if (args.length > 0 && args[0] instanceof JSONObject) {
                    JSONObject data = (JSONObject) args[0];
                    String leftUserId = data.optString("userId");
                    if (leftUserId != null && !leftUserId.isEmpty()) {
                        PeerConnection pc = peerConnections.remove(leftUserId);
                        pendingIceCandidates.remove(leftUserId);
                        if (pc != null) {
                            try { pc.close(); } catch (Exception ignored) {}
                            Log.i(TAG, "Closed peer connection for departed viewer: " + leftUserId);
                        }
                    }
                }
            });

            // 5. When a viewer replies with an RTC Answer
            signalingSocket.on("rtc:answer", args -> {
                if (args.length > 0 && args[0] instanceof JSONObject) {
                    JSONObject data = (JSONObject) args[0];
                    String senderId = data.optString("senderUserId");
                    JSONObject sdpObj = data.optJSONObject("sdp");
                    if (sdpObj != null) {
                        String sdp = sdpObj.optString("sdp");
                        PeerConnection pc = peerConnections.get(senderId);
                        if (pc != null) {
                            pc.setRemoteDescription(new SimpleSdpObserver() {
                                @Override
                                public void onSetSuccess() {
                                    Log.i(TAG, "Applied WebRTC Answer from viewer: " + senderId);
                                    List<IceCandidate> queued = pendingIceCandidates.remove(senderId);
                                    if (queued != null) {
                                        synchronized (queued) {
                                            for (IceCandidate cand : queued) {
                                                pc.addIceCandidate(cand);
                                            }
                                        }
                                    }
                                }
                            }, new SessionDescription(SessionDescription.Type.ANSWER, sdp));
                        }
                    }
                }
            });

            // 6. When a viewer sends an ICE Candidate
            signalingSocket.on("rtc:ice-candidate", args -> {
                if (args.length > 0 && args[0] instanceof JSONObject) {
                    JSONObject data = (JSONObject) args[0];
                    String senderId = data.optString("senderUserId");
                    JSONObject candidateObj = data.optJSONObject("candidate");
                    if (candidateObj != null) {
                        String sdp = candidateObj.optString("candidate");
                        String sdpMid = candidateObj.optString("sdpMid");
                        int sdpMLineIndex = candidateObj.optInt("sdpMLineIndex");

                        IceCandidate candidate = new IceCandidate(sdpMid, sdpMLineIndex, sdp);
                        PeerConnection pc = peerConnections.get(senderId);
                        if (pc != null && pc.getRemoteDescription() != null) {
                            pc.addIceCandidate(candidate);
                        } else {
                            List<IceCandidate> queue = pendingIceCandidates.computeIfAbsent(senderId, k -> new ArrayList<>());
                            synchronized (queue) {
                                queue.add(candidate);
                            }
                        }
                    }
                }
            });

            signalingSocket.connect();

        } catch (Exception e) {
            Log.e(TAG, "Signaling connection error", e);
        }
    }

    private void createPeerConnectionForViewer(String viewerId) {
        if (viewerId == null || viewerId.isEmpty()) return;
        if (peerConnectionFactory == null) {
            Log.e(TAG, "Cannot create peer connection: peerConnectionFactory is null");
            return;
        }

        // Close and clean up any existing connection for this viewer
        PeerConnection oldPc = peerConnections.remove(viewerId);
        if (oldPc != null) {
            try { oldPc.close(); } catch (Exception ignored) {}
        }
        pendingIceCandidates.remove(viewerId);

        List<PeerConnection.IceServer> iceServers = new ArrayList<>();
        iceServers.add(PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer());
        iceServers.add(PeerConnection.IceServer.builder("stun:stun1.l.google.com:19302").createIceServer());
        iceServers.add(PeerConnection.IceServer.builder("stun:stun2.l.google.com:19302").createIceServer());
        iceServers.add(PeerConnection.IceServer.builder("stun:stun.cloudflare.com:3478").createIceServer());
        iceServers.add(PeerConnection.IceServer.builder("turn:openrelay.metered.ca:443")
                .setUsername("openrelayproject")
                .setPassword("openrelayproject")
                .createIceServer());
        iceServers.add(PeerConnection.IceServer.builder("turn:openrelay.metered.ca:80")
                .setUsername("openrelayproject")
                .setPassword("openrelayproject")
                .createIceServer());

        PeerConnection.RTCConfiguration rtcConfig = new PeerConnection.RTCConfiguration(iceServers);
        rtcConfig.sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN;
        rtcConfig.continualGatheringPolicy = PeerConnection.ContinualGatheringPolicy.GATHER_CONTINUALLY;
        rtcConfig.bundlePolicy = PeerConnection.BundlePolicy.MAXBUNDLE;
        rtcConfig.rtcpMuxPolicy = PeerConnection.RtcpMuxPolicy.REQUIRE;
        rtcConfig.tcpCandidatePolicy = PeerConnection.TcpCandidatePolicy.DISABLED;

        PeerConnection pc = peerConnectionFactory.createPeerConnection(rtcConfig, new PeerConnection.Observer() {
            @Override public void onSignalingChange(PeerConnection.SignalingState signalingState) {}
            @Override public void onIceConnectionChange(PeerConnection.IceConnectionState iceConnectionState) {
                Log.d(TAG, "ICE Connection State for " + viewerId + ": " + iceConnectionState);
            }
            @Override public void onIceConnectionReceivingChange(boolean b) {}
            @Override public void onIceGatheringChange(PeerConnection.IceGatheringState iceGatheringState) {}

            @Override
            public void onIceCandidate(IceCandidate iceCandidate) {
                try {
                    JSONObject payload = new JSONObject();
                    payload.put("targetUserId", viewerId);
                    JSONObject candObj = new JSONObject();
                    candObj.put("candidate", iceCandidate.sdp);
                    candObj.put("sdpMid", iceCandidate.sdpMid);
                    candObj.put("sdpMLineIndex", iceCandidate.sdpMLineIndex);
                    payload.put("candidate", candObj);
                    signalingSocket.emit("rtc:ice-candidate", payload);
                } catch (Exception e) {
                    Log.e(TAG, "Error emitting ICE candidate", e);
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

            // Enable stereo full-fidelity Opus audio
            if (sdp.contains("opus/48000") && !sdp.contains("stereo=1")) {
                sdp = sdp.replace("useinbandfec=1", "useinbandfec=1;stereo=1;sprop-stereo=1");
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
            pendingIceCandidates.clear();

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
