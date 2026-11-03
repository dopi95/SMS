package com.example.bluelight_sms_sync

import android.app.job.JobInfo
import android.app.job.JobParameters
import android.app.job.JobScheduler
import android.app.job.JobService
import android.content.ComponentName
import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.os.PowerManager
import android.util.Log
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class SyncJobService : JobService() {
    companion object {
        private const val TAG = "BlueLightJobService"
        const val JOB_ID = 2001

        fun scheduleNetworkSync(context: Context) {
            try {
                val componentName = ComponentName(context, SyncJobService::class.java)
                val builder = JobInfo.Builder(JOB_ID, componentName)
                    .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                    .setPersisted(true)

                val scheduler = context.getSystemService(Context.JOB_SCHEDULER_SERVICE) as? JobScheduler
                scheduler?.schedule(builder.build())
                Log.d(TAG, "Scheduled SyncJobService for network availability.")
            } catch (e: Exception) {
                Log.e(TAG, "Error scheduling job: ${e.message}")
            }
        }
    }

    override fun onStartJob(params: JobParameters?): Boolean {
        Log.d(TAG, "SyncJobService: Network connected! Flushing pending SMS queue...")
        SyncManager.syncPending(applicationContext) { synced, remaining ->
            Log.d(TAG, "SyncJobService finished: synced=$synced, remaining=$remaining")
            jobFinished(params, remaining > 0)
        }
        return true
    }

    override fun onStopJob(params: JobParameters?): Boolean {
        return true // Reschedule if aborted
    }
}

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

            val db = SmsDbHelper.getInstance(context)
            val pendingList = db.getPendingSms()

            if (pendingList.isEmpty()) {
                Log.d(TAG, "No pending SMS to sync.")
                onComplete?.invoke(0, 0)
                return@execute
            }

            if (!isOnline(context)) {
                Log.d(TAG, "Device is offline. Scheduling system job for network reconnection...")
                SyncJobService.scheduleNetworkSync(context)
                onComplete?.invoke(0, pendingList.size)
                return@execute
            }

            var wakeLock: PowerManager.WakeLock? = null
            isSyncing = true
            var successCount = 0

            try {
                val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
                wakeLock = powerManager?.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "BlueLightSync:UploadWakeLock")
                wakeLock?.acquire(60000) // Keep CPU awake during upload

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
                            // Generous timeouts for Render cold-starts (up to 50s)
                            connectTimeout = 50000
                            readTimeout = 50000
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
                            // 200..299: recorded. 422: already processed/ignored non-school account
                            db.markSynced(item.id, code)
                            successCount++
                        } else {
                            db.markFailed(item.id, code)
                            Log.w(TAG, "Failed response code $code for SMS #${item.id}")
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Error syncing SMS #${item.id}: ${e.message}")
                        if (!isOnline(context)) {
                            Log.w(TAG, "Lost internet connection mid-sync. Pausing queue.")
                            SyncJobService.scheduleNetworkSync(context)
                            break
                        }
                    }
                }
            } finally {
                isSyncing = false
                try {
                    if (wakeLock?.isHeld == true) wakeLock.release()
                } catch (_: Exception) {}

                val remaining = db.getPendingSms().size
                Log.d(TAG, "Sync complete. Synced: $successCount, Remaining: $remaining")
                if (remaining > 0) {
                    SyncJobService.scheduleNetworkSync(context)
                }
                onComplete?.invoke(successCount, remaining)
            }
        }
    }
}
