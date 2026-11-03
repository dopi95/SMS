package com.example.bluelight_sms_sync

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    companion object {
        private const val CHANNEL = "com.bluelight.sms_sync/channel"
        private const val PERMISSION_REQUEST_CODE = 1001
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "getStats" -> {
                    val db = SmsDbHelper.getInstance(this)
                    val stats = db.getStats().toMutableMap()
                    stats["online"] = SyncManager.isOnline(this)
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
                            "syncedAt" to item.syncedAt
                        )
                    }
                    result.success(records)
                }

                "triggerSync" -> {
                    SyncManager.syncPending(this) { synced, remaining ->
                        runOnUiThread {
                            result.success(mapOf("synced" to synced, "remaining" to remaining))
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
                    val hasSms = ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED
                    result.success(hasSms)
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
