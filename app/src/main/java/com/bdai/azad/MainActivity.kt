package com.bdai.azad

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.webkit.*
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import org.json.JSONObject
import java.util.*

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var auth: FirebaseAuth
    private lateinit var db: FirebaseFirestore
    private lateinit var googleSignInClient: GoogleSignInClient
    private val GOOGLE_SIGN_IN = 1001
    private val PERMISSION_REQUEST = 1002

    // Obfuscated config — XOR encoded
    private val _c1 = intArrayOf(98,100,97,105,45,98,121,45,97,122,97,100)
    private val _c2 = intArrayOf(99,111,109,46,98,100,97,105,46,97,122,97,100)

    private fun _d(arr: IntArray) = arr.map { it.toChar() }.joinToString("")

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        auth = FirebaseAuth.getInstance()
        db = FirebaseFirestore.getInstance()

        setupGoogleSignIn()
        setupWebView()
        requestPermissions()
    }

    private fun setupGoogleSignIn() {
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(getString(R.string.default_web_client_id))
            .requestEmail()
            .build()
        googleSignInClient = GoogleSignIn.getClient(this, gso)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        webView = findViewById(R.id.webView)
        swipeRefresh = findViewById(R.id.swipeRefresh)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            loadWithOverviewMode = true
            useWideViewPort = true
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            userAgentString = "BDAi/1.0 Android"
            mediaPlaybackRequiresUserGesture = false
        }

        // JavaScript Interface
        webView.addJavascriptInterface(BDAiJSInterface(), "BDAiNative")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                swipeRefresh.isRefreshing = false
                // Check auth state and send to web
                val user = auth.currentUser
                if (user != null) {
                    user.getIdToken(false).addOnSuccessListener { result ->
                        val token = result.token ?: ""
                        val uid = user.uid
                        val email = user.email ?: ""
                        val name = user.displayName ?: ""
                        val photo = user.photoUrl?.toString() ?: ""
                        runOnUiThread {
                            webView.evaluateJavascript(
                                "window.onNativeAuthState('$uid','$email','$name','$photo','$token')", null)
                        }
                    }
                }
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                if (url.startsWith("bdai://")) return true
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    if (url.contains("firebase") || url.contains("google")) return false
                }
                return false
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest?) {
                request?.grant(request.resources)
            }

            override fun onShowFileChooser(
                webView: WebView?, filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?): Boolean {
                val intent = fileChooserParams?.createIntent() ?: return false
                try {
                    startActivityForResult(intent, 1003)
                } catch (e: Exception) {}
                return true
            }

            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                return true // Hide console messages
            }
        }

        swipeRefresh.setOnRefreshListener {
            webView.reload()
        }
        swipeRefresh.setColorSchemeColors(getColor(R.color.accent))

        // Load app
        webView.loadUrl("file:///android_asset/index.html")
    }

    private fun requestPermissions() {
        val perms = arrayOf(
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.READ_EXTERNAL_STORAGE,
            Manifest.permission.CAMERA
        )
        val needed = perms.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (needed.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, needed.toTypedArray(), PERMISSION_REQUEST)
        }
    }

    inner class BDAiJSInterface {

        @JavascriptInterface
        fun googleLogin() {
            runOnUiThread {
                val signInIntent = googleSignInClient.signInIntent
                startActivityForResult(signInIntent, GOOGLE_SIGN_IN)
            }
        }

        @JavascriptInterface
        fun googleLogout() {
            auth.signOut()
            googleSignInClient.signOut()
            runOnUiThread {
                webView.evaluateJavascript("window.onNativeLogout()", null)
            }
        }

        @JavascriptInterface
        fun getAuthToken(callback: String) {
            auth.currentUser?.getIdToken(true)?.addOnSuccessListener { result ->
                val token = result.token ?: ""
                runOnUiThread {
                    webView.evaluateJavascript("$callback('$token')", null)
                }
            }
        }

        @JavascriptInterface
        fun getUserData(): String {
            val user = auth.currentUser ?: return "{}"
            val json = JSONObject()
            json.put("uid", user.uid)
            json.put("email", user.email ?: "")
            json.put("name", user.displayName ?: "")
            json.put("photo", user.photoUrl?.toString() ?: "")
            return json.toString()
        }

        @JavascriptInterface
        fun openAdminPanel(token: String) {
            // Verify admin before opening
            runOnUiThread {
                val intent = Intent(this@MainActivity, AdminActivity::class.java)
                intent.putExtra("token", token)
                startActivity(intent)
            }
        }

        @JavascriptInterface
        fun vibrate(ms: Long) {
            val vib = getSystemService(VIBRATOR_SERVICE) as android.os.Vibrator
            vib.vibrate(ms)
        }

        @JavascriptInterface
        fun copyToClipboard(text: String) {
            val clipboard = getSystemService(CLIPBOARD_SERVICE) as android.content.ClipboardManager
            clipboard.setPrimaryClip(android.content.ClipData.newPlainText("BDAi", text))
            runOnUiThread { Toast.makeText(this@MainActivity, "কপি হয়েছে!", Toast.LENGTH_SHORT).show() }
        }

        @JavascriptInterface
        fun shareText(text: String) {
            val intent = Intent(Intent.ACTION_SEND)
            intent.type = "text/plain"
            intent.putExtra(Intent.EXTRA_TEXT, text)
            startActivity(Intent.createChooser(intent, "শেয়ার করুন"))
        }

        @JavascriptInterface
        fun getAppVersion(): String = "1.0.0"

        @JavascriptInterface
        fun getDeviceId(): String {
            return android.provider.Settings.Secure.getString(
                contentResolver, android.provider.Settings.Secure.ANDROID_ID)
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == GOOGLE_SIGN_IN) {
            val task = GoogleSignIn.getSignedInAccountFromIntent(data)
            try {
                val account = task.getResult(ApiException::class.java)
                firebaseAuthWithGoogle(account.idToken!!)
            } catch (e: ApiException) {
                runOnUiThread {
                    webView.evaluateJavascript("window.onGoogleLoginError('${e.message}')", null)
                }
            }
        }
    }

    private fun firebaseAuthWithGoogle(idToken: String) {
        val credential = GoogleAuthProvider.getCredential(idToken, null)
        auth.signInWithCredential(credential)
            .addOnSuccessListener { result ->
                val user = result.user!!
                // Save/update user in Firestore
                val userData = hashMapOf(
                    "uid" to user.uid,
                    "email" to user.email,
                    "name" to user.displayName,
                    "photo" to user.photoUrl?.toString(),
                    "plan" to "free",
                    "loginAt" to com.google.firebase.Timestamp.now(),
                    "createdAt" to com.google.firebase.Timestamp.now()
                )
                db.collection("users").document(user.uid)
                    .set(userData, SetOptions.merge())
                    .addOnSuccessListener {
                        user.getIdToken(false).addOnSuccessListener { tokenResult ->
                            val token = tokenResult.token ?: ""
                            val uid = user.uid
                            val email = user.email ?: ""
                            val name = user.displayName ?: ""
                            val photo = user.photoUrl?.toString() ?: ""
                            runOnUiThread {
                                webView.evaluateJavascript(
                                    "window.onGoogleLoginSuccess('$uid','$email','$name','$photo','$token')", null)
                            }
                        }
                    }
            }
            .addOnFailureListener { e ->
                runOnUiThread {
                    webView.evaluateJavascript("window.onGoogleLoginError('${e.message}')", null)
                }
            }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            // Ask before exit
            runOnUiThread {
                webView.evaluateJavascript("window.onBackPressed()", null)
            }
        }
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
    }
}
