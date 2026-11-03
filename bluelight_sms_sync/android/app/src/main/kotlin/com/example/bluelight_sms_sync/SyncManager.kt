package com.example.bluelight_sms_sync

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.util.Log
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

object SyncManager {
    private const val TAG = "BlueLightSync"
    private const val DEFAULT_WEBHOOK_URL = "https://sms-fyvf.onrender.com/api/bank-transactions/webhook"
    private const val DEFAULT_SECRET = "bluelight_sec_5jtxt3kwwdmvyxl5ut"

    private val executor = Executors.newSingleThreadExecutor()
    @Volatile
    private var isSyncing = false

    fun getWebhookUrl(context: Context): String {
        val prefs = context.getSharedPreferences("bluelight_prefs", Context.MODE_PRIVATE)
        return prefs.getString("webhook_url", DEFAULT_WEBHOOK_URL) ?: DEFAULT_WEBHOOK_URL
    }

    fun getSecret(context: Context): String {
        val prefs = context.getSharedPreferences("bluelight_prefs", Context.MODE_PRIVATE)
        return prefs.getString("webhook_secret", DEFAULT_SECRET) ?: DEFAULT_SECRET
    }

    fun saveConfig(context: Context, url: String, secret: String) {
        val prefs = context.getSharedPreferences("bluelight_prefs", Context.MODE_PRIVATE)
        prefs.edit()
            .putString("webhook_url", url.trim())
            .putString("webhook_secret", secret.trim())
            .apply()
    }

    fun isOnline(context: Context): Boolean {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return false
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val net = cm.activeNetwork ?: return false
            val caps = cm.getNetworkCapabilities(net) ?: return false
            caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        } else {
            @Suppress("DEPRECATION")
            val info = cm.activeNetworkInfo
            @Suppress("DEPRECATION")
            info != null && info.isConnected
        }
    }

    fun syncPending(context: Context, onComplete: ((syncedCount: Int, pendingRemaining: Int) -> Unit)? = null) {
        executor.execute {
            if (isSyncing) {
                Log.d(TAG, "Sync already in progress, skipping duplicate call.")
                return@execute
            }
            if (!isOnline(context)) {
                Log.d(TAG, "Device is offline. Pending messages will remain in database.")
                val db = SmsDbHelper.getInstance(context)
                onComplete?.invoke(0, db.getPendingSms().size)
                return@execute
            }

            isSyncing = true
            val db = SmsDbHelper.getInstance(context)
            var successCount = 0

            try {
                val pendingList = db.getPendingSms()
                Log.d(TAG, "Starting sync for ${pendingList.size} pending SMS messages...")

                val targetUrl = getWebhookUrl(context)
                val secret = getSecret(context)

                for (item in pendingList) {
                    try {
                        val fullUrl = if (targetUrl.contains("?")) {
                            "$targetUrl&secret=$secret"
                        } else {
                            "$targetUrl?secret=$secret"
                        }

                        val url = URL(fullUrl)
                        val conn = (url.openConnection() as HttpURLConnection).apply {
                            requestMethod = "POST"
                            setRequestProperty("Content-Type", "application/json; charset=UTF-8")
                            setRequestProperty("x-api-key", secret)
                            connectTimeout = 15000
                            readTimeout = 25000
                            doOutput = true
                        }

                        val payload = JSONObject().apply {
                            put("message", item.message)
                            put("from", item.sender)
                            put("timestamp", item.receivedAt)
                        }

                        OutputStreamWriter(conn.outputStream, "UTF-8").use { writer ->
                            writer.write(payload.toString())
                            writer.flush()
                        }

                        val code = conn.responseCode
                        Log.d(TAG, "Sent SMS #${item.id} -> HTTP $code")

                        if (code in 200..299 || code == 422) {
                            // 200..299: successfully processed. 422: already processed / non-bank SMS accepted by controller
                            db.markSynced(item.id, code)
                            successCount++
                        } else {
                            db.markFailed(item.id, code)
                            Log.w(TAG, "Failed response code $code for SMS #${item.id}")
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Error syncing SMS #${item.id}: ${e.message}")
                        db.markFailed(item.id, -1)
                        // Break if full network failure
                        if (!isOnline(context)) {
                            Log.w(TAG, "Lost internet connection mid-sync. Pausing queue.")
                            break
                        }
                    }
                }
            } finally {
                isSyncing = false
                val remaining = db.getPendingSms().size
                Log.d(TAG, "Sync complete. Synced: $successCount, Remaining: $remaining")
                onComplete?.invoke(successCount, remaining)
            }
        }
    }
}

