import { NextRequest, NextResponse } from "next/server"

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL ?? "https://hargai.site"

export const dynamic = "force-dynamic"
export const revalidate = 0

const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
}

function normalizeConfidence(value: unknown): number {
  const n = Number(value)
  if (Number.isNaN(n)) return 0
  return n > 1 ? n / 100 : n
}

function emptySummary() {
  return {
    total_audits: 0,
    total_objects: 0,
    average_confidence: 0,
    category_distribution: [],
    daily_trend: [],
  }
}

function buildSummary(audits: any[]) {
  if (!Array.isArray(audits) || audits.length === 0) return emptySummary()

  const categoryMap = new Map<string, number>()
  const dailyMap = new Map<string, number>()
  let totalObjects = 0
  let confidenceSum = 0
  let confidenceCount = 0

  for (const audit of audits) {
    // ─── total_detections ───────────────────────────────────────────────────
    // Backend Python mengirim field "total_detections" sebagai integer.
    // Ambil dengan semua kemungkinan nama field.
    const td =
      audit.total_detections ??
      audit.totalDetections ??
      audit.total_objects ??
      audit.objectCount ??
      audit.count

    // Kalau field ada (termasuk nilai 0 yang valid), pakai.
    // Kalau tidak ada sama sekali, hitung dari array detections jika ada.
    const auditObjects =
      td !== undefined && td !== null
        ? Number(td)
        : Array.isArray(audit.detections)
        ? audit.detections.length
        : 0

    totalObjects += Number.isNaN(auditObjects) ? 0 : auditObjects

    // ─── confidence ─────────────────────────────────────────────────────────
    const rawConf =
      audit.average_confidence ??
      audit.averageConfidence ??
      audit.confidence ??
      audit.score ??
      0
    const conf = normalizeConfidence(rawConf)
    if (conf > 0) {
      confidenceSum += conf
      confidenceCount++
    }

    // ─── daily trend ────────────────────────────────────────────────────────
    const dateRaw =
      audit.created_at ??
      audit.createdAt ??
      audit.timestamp ??
      audit.date ??
      ""
    const date = String(dateRaw).slice(0, 10)
    if (date && date.length === 10 && date !== "unde") {
      dailyMap.set(date, (dailyMap.get(date) ?? 0) + 1)
    }

    // ─── category distribution ───────────────────────────────────────────────
    // History endpoint tidak mengirim array detections — hanya top_label.
    // Gunakan top_label dan tambahkan sebesar jumlah objek audit ini.
    const detections = Array.isArray(audit.detections) ? audit.detections : []

    if (detections.length > 0) {
      for (const det of detections) {
        const label = String(
          det.label ?? det.class_name ?? det.name ?? "Tidak diketahui"
        )
        categoryMap.set(label, (categoryMap.get(label) ?? 0) + 1)
      }
    } else {
      const fallback =
        audit.top_label ??
        audit.label ??
        audit.top_prediction ??
        audit.prediction ??
        audit.category
      if (fallback) {
        const label = String(fallback)
        const add = auditObjects > 0 ? auditObjects : 1
        categoryMap.set(label, (categoryMap.get(label) ?? 0) + add)
      }
    }
  }

  return {
    total_audits: audits.length,
    total_objects: totalObjects,
    average_confidence: confidenceCount > 0 ? confidenceSum / confidenceCount : 0,
    category_distribution: Array.from(categoryMap.entries()).map(([label, count]) => ({
      label,
      count,
    })),
    daily_trend: Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count })),
  }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization")

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/audits/history`, {
      method: "GET",
      headers: { Authorization: auth || "" },
      cache: "no-store",
    })

    if (!response.ok) {
      return NextResponse.json(emptySummary(), {
        status: response.status,
        headers: noStoreHeaders,
      })
    }

    const data = await response.json()
    const audits: any[] = Array.isArray(data) ? data : []

    // ── TEMPORARY DEBUG: hapus setelah fix terkonfirmasi ──────────────────
    if (audits.length > 0) {
      const sample = audits[0]
      console.log("=== [reports/summary] DEBUG ===")
      console.log("Keys in audit[0]:", Object.keys(sample))
      console.log("audit[0].total_detections:", sample.total_detections)
      console.log("audit[0].top_label:", sample.top_label)
      console.log("audit[0].average_confidence:", sample.average_confidence)
      console.log("audit[0].created_at:", sample.created_at)
      console.log("Full audit[0]:", JSON.stringify(sample, null, 2))
    }
    // ── END DEBUG ─────────────────────────────────────────────────────────

    const summary = buildSummary(audits)

    console.log("=== [reports/summary] RESULT ===")
    console.log(JSON.stringify(summary))

    return NextResponse.json(summary, {
      status: 200,
      headers: noStoreHeaders,
    })
  } catch (error: any) {
    console.error("[reports/summary] Fetch error:", error?.message)
    return NextResponse.json(
      { message: "Backend tidak dapat dijangkau.", detail: error?.message, ...emptySummary() },
      { status: 503, headers: noStoreHeaders }
    )
  }
}