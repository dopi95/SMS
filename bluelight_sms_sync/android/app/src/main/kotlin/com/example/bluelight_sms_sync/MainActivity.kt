package com.example.bluelight_sms_sync

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.Network
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.util.concurrent.Executors

class MainActivity : FlutterActivity() {
    companion object {
        private const val TAG = "BlueLightMainActivity"
        private const val CHANNEL = "com.bluelight.sms_sync/channel"
        private const val PERMISSION_REQUEST_CODE = 1001
    }

    private var networkCallback: ConnectivityManager.NetworkCallback? = null

    private val autoRetryHandler = android.os.Handler(android.os.Looper.getMainLooper())
    private val autoRetryRunnable = object : Runnable {
        override fun run() {
            try {
                val db = SmsDbHelper.getInstance(applicationContext)
                val unsynced = db.getUnsyncedSms().size
                if (unsynced > 0) {
                    Log.d(TAG, "Auto-retry loop: $unsynced unsynced SMS found, retrying automatically...")
                    SyncManager.syncPending(applicationContext)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error in auto-retry loop: ${e.message}")
            }
            autoRetryHandler.postDelayed(this, 15000)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        registerNetworkCallback()
        autoRetryHandler.postDelayed(autoRetryRunnable, 5000)
    }

    private fun registerNetworkCallback() {
        try {
            val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return
            networkCallback = object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    super.onAvailable(network)
                    Log.d(TAG, "Network became available! Triggering sync...")
                    SyncManager.syncPending(applicationContext)
                }
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                cm.registerDefaultNetworkCallback(networkCallback!!)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error registering network callback: ${e.message}")
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        try {
            val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            networkCallback?.let { cm?.unregisterNetworkCallback(it) }
            autoRetryHandler.removeCallbacks(autoRetryRunnable)
        } catch (_: Exception) {}
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "getStats" -> {
                    val db = SmsDbHelper.getInstance(this)
                    val stats = db.getStats().toMutableMap()
                    result.success(stats)
                }

                "getRecords" -> {
                    val db = SmsDbHelper.getInstance(this)
                    val records = db.getAllRecords(50).map { item ->
                        mapOf(
                            "id" to item.id,
                            "sender" to item.sender,
                            "message" to item.message,
                            "receivedAt" to item.receivedAt,
                            "status" to item.status,
                            "responseCode" to item.responseCode,
                            "syncedAt" to item.syncedAt,
                            "error" to item.errorMsg
                        )
                    }
                    result.success(records)
                }

                "triggerSync" -> {
                    SyncManager.syncPending(this) { synced, remaining, lastError ->
                        runOnUiThread {
                            result.success(
                                mapOf(
                                    "synced" to synced,
                                    "remaining" to remaining,
                                    "error" to (lastError ?: "")
                                )
                            )
                        }
                    }
                }

                "retrySync" -> {
                    val id = (call.argument<Number>("id"))?.toLong() ?: -1L
                    if (id > 0) {
                        val db = SmsDbHelper.getInstance(this)
                        db.markPending(id)
                        SyncManager.syncPending(this) { synced, remaining, lastError ->
                            runOnUiThread {
                                result.success(
                                    mapOf(
                                        "synced" to synced,
                                        "remaining" to remaining,
                                        "error" to (lastError ?: "")
                                    )
                                )
                            }
                        }
                    } else {
                        result.error("INVALID_ID", "Invalid record ID", null)
                    }
                }

                "sendTestSms" -> {
                    val db = SmsDbHelper.getInstance(this)
                    val testSender = "CBE"
                    val refNum = (100000..999999).random()
                    val testBody = "Dear Customer, your account 1000771610858 has been credited with ETB 25.00 on ${System.currentTimeMillis()}. Ref: TEST$refNum. Thank you for banking with CBE."
                    val id = db.insertSms(testSender, testBody, System.currentTimeMillis(), "PENDING")
                    Log.d(TAG, "Created mock CBE SMS #$id for testing. Triggering sync...")
                    SyncManager.syncPending(this) { synced, remaining, lastError ->
                        runOnUiThread {
                            result.success(
                                mapOf(
                                    "id" to id,
                                    "synced" to synced,
                                    "remaining" to remaining,
                                    "error" to (lastError ?: "")
                                )
                            )
                        }
                    }
                }

                "scanInbox" -> {
                    Executors.newSingleThreadExecutor().execute {
                        try {
                            val db = SmsDbHelper.getInstance(this)
                            val inboxUri = Uri.parse("content://sms/inbox")
                            val projection = arrayOf("address", "body", "date")
                            val cursor = contentResolver.query(inboxUri, projection, null, null, "date DESC LIMIT 50")

                            var importedBank = 0
                            var importedOther = 0

                            cursor?.use {
                                while (it.moveToNext()) {
                                    val address = it.getString(it.getColumnIndexOrThrow("address")) ?: "Unknown"
                                    val body = it.getString(it.getColumnIndexOrThrow("body")) ?: ""
                                    val date = it.getLong(it.getColumnIndexOrThrow("date"))

                                    if (body.isNotEmpty() && !db.messageExists(body, date)) {
                                        val isBank = SmsReceiver.isBankMessage(body, address)
                                        val status = if (isBank) "PENDING" else "NON_BANK"
                                        db.insertSms(address, body, date, status)
                                        if (isBank) importedBank++ else importedOther++
                                    }
                                }
                            }

                            if (importedBank > 0) {
                                SyncManager.syncPending(this)
                            }

                            runOnUiThread {
                                result.success(mapOf("bank" to importedBank, "other" to importedOther))
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "Error scanning inbox: ${e.message}", e)
                            runOnUiThread {
                                result.error("SCAN_ERROR", e.message, null)
                            }
                        }
                    }
                }

                "getConfig" -> {
                    result.success(
                        mapOf(
                            "url" to SyncManager.getWebhookUrl(this),
                            "secret" to SyncManager.getSecret(this)
                        )
                    )
                }

                "saveConfig" -> {
                    val url = call.argument<String>("url") ?: ""
                    val secret = call.argument<String>("secret") ?: ""
                    SyncManager.saveConfig(this, url, secret)
                    result.success(true)
                }

                "hasPermissions" -> {
                    val hasReceive = ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED
                    val hasRead = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED
                    result.success(hasReceive && hasRead)
                }

                "requestPermissions" -> {
                    val perms = mutableListOf(
                        Manifest.permission.RECEIVE_SMS,
                        Manifest.permission.READ_SMS
                    )
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        perms.add(Manifest.permission.POST_NOTIFICATIONS)
                    }
                    ActivityCompat.requestPermissions(this, perms.toTypedArray(), PERMISSION_REQUEST_CODE)
                    result.success(true)
                }

                else -> result.notImplemented()
            }
        }
    }
}
