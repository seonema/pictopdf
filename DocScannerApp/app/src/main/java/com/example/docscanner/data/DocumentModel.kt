package com.example.docscanner.data

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.Calendar
import java.util.UUID

enum class FilterType {
    ORIGINAL,
    PHOTOCOPY,
    COLOR_SCAN,
    BW_PRINTER
}

data class DocumentModel(
    val id: String = UUID.randomUUID().toString(),
    val title: String,
    val imagePath: String,
    val pdfPath: String? = null,
    val dateShamsi: String,
    val filterApplied: FilterType = FilterType.PHOTOCOPY,
    val timestamp: Long = System.currentTimeMillis(),
    val fileSizeBytes: Long = 0L
) {
    fun formattedSize(): String {
        return when {
            fileSizeBytes >= 1024 * 1024 -> String.format("%.1f مگابایت", fileSizeBytes / (1024.0 * 1024.0))
            fileSizeBytes >= 1024 -> String.format("%d کیلوبایت", fileSizeBytes / 1024)
            else -> "$fileSizeBytes بایت"
        }
    }

    fun toJsonObject(): JSONObject {
        return JSONObject().apply {
            put("id", id)
            put("title", title)
            put("imagePath", imagePath)
            put("pdfPath", pdfPath ?: "")
            put("dateShamsi", dateShamsi)
            put("filterApplied", filterApplied.name)
            put("timestamp", timestamp)
            put("fileSizeBytes", fileSizeBytes)
        }
    }

    companion object {
        fun fromJsonObject(obj: JSONObject): DocumentModel {
            val pdf = obj.optString("pdfPath", "")
            return DocumentModel(
                id = obj.getString("id"),
                title = obj.getString("title"),
                imagePath = obj.getString("imagePath"),
                pdfPath = if (pdf.isNotEmpty()) pdf else null,
                dateShamsi = obj.getString("dateShamsi"),
                filterApplied = try {
                    FilterType.valueOf(obj.getString("filterApplied"))
                } catch (e: Exception) {
                    FilterType.PHOTOCOPY
                },
                timestamp = obj.optLong("timestamp", System.currentTimeMillis()),
                fileSizeBytes = obj.optLong("fileSizeBytes", 0L)
            )
        }
    }
}

/**
 * Lightweight local repository for persisting scanned document records
 */
class DocumentRepository(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("doc_scanner_records", Context.MODE_PRIVATE)

    fun getAllDocuments(): List<DocumentModel> {
        val json = prefs.getString("documents_list", "[]") ?: "[]"
        val list = mutableListOf<DocumentModel>()
        try {
            val arr = JSONArray(json)
            for (i in 0 until arr.length()) {
                list.add(DocumentModel.fromJsonObject(arr.getJSONObject(i)))
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return list.sortedByDescending { it.timestamp }
    }

    fun saveDocument(doc: DocumentModel) {
        val current = getAllDocuments().toMutableList()
        current.removeAll { it.id == doc.id }
        current.add(0, doc)
        persist(current)
    }

    fun deleteDocument(docId: String) {
        val current = getAllDocuments().toMutableList()
        val item = current.find { it.id == docId }
        item?.let {
            try {
                File(it.imagePath).delete()
                it.pdfPath?.let { p -> File(p).delete() }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        current.removeAll { it.id == docId }
        persist(current)
    }

    private fun persist(list: List<DocumentModel>) {
        val arr = JSONArray()
        list.forEach { arr.put(it.toJsonObject()) }
        prefs.edit().putString("documents_list", arr.toString()).apply()
    }
}

/**
 * Ultra-lightweight Persian (Solar Hijri / Shamsi) calendar converter
 * Zero external libraries required.
 */
object ShamsiDateHelper {
    fun getCurrentShamsiDate(): String {
        val cal = Calendar.getInstance()
        val gYear = cal.get(Calendar.YEAR)
        val gMonth = cal.get(Calendar.MONTH) + 1
        val gDay = cal.get(Calendar.DAY_OF_MONTH)

        val shamsi = gregorianToShamsi(gYear, gMonth, gDay)
        val monthNames = arrayOf(
            "فروردین", "اردیبهشت", "خرداد",
            "تیر", "مرداد", "شهریور",
            "مهر", "آبان", "آذر",
            "دی", "بهمن", "اسفند"
        )
        val mName = if (shamsi[1] in 1..12) monthNames[shamsi[1] - 1] else ""
        return "${shamsi[2]} $mName ${shamsi[0]}"
    }

    private fun gregorianToShamsi(gYear: Int, gMonth: Int, gDay: Int): IntArray {
        val gDaysInMonth = intArrayOf(31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)
        val jDaysInMonth = intArrayOf(31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29)

        var gy = gYear - 1600
        var gm = gMonth - 1
        var gd = gDay - 1

        var gDayNo = 365 * gy + ((gy + 3) / 4) - ((gy + 99) / 100) + ((gy + 399) / 400)
        for (i in 0 until gm) {
            gDayNo += gDaysInMonth[i]
        }
        if (gm > 1 && ((gy % 4 == 0 && gy % 100 != 0) || (gy % 400 == 0))) {
            gDayNo++
        }
        gDayNo += gd

        var jDayNo = gDayNo - 79
        val jNp = jDayNo / 12053
        jDayNo %= 12053

        var jy = 979 + 33 * jNp + 4 * (jDayNo / 1461)
        jDayNo %= 1461

        if (jDayNo >= 366) {
            jy += (jDayNo - 1) / 365
            jDayNo = (jDayNo - 1) % 365
        }

        var jm = 0
        for (i in 0..11) {
            if (jDayNo < jDaysInMonth[i]) {
                jm = i
                break
            }
            jDayNo -= jDaysInMonth[i]
        }
        val jd = jDayNo + 1
        return intArrayOf(jy, jm + 1, jd)
    }
}
