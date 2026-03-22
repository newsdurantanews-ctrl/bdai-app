package com.bdai.azad

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.*
import androidx.appcompat.app.AppCompatActivity
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore

class AdminActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var auth: FirebaseAuth
    private lateinit var db: FirebaseFirestore

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        auth = FirebaseAuth.getInstance()
        db = FirebaseFirestore.getInstance()

        // Verify admin role first
        val uid = auth.currentUser?.uid ?: run { finish(); return }

        db.collection("users").document(uid).get()
            .addOnSuccessListener { doc ->
                val role = doc.getString("role") ?: "user"
                if (role !in listOf("admin", "super_admin", "distributor")) {
                    finish()
                    return@addOnSuccessListener
                }
                setupAdminWebView(role)
            }
            .addOnFailureListener { finish() }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupAdminWebView(role: String) {
        webView = WebView(this)
        setContentView(webView)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
        }

        webView.addJavascriptInterface(AdminJSInterface(), "AdminNative")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                val user = auth.currentUser ?: return
                webView.evaluateJavascript(
                    "window.initAdmin('$role','${user.uid}','${user.email}')", null)
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage?) = true
        }

        webView.loadUrl("file:///android_asset/admin.html")
    }

    inner class AdminJSInterface {
        @JavascriptInterface
        fun goBack() = runOnUiThread { finish() }

        @JavascriptInterface
        fun getUserRole(): String {
            val uid = auth.currentUser?.uid ?: return "user"
            var role = "user"
            db.collection("users").document(uid).get()
                .addOnSuccessListener { role = it.getString("role") ?: "user" }
            return role
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else finish()
    }
}
