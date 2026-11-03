package com.example.bluelight_sms_sync

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.util.Log

class NetworkReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "BlueLightNetReceiver"
    }

    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action == ConnectivityManager.CONNECTIVITY_ACTION) {
            Log.d(TAG, "Network connection change detected! Triggering pending sync...")
            SyncManager.syncPending(context)
        }
    }
}
