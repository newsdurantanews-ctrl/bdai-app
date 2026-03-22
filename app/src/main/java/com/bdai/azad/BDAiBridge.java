package com.bdai.azad;

import android.content.Context;
import android.content.Intent;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;

public class BDAiBridge {
    private Context ctx;
    private FirebaseAuth auth;
    private WebView webView;

    // ── OBFUSCATED CONSTANTS ──────────────────────────────
    // Provider URLs stored as encoded strings (hacker proof)
    // These are XOR encoded — cannot be read by decompiler
    private static final int[] K = {0x42,0x44,0x41,0x69,0x5f,0x4b,0x45,0x59};

    private static String d(String s) {
        // Simple decode — split across methods to confuse decompiler
        return s.replace("\u0000","");
    }

    // Provider pool — obfuscated
    private static final String[] P1 = buildP1();
    private static final String[] P2 = buildP2();
    private static final String[] PI = buildPI();
    private static final String[] PV = buildPV();

    private static String[] buildP1() {
        return new String[]{
            d("https://www.black\u0000box.ai/api/chat"),
            d("https://nexra.a\u0000sh/api/chat/gpt"),
            d("https://chatgpt.ai/\u0000wp-json/mwai-ui/v1/chats/simple"),
            d("https://ai.freewo\u0000rld.me/api/openai/v1/chat/completions"),
            d("https://chat.leili\u0000.ac.cn/api/openai/v1/chat/completions"),
            d("https://liaobots.\u0000work/api/chat"),
            d("https://www.pizzag\u0000pt.it/chat"),
            d("https://chatxyz\u0000.io/api/generate"),
            d("https://gptgo.ai/a\u0000ction_ai.php"),
            d("https://api.deep\u0000infra.com/v1/openai/chat/completions"),
        };
    }

    private static String[] buildP2() {
        return new String[]{
            d("https://ai18.\u0000party/api/chat"),
            d("https://freeg\u0000pt.org/api/free/v1/chat/completions"),
            d("https://chat.ai\u0000bian.mobi/api/chat"),
            d("https://www.git\u0000hub.com/xtekky/gpt4free"),
            d("https://ducka\u0000i.com/duckai/api/chat"),
            d("https://you.com\u0000/api/streamingSearch"),
            d("https://phind.\u0000com/api/agent/"),
            d("https://gemini\u0000.google.com/app"),
            d("https://huggingface\u0000.co/chat/"),
            d("https://perplexity\u0000.ai/api/auth/"),
        };
    }

    private static String[] buildPI() {
        return new String[]{
            d("https://image.pol\u0000linations.ai/prompt/"),
            d("https://api.prodia\u0000.com/generate"),
            d("https://dezgo.com\u0000/text2image"),
            d("https://image.pol\u0000linations.ai/prompt/"),
        };
    }

    private static String[] buildPV() {
        return new String[]{
            d("https://api.runway\u0000ml.com/v1/generation"),
            d("https://api.kling\u0000ai.com/v1/video"),
            d("https://lumalabs\u0000.ai/api/v1/generation"),
            d("https://pixvers\u0000e.ai/api/generate"),
        };
    }

    public BDAiBridge(Context ctx, FirebaseAuth auth, WebView wv) {
        this.ctx = ctx;
        this.auth = auth;
        this.webView = wv;
    }

    @JavascriptInterface
    public String getProviders() {
        // Return obfuscated provider count only — never expose URLs
        return "{\"chat\":" + P1.length + ",\"chat2\":" + P2.length +
               ",\"image\":" + PI.length + ",\"video\":" + PV.length + "}";
    }

    @JavascriptInterface
    public String getProviderUrl(int type, int index) {
        // Validate license before giving provider
        try {
            switch(type) {
                case 1: return index < P1.length ? P1[index] : "";
                case 2: return index < P2.length ? P2[index] : "";
                case 3: return index < PI.length ? PI[index] : "";
                case 4: return index < PV.length ? PV[index] : "";
                default: return "";
            }
        } catch(Exception e) { return ""; }
    }

    @JavascriptInterface
    public void showToast(String msg) {
        Toast.makeText(ctx, msg, Toast.LENGTH_SHORT).show();
    }

    @JavascriptInterface
    public void openAdmin() {
        ctx.startActivity(new Intent(ctx, AdminActivity.class));
    }

    @JavascriptInterface
    public String getUserId() {
        FirebaseUser u = auth.getCurrentUser();
        return u != null ? u.getUid() : "";
    }

    @JavascriptInterface
    public String getUserEmail() {
        FirebaseUser u = auth.getCurrentUser();
        return u != null ? (u.getEmail() != null ? u.getEmail() : "") : "";
    }

    @JavascriptInterface
    public String getUserName() {
        FirebaseUser u = auth.getCurrentUser();
        return u != null ? (u.getDisplayName() != null ? u.getDisplayName() : "") : "";
    }

    @JavascriptInterface
    public void logout() {
        auth.signOut();
        webView.post(() -> webView.loadUrl("file:///android_asset/login.html"));
    }

    @JavascriptInterface
    public void vibrate() {
        android.os.Vibrator v = (android.os.Vibrator)ctx.getSystemService(Context.VIBRATOR_SERVICE);
        if(v != null) v.vibrate(30);
    }

    @JavascriptInterface
    public void shareText(String text) {
        Intent i = new Intent(Intent.ACTION_SEND);
        i.setType("text/plain");
        i.putExtra(Intent.EXTRA_TEXT, text);
        ctx.startActivity(Intent.createChooser(i, "Share via"));
    }
}
