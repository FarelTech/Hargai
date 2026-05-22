"use client"

import { useEffect, useMemo, useState } from "react"
import Navigation from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend,
} from "recharts"
import {
  BarChart3, PieChart as PieChartIcon, CalendarRange, Download, RefreshCw,
  TrendingUp, Package, Target, Layers, FileText, ArrowUpRight, ArrowDownRight, Camera,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

// ─── Types ─────────────────────────────────────────────────────────────────────
type CategoryEntry = { label: string; count: number }
type DailyEntry = { date: string; count: number }
type ReportsSummary = {
  total_audits: number; total_objects: number; average_confidence: number
  category_distribution: CategoryEntry[]; daily_trend: DailyEntry[]
}

const PIE_COLORS = ["#06b6d4","#10b981","#f59e0b","#8b5cf6","#ef4444","#64748b","#f97316","#ec4899"]

// ─── Shared animations CSS ─────────────────────────────────────────────────────
const sharedStyles = `
  @keyframes blob { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,-30px) scale(1.08)} 66%{transform:translate(-20px,20px) scale(0.94)} }
  @keyframes fadeInUp { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
  @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
  @keyframes float { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-8px)} }
  @keyframes gridFade { from{opacity:0} to{opacity:1} }
  @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

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

  .card-report {
    transition: transform 0.35s cubic-bezier(.22,.68,0,1.2), box-shadow 0.35s ease, border-color 0.3s ease;
    border: 1px solid transparent;
  }
  .card-report:hover { transform: translateY(-3px); box-shadow: 0 16px 36px -8px rgba(8,145,178,0.12); border-color: rgba(8,145,178,0.15); }

  .stat-card-report { transition: transform 0.3s ease, box-shadow 0.3s ease; }
  .stat-card-report:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(8,145,178,0.15); }

  .btn-glow { transition: box-shadow 0.3s ease, transform 0.2s ease; }
  .btn-glow:hover { box-shadow: 0 0 20px 3px rgba(8,145,178,0.3); transform: translateY(-1px); }

  .range-btn { transition: all 0.2s ease; }
  .range-btn-active { background: #0891b2; color: #fff; box-shadow: 0 4px 12px rgba(8,145,178,0.35); }
  .range-btn-inactive { background: #fff; color: #374151; border: 1px solid #e5e7eb; }
  .range-btn-inactive:hover { background: #f8fafc; border-color: rgba(8,145,178,0.3); }

  .table-row-report { transition: background 0.15s ease; }
  .table-row-report:hover { background: rgba(8,145,178,0.04); }

  .dominant-banner {
    background: linear-gradient(135deg, #0891b2 0%, #0e7490 60%, #164e63 100%);
  }
`

// ─── Custom Tooltips ────────────────────────────────────────────────────────────
function CustomBarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl bg-white border border-gray-100 shadow-xl p-3 text-sm">
      <p className="font-serif font-bold text-gray-900 mb-1">{label}</p>
      <p className="text-cyan-600 font-semibold">{payload[0].value} audit</p>
    </div>
  )
}
function CustomLineTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl bg-white border border-gray-100 shadow-xl p-3 text-sm">
      <p className="font-bold text-gray-900 mb-1">{label}</p>
      <p className="text-emerald-600 font-semibold">{payload[0].value} audit</p>
    </div>
  )
}
function CustomPieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl bg-white border border-gray-100 shadow-xl p-3 text-sm">
      <p className="font-serif font-bold text-gray-900 mb-1">{payload[0].name}</p>
      <p className="text-violet-600 font-semibold">{payload[0].value} audit</p>
      <p className="text-gray-400 text-xs">{payload[0].payload.percent?.toFixed(1)}%</p>
    </div>
  )
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, bg, color, border }: {
  label: string; value: string | number; icon: React.ReactNode; bg: string; color: string; border: string
}) {
  return (
    <div className={`stat-card-report rounded-2xl ${bg} border ${border} p-5`}>
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white shadow-sm mb-4`}>{icon}</div>
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
      <p className={`text-3xl font-serif font-bold ${color} break-words`}>{value}</p>
    </div>
  )
}

// ─── Filter Bar ─────────────────────────────────────────────────────────────────
function FilterBar({ activeRange, onRangeChange, onRefresh, onExport, loading }: {
  activeRange: string; onRangeChange: (r: string) => void
  onRefresh: () => void; onExport: () => void; loading: boolean
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        {[{ label: "7 Hari", value: "7d" }, { label: "30 Hari", value: "30d" }, { label: "Semua", value: "all" }].map((range) => (
          <button key={range.value} onClick={() => onRangeChange(range.value)}
            className={`range-btn px-4 py-1.5 rounded-xl text-sm font-semibold ${activeRange === range.value ? "range-btn-active" : "range-btn-inactive"}`}>
            {range.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={onRefresh} disabled={loading} variant="outline"
          className="border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />Perbarui
        </Button>
        <Button onClick={onExport} className="btn-glow bg-cyan-600 hover:bg-cyan-700 rounded-xl" size="sm">
          <Download className="h-4 w-4 mr-2" />Export Laporan
        </Button>
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function ReportsAnalyticsPage() {
  const [summary, setSummary] = useState<ReportsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeRange, setActiveRange] = useState("7d")

  const fetchData = async () => {
    setLoading(true); setError(null)
    try {
      const token = localStorage.getItem("access_token")
      const res = await fetch("/api/reports/summary", { headers: { Authorization: `Bearer ${token ?? ""}` }, cache: "no-store" })
      if (!res.ok) { setError(`Gagal memuat data laporan (${res.status}).`); setSummary(null); return }
      const data: ReportsSummary = await res.json()
      setSummary(data)
    } catch { setError("Backend tidak dapat dihubungi."); setSummary(null) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const distributionData = useMemo(() => {
    if (!summary) return []
    const categories = Array.isArray(summary.category_distribution) ? summary.category_distribution : []
    const total = categories.reduce((sum, entry) => sum + Number(entry.count ?? 0), 0)
    return categories.map((entry) => ({
      name: entry.label,
      value: Number(entry.count ?? 0),
      percent: total > 0 ? (Number(entry.count ?? 0) / total) * 100 : 0,
    }))
  }, [summary])

  const trendData = useMemo(() => {
    if (!summary) return []
    let entries = Array.isArray(summary.daily_trend) ? summary.daily_trend : []
    if (activeRange === "7d") entries = entries.slice(-7)
    else if (activeRange === "30d") entries = entries.slice(-30)
    return entries.map((entry) => ({
      label: new Date(`${entry.date}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
      total: Number(entry.count ?? 0),
    }))
  }, [summary, activeRange])

  const dominantCategory = useMemo(() => {
    if (!distributionData.length) return null
    return [...distributionData].sort((a, b) => b.value - a.value)[0].name
  }, [distributionData])

  const trendDelta = useMemo(() => {
    if (trendData.length < 2) return null
    const last = trendData[trendData.length - 1].total
    const prev = trendData[trendData.length - 2].total
    if (prev === 0) return null
    const pct = Math.round(((last - prev) / prev) * 100)
    return { pct, direction: pct >= 0 ? "up" : "down" } as const
  }, [trendData])

  const hasCategoryData = distributionData.length > 0
  const hasTrendData = trendData.length > 0
  const hasChartData = hasCategoryData || hasTrendData

  const handleExport = () => {
    if (!summary) return
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), summary }, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = `laporan-analitik-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{sharedStyles}</style>
      <Navigation />

      {/* ── HERO ── */}
      <section className="relative bg-gradient-to-br from-gray-50 via-white to-cyan-50/30 py-24 overflow-hidden border-b border-gray-100">
        <div className="absolute top-[-80px] left-[-80px] w-[400px] h-[400px] rounded-full bg-violet-200/20 blur-3xl animate-blob pointer-events-none" />
        <div className="absolute bottom-[-60px] right-[-60px] w-[350px] h-[350px] rounded-full bg-cyan-200/20 blur-3xl animate-blob-delay pointer-events-none" />
        <div className="absolute inset-0 hero-grid pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <div className="fade-up inline-flex items-center gap-2 bg-white border border-violet-200 rounded-full px-4 py-2 shadow-md text-sm text-violet-700 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
            </span>
            Analitik Real-time
          </div>
          <h1 className="fade-up delay-1 text-4xl md:text-5xl font-serif font-black text-gray-900 mb-4">
            Laporan &amp; <span className="shimmer-text">Analitik</span>
          </h1>
          <p className="fade-up delay-2 text-lg text-gray-500 max-w-2xl mx-auto">
            Visualisasi data hasil audit sampah dari seluruh sesi deteksi secara komprehensif.
          </p>
        </div>
      </section>

      {/* ── ERROR BANNER ── */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 pt-8">
          <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4 flex items-center justify-between gap-4">
            <p className="text-red-700 text-sm font-semibold">{error}</p>
            <Button onClick={fetchData} size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-100 shrink-0 rounded-xl">
              <RefreshCw className="h-4 w-4 mr-2" />Coba Lagi
            </Button>
          </div>
        </div>
      )}

      {/* ── STAT CARDS ── */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="fade-up delay-1">
            <StatCard label="Total Audit" value={loading ? "—" : (summary?.total_audits ?? 0)}
              icon={<FileText className="w-5 h-5 text-cyan-600" />} bg="bg-cyan-50" color="text-cyan-700" border="border-cyan-100" />
          </div>
          <div className="fade-up delay-2">
            <StatCard label="Total Objek Terdeteksi" value={loading ? "—" : (summary?.total_objects ?? 0)}
              icon={<Package className="w-5 h-5 text-violet-600" />} bg="bg-violet-50" color="text-violet-700" border="border-violet-100" />
          </div>
          <div className="fade-up delay-3">
            <StatCard label="Rata-rata Confidence"
              value={loading ? "—" : summary && summary.average_confidence > 0 ? `${(summary.average_confidence * 100).toFixed(1)}%` : "—"}
              icon={<Target className="w-5 h-5 text-amber-600" />} bg="bg-amber-50" color="text-amber-600" border="border-amber-100" />
          </div>
          <div className="fade-up delay-4">
            <StatCard label="Kategori Unik" value={loading ? "—" : distributionData.length}
              icon={<Layers className="w-5 h-5 text-emerald-600" />} bg="bg-emerald-50" color="text-emerald-700" border="border-emerald-100" />
          </div>
        </div>
      </section>

      {/* ── DOMINANT CATEGORY BANNER ── */}
      {dominantCategory && (
        <section className="pb-4">
          <div className="max-w-7xl mx-auto px-4">
            <div className="dominant-banner rounded-2xl p-6 flex items-center justify-between gap-4 shadow-lg shadow-cyan-900/10">
              <div>
                <p className="text-cyan-100 text-xs font-semibold uppercase tracking-widest mb-1">Kategori Paling Banyak Terdeteksi</p>
                <p className="text-white text-2xl font-serif font-bold">{dominantCategory}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-white/30 shrink-0" />
            </div>
          </div>
        </section>
      )}

      {/* ── LOADING ── */}
      {loading && (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="rounded-2xl bg-white shadow-sm p-10 text-center">
            <div className="animate-float inline-block mb-4"><BarChart3 className="h-12 w-12 text-cyan-200" /></div>
            <p className="text-gray-400">Memuat data laporan...</p>
          </div>
        </div>
      )}

      {/* ── NO DATA ── */}
      {!loading && !hasChartData && (
        <section className="py-10">
          <div className="max-w-7xl mx-auto px-4">
            <div className="rounded-2xl bg-white shadow-sm p-12 text-center border border-dashed border-gray-200">
              <div className="animate-float inline-block mb-4"><BarChart3 className="h-16 w-16 text-gray-200" /></div>
              <p className="text-gray-500 text-lg mb-6">{error ? "Data tidak dapat dimuat dari server." : "Belum ada data audit untuk dianalisis."}</p>
              {!error && <Link href="/classify"><Button className="btn-glow bg-cyan-600 hover:bg-cyan-700 rounded-xl px-8">Mulai Deteksi</Button></Link>}
            </div>
          </div>
        </section>
      )}

      {/* ── CHARTS ── */}
      {!loading && hasChartData && (
        <section className="py-8">
          <div className="max-w-7xl mx-auto px-4 space-y-6">
            <FilterBar activeRange={activeRange} onRangeChange={setActiveRange} onRefresh={fetchData} onExport={handleExport} loading={loading} />

            {hasCategoryData && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Bar Chart */}
                <div className="card-report rounded-2xl bg-white shadow-md overflow-hidden fade-up delay-1">
                  <div className="h-1 w-full bg-gradient-to-r from-cyan-400 to-cyan-600" />
                  <div className="border-b border-gray-50 px-6 py-4">
                    <div className="flex items-center gap-2 mb-0.5">
                      <BarChart3 className="w-5 h-5 text-cyan-600" />
                      <h3 className="font-serif font-bold text-gray-900">Distribusi Kategori</h3>
                    </div>
                    <p className="text-sm text-gray-400">Jumlah audit per kategori sampah.</p>
                  </div>
                  <div className="p-5">
                    <div className="h-[340px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={distributionData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                          <Tooltip content={<CustomBarTooltip />} />
                          <Bar dataKey="value" name="Jumlah Audit" radius={[8, 8, 0, 0]}>
                            {distributionData.map((entry, index) => <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Pie Chart */}
                <div className="card-report rounded-2xl bg-white shadow-md overflow-hidden fade-up delay-2">
                  <div className="h-1 w-full bg-gradient-to-r from-violet-400 to-violet-600" />
                  <div className="border-b border-gray-50 px-6 py-4">
                    <div className="flex items-center gap-2 mb-0.5">
                      <PieChartIcon className="w-5 h-5 text-violet-600" />
                      <h3 className="font-serif font-bold text-gray-900">Proporsi Kategori</h3>
                    </div>
                    <p className="text-sm text-gray-400">Distribusi proporsi tiap kategori.</p>
                  </div>
                  <div className="p-5">
                    <div className="h-[340px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={distributionData} cx="50%" cy="45%" outerRadius={110} innerRadius={48}
                            dataKey="value" nameKey="name" paddingAngle={2}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                            {distributionData.map((entry, index) => <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={<CustomPieTooltip />} />
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Line Chart */}
            {hasTrendData && (
              <div className="card-report rounded-2xl bg-white shadow-md overflow-hidden fade-up delay-3">
                <div className="h-1 w-full bg-gradient-to-r from-emerald-400 to-emerald-600" />
                <div className="border-b border-gray-50 px-6 py-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <CalendarRange className="w-5 h-5 text-emerald-600" />
                        <h3 className="font-serif font-bold text-gray-900">Tren Audit per Hari</h3>
                      </div>
                      <p className="text-sm text-gray-400">
                        {activeRange === "7d" ? "7 hari terakhir" : activeRange === "30d" ? "30 hari terakhir" : "Semua periode"} berdasarkan jumlah audit harian.
                      </p>
                    </div>
                    {trendDelta && (
                      <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold ${trendDelta.direction === "up" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                        {trendDelta.direction === "up" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        {Math.abs(trendDelta.pct)}% vs kemarin
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-5">
                  <div className="h-[380px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomLineTooltip />} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
                        <Line type="monotone" dataKey="total" name="Jumlah Audit" stroke="#10b981" strokeWidth={3}
                          dot={{ r: 5, fill: "#10b981", strokeWidth: 0 }} activeDot={{ r: 7, fill: "#059669" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Summary Table */}
            {hasCategoryData && (
              <div className="card-report rounded-2xl bg-white shadow-md overflow-hidden fade-up delay-4">
                <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-amber-500" />
                <div className="border-b border-gray-50 px-6 py-4">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Layers className="w-5 h-5 text-amber-500" />
                    <h3 className="font-serif font-bold text-gray-900">Ringkasan Per Kategori</h3>
                  </div>
                  <p className="text-sm text-gray-400">Detail jumlah dan proporsi setiap kategori sampah.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="text-left py-3 px-6 text-xs font-semibold uppercase tracking-widest text-gray-400">Kategori</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-widest text-gray-400">Jumlah</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-widest text-gray-400">Proporsi</th>
                        <th className="py-3 px-6" />
                      </tr>
                    </thead>
                    <tbody>
                      {[...distributionData].sort((a, b) => b.value - a.value).map((entry, index) => (
                        <tr key={entry.name} className="table-row-report border-b border-gray-50">
                          <td className="py-3 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: PIE_COLORS[index % PIE_COLORS.length] }} />
                              <span className="font-semibold text-gray-900">{entry.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-gray-900">{entry.value}</td>
                          <td className="py-3 px-4 text-center text-gray-500">{entry.percent.toFixed(1)}%</td>
                          <td className="py-3 px-6">
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${entry.percent}%`, background: PIE_COLORS[index % PIE_COLORS.length] }} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <div className="section-divider" />

      {/* ── CTA ── */}
      <section className="py-10 bg-white">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { icon: FileText, title: "Riwayat Deteksi", desc: "Lihat seluruh rekam jejak hasil deteksi secara kronologis.", href: "/history", color: "text-cyan-600", topBar: "from-cyan-400 to-cyan-600", btn: "bg-cyan-600 hover:bg-cyan-700", label: "Buka Riwayat" },
            { icon: Camera, title: "Sesi Deteksi Baru", desc: "Ambil foto baru untuk memulai sesi deteksi berikutnya.", href: "/classify", color: "text-amber-500", topBar: "from-amber-400 to-amber-500", btn: "bg-amber-500 hover:bg-amber-600", label: "Mulai Deteksi" },
          ].map(({ icon: Icon, title, desc, href, color, topBar, btn, label }) => (
            <div key={title} className="card-report rounded-2xl bg-white shadow-md overflow-hidden">
              <div className={`h-1 w-full bg-gradient-to-r ${topBar}`} />
              <div className="p-8 text-center">
                <Icon className={`h-14 w-14 ${color} mx-auto mb-4`} />
                <h3 className="text-xl font-serif font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 mb-6">{desc}</p>
                <Link href={href}><Button className={`btn-glow w-full ${btn} rounded-xl`}>{label}</Button></Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 text-white py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            <div className="md:col-span-2">
              <h3 className="text-2xl font-serif font-black text-cyan-400 mb-3">HargAI</h3>
              <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">HargAI adalah platform klasifikasi sampah berbasis AI yang membantu pengguna mengenali jenis sampah dan melihat estimasi harga secara cepat.</p>
            </div>
            <div className="md:text-right">
              <h4 className="text-lg font-serif font-bold mb-4">Mulai Menggunakan</h4>
              <p className="text-gray-400 text-sm mb-4">Daftar akun untuk mengakses fitur.</p>
              <Link href="/register"><Button className="btn-glow bg-cyan-600 hover:bg-cyan-700 text-white font-bold">Sign Up / Register</Button></Link>
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