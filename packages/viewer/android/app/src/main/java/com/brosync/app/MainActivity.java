package com.brosync.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSION_REQUEST_AUDIO = 1002;
    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ScreenSharePlugin.class);
        super.onCreate(savedInstanceState);

        // Request RECORD_AUDIO runtime permission required for Android 10+ AudioPlaybackCapture
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.RECORD_AUDIO}, PERMISSION_REQUEST_AUDIO);
        }

        // Enable HTML5 Fullscreen support in Capacitor WebView
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.setWebChromeClient(new WebChromeClient() {
                    @Override
                    public void onShowCustomView(View view, CustomViewCallback callback) {
                        super.onShowCustomView(view, callback);
                        customView = view;
                        customViewCallback = callback;
                        ScreenSharePlugin.applyImmersiveFullscreen(MainActivity.this, true);
                    }

                    @Override
                    public void onHideCustomView() {
                        super.onHideCustomView();
                        customView = null;
                        if (customViewCallback != null) {
                            customViewCallback.onCustomViewHidden();
                            customViewCallback = null;
                        }
                        ScreenSharePlugin.applyImmersiveFullscreen(MainActivity.this, false);
                    }
                });
            }
        } catch (Exception ignored) {}
    }
}
