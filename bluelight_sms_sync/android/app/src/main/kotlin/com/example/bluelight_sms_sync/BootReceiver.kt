package com.example.bluelight_sms_sync

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "BlueLightBootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent?) {
        val action = intent?.action ?: return
        Log.d(TAG, "Device event received: $action. Triggering pending SMS sync...")

        // Trigger sync of any pending offline messages
        SyncManager.syncPending(context)
    }
}

