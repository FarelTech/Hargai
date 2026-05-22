"use client"

import { useEffect, useMemo, useState } from "react"
import Navigation from "@/components/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Search, Download, Eye, Trash2, BarChart3, X, Tag,
  AlertTriangle, Camera, Clock, ChevronRight, Scale,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"

// ─── Storage keys ──────────────────────────────────────────────────────────────
const HISTORY_CACHE_KEY = "hargai_history_cache"
const WEIGHT_PRICES_KEY = "hargai_weight_prices"

// ─── Types ─────────────────────────────────────────────────────────────────────
type WastePrice = {
  id?: string; name?: string; category?: string; unit?: string
  current_price: number | string | null; currency?: string
}
type DetectionItem = {
  label: string; confidence: number
  bbox: { x1: number; y1: number; x2: number; y2: number }
  price?: WastePrice | null
}
type WeightEntry = { weight: number; weightBasedPrice: number; updatedAt: string }
type AuditItem = {
  audit_id: number | string; image_url: string; preview_image?: string
  detections: DetectionItem[]; top_label: string; top_prediction?: string
  total_detections?: number; average_confidence?: number
  estimated_price?: number; weight_based_price?: number; actual_weight?: number
  created_at: string; raw_response?: unknown
}

// ─── localStorage helpers ───────────────────────────────────────────────────────
function loadCachedHistory(): AuditItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(HISTORY_CACHE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(normalizeHistoryItem) : []
  } catch { return [] }
}
function saveCachedHistory(items: AuditItem[]) {
  if (typeof window === "undefined") return
  try { localStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify(items)) } catch {}
}
function loadWeightPrices(): Record<string, WeightEntry> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(WEIGHT_PRICES_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}
function removeCachedItem(id: string) {
  if (typeof window === "undefined") return
  try {
    const raw = localStorage.getItem(HISTORY_CACHE_KEY)
    if (!raw) return
    const parsed: AuditItem[] = JSON.parse(raw)
    const filtered = parsed.filter((item) => String(item.audit_id) !== id)
    localStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify(filtered))
  } catch {}
}

// ─── Normalization helpers ──────────────────────────────────────────────────────
const normalizeConfidence = (value: unknown): number => {
  const n = Number(value)
  if (Number.isNaN(n)) return 0
  return n > 1 ? n / 100 : n
}
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
  const possibleArrays = [
    result.detections, result.results, result.predictions, result.objects, result.items,
    result.data?.detections, result.data?.results, result.data?.predictions,
    result.output?.detections, result.output?.results, result.output?.predictions,
  ]
  const found = possibleArrays.find((v) => Array.isArray(v))
  return Array.isArray(found) ? found : []
}
const getLabelFromItem = (item: any, index: number): string =>
  String(item?.label ?? item?.class ?? item?.class_name ?? item?.className ??
    item?.name ?? item?.category ?? item?.prediction ?? item?.predicted_class ??
    item?.predicted_label ?? item?.cls ?? item?.object ?? item?.type ?? `Objek ${index + 1}`)
const getConfidenceFromItem = (item: any): number =>
  normalizeConfidence(item?.confidence ?? item?.score ?? item?.conf ?? item?.probability ?? item?.prob ?? item?.accuracy ?? 0)
const getImageUrl = (result: any): string =>
  String(result?.image_url ?? result?.imageUrl ?? result?.image ?? result?.url ??
    result?.file_url ?? result?.fileUrl ??
    result?.data?.image_url ?? result?.data?.imageUrl ?? result?.data?.image ??
    result?.output?.image_url ?? "")
const getTopLabel = (data: any, detections: DetectionItem[]): string =>
  String(data?.top_prediction ?? data?.top_label ?? data?.prediction ?? data?.label ??
    data?.class ?? data?.class_name ?? data?.predicted_class ?? data?.predicted_label ??
    data?.result ?? data?.category ??
    data?.data?.top_prediction ?? data?.data?.top_label ?? data?.data?.prediction ?? data?.data?.label ??
    data?.output?.top_prediction ?? data?.output?.top_label ?? data?.output?.prediction ?? data?.output?.label ??
    detections[0]?.label ?? "Tidak diketahui")
const getDetections = (result: any): DetectionItem[] => {
  if (!result) return []
  const raw = getRawDetections(result)
  if (raw.length > 0) {
    return raw.map((item: any, index: number) => ({
      label: getLabelFromItem(item, index),
      confidence: getConfidenceFromItem(item),
      bbox: normalizeBBox(item),
      price: item?.price ?? null,
    }))
  }
  const fallbackLabel = result?.top_prediction ?? result?.top_label ?? result?.prediction ?? result?.label ??
    result?.class ?? result?.class_name ?? result?.data?.top_prediction ?? result?.data?.top_label ??
    result?.output?.top_prediction ?? result?.output?.top_label
  if (!fallbackLabel) return []
  const count = Number(result?.total_detections ?? result?.totalDetections ?? 1)
  return Array.from({ length: Math.max(count || 1, 1) }).map(() => ({
    label: String(fallbackLabel),
    confidence: normalizeConfidence(result?.average_confidence ?? result?.confidence ?? result?.score ??
      result?.data?.average_confidence ?? result?.data?.confidence ?? 0),
    bbox: { x1: 0, y1: 0, x2: 0, y2: 0 },
    price: null,
  }))
}
function normalizeHistoryItem(rawData: unknown): AuditItem {
  const data = (rawData || {}) as Record<string, any>
  const detections = getDetections(data)
  const topLabel = getTopLabel(data, detections)
  const estimatedPriceFromDetections = detections.reduce((sum, det) => {
    const price = Number(det?.price?.current_price)
    return sum + (Number.isNaN(price) ? 0 : price)
  }, 0)
  const rawEstimatedPrice = Number(data.estimated_price ?? data.estimatedPrice ?? data.total_price ?? data.totalPrice ?? data.price ?? 0)
  return {
    audit_id: data.audit_id ?? data.auditId ?? data.id ?? "-",
    image_url: getImageUrl(data),
    preview_image: String(data.preview_image ?? data.previewImage ?? ""),
    detections,
    top_label: topLabel,
    top_prediction: topLabel,
    total_detections: Number(data.total_detections ?? data.totalDetections ?? detections.length),
    average_confidence: normalizeConfidence(data.average_confidence ?? data.averageConfidence ?? data.confidence ?? data.score ?? 0),
    estimated_price: estimatedPriceFromDetections > 0 ? estimatedPriceFromDetections : rawEstimatedPrice > 0 ? rawEstimatedPrice : undefined,
    weight_based_price: Number(data.weight_based_price ?? 0) || undefined,
    actual_weight: Number(data.actual_weight ?? 0) || undefined,
    created_at: String(data.created_at ?? data.createdAt ?? data.timestamp ?? data.data?.created_at ?? new Date().toISOString()),
    raw_response: data,
  }
}

// ─── Utilities ─────────────────────────────────────────────────────────────────
const formatCurrency = (value: number | string | null | undefined, currency = "IDR") => {
  const n = Number(value)
  if (value === null || value === undefined || Number.isNaN(n) || n <= 0) return null
  return new Intl.NumberFormat("id-ID", { style: "currency", currency, maximumFractionDigits: 0 }).format(n)
}
function getAverageConfidence(audit: AuditItem): string {
  if (typeof audit.average_confidence === "number" && audit.average_confidence > 0)
    return (audit.average_confidence * 100).toFixed(1)
  if (!audit.detections.length) return "0.0"
  const avg = audit.detections.reduce((sum, item) => sum + Number(item.confidence || 0), 0) / audit.detections.length
  return (avg * 100).toFixed(1)
}
function getTotalDetections(audit: AuditItem): number { return Number(audit.total_detections || audit.detections.length || 0) }
function getDisplayDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
}
function getDisplayImage(audit: AuditItem): string { return audit.preview_image || audit.image_url || "" }
function getEstimatedPrice(audit: AuditItem): number {
  if (typeof audit.weight_based_price === "number" && audit.weight_based_price > 0) return audit.weight_based_price
  if (typeof audit.estimated_price === "number" && audit.estimated_price > 0) return audit.estimated_price
  return audit.detections.reduce((sum, det) => { const p = Number(det?.price?.current_price); return sum + (Number.isNaN(p) ? 0 : p) }, 0)
}
function getBasePrice(audit: AuditItem): number {
  if (typeof audit.estimated_price === "number" && audit.estimated_price > 0) return audit.estimated_price
  return audit.detections.reduce((sum, det) => { const p = Number(det?.price?.current_price); return sum + (Number.isNaN(p) ? 0 : p) }, 0)
}
function getUniqueLabels(audit: AuditItem): string[] {
  const seen = new Set<string>()
  audit.detections.forEach((d) => { if (d.label) seen.add(d.label) })
  if (seen.size === 0 && audit.top_label) seen.add(audit.top_label)
  return Array.from(seen)
}

// ─── Shared animations CSS ─────────────────────────────────────────────────────
const sharedStyles = `
  @keyframes blob { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,-30px) scale(1.08)} 66%{transform:translate(-20px,20px) scale(0.94)} }
  @keyframes fadeInUp { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
  @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
  @keyframes float { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-8px)} }
  @keyframes gridFade { from{opacity:0} to{opacity:1} }

  .animate-blob { animation: blob 9s infinite ease-in-out; }
  .animate-blob-delay { animation: blob 11s infinite ease-in-out 3s; }
  .animate-float { animation: float 4s ease-in-out infinite; }
  .fade-up { animation: fadeInUp 0.7s ease both; }
  .delay-1{animation-delay:0.1s} .delay-2{animation-delay:0.2s} .delay-3{animation-delay:0.35s} .delay-4{animation-delay:0.5s}

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

  .card-session {
    transition: transform 0.35s cubic-bezier(.22,.68,0,1.2), box-shadow 0.35s ease, border-color 0.3s ease;
    border: 1px solid transparent;
  }
  .card-session:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px -12px rgba(8,145,178,0.15);
    border-color: rgba(8,145,178,0.2);
  }
  .stat-pill { transition: transform 0.3s ease, box-shadow 0.3s ease; }
  .stat-pill:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(8,145,178,0.12); }

  .btn-glow { transition: box-shadow 0.3s ease, transform 0.2s ease; }
  .btn-glow:hover { box-shadow: 0 0 20px 3px rgba(8,145,178,0.3); transform: translateY(-1px); }
`

// ─── Sub-components ────────────────────────────────────────────────────────────
function DeleteDialog({ open, onConfirm, onCancel }: { open: boolean; onConfirm: () => void; onCancel: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-red-500 to-rose-600" />
        <div className="p-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 mx-auto mb-4">
            <AlertTriangle className="h-7 w-7 text-red-600" />
          </div>
          <h3 className="text-center text-xl font-serif font-bold text-gray-900 mb-2">Hapus Sesi Deteksi?</h3>
          <p className="text-center text-sm text-gray-500 leading-relaxed">
            Seluruh data deteksi pada sesi ini akan dihapus permanen dan tidak dapat dikembalikan.
          </p>
          <div className="mt-6 flex gap-3">
            <Button onClick={onCancel} variant="outline" className="flex-1 rounded-xl">Batal</Button>
            <Button onClick={onConfirm} className="flex-1 rounded-xl bg-red-600 hover:bg-red-700">
              <Trash2 className="h-4 w-4 mr-2" />Ya, Hapus
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SessionCard({ audit, deletingId, onDetail, onDelete }: {
  audit: AuditItem; deletingId: string | null
  onDetail: (audit: AuditItem) => void; onDelete: (id: number | string) => void
}) {
  const image = getDisplayImage(audit)
  const totalDetections = getTotalDetections(audit)
  const avgConf = getAverageConfidence(audit)
  const basePrice = getBasePrice(audit)
  const weightPrice = typeof audit.weight_based_price === "number" && audit.weight_based_price > 0 ? audit.weight_based_price : null
  const isDeleting = deletingId === String(audit.audit_id)
  const uniqueLabels = getUniqueLabels(audit)
  const formattedBase = formatCurrency(basePrice)
  const formattedWeight = formatCurrency(weightPrice)

  return (
    <div className="card-session rounded-2xl bg-white shadow-md overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-cyan-400 to-cyan-600" />
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Image */}
        <div className="lg:col-span-3 bg-gray-900">
          <div className="h-52 lg:h-full min-h-[200px] flex items-center justify-center overflow-hidden relative">
            {image ? (
              <>
                <img src={image} alt="Foto sesi deteksi" className="w-full h-full object-contain" />
                <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1.5 backdrop-blur-sm">
                  <Camera className="h-3.5 w-3.5 text-white" />
                  <span className="text-xs font-semibold text-white">{totalDetections} objek</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-600 gap-2">
                <Camera className="h-10 w-10 opacity-40" />
                <p className="text-xs">Tidak ada gambar</p>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="lg:col-span-6 p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock className="h-3.5 w-3.5" />
            <span>{getDisplayDate(audit.created_at)}</span>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Objek terdeteksi</p>
            <div className="flex flex-wrap gap-2">
              {uniqueLabels.length > 0 ? uniqueLabels.map((label) => {
                const count = audit.detections.filter((d) => d.label === label).length || 1
                return (
                  <span key={label} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-50 border border-cyan-100 text-cyan-800 text-xs font-semibold">
                    {label}
                    {count > 1 && <span className="ml-0.5 rounded-full bg-cyan-200 text-cyan-900 text-[10px] px-1.5 font-bold">×{count}</span>}
                  </span>
                )
              }) : <span className="text-xs text-gray-400 italic">Tidak ada objek terdeteksi</span>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-cyan-50 border border-cyan-100 p-3">
              <p className="text-gray-400 text-xs mb-0.5">Total Objek</p>
              <p className="font-serif font-bold text-cyan-700 text-2xl">{totalDetections}</p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
              <p className="text-gray-400 text-xs mb-0.5">Avg. Confidence</p>
              <p className="font-serif font-bold text-amber-600 text-2xl">{avgConf}%</p>
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50">
              <div className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-green-600" />
                <span className="text-xs font-medium text-gray-600">Estimasi Harga Dasar</span>
              </div>
              {formattedBase ? <span className="text-xs font-bold text-green-700">{formattedBase}</span>
                : <span className="text-xs text-gray-400 italic">Belum ada data</span>}
            </div>
            {weightPrice !== null && (
              <div className="flex items-center justify-between px-3 py-2.5 bg-emerald-50 border-t border-emerald-100">
                <div className="flex items-center gap-1.5">
                  <Scale className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-700">Harga Berat ({audit.actual_weight} kg)</span>
                </div>
                <span className="text-xs font-bold text-emerald-700">{formattedWeight}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="lg:col-span-3 p-5 bg-white border-t lg:border-t-0 lg:border-l border-gray-100 flex lg:flex-col gap-3 items-end justify-end lg:justify-center">
          <Button onClick={() => onDetail(audit)} className="btn-glow bg-cyan-600 hover:bg-cyan-700 text-white flex-1 lg:flex-none lg:w-full rounded-xl">
            <Eye className="h-4 w-4 mr-2" />Lihat Detail<ChevronRight className="h-4 w-4 ml-1 opacity-60" />
          </Button>
          <Button onClick={() => onDelete(audit.audit_id)} disabled={isDeleting} variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50 flex-1 lg:flex-none lg:w-full rounded-xl">
            <Trash2 className="h-4 w-4 mr-2" />{isDeleting ? "Menghapus..." : "Hapus"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function DetailModal({ audit, onClose }: { audit: AuditItem; onClose: () => void }) {
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 })
  const image = getDisplayImage(audit)
  const totalDetections = getTotalDetections(audit)
  const avgConf = getAverageConfidence(audit)
  const hasWeightPrice = typeof audit.weight_based_price === "number" && audit.weight_based_price > 0
  const baseEstimatedPrice = useMemo(() => {
    if (typeof audit.estimated_price === "number" && audit.estimated_price > 0) return audit.estimated_price
    return audit.detections.reduce((sum, det) => { const p = Number(det?.price?.current_price); return sum + (Number.isNaN(p) ? 0 : p) }, 0)
  }, [audit])
  const finalPrice = hasWeightPrice ? audit.weight_based_price! : baseEstimatedPrice
  const groupedByLabel = useMemo(() => {
    const map: Record<string, DetectionItem[]> = {}
    audit.detections.forEach((det) => { if (!map[det.label]) map[det.label] = []; map[det.label].push(det) })
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length)
  }, [audit])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-auto rounded-2xl bg-white shadow-2xl">
        <div className="h-1.5 w-full bg-gradient-to-r from-cyan-400 to-cyan-600" />
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-serif font-bold text-gray-900">Detail Sesi Deteksi</h2>
            <p className="text-xs text-gray-400 mt-0.5">ID: {audit.audit_id} · {getDisplayDate(audit.created_at)}</p>
          </div>
          <Button onClick={onClose} variant="outline" size="sm" className="rounded-xl">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          <div className="bg-gray-900 lg:min-h-[520px] flex items-center justify-center p-4">
            {image ? (
              <div className="relative w-full overflow-hidden rounded-xl">
                <img src={image} alt="Foto sesi deteksi" className="w-full max-h-[540px] object-contain"
                  onLoad={(e) => setImageNaturalSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })} />
                {audit.detections.map((det, index) => {
                  const hasValidBox = det.bbox.x2 > det.bbox.x1 && det.bbox.y2 > det.bbox.y1 && imageNaturalSize.width > 0 && imageNaturalSize.height > 0
                  if (!hasValidBox) return null
                  const isNorm = det.bbox.x2 <= 1 && det.bbox.y2 <= 1
                  const left = isNorm ? det.bbox.x1 * 100 : (det.bbox.x1 / imageNaturalSize.width) * 100
                  const top = isNorm ? det.bbox.y1 * 100 : (det.bbox.y1 / imageNaturalSize.height) * 100
                  const width = isNorm ? (det.bbox.x2 - det.bbox.x1) * 100 : ((det.bbox.x2 - det.bbox.x1) / imageNaturalSize.width) * 100
                  const height = isNorm ? (det.bbox.y2 - det.bbox.y1) * 100 : ((det.bbox.y2 - det.bbox.y1) / imageNaturalSize.height) * 100
                  return (
                    <div key={`${det.label}-${index}`} className="pointer-events-none absolute rounded-lg border-2 border-cyan-400"
                      style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}>
                      <div className="absolute -top-8 left-0 whitespace-nowrap rounded-md bg-cyan-600 px-2 py-1 text-xs font-semibold text-white shadow-sm">
                        {det.label} • {(det.confidence * 100).toFixed(1)}%
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-600 gap-3 py-20">
                <Camera className="h-14 w-14 opacity-40" />
                <p className="text-sm">Tidak ada gambar</p>
              </div>
            )}
          </div>
          <div className="p-6 space-y-5 overflow-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Ringkasan Sesi</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-cyan-50 p-4">
                <p className="text-xs text-gray-500 mb-1">Total Objek</p>
                <p className="text-3xl font-serif font-bold text-cyan-700">{totalDetections}</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-4">
                <p className="text-xs text-gray-500 mb-1">Avg. Confidence</p>
                <p className="text-3xl font-serif font-bold text-amber-700">{avgConf}%</p>
              </div>
              <div className="rounded-xl bg-green-50 border border-green-100 p-4">
                <div className="flex items-center gap-2 mb-1"><Tag className="h-4 w-4 text-green-600" /><p className="text-xs text-gray-500">Estimasi Harga Dasar</p></div>
                {baseEstimatedPrice > 0 ? <p className="text-lg font-serif font-bold text-green-700">{formatCurrency(baseEstimatedPrice)}</p>
                  : <p className="text-sm text-gray-400 italic">Belum ada data harga</p>}
              </div>
              <div className={`rounded-xl border p-4 ${hasWeightPrice ? "bg-emerald-50 border-emerald-100" : "bg-gray-50 border-gray-100"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Scale className={`h-4 w-4 ${hasWeightPrice ? "text-emerald-600" : "text-gray-400"}`} />
                  <p className="text-xs text-gray-500">{hasWeightPrice ? `Harga Berat (${audit.actual_weight} kg)` : "Berat Aktual"}</p>
                </div>
                {hasWeightPrice ? <p className="text-lg font-serif font-bold text-emerald-700">{formatCurrency(audit.weight_based_price)}</p>
                  : <p className="text-sm text-gray-400 italic">Belum diinput</p>}
              </div>
              <div className="col-span-2 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-700 p-4">
                <div className="flex items-center gap-2 mb-1">
                  {hasWeightPrice ? <Scale className="h-4 w-4 text-white/80" /> : <Tag className="h-4 w-4 text-white/80" />}
                  <p className="text-xs text-white/80">{hasWeightPrice ? "Total Estimasi (Berdasarkan Berat)" : "Total Estimasi Harga"}</p>
                </div>
                {finalPrice > 0 ? (
                  <>
                    <p className="text-2xl font-serif font-bold text-white">{formatCurrency(finalPrice)}</p>
                    {hasWeightPrice && <p className="text-xs text-white/60 mt-1">Berdasarkan berat aktual {audit.actual_weight} kg</p>}
                  </>
                ) : <p className="text-base text-white/70 italic">Belum ada data harga tersedia</p>}
              </div>
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Objek Terdeteksi ({totalDetections})</p>
            {groupedByLabel.length > 0 ? (
              <div className="space-y-3">
                {groupedByLabel.map(([label, items]) => (
                  <div key={label} className="rounded-xl border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                      <span className="font-serif font-bold text-gray-900 text-sm">{label}</span>
                      <Badge className="bg-cyan-100 text-cyan-800 text-xs">{items.length}× ditemukan</Badge>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {items.map((det, idx) => (
                        <div key={idx} className="px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-gray-400">Objek #{idx + 1}</span>
                            <span className="text-xs font-semibold text-cyan-600">Conf: {(det.confidence * 100).toFixed(1)}%</span>
                          </div>
                          {det.bbox.x2 > 0 && (
                            <p className="text-xs text-gray-400 font-mono mt-1">
                              BBox: ({det.bbox.x1.toFixed(2)}, {det.bbox.y1.toFixed(2)}) – ({det.bbox.x2.toFixed(2)}, {det.bbox.y2.toFixed(2)})
                            </p>
                          )}
                          {det.price ? (
                            <div className="flex flex-wrap gap-2 mt-2">
                              <div className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-2 py-1">
                                <Tag className="h-3 w-3 text-green-600" />
                                <span className="text-xs font-semibold text-green-700">
                                  {formatCurrency(det.price.current_price, det.price.currency || "IDR") ?? "—"}
                                  {det.price.unit ? ` / ${det.price.unit}` : ""}
                                </span>
                              </div>
                              {hasWeightPrice && audit.actual_weight && (
                                <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-1">
                                  <Scale className="h-3 w-3 text-emerald-600" />
                                  <span className="text-xs font-semibold text-emerald-700">
                                    {formatCurrency(Number(det.price.current_price) * audit.actual_weight, det.price.currency || "IDR") ?? "—"} ({audit.actual_weight} kg)
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : <p className="text-xs text-gray-400 italic mt-1">Harga belum tersedia</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400 italic">Tidak ada objek terdeteksi pada sesi ini.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function DetectionHistoryPage() {
  const [auditHistory, setAuditHistory] = useState<AuditItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [sortBy, setSortBy] = useState("newest")
  const [selectedAudit, setSelectedAudit] = useState<AuditItem | null>(null)

  const mergeWeightPrices = (items: AuditItem[]): AuditItem[] => {
    const weightPrices = loadWeightPrices()
    return items.map((item) => {
      const entry = weightPrices[String(item.audit_id)]
      if (!entry) return item
      return { ...item, weight_based_price: entry.weightBasedPrice, actual_weight: entry.weight }
    })
  }

  const loadHistory = async () => {
    setLoading(true)
    const cached = loadCachedHistory()
    if (cached.length > 0) setAuditHistory(mergeWeightPrices(cached))
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
      const res = await fetch("/api/history", { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: "no-store" })
      if (!res.ok) { setLoading(false); return }
      const data = await res.json()
      const normalized: AuditItem[] = Array.isArray(data) ? data.map(normalizeHistoryItem) : []
      const withWeight = mergeWeightPrices(normalized)
      saveCachedHistory(normalized)
      setAuditHistory(withWeight)
    } catch (error) { console.error("Gagal memuat riwayat:", error) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadHistory() }, [])

  const categories = useMemo(() => {
    const cats = new Set<string>(["all"])
    auditHistory.forEach((item) => getUniqueLabels(item).forEach((label) => cats.add(label)))
    return Array.from(cats)
  }, [auditHistory])

  const filteredAndSorted = useMemo(() => {
    const keyword = searchTerm.toLowerCase().trim()
    const filtered = auditHistory.filter((item) => {
      const labels = getUniqueLabels(item).join(" ").toLowerCase()
      const date = getDisplayDate(item.created_at).toLowerCase()
      const topLabel = item.top_label.toLowerCase()
      const matchesSearch = !keyword || labels.includes(keyword) || date.includes(keyword) || topLabel.includes(keyword)
      const matchesCategory = selectedCategory === "all" || getUniqueLabels(item).some((label) => label === selectedCategory)
      return matchesSearch && matchesCategory
    })
    if (sortBy === "newest") filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    else if (sortBy === "oldest") filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    else if (sortBy === "objects") filtered.sort((a, b) => getTotalDetections(b) - getTotalDetections(a))
    else if (sortBy === "confidence") filtered.sort((a, b) => Number(getAverageConfidence(b)) - Number(getAverageConfidence(a)))
    else if (sortBy === "price") filtered.sort((a, b) => getEstimatedPrice(b) - getEstimatedPrice(a))
    return filtered
  }, [auditHistory, searchTerm, selectedCategory, sortBy])

  const stats = useMemo(() => {
    const totalSessions = auditHistory.length
    const totalObjects = auditHistory.reduce((sum, item) => sum + getTotalDetections(item), 0)
    const averageConfidence = totalSessions
      ? (auditHistory.reduce((sum, item) => sum + Number(getAverageConfidence(item)), 0) / totalSessions).toFixed(1) : "0.0"
    const totalEstimatedPrice = auditHistory.reduce((sum, item) => sum + getEstimatedPrice(item), 0)
    return { totalSessions, totalObjects, averageConfidence, totalEstimatedPrice }
  }, [auditHistory])

  const handleOpenDetail = async (audit: AuditItem) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
      const res = await fetch(`/api/history/${audit.audit_id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: "no-store" })
      if (!res.ok) { setSelectedAudit(audit); return }
      const raw = await res.json()
      const detail = normalizeHistoryItem(raw)
      const weightPrices = loadWeightPrices()
      const entry = weightPrices[String(detail.audit_id)]
      const merged: AuditItem = entry ? { ...detail, weight_based_price: entry.weightBasedPrice, actual_weight: entry.weight } : detail
      if (!merged.detections.length && audit.detections.length) { setSelectedAudit({ ...audit, ...merged, detections: audit.detections }); return }
      setSelectedAudit(merged)
    } catch { setSelectedAudit(audit) }
  }

  const handleDeleteAudit = (auditId: number | string) => setDeleteTarget(String(auditId))

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    const id = deleteTarget
    const previousHistory = [...auditHistory]
    setDeleteTarget(null)
    setDeletingId(id)
    setAuditHistory((cur) => cur.filter((item) => String(item.audit_id) !== id))
    removeCachedItem(id)
    if (selectedAudit && String(selectedAudit.audit_id) === id) setSelectedAudit(null)
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
      const res = await fetch(`/api/history/${id}`, { method: "DELETE", headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (!res.ok) { setAuditHistory(previousHistory); saveCachedHistory(previousHistory); return }
      await loadHistory()
    } catch { setAuditHistory(previousHistory); saveCachedHistory(previousHistory) }
    finally { setDeletingId(null) }
  }

  const handleExportData = () => {
    const blob = new Blob([JSON.stringify(filteredAndSorted, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url; link.download = `riwayat-deteksi-${Date.now()}.json`; link.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{sharedStyles}</style>
      <Navigation />

      <DeleteDialog open={!!deleteTarget} onConfirm={handleConfirmDelete} onCancel={() => setDeleteTarget(null)} />

      {/* ── HERO ── */}
      <section className="relative bg-gradient-to-br from-gray-50 via-white to-cyan-50/30 py-24 overflow-hidden border-b border-gray-100">
        <div className="absolute top-[-80px] left-[-80px] w-[400px] h-[400px] rounded-full bg-cyan-200/25 blur-3xl animate-blob pointer-events-none" />
        <div className="absolute bottom-[-60px] right-[-60px] w-[350px] h-[350px] rounded-full bg-cyan-300/15 blur-3xl animate-blob-delay pointer-events-none" />
        <div className="absolute inset-0 hero-grid pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <div className="fade-up inline-flex items-center gap-2 bg-white border border-cyan-200 rounded-full px-4 py-2 shadow-md text-sm text-cyan-700 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
            </span>
            Rekam Jejak Deteksi Lengkap
          </div>
          <h1 className="fade-up delay-1 text-5xl md:text-6xl font-serif font-black text-gray-900 mb-4">
            Riwayat <span className="shimmer-text">Deteksi</span>
          </h1>
          <p className="fade-up delay-2 text-lg text-gray-500 max-w-2xl mx-auto">
            Setiap entri merupakan satu sesi pengambilan foto beserta seluruh objek yang terdeteksi oleh AI.
          </p>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Sesi", value: stats.totalSessions, color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-100" },
            { label: "Total Objek", value: stats.totalObjects, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" },
            { label: "Rata-rata Confidence", value: `${stats.averageConfidence}%`, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
            { label: "Total Estimasi Harga", value: formatCurrency(stats.totalEstimatedPrice) ?? "Rp 0", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", small: true },
          ].map(({ label, value, color, bg, border, small }) => (
            <div key={label} className={`stat-pill rounded-2xl ${bg} border ${border} p-4 text-center`}>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
              <p className={`font-serif font-bold ${color} ${small ? "text-xl" : "text-3xl"}`}>{value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FILTER BAR ── */}
      <section className="py-5 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
            <Input type="text" placeholder="Cari berdasarkan jenis objek atau tanggal..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 bg-gray-50 border-gray-200 rounded-xl focus:border-cyan-300 focus:ring-cyan-100" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-gray-700 focus:outline-none focus:border-cyan-300">
              <option value="all">Semua Jenis Objek</option>
              {categories.filter((c) => c !== "all").map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-gray-700 focus:outline-none focus:border-cyan-300">
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
              <option value="objects">Objek Terbanyak</option>
              <option value="confidence">Confidence Tertinggi</option>
              <option value="price">Estimasi Harga Tertinggi</option>
            </select>
            <Button onClick={handleExportData} className="btn-glow w-full bg-cyan-600 hover:bg-cyan-700 rounded-xl">
              <Download className="h-4 w-4 mr-2" />Export Data
            </Button>
          </div>
        </div>
      </section>

      {/* ── LIST ── */}
      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-5 flex items-center justify-between">
            <p className="text-gray-500 text-sm">
              {loading ? "Memuat data riwayat..." : (
                <>Menampilkan <span className="font-bold text-gray-900">{filteredAndSorted.length}</span> dari{" "}
                  <span className="font-bold text-gray-900">{auditHistory.length}</span> sesi deteksi</>
              )}
            </p>
          </div>
          <div className="space-y-4">
            {loading && auditHistory.length === 0 ? (
              <div className="rounded-2xl bg-white shadow-sm p-12 text-center">
                <div className="animate-float inline-block mb-4"><Camera className="h-14 w-14 text-cyan-200" /></div>
                <p className="text-gray-400">Memuat data sesi...</p>
              </div>
            ) : filteredAndSorted.length > 0 ? (
              filteredAndSorted.map((audit, i) => (
                <div key={audit.audit_id} className="fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                  <SessionCard audit={audit} deletingId={deletingId} onDetail={handleOpenDetail} onDelete={handleDeleteAudit} />
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-white shadow-sm p-12 text-center border border-dashed border-gray-200">
                <Camera className="h-14 w-14 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500 mb-6">Belum ada sesi deteksi yang tersimpan.</p>
                <Link href="/classify">
                  <Button className="btn-glow bg-cyan-600 hover:bg-cyan-700 rounded-xl px-8">Mulai Deteksi</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ── CTA ── */}
      <section className="py-10 bg-white">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { icon: BarChart3, title: "Laporan Analitik", desc: "Visualisasi dan analisis data dari seluruh sesi deteksi.", href: "/reports", color: "text-cyan-600", btn: "bg-cyan-600 hover:bg-cyan-700", label: "Buka Laporan" },
            { icon: Camera, title: "Sesi Deteksi Baru", desc: "Ambil foto baru untuk memulai sesi deteksi berikutnya.", href: "/classify", color: "text-amber-500", btn: "bg-amber-500 hover:bg-amber-600", label: "Mulai Deteksi" },
          ].map(({ icon: Icon, title, desc, href, color, btn, label }) => (
            <div key={title} className="card-session rounded-2xl bg-white shadow-md overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-cyan-400 to-cyan-600" />
              <div className="p-8 text-center">
                <Icon className={`h-14 w-14 ${color} mx-auto mb-4`} />
                <h3 className="text-xl font-serif font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 mb-6">{desc}</p>
                <Link href={href}><Button className={`w-full ${btn} rounded-xl btn-glow`}>{label}</Button></Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {selectedAudit && <DetailModal audit={selectedAudit} onClose={() => setSelectedAudit(null)} />}

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 text-white py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            <div className="md:col-span-2">
              <h3 className="text-2xl font-serif font-black text-cyan-400 mb-3">HargAI</h3>
              <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">
                HargAI adalah platform klasifikasi sampah berbasis AI yang membantu pengguna mengenali jenis sampah dan melihat estimasi harga secara cepat.
              </p>
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