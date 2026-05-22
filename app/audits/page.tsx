"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import Navigation from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Image as ImageIcon, History, RotateCcw, Search, ArrowUpDown,
  CheckCircle, Tag, Scale, Save, RefreshCw, Info, Camera,
} from "lucide-react"
import Link from "next/link"

// ─── Storage keys ──────────────────────────────────────────────────────────────
const WEIGHT_PRICES_KEY = "hargai_weight_prices"
const HISTORY_CACHE_KEY = "hargai_history_cache"

// ─── Types ─────────────────────────────────────────────────────────────────────
type WastePrice = { id: string; name: string; category: string; unit: string; current_price: number | string | null; currency: string }
type DetectionItem = { label: string; confidence: number; bbox: { x1: number; y1: number; x2: number; y2: number }; price?: WastePrice | null }
type DetectWasteResponse = {
  audit_id: number | string; image_url: string; preview_image?: string
  detections: DetectionItem[]; top_prediction: string; top_label?: string; created_at: string; raw_response?: unknown
}

// ─── Shared animations CSS ─────────────────────────────────────────────────────
const sharedStyles = `
  @keyframes blob { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,-30px) scale(1.08)} 66%{transform:translate(-20px,20px) scale(0.94)} }
  @keyframes fadeInUp { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
  @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
  @keyframes float { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-8px)} }
  @keyframes gridFade { from{opacity:0} to{opacity:1} }
  @keyframes pulse-save { 0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0)} 50%{box-shadow:0 0 0 6px rgba(16,185,129,0.15)} }

  .animate-blob { animation: blob 9s infinite ease-in-out; }
  .animate-blob-delay { animation: blob 11s infinite ease-in-out 3s; }
  .animate-float { animation: float 4s ease-in-out infinite; }
  .fade-up { animation: fadeInUp 0.7s ease both; }
  .delay-1{animation-delay:0.1s} .delay-2{animation-delay:0.2s} .delay-3{animation-delay:0.35s}

  .hero-grid {
    background-image: linear-gradient(rgba(8,145,178,0.06) 1px,transparent 1px), linear-gradient(90deg,rgba(8,145,178,0.06) 1px,transparent 1px);
    background-size: 40px 40px;
    animation: gridFade 1.2s ease both;
  }
  .shimmer-text {
    background: linear-gradient(90deg,#0891b2 0%,#06b6d4 30%,#67e8f9 50%,#06b6d4 70%,#0891b2 100%);
    background-size: 200% auto;
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    animation: shimmer 4s linear infinite;
  }
  .section-divider { height:1px; background:linear-gradient(90deg,transparent,rgba(8,145,178,0.25),transparent); }

  .card-audit {
    transition: transform 0.35s cubic-bezier(.22,.68,0,1.2), box-shadow 0.35s ease, border-color 0.3s ease;
    border: 1px solid transparent;
  }
  .card-audit:hover { transform: translateY(-3px); box-shadow: 0 16px 36px -8px rgba(8,145,178,0.12); border-color: rgba(8,145,178,0.15); }

  .btn-glow { transition: box-shadow 0.3s ease, transform 0.2s ease; }
  .btn-glow:hover { box-shadow: 0 0 20px 3px rgba(8,145,178,0.3); transform: translateY(-1px); }

  .btn-emerald-glow { transition: box-shadow 0.3s ease, transform 0.2s ease; }
  .btn-emerald-glow:hover { box-shadow: 0 0 20px 3px rgba(16,185,129,0.3); transform: translateY(-1px); }

  .save-success { animation: pulse-save 2s ease-in-out 2; }
  .price-card { transition: transform 0.25s ease, box-shadow 0.25s ease; }
  .price-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px -4px rgba(0,0,0,0.08); }
`

// ─── Currency formatter ─────────────────────────────────────────────────────────
const formatCurrency = (value: number | string | null | undefined, currency = "IDR"): string => {
  const n = Number(value)
  if (value === null || value === undefined || Number.isNaN(n) || n < 0) return "Harga belum tersedia"
  if (n === 0) return "Rp 0"
  return new Intl.NumberFormat("id-ID", { style: "currency", currency, maximumFractionDigits: 0 }).format(n)
}

// ─── Normalization helpers ──────────────────────────────────────────────────────
const normalizeConfidence = (value: unknown): number => { const n = Number(value); if (Number.isNaN(n)) return 0; return n > 1 ? n / 100 : n }
const normalizeBBox = (item: any) => {
  const bbox = item?.bbox || item?.box || item?.bounding_box || item?.boundingBox || {}
  return {
    x1: Number(bbox?.x1 ?? bbox?.xmin ?? bbox?.left ?? item?.x1 ?? item?.xmin ?? 0),
    y1: Number(bbox?.y1 ?? bbox?.ymin ?? bbox?.top ?? item?.y1 ?? item?.ymin ?? 0),
    x2: Number(bbox?.x2 ?? bbox?.xmax ?? bbox?.right ?? item?.x2 ?? item?.xmax ?? 0),
    y2: Number(bbox?.y2 ?? bbox?.ymax ?? bbox?.bottom ?? item?.y2 ?? item?.ymax ?? 0),
  }
}
const getRawDetections = (result: any): any[] => {
  if (!result) return []
  const possibleArrays = [result.detections, result.results, result.predictions, result.objects, result.items, result.data?.detections, result.data?.results, result.data?.predictions, result.output?.detections, result.output?.results, result.output?.predictions]
  const found = possibleArrays.find((v) => Array.isArray(v))
  return Array.isArray(found) ? found : []
}
const getLabelFromItem = (item: any, index: number): string => String(item?.label ?? item?.class ?? item?.class_name ?? item?.className ?? item?.name ?? item?.category ?? item?.prediction ?? item?.predicted_class ?? item?.predicted_label ?? item?.cls ?? item?.object ?? item?.type ?? `Objek ${index + 1}`)
const getConfidenceFromItem = (item: any): number => normalizeConfidence(item?.confidence ?? item?.score ?? item?.conf ?? item?.probability ?? item?.prob ?? item?.accuracy ?? 0)
const getDetections = (result: any): DetectionItem[] => {
  if (!result) return []
  const raw = getRawDetections(result)
  if (raw.length > 0) return raw.map((item: any, index: number) => ({ label: getLabelFromItem(item, index), confidence: getConfidenceFromItem(item), bbox: normalizeBBox(item), price: item?.price ?? null }))
  const singleLabel = result.top_prediction ?? result.top_label ?? result.prediction ?? result.label ?? result.class ?? result.class_name ?? result.predicted_class ?? result.predicted_label ?? result.result ?? result.category ?? result.data?.top_prediction ?? result.data?.top_label ?? result.data?.prediction ?? result.data?.label ?? result.output?.top_prediction ?? result.output?.top_label ?? result.output?.prediction ?? result.output?.label
  if (!singleLabel) return []
  return [{ label: String(singleLabel), confidence: normalizeConfidence(result.confidence ?? result.score ?? result.conf ?? result.probability ?? result.data?.confidence ?? result.data?.score ?? result.output?.confidence ?? result.output?.score ?? 0), bbox: { x1: 0, y1: 0, x2: 0, y2: 0 }, price: null }]
}
const getImageUrl = (result: any): string => String(result?.image_url ?? result?.imageUrl ?? result?.image ?? result?.url ?? result?.file_url ?? result?.fileUrl ?? result?.data?.image_url ?? result?.data?.imageUrl ?? result?.data?.image ?? result?.output?.image_url ?? "")

function normalizeAuditData(rawData: unknown): DetectWasteResponse | null {
  if (!rawData || typeof rawData !== "object") return null
  const data = rawData as Record<string, any>
  const detections = getDetections(data)
  const topPrediction = String(data.top_prediction ?? data.top_label ?? data.prediction ?? data.label ?? data.class ?? data.class_name ?? data.predicted_class ?? data.predicted_label ?? data.result ?? data.category ?? data.data?.top_prediction ?? data.data?.top_label ?? data.data?.prediction ?? data.data?.label ?? data.output?.top_prediction ?? data.output?.top_label ?? data.output?.prediction ?? data.output?.label ?? detections[0]?.label ?? "Tidak diketahui")
  return {
    audit_id: data.audit_id ?? data.auditId ?? data.id ?? "-",
    image_url: getImageUrl(data),
    preview_image: String(data.preview_image ?? data.previewImage ?? ""),
    detections,
    top_prediction: topPrediction,
    top_label: topPrediction,
    created_at: String(data.created_at ?? data.createdAt ?? data.timestamp ?? data.data?.created_at ?? new Date().toISOString()),
    raw_response: data.raw_response ?? data,
  }
}

// ─── localStorage helpers ───────────────────────────────────────────────────────
function saveWeightEntry(auditId: string | number, weight: number, weightBasedPrice: number) {
  try {
    const raw = localStorage.getItem(WEIGHT_PRICES_KEY)
    const existing = raw ? JSON.parse(raw) : {}
    existing[String(auditId)] = { weight, weightBasedPrice, updatedAt: new Date().toISOString() }
    localStorage.setItem(WEIGHT_PRICES_KEY, JSON.stringify(existing))
  } catch {}
}
function loadWeightEntry(auditId: string | number): { weight: number; weightBasedPrice: number } | null {
  try {
    const raw = localStorage.getItem(WEIGHT_PRICES_KEY)
    if (!raw) return null
    const all = JSON.parse(raw)
    return all[String(auditId)] ?? null
  } catch { return null }
}
function patchHistoryCache(auditId: string | number, weight: number, weightBasedPrice: number) {
  try {
    const raw = localStorage.getItem(HISTORY_CACHE_KEY)
    if (!raw) return
    const items: any[] = JSON.parse(raw)
    const updated = items.map((item) => String(item.audit_id) === String(auditId) ? { ...item, weight_based_price: weightBasedPrice, actual_weight: weight } : item)
    localStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify(updated))
  } catch {}
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function AuditPage() {
  const [latestAudit, setLatestAudit] = useState<DetectWasteResponse | null>(null)
  const [mounted, setMounted] = useState(false)
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 })
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [sortBy, setSortBy] = useState<"latest" | "confidence" | "label">("latest")
  const [actualWeightInput, setActualWeightInput] = useState("")
  const [savedWeight, setSavedWeight] = useState<number | null>(null)
  const [savedWeightPrice, setSavedWeightPrice] = useState<number | null>(null)
  const [weightSaved, setWeightSaved] = useState(false)

  useEffect(() => {
    setMounted(true)
    const raw = sessionStorage.getItem("latest_detection_result")
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      const audit = normalizeAuditData(parsed)
      setLatestAudit(audit)
      if (audit?.audit_id) {
        const entry = loadWeightEntry(audit.audit_id)
        if (entry) { setActualWeightInput(String(entry.weight)); setSavedWeight(entry.weight); setSavedWeightPrice(entry.weightBasedPrice); setWeightSaved(true) }
      }
    } catch (err) { console.error("Gagal membaca hasil deteksi terbaru:", err); setLatestAudit(null) }
  }, [])

  const detections = latestAudit?.detections ?? []
  const displayImage = latestAudit?.preview_image || latestAudit?.image_url || ""

  const avgConfidence = useMemo(() => detections.length === 0 ? 0 : detections.reduce((s, d) => s + d.confidence, 0) / detections.length, [detections])
  const baseEstimatedPrice = useMemo(() => detections.reduce((total, item) => { const price = Number(item.price?.current_price); return total + (Number.isNaN(price) ? 0 : price) }, 0), [detections])
  const avgPricePerKg = useMemo(() => {
    const withPrice = detections.filter((d) => d.price && Number(d.price.current_price) > 0)
    if (withPrice.length === 0) return 0
    return withPrice.reduce((s, d) => s + Number(d.price!.current_price), 0) / withPrice.length
  }, [detections])
  const weightPreviewPrice = useMemo(() => {
    const w = parseFloat(actualWeightInput)
    if (!w || isNaN(w) || w <= 0) return null
    return avgPricePerKg > 0 ? avgPricePerKg * w : null
  }, [actualWeightInput, avgPricePerKg])

  const handleSaveWeight = useCallback(() => {
    const w = parseFloat(actualWeightInput)
    if (isNaN(w) || w <= 0 || !latestAudit?.audit_id) return
    const price = avgPricePerKg > 0 ? avgPricePerKg * w : 0
    setSavedWeight(w); setSavedWeightPrice(price); setWeightSaved(true)
    saveWeightEntry(latestAudit.audit_id, w, price)
    patchHistoryCache(latestAudit.audit_id, w, price)
  }, [actualWeightInput, avgPricePerKg, latestAudit?.audit_id])

  const handleResetWeight = useCallback(() => {
    setActualWeightInput(""); setSavedWeight(null); setSavedWeightPrice(null); setWeightSaved(false)
    if (latestAudit?.audit_id) {
      try {
        const raw = localStorage.getItem(WEIGHT_PRICES_KEY)
        if (raw) { const all = JSON.parse(raw); delete all[String(latestAudit.audit_id)]; localStorage.setItem(WEIGHT_PRICES_KEY, JSON.stringify(all)) }
      } catch {}
      patchHistoryCache(latestAudit.audit_id, 0, 0)
    }
  }, [latestAudit?.audit_id])

  const categories = useMemo(() => Array.from(new Set(detections.map((d) => d.label))), [detections])
  const filteredDetections = useMemo(() => {
    let result = detections.filter((item) => item.label.toLowerCase().includes(searchTerm.toLowerCase()) && (categoryFilter === "all" || item.label === categoryFilter))
    if (sortBy === "confidence") result = [...result].sort((a, b) => b.confidence - a.confidence)
    if (sortBy === "label") result = [...result].sort((a, b) => a.label.localeCompare(b.label))
    return result
  }, [detections, searchTerm, categoryFilter, sortBy])

  const formattedCreatedAt = useMemo(() => {
    if (!mounted || !latestAudit?.created_at) return "-"
    const date = new Date(latestAudit.created_at)
    return isNaN(date.getTime()) ? "-" : date.toLocaleString("id-ID")
  }, [mounted, latestAudit?.created_at])

  const weightValue = parseFloat(actualWeightInput)
  const isWeightValid = !isNaN(weightValue) && weightValue > 0

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <style>{sharedStyles}</style>
      <Navigation />

      {/* ── HERO ── */}
      <section className="relative bg-gradient-to-br from-gray-50 via-white to-cyan-50/30 py-24 overflow-hidden border-b border-gray-100">
        <div className="absolute top-[-80px] right-[-80px] w-[400px] h-[400px] rounded-full bg-emerald-200/20 blur-3xl animate-blob pointer-events-none" />
        <div className="absolute bottom-[-60px] left-[-60px] w-[350px] h-[350px] rounded-full bg-cyan-200/20 blur-3xl animate-blob-delay pointer-events-none" />
        <div className="absolute inset-0 hero-grid pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4">
          <div className="fade-up inline-flex items-center gap-2 bg-white border border-emerald-200 rounded-full px-4 py-2 shadow-md text-sm text-emerald-700 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Hasil Deteksi Tersimpan Otomatis
          </div>
          <h1 className="fade-up delay-1 text-4xl md:text-5xl font-serif font-black text-gray-900 mb-4">
            Audit <span className="shimmer-text">Sampah</span>
          </h1>
          <p className="fade-up delay-2 text-lg text-gray-500 max-w-3xl">
            Pusat pengelolaan hasil deteksi sampah yang otomatis tersimpan dari proses klasifikasi AI.
          </p>
        </div>
      </section>

      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4">
          {latestAudit ? (
            <div className="space-y-6">

              {/* ── ROW 1: Preview + Klasifikasi ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Preview */}
                <div className="card-audit rounded-2xl bg-white shadow-md overflow-hidden fade-up delay-1">
                  <div className="h-1 w-full bg-gradient-to-r from-cyan-400 to-cyan-600" />
                  <div className="border-b border-gray-100 px-6 py-4">
                    <h2 className="text-xl font-serif font-bold text-gray-900">Preview Hasil Deteksi</h2>
                  </div>
                  <div className="p-4">
                    <div className="relative overflow-hidden rounded-xl bg-gray-900">
                      {displayImage ? (
                        <img src={displayImage} alt="Hasil deteksi" className="h-auto w-full"
                          onLoad={(e) => setImageNaturalSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })} />
                      ) : (
                        <div className="w-full h-[420px] flex items-center justify-center text-gray-500">
                          <div className="text-center"><Camera className="h-12 w-12 text-gray-600 mx-auto mb-2 opacity-40" /><p className="text-sm">Tidak ada gambar</p></div>
                        </div>
                      )}
                      {detections.map((result, index) => {
                        const hasValidBox = result.bbox.x2 > result.bbox.x1 && result.bbox.y2 > result.bbox.y1 && imageNaturalSize.width > 0 && imageNaturalSize.height > 0
                        if (!hasValidBox) return null
                        const isNorm = result.bbox.x2 <= 1 && result.bbox.y2 <= 1
                        const left = isNorm ? result.bbox.x1 * 100 : (result.bbox.x1 / imageNaturalSize.width) * 100
                        const top = isNorm ? result.bbox.y1 * 100 : (result.bbox.y1 / imageNaturalSize.height) * 100
                        const width = isNorm ? (result.bbox.x2 - result.bbox.x1) * 100 : ((result.bbox.x2 - result.bbox.x1) / imageNaturalSize.width) * 100
                        const height = isNorm ? (result.bbox.y2 - result.bbox.y1) * 100 : ((result.bbox.y2 - result.bbox.y1) / imageNaturalSize.height) * 100
                        return (
                          <div key={`bbox-${result.label}-${index}`} className="pointer-events-none absolute rounded-lg border-2 border-cyan-400"
                            style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}>
                            <div className="absolute -top-8 left-0 whitespace-nowrap rounded-md bg-cyan-600 px-2 py-1 text-xs font-semibold text-white shadow-sm">
                              {result.label} • {(result.confidence * 100).toFixed(1)}%
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Klasifikasi */}
                <div className="card-audit rounded-2xl bg-white shadow-md overflow-hidden fade-up delay-2">
                  <div className="h-1 w-full bg-gradient-to-r from-cyan-400 to-cyan-600" />
                  <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-serif font-bold text-gray-900">Hasil Klasifikasi AI</h2>
                    <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-100 rounded-full px-3 py-1 text-xs font-semibold">
                      <CheckCircle className="h-3.5 w-3.5" />Tersimpan
                    </span>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-cyan-50 border border-cyan-100 p-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Audit ID</p>
                        <p className="text-3xl font-serif font-black text-cyan-600">{latestAudit.audit_id}</p>
                      </div>
                      <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Kategori</p>
                        <p className="text-xl font-serif font-black text-amber-600 break-words">{latestAudit.top_prediction}</p>
                      </div>
                      <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Total Objek</p>
                        <p className="text-2xl font-serif font-bold text-gray-900">{detections.length}</p>
                      </div>
                      <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Confidence</p>
                        <p className="text-2xl font-serif font-bold text-gray-900">{(avgConfidence * 100).toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="price-card rounded-xl border border-green-100 bg-green-50 p-4">
                      <div className="flex items-center gap-2 mb-1"><Tag className="h-4 w-4 text-green-600" /><p className="text-xs text-gray-500">Estimasi Harga Dasar</p></div>
                      <p className="text-2xl font-serif font-black text-green-700">{formatCurrency(baseEstimatedPrice)}</p>
                      {baseEstimatedPrice > 0 && avgPricePerKg > 0 && <p className="text-xs text-green-600 mt-1">≈ {formatCurrency(avgPricePerKg)} / kg rata-rata</p>}
                    </div>
                    {weightSaved && savedWeightPrice !== null && (
                      <div className="save-success price-card rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-4">
                        <div className="flex items-center gap-2 mb-1"><Scale className="h-4 w-4 text-emerald-600" /><p className="text-xs text-gray-500">Estimasi Harga ({savedWeight} kg)</p></div>
                        <p className="text-2xl font-serif font-black text-emerald-700">{formatCurrency(savedWeightPrice)}</p>
                        <p className="text-xs text-emerald-600 mt-1">{formatCurrency(avgPricePerKg)} / kg × {savedWeight} kg</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">Waktu deteksi: {formattedCreatedAt}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Link href="/history"><Button className="btn-glow w-full bg-cyan-600 hover:bg-cyan-700 rounded-xl"><History className="h-4 w-4 mr-2" />Lihat Riwayat</Button></Link>
                      <Link href="/classify"><Button variant="outline" className="w-full border-gray-200 rounded-xl"><RotateCcw className="h-4 w-4 mr-2" />Deteksi Baru</Button></Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── WEIGHT INPUT ── */}
              <div className="card-audit rounded-2xl bg-white shadow-md overflow-hidden fade-up delay-3">
                <div className="h-1 w-full bg-gradient-to-r from-emerald-400 to-emerald-600" />
                <div className="border-b border-gray-100 px-6 py-4 bg-gradient-to-r from-emerald-50 to-green-50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                      <Scale className="h-5 w-5 text-emerald-700" />
                    </div>
                    <div>
                      <h2 className="text-xl font-serif font-bold text-gray-900">Input Berat Aktual</h2>
                      <p className="text-sm text-gray-500 mt-0.5">Masukkan berat sebenarnya untuk estimasi harga yang lebih akurat</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Berat Sampah (kg)</label>
                        <div className="flex gap-3">
                          <div className="relative flex-1">
                            <Scale className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input type="number" min="0.01" step="0.01" placeholder="Contoh: 2.5" value={actualWeightInput}
                              onChange={(e) => { setActualWeightInput(e.target.value); setWeightSaved(false) }}
                              className="pl-9 text-lg font-semibold border-gray-200 focus:border-emerald-300 focus:ring-emerald-100 rounded-xl" />
                          </div>
                          <div className="flex items-center px-3 bg-gray-100 rounded-xl border border-gray-200">
                            <span className="text-sm font-semibold text-gray-600">kg</span>
                          </div>
                        </div>
                      </div>
                      {avgPricePerKg > 0 ? (
                        <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-100 p-3">
                          <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                          <div className="text-xs text-blue-700">
                            <p className="font-semibold">Harga referensi:</p>
                            <p>{formatCurrency(avgPricePerKg)} / kg (rata-rata dari {detections.filter((d) => d.price && Number(d.price.current_price) > 0).length} objek)</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 p-3">
                          <Info className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                          <p className="text-xs text-amber-700">Data harga per kg belum tersedia untuk objek yang terdeteksi.</p>
                        </div>
                      )}
                      <div className="flex gap-3">
                        <Button onClick={handleSaveWeight} disabled={!isWeightValid || !avgPricePerKg}
                          className="btn-emerald-glow flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl">
                          <Save className="h-4 w-4 mr-2" />{weightSaved ? "Perbarui Berat" : "Hitung & Simpan"}
                        </Button>
                        {weightSaved && (
                          <Button onClick={handleResetWeight} variant="outline" className="border-gray-200 rounded-xl">
                            <RefreshCw className="h-4 w-4 mr-1" />Reset
                          </Button>
                        )}
                      </div>
                      {weightSaved && (
                        <p className="text-xs text-emerald-600 flex items-center gap-1">
                          <CheckCircle className="h-3.5 w-3.5" />Tersimpan — data ini akan muncul di halaman Riwayat
                        </p>
                      )}
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-gray-700">Estimasi Harga</p>
                      {isWeightValid && weightPreviewPrice !== null && !weightSaved && (
                        <div className="price-card rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 p-5">
                          <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide mb-1">Preview (belum disimpan)</p>
                          <p className="text-3xl font-serif font-black text-emerald-700">{formatCurrency(weightPreviewPrice)}</p>
                          <p className="text-xs text-emerald-600 mt-1">{formatCurrency(avgPricePerKg)} × {weightValue.toFixed(2)} kg</p>
                        </div>
                      )}
                      {weightSaved && savedWeightPrice !== null && (
                        <div className="price-card save-success rounded-xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-green-50 p-5">
                          <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide mb-1">✓ Tersimpan</p>
                          <p className="text-3xl font-serif font-black text-emerald-700">{formatCurrency(savedWeightPrice)}</p>
                          <p className="text-xs text-emerald-600 mt-1">{formatCurrency(avgPricePerKg)} × {savedWeight} kg</p>
                        </div>
                      )}
                      <div className="price-card rounded-xl bg-white border border-gray-100 p-4">
                        <p className="text-xs text-gray-400 mb-1">Estimasi Harga Dasar (tanpa berat)</p>
                        <p className="text-xl font-serif font-bold text-gray-700">{formatCurrency(baseEstimatedPrice)}</p>
                      </div>
                      {detections.some((d) => d.price && Number(d.price.current_price) > 0) && (
                        <div className="rounded-xl bg-white border border-gray-100 p-4 space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Harga per objek</p>
                          {detections.map((det, idx) => {
                            const unitPrice = Number(det.price?.current_price)
                            if (!det.price || isNaN(unitPrice) || unitPrice <= 0) return null
                            const weightedPrice = isWeightValid && avgPricePerKg > 0 ? unitPrice * weightValue : null
                            return (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <span className="font-medium text-gray-700 truncate mr-2">{det.label}</span>
                                <div className="text-right shrink-0">
                                  <p className="text-xs text-gray-400">{formatCurrency(unitPrice, det.price.currency || "IDR")} / {det.price.unit || "kg"}</p>
                                  {weightedPrice !== null && <p className="text-xs font-semibold text-emerald-600">→ {formatCurrency(weightedPrice, det.price.currency || "IDR")} ({weightValue} kg)</p>}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── DATA TABLE ── */}
              <div className="card-audit rounded-2xl bg-white shadow-md overflow-hidden fade-up">
                <div className="h-1 w-full bg-gradient-to-r from-violet-400 to-violet-600" />
                <div className="border-b border-gray-100 px-6 py-4">
                  <h2 className="text-xl font-serif font-bold text-gray-900">Tabel Data Audit</h2>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Cari kategori sampah..."
                        className="pl-9 border-gray-200 rounded-xl focus:border-cyan-300" />
                    </div>
                    <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                      className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:border-cyan-300">
                      <option value="all">Semua kategori</option>
                      {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                      className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:border-cyan-300">
                      <option value="latest">Urutan deteksi</option>
                      <option value="confidence">Confidence tertinggi</option>
                      <option value="label">Kategori A-Z</option>
                    </select>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-500">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">No</th>
                          <th className="px-4 py-3 text-left font-semibold">Jenis Sampah</th>
                          <th className="px-4 py-3 text-left font-semibold"><span className="inline-flex items-center gap-1">Confidence <ArrowUpDown className="h-3.5 w-3.5" /></span></th>
                          <th className="px-4 py-3 text-left font-semibold">Bounding Box</th>
                          <th className="px-4 py-3 text-left font-semibold">Harga / kg</th>
                          {savedWeight && <th className="px-4 py-3 text-left font-semibold text-emerald-700">Est. Harga ({savedWeight} kg)</th>}
                          <th className="px-4 py-3 text-left font-semibold">Waktu Deteksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredDetections.length > 0 ? filteredDetections.map((item, index) => {
                          const unitPrice = Number(item.price?.current_price)
                          const hasPrice = item.price && !isNaN(unitPrice) && unitPrice > 0
                          const weightPrice = hasPrice && savedWeight ? unitPrice * savedWeight : null
                          return (
                            <tr key={`${item.label}-${index}`} className="hover:bg-cyan-50/30 transition-colors">
                              <td className="px-4 py-3 text-gray-400">{index + 1}</td>
                              <td className="px-4 py-3 font-semibold text-gray-900">{item.label}</td>
                              <td className="px-4 py-3"><Badge className="bg-cyan-100 text-cyan-800 hover:bg-cyan-100">{(item.confidence * 100).toFixed(1)}%</Badge></td>
                              <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                                {item.bbox.x2 > 0 ? `(${item.bbox.x1.toFixed(1)},${item.bbox.y1.toFixed(1)})–(${item.bbox.x2.toFixed(1)},${item.bbox.y2.toFixed(1)})` : "—"}
                              </td>
                              <td className="px-4 py-3 text-gray-700">{hasPrice ? formatCurrency(unitPrice, item.price!.currency || "IDR") : "—"}</td>
                              {savedWeight !== null && <td className="px-4 py-3 font-semibold text-emerald-700">{weightPrice !== null ? formatCurrency(weightPrice, item.price!.currency || "IDR") : "—"}</td>}
                              <td className="px-4 py-3 text-gray-400 text-xs">{formattedCreatedAt}</td>
                            </tr>
                          )
                        }) : (
                          <tr><td colSpan={savedWeight ? 7 : 6} className="px-4 py-8 text-center text-gray-400">Tidak ada data deteksi yang cocok.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white shadow-sm p-12 text-center">
              <div className="animate-float inline-block mb-4"><ImageIcon className="h-16 w-16 text-gray-200" /></div>
              <p className="text-gray-500 text-lg mb-2">Belum ada hasil deteksi terbaru</p>
              <p className="text-gray-400 text-sm">Lakukan klasifikasi terlebih dahulu di halaman Klasifikasi.</p>
              <Link href="/classify" className="inline-block mt-6">
                <Button className="btn-glow bg-cyan-600 hover:bg-cyan-700 rounded-xl px-8">Deteksi Baru</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 text-white py-12 border-t border-gray-800 mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            <div className="md:col-span-2">
              <h3 className="text-2xl font-serif font-black text-cyan-400 mb-3">HargAI</h3>
              <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">HargAI adalah platform klasifikasi sampah berbasis AI yang membantu pengguna mengenali jenis sampah dan melihat estimasi harga secara cepat.</p>
            </div>
            <div className="md:text-right">
              <h4 className="text-lg font-serif font-bold mb-4">Mulai Menggunakan</h4>
              <p className="text-gray-400 text-sm mb-4">Daftar akun untuk mengakses fitur.</p>
              <Link href="/register"><Button className="btn-glow bg-cyan-600 hover:bg-cyan-700 font-bold">Sign Up / Register</Button></Link>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-400 text-sm">© 2026 HargAI. All rights reserved.</p>
            <p className="text-gray-500 text-xs">Powered by HargAI Waste Classification System</p>
          </div>
        </div>
      </footer>
    </div>
  )
}