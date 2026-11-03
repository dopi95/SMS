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
            if (SyncManager.isOnline(context)) {
                Log.d(TAG, "Network connection restored! Triggering auto-sync for any pending offline SMS...")
                SyncManager.syncPending(context)
            }
        }
    }
}

