package com.example.bluelight_sms_sync

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

data class SmsItem(
    val id: Long,
    val sender: String,
    val message: String,
    val receivedAt: Long,
    val status: String, // PENDING, SYNCED, FAILED
    val responseCode: Int,
    val syncedAt: Long
)

class SmsDbHelper(context: Context) : SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {

    companion object {
        const val DATABASE_NAME = "bluelight_sms_sync.db"
        const val DATABASE_VERSION = 1

        const val TABLE_NAME = "sms_records"
        const val COL_ID = "id"
        const val COL_SENDER = "sender"
        const val COL_MESSAGE = "message"
        const val COL_RECEIVED_AT = "received_at"
        const val COL_STATUS = "status"
        const val COL_RESPONSE_CODE = "response_code"
        const val COL_SYNCED_AT = "synced_at"

        @Volatile
        private var instance: SmsDbHelper? = null

        fun getInstance(context: Context): SmsDbHelper {
            return instance ?: synchronized(this) {
                instance ?: SmsDbHelper(context.applicationContext).also { instance = it }
            }
        }
    }

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("""
            CREATE TABLE $TABLE_NAME (
                $COL_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                $COL_SENDER TEXT,
                $COL_MESSAGE TEXT,
                $COL_RECEIVED_AT INTEGER,
                $COL_STATUS TEXT,
                $COL_RESPONSE_CODE INTEGER,
                $COL_SYNCED_AT INTEGER
            )
        """.trimIndent())
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        db.execSQL("DROP TABLE IF EXISTS $TABLE_NAME")
        onCreate(db)
    }

    fun insertSms(sender: String, message: String, receivedAt: Long = System.currentTimeMillis()): Long {
        val db = writableDatabase
        val cv = ContentValues().apply {
            put(COL_SENDER, sender)
            put(COL_MESSAGE, message)
            put(COL_RECEIVED_AT, receivedAt)
            put(COL_STATUS, "PENDING")
            put(COL_RESPONSE_CODE, 0)
            put(COL_SYNCED_AT, 0)
        }
        return db.insert(TABLE_NAME, null, cv)
    }

    fun getPendingSms(): List<SmsItem> {
        val list = mutableListOf<SmsItem>()
        val db = readableDatabase
        val cursor = db.query(
            TABLE_NAME,
            null,
            "$COL_STATUS = ?",
            arrayOf("PENDING"),
            null,
            null,
            "$COL_RECEIVED_AT ASC"
        )
        cursor.use {
            while (it.moveToNext()) {
                list.add(
                    SmsItem(
                        id = it.getLong(it.getColumnIndexOrThrow(COL_ID)),
                        sender = it.getString(it.getColumnIndexOrThrow(COL_SENDER)) ?: "",
                        message = it.getString(it.getColumnIndexOrThrow(COL_MESSAGE)) ?: "",
                        receivedAt = it.getLong(it.getColumnIndexOrThrow(COL_RECEIVED_AT)),
                        status = it.getString(it.getColumnIndexOrThrow(COL_STATUS)) ?: "PENDING",
                        responseCode = it.getInt(it.getColumnIndexOrThrow(COL_RESPONSE_CODE)),
                        syncedAt = it.getLong(it.getColumnIndexOrThrow(COL_SYNCED_AT))
                    )
                )
            }
        }
        return list
    }

    fun markSynced(id: Long, responseCode: Int) {
        val db = writableDatabase
        val cv = ContentValues().apply {
            put(COL_STATUS, "SYNCED")
            put(COL_RESPONSE_CODE, responseCode)
            put(COL_SYNCED_AT, System.currentTimeMillis())
        }
        db.update(TABLE_NAME, cv, "$COL_ID = ?", arrayOf(id.toString()))
    }

    fun markFailed(id: Long, responseCode: Int) {
        val db = writableDatabase
        val cv = ContentValues().apply {
            put(COL_STATUS, "FAILED")
            put(COL_RESPONSE_CODE, responseCode)
        }
        db.update(TABLE_NAME, cv, "$COL_ID = ?", arrayOf(id.toString()))
    }

    fun getAllRecords(limit: Int = 50): List<SmsItem> {
        val list = mutableListOf<SmsItem>()
        val db = readableDatabase
        val cursor = db.query(
            TABLE_NAME,
            null,
            null,
            null,
            null,
            null,
            "$COL_RECEIVED_AT DESC",
            limit.toString()
        )
        cursor.use {
            while (it.moveToNext()) {
                list.add(
                    SmsItem(
                        id = it.getLong(it.getColumnIndexOrThrow(COL_ID)),
                        sender = it.getString(it.getColumnIndexOrThrow(COL_SENDER)) ?: "",
                        message = it.getString(it.getColumnIndexOrThrow(COL_MESSAGE)) ?: "",
                        receivedAt = it.getLong(it.getColumnIndexOrThrow(COL_RECEIVED_AT)),
                        status = it.getString(it.getColumnIndexOrThrow(COL_STATUS)) ?: "PENDING",
                        responseCode = it.getInt(it.getColumnIndexOrThrow(COL_RESPONSE_CODE)),
                        syncedAt = it.getLong(it.getColumnIndexOrThrow(COL_SYNCED_AT))
                    )
                )
            }
        }
        return list
    }

    fun getStats(): Map<String, Any> {
        val db = readableDatabase
        var total = 0
        var synced = 0
        var pending = 0

        val cTotal = db.rawQuery("SELECT COUNT(*) FROM $TABLE_NAME", null)
        cTotal.use { if (it.moveToFirst()) total = it.getInt(0) }

        val cSynced = db.rawQuery("SELECT COUNT(*) FROM $TABLE_NAME WHERE $COL_STATUS = 'SYNCED'", null)
        cSynced.use { if (it.moveToFirst()) synced = it.getInt(0) }

        val cPending = db.rawQuery("SELECT COUNT(*) FROM $TABLE_NAME WHERE $COL_STATUS = 'PENDING'", null)
        cPending.use { if (it.moveToFirst()) pending = it.getInt(0) }

        return mapOf(
            "total" to total,
            "synced" to synced,
            "pending" to pending
        )
    }
}

