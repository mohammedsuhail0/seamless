package com.brosync.app;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;

import androidx.activity.result.ActivityResult;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "BroSyncScreenShare",
    permissions = {
        @Permission(
            alias = "audio",
            strings = { Manifest.permission.RECORD_AUDIO }
        )
    }
)
public class ScreenSharePlugin extends Plugin {

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void startCapture(PluginCall call) {
        if (getPermissionState("audio") != PermissionState.GRANTED) {
            requestPermissionForAlias("audio", call, "handleAudioPermission");
        } else {
            launchMediaProjection(call);
        }
    }

    @PermissionCallback
    private void handleAudioPermission(PluginCall call) {
        launchMediaProjection(call);
    }

    private void launchMediaProjection(PluginCall call) {
        Context context = getContext();
        MediaProjectionManager manager = (MediaProjectionManager) context.getSystemService(Context.MEDIA_PROJECTION_SERVICE);
        if (manager != null) {
            Intent intent = manager.createScreenCaptureIntent();
            startActivityForResult(call, intent, "handleCaptureResult");
        } else {
            call.reject("MediaProjectionManager not available");
        }
    }

    @ActivityCallback
    private void handleCaptureResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            Context context = getContext();
            Intent serviceIntent = new Intent(context, ScreenCaptureService.class);
            serviceIntent.setAction(ScreenCaptureService.ACTION_START);
            serviceIntent.putExtra(ScreenCaptureService.EXTRA_RESULT_CODE, result.getResultCode());
            serviceIntent.putExtra(ScreenCaptureService.EXTRA_RESULT_DATA, result.getData());
            serviceIntent.putExtra(ScreenCaptureService.EXTRA_ROOM_CODE, call.getString("roomCode"));
            serviceIntent.putExtra(ScreenCaptureService.EXTRA_SERVER_URL, call.getString("serverUrl"));
            serviceIntent.putExtra(ScreenCaptureService.EXTRA_TOKEN, call.getString("token"));
            serviceIntent.putExtra(ScreenCaptureService.EXTRA_DISPLAY_NAME, call.getString("displayName"));

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }

            JSObject res = new JSObject();
            res.put("status", "streaming");
            call.resolve(res);
        } else {
            call.reject("Screen capture permission cancelled by user");
        }
    }

    @PluginMethod
    public void stopCapture(PluginCall call) {
        Context context = getContext();
        Intent stopIntent = new Intent(context, ScreenCaptureService.class);
        stopIntent.setAction(ScreenCaptureService.ACTION_STOP);
        context.startService(stopIntent);

        JSObject res = new JSObject();
        res.put("status", "stopped");
        call.resolve(res);
    }

    @PluginMethod
    public void setImmersiveFullscreen(PluginCall call) {
        boolean enabled = call.getBoolean("enabled", true);
        Activity activity = getActivity();
        if (activity != null) {
            applyImmersiveFullscreen(activity, enabled);
        }
        JSObject res = new JSObject();
        res.put("fullscreen", enabled);
        call.resolve(res);
    }

    public static void applyImmersiveFullscreen(Activity activity, boolean enabled) {
        if (activity == null) return;
        activity.runOnUiThread(() -> {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    WindowInsetsController controller = activity.getWindow().getInsetsController();
                    if (controller != null) {
                        if (enabled) {
                            controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                            controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                        } else {
                            controller.show(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                        }
                    }
                } else {
                    View decorView = activity.getWindow().getDecorView();
                    if (enabled) {
                        decorView.setSystemUiVisibility(
                                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                                | View.SYSTEM_UI_FLAG_FULLSCREEN
                                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        );
                    } else {
                        decorView.setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
                    }
                }
            } catch (Exception ignored) {}
        });
    }
}
