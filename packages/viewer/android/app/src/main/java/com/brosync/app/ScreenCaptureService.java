package com.brosync.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.projection.MediaProjection;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import org.json.JSONObject;
import org.webrtc.*;

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
    private ScreenCapturerAndroid screenCapturer;
    private SurfaceTextureHelper surfaceTextureHelper;
    private Socket signalingSocket;
    private String roomCode;
    private String serverUrl;
    private final Map<String, PeerConnection> peerConnections = new ConcurrentHashMap<>();

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
                .setContentText("Broadcasting your mobile screen with zero lag")
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
                    startForeground(NOTIFICATION_ID, buildNotification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION);
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

            peerConnectionFactory = PeerConnectionFactory.builder()
                    .setVideoEncoderFactory(encoderFactory)
                    .setVideoDecoderFactory(decoderFactory)
                    .createPeerConnectionFactory();

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
            
            // 720p 30fps: Ideal mobile sweet spot for hardware acceleration, low thermals, and sub-100ms latency
            screenCapturer.startCapture(1280, 720, 30);
            videoTrack = peerConnectionFactory.createVideoTrack("BROSYNC_MOBILE_SCREEN_TRACK", videoSource);
            videoTrack.setEnabled(true);

            connectSignaling(token, displayName);
            Log.i(TAG, "Hardware accelerated WebRTC Screen Capturer initialized successfully");

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
                // When viewers join, create peer offers
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
            pc.addTrack(videoTrack, Collections.singletonList("BROSYNC_STREAM"));
            peerConnections.put(viewerId, pc);

            MediaConstraints constraints = new MediaConstraints();
            pc.createOffer(new SimpleSdpObserver() {
                @Override
                public void onCreateSuccess(SessionDescription sessionDescription) {
                    pc.setLocalDescription(new SimpleSdpObserver() {
                        @Override
                        public void onSetSuccess() {
                            try {
                                JSONObject payload = new JSONObject();
                                payload.put("targetUserId", viewerId);
                                JSONObject sdpObj = new JSONObject();
                                sdpObj.put("type", "offer");
                                sdpObj.put("sdp", sessionDescription.description);
                                payload.put("sdp", sdpObj);
                                signalingSocket.emit("rtc:offer", payload);
                                Log.i(TAG, "WebRTC offer sent to viewer: " + viewerId);
                            } catch (Exception e) {
                                Log.e(TAG, "Error sending RTC offer", e);
                            }
                        }
                    }, sessionDescription);
                }
            }, constraints);
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

            if (videoSource != null) {
                videoSource.dispose();
                videoSource = null;
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
