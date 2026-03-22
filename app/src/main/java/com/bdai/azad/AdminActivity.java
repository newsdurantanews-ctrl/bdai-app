package com.bdai.azad;

import android.annotation.SuppressLint;
import android.os.Bundle;
import android.webkit.*;
import androidx.appcompat.app.AppCompatActivity;
import com.google.firebase.auth.FirebaseAuth;

@SuppressLint("SetJavaScriptEnabled")
public class AdminActivity extends AppCompatActivity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_admin);

        webView = findViewById(R.id.adminWebView);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);

        webView.addJavascriptInterface(
            new BDAiBridge(this, FirebaseAuth.getInstance(), webView), "BDAiNative"
        );

        webView.setWebViewClient(new WebViewClient());
        webView.loadUrl("file:///android_asset/admin.html");
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
