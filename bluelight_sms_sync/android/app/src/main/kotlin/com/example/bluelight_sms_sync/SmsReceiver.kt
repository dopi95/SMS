package com.example.bluelight_sms_sync

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log

class SmsReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "BlueLightSmsReceiver"

        fun isBankMessage(body: String, sender: String): Boolean {
            val text = body.lowercase()
            val from = sender.lowercase()

            if (from.contains("cbe") || from.contains("awash") || from.contains("127") || from.contains("telebirr")) {
                return true
            }

            return text.contains("credited with") ||
                    text.contains("credited") ||
                    text.contains("etb") ||
                    text.contains("birr") ||
                    text.contains("received etb") ||
                    text.contains("banking with cbe") ||
                    text.contains("awash bank") ||
                    text.contains("cbebirr")
        }
    }

    override fun onReceive(context: Context, intent: Intent?) {
        if (intent == null || intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        try {
            val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
            if (messages.isNullOrEmpty()) return

            val sender = messages[0]?.displayOriginatingAddress ?: messages[0]?.originatingAddress ?: "Unknown"
            val sb = StringBuilder()
            var timestamp = System.currentTimeMillis()

            for (msg in messages) {
                if (msg != null) {
                    sb.append(msg.displayMessageBody ?: msg.messageBody ?: "")
                    if (msg.timestampMillis > 0) {
                        timestamp = msg.timestampMillis
                    }
                }
            }

            val fullBody = sb.toString().trim()
            if (fullBody.isEmpty()) return

            Log.d(TAG, "Incoming SMS from $sender: ${fullBody.take(60)}...")

            // Filter bank messages
            if (isBankMessage(fullBody, sender)) {
                Log.d(TAG, "Identified as bank transaction SMS! Saving to database...")
                val db = SmsDbHelper.getInstance(context)
                val id = db.insertSms(sender, fullBody, timestamp)
                Log.d(TAG, "Saved SMS #$id as PENDING. Triggering background sync...")

                // Immediately attempt sync (if online, sent in ~1s; if offline, held in DB)
                SyncManager.syncPending(context)
            } else {
                Log.d(TAG, "Ignoring non-bank message.")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error processing incoming SMS: ${e.message}", e)
        }
    }
}

