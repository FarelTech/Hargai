"use client"

import { useEffect, useState, useCallback } from "react"
import Navigation from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getStoredUser, getStoredToken } from "@/lib/auth"
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts"
import {
  ScanLine, LayoutGrid, TrendingUp, Users,
  Pencil, Trash2, ArrowRight, Clock, CheckCircle,
} from "lucide-react"
import Link from "next/link"

// ─── Types ────────────────────────────────────────────────────────────────────

type User = {
  id: string | number
  username: string
  email: string
  role: string
}

type AuditHistory = {
  audit_id: string
  image_url: string
  top_label: string
  total_detections: number
  average_confidence: number
  created_at: string
}

type CategoryItem = { label: string; count: number }
type DailyItem   = { date: string; count: number }

type Stats = {
  total_audits: number
  total_objects: number
  average_confidence: number
  category_distribution: CategoryItem[]
  daily_trend: DailyItem[]
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const CAT_COLORS = [
  "#0891b2","#f59e0b","#10b981","#ef4444",
  "#8b5cf6","#ec4899","#84cc16","#f97316",
]

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, delay = "delay-1",
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  delay?: string
}) {
  return (
    <Card className={`stat-card fade-up ${delay} border border-gray-100 shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group cursor-default`}>
      <div className="h-1 w-full bg-gradient-to-r from-cyan-400 to-cyan-600" />
      <CardHeader className="pb-2 pt-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-sans font-semibold text-gray-400 uppercase tracking-widest">
            {label}
          </CardTitle>
          <div className="icon-wrap w-10 h-10 bg-cyan-50 rounded-xl flex items-center justify-center transition-colors duration-300 group-hover:bg-cyan-100">
            <span className="text-cyan-600">{icon}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-5">
        <p className="text-4xl font-serif font-black text-gray-900 leading-none mb-1">
          {value}
        </p>
        {sub && <p className="text-xs text-gray-400 font-sans mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditUserModal({
  user, onClose, onSaved,
}: { user: User; onClose: () => void; onSaved: (u: User) => void }) {
  const [username, setUsername] = useState(user.username)
  const [email, setEmail]       = useState(user.email)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")

  const handleSave = async () => {
    setLoading(true); setError("")
    try {
      const token = getStoredToken()
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username, email }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.detail || "Gagal memperbarui profil")
      }
      const updated = await res.json()
      localStorage.setItem("user", JSON.stringify({ ...user, ...updated }))
      onSaved({ ...user, ...updated })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8 border border-gray-100 animate-modal">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
            <Pencil className="h-5 w-5 text-cyan-600" />
          </div>
          <h2 className="text-2xl font-serif font-black text-gray-900">Edit Profil</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-sans font-semibold text-gray-500 block mb-1.5 uppercase tracking-widest">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-sans font-semibold text-gray-500 block mb-1.5 uppercase tracking-widest">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
            />
          </div>
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-sans">
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-200 text-gray-600 font-sans rounded-xl hover:bg-gray-50"
            >
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-sans font-bold rounded-xl btn-primary-glow"
            >
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteUserModal({
  onClose, onDeleted,
}: { onClose: () => void; onDeleted: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState("")

  const handleDelete = async () => {
    setLoading(true); setError("")
    try {
      const token = getStoredToken()
      const res = await fetch("/api/users/me", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.detail || "Gagal menghapus akun")
      }
      localStorage.removeItem("user")
      localStorage.removeItem("token")
      onDeleted()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-8 text-center border border-gray-100 animate-modal">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Trash2 className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-serif font-black text-gray-900 mb-2">Hapus Akun</h2>
        <p className="text-gray-500 font-sans text-sm mb-6 leading-relaxed">
          Tindakan ini tidak dapat dibatalkan. Semua data Anda akan dihapus secara permanen.
        </p>
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-sans mb-4">
            {error}
          </div>
        )}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-gray-200 text-gray-600 font-sans rounded-xl"
          >
            Batal
          </Button>
          <Button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-sans font-bold rounded-xl"
          >
            {loading ? "Menghapus..." : "Hapus Akun"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [user, setUser]         = useState<User | null>(null)
  const [stats, setStats]       = useState<Stats | null>(null)
  const [history, setHistory]   = useState<AuditHistory[]>([])
  const [loading, setLoading]   = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  const fetchAll = useCallback(async () => {
    try {
      const stored = getStoredUser()
      if (stored) setUser(stored as unknown as User)

      const token = getStoredToken()
      if (!token) return

      const headers = { Authorization: `Bearer ${token}` }

      const [userRes, statsRes, historyRes] = await Promise.allSettled([
        fetch("/api/users/me",         { headers }),
        fetch("/api/reports/summary",  { headers }),
        fetch("/api/history",          { headers }),
      ])

      if (userRes.status === "fulfilled" && userRes.value.ok) {
        const d = await userRes.value.json()
        setUser(d)
        localStorage.setItem("user", JSON.stringify(d))
      }
      if (statsRes.status === "fulfilled" && statsRes.value.ok)
        setStats(await statsRes.value.json())
      if (historyRes.status === "fulfilled" && historyRes.value.ok)
        setHistory(await historyRes.value.json())
    } catch {
      // stored user still shown
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const recentActivity = history.slice(0, 5)

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    })

  const confidenceBadge = (c: number) =>
    c >= 0.8
      ? "bg-cyan-100 text-cyan-700"
      : c >= 0.6
      ? "bg-amber-100 text-amber-700"
      : "bg-red-100 text-red-600"

  return (
    <>
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.08); }
          66% { transform: translate(-20px, 20px) scale(0.94); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(0.9); opacity: 0.6; }
          70%  { transform: scale(1.15); opacity: 0; }
          100% { transform: scale(1.15); opacity: 0; }
        }
        @keyframes gridFade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }

        .animate-blob       { animation: blob 9s infinite ease-in-out; }
        .animate-blob-delay { animation: blob 11s infinite ease-in-out 3s; }
        .animate-float      { animation: float 4s ease-in-out infinite; }
        .animate-ping       { animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite; }

        .fade-up   { animation: fadeInUp   0.7s ease both; }
        .fade-left { animation: fadeInLeft 0.7s ease both; }
        .fade-right{ animation: fadeInRight 0.7s ease both; }
        .animate-modal { animation: modalIn 0.35s cubic-bezier(.22,.68,0,1.2) both; }

        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        .delay-3 { animation-delay: 0.35s; }
        .delay-4 { animation-delay: 0.5s; }
        .delay-5 { animation-delay: 0.65s; }

        .hero-grid {
          background-image:
            linear-gradient(rgba(8,145,178,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(8,145,178,0.06) 1px, transparent 1px);
          background-size: 40px 40px;
          animation: gridFade 1.2s ease both;
        }

        .shimmer-text {
          background: linear-gradient(
            90deg,
            #0891b2 0%, #06b6d4 30%, #67e8f9 50%, #06b6d4 70%, #0891b2 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }

        .btn-primary-glow {
          transition: box-shadow 0.3s ease, transform 0.2s ease;
        }
        .btn-primary-glow:hover {
          box-shadow: 0 0 24px 4px rgba(8,145,178,0.35);
          transform: translateY(-2px);
        }

        .stat-card {
          transition: transform 0.3s cubic-bezier(.22,.68,0,1.2), box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .stat-card:hover {
          transform: translateY(-6px) scale(1.01);
          box-shadow: 0 20px 40px -10px rgba(8,145,178,0.18);
          border-color: rgba(8,145,178,0.25) !important;
        }
        .stat-card:hover .icon-wrap { background: rgba(8,145,178,0.15); }

        .card-hover {
          transition: transform 0.35s cubic-bezier(.22,.68,0,1.2),
                      box-shadow 0.35s ease,
                      border-color 0.3s ease;
        }
        .card-hover:hover {
          transform: translateY(-6px) scale(1.01);
          box-shadow: 0 20px 40px -10px rgba(8,145,178,0.18);
          border-color: rgba(8,145,178,0.25) !important;
        }

        .activity-row {
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
        }
        .activity-row:hover {
          transform: translateX(4px);
          box-shadow: 0 8px 24px -6px rgba(8,145,178,0.12);
          border-color: rgba(8,145,178,0.2) !important;
        }

        .nav-card {
          transition: transform 0.35s cubic-bezier(.22,.68,0,1.2), box-shadow 0.35s ease, border-color 0.3s ease;
        }
        .nav-card:hover {
          transform: translateY(-8px) scale(1.01);
          box-shadow: 0 24px 48px -12px rgba(8,145,178,0.18);
          border-color: rgba(8,145,178,0.3) !important;
        }
        .nav-card:hover .nav-icon { background: rgba(8,145,178,0.15); }

        .check-item {
          transition: transform 0.25s ease, background 0.25s ease;
        }
        .check-item:hover { transform: translateX(4px); }

        .section-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(8,145,178,0.25), transparent);
        }

        .user-card-actions button {
          transition: all 0.2s ease;
        }

        .badge-float {
          animation: float 3.5s ease-in-out infinite;
        }

        .cta-bg {
          background: linear-gradient(135deg, #0891b2 0%, #0e7490 60%, #164e63 100%);
        }

        .thumbnail-wrap {
          transition: transform 0.3s ease;
        }
        .activity-row:hover .thumbnail-wrap {
          transform: scale(1.08);
        }

        .skeleton {
          background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
      `}</style>

      <div className="min-h-screen bg-white">
        <Navigation />

        {showEdit && user && (
          <EditUserModal
            user={user}
            onClose={() => setShowEdit(false)}
            onSaved={(u) => { setUser(u); setShowEdit(false) }}
          />
        )}
        {showDelete && (
          <DeleteUserModal
            onClose={() => setShowDelete(false)}
            onDeleted={() => { window.location.href = "/login" }}
          />
        )}

        {/* ── Hero Banner ─────────────────────────────────────────────────── */}
        <section className="relative bg-gradient-to-br from-gray-50 via-white to-cyan-50/30 py-24 overflow-hidden">
          {/* Animated background blobs */}
          <div className="absolute top-[-80px] left-[-80px] w-[400px] h-[400px] rounded-full bg-cyan-200/25 blur-3xl animate-blob pointer-events-none" />
          <div className="absolute bottom-[-60px] right-[-60px] w-[350px] h-[350px] rounded-full bg-cyan-300/15 blur-3xl animate-blob-delay pointer-events-none" />

          {/* Grid overlay */}
          <div className="absolute inset-0 hero-grid pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Floating badge */}
            <div className="flex justify-center mb-8 fade-up">
              <div className="badge-float inline-flex items-center gap-2 bg-white border border-cyan-200 rounded-full px-4 py-2 shadow-md text-sm font-sans text-cyan-700">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                </span>
                Pusat Monitoring Real-time
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-8">
              <div className="fade-left">
                <p className="text-xs font-sans font-semibold text-cyan-600 uppercase tracking-widest mb-3">
                  Dashboard Utama
                </p>
                <h1 className="text-4xl md:text-5xl font-serif font-black text-gray-900 mb-3 leading-tight">
                  Selamat Datang{" "}
                  {user && (
                    <span className="shimmer-text">&mdash; {user.username}</span>
                  )}
                </h1>
                <p className="text-lg text-gray-500 font-sans max-w-xl leading-relaxed">
                  Ringkasan data deteksi &amp; audit sampah secara real-time untuk monitoring sistem yang efisien.
                </p>
              </div>

              {/* User info card with edit / delete */}
              {user && (
                <div className="flex-shrink-0 fade-right">
                  <Card className="border border-gray-100 shadow-lg rounded-2xl overflow-hidden user-card-actions">
                    <div className="h-1 w-full bg-gradient-to-r from-cyan-400 to-cyan-600" />
                    <CardContent className="pt-5 pb-4 px-5">
                      <div className="flex items-center gap-4">
                        <div className="relative w-12 h-12 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-xl flex items-center justify-center text-white font-serif font-black text-xl shadow-md">
                          {user.username?.[0]?.toUpperCase()}
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white" />
                        </div>
                        <div>
                          <p className="font-serif font-bold text-gray-900">{user.username}</p>
                          <p className="text-xs font-sans text-cyan-600 uppercase font-semibold tracking-wide">{user.role}</p>
                          <p className="text-xs font-sans text-gray-400">{user.email}</p>
                        </div>
                        <div className="flex flex-col gap-1.5 ml-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowEdit(true)}
                            className="border-cyan-200 text-cyan-600 hover:bg-cyan-50 h-8 px-3 font-sans text-xs rounded-lg"
                          >
                            <Pencil className="h-3 w-3 mr-1" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowDelete(true)}
                            className="border-red-200 text-red-500 hover:bg-red-50 h-8 px-3 font-sans text-xs rounded-lg"
                          >
                            <Trash2 className="h-3 w-3 mr-1" /> Hapus
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="section-divider" />

        {/* ── Stat Cards ──────────────────────────────────────────────────── */}
        <section className="py-14 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-36 skeleton rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  icon={<LayoutGrid className="h-5 w-5" />}
                  label="Total Audit"
                  value={stats?.total_audits ?? history.length}
                  sub="sesi deteksi"
                  delay="delay-1"
                />
                <StatCard
                  icon={<ScanLine className="h-5 w-5" />}
                  label="Objek Terdeteksi"
                  value={stats?.total_objects ?? "—"}
                  sub="total objek"
                  delay="delay-2"
                />
                <StatCard
                  icon={<Users className="h-5 w-5" />}
                  label="Kategori Sampah"
                  value={stats?.category_distribution?.length ?? "—"}
                  sub="jenis berbeda"
                  delay="delay-3"
                />
                <StatCard
                  icon={<TrendingUp className="h-5 w-5" />}
                  label="Avg Confidence"
                  value={
                    stats?.average_confidence
                      ? `${(stats.average_confidence * 100).toFixed(0)}%`
                      : "—"
                  }
                  sub="confidence score"
                  delay="delay-4"
                />
              </div>
            )}
          </div>
        </section>

        <div className="section-divider" />

        {/* ── Charts ──────────────────────────────────────────────────────── */}
        <section className="py-20 bg-gray-50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-100/40 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center mb-12 fade-up">
              <span className="inline-block text-xs font-sans font-semibold tracking-widest text-cyan-600 uppercase bg-cyan-50 border border-cyan-100 rounded-full px-4 py-1.5 mb-4">
                Visualisasi Data
              </span>
              <h2 className="text-3xl md:text-4xl font-serif font-black text-gray-900 mb-3">
                Grafik Ringkasan
              </h2>
              <p className="text-lg text-gray-500 font-sans max-w-2xl mx-auto leading-relaxed">
                Visualisasi data deteksi sampah untuk memahami pola pengelolaan secara lebih intuitif.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Daily Trend */}
              <Card className="card-hover fade-left border border-gray-100 shadow-md bg-white rounded-2xl overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-cyan-400 to-cyan-600" />
                <CardHeader className="pt-6">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 bg-cyan-50 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-cyan-600" />
                    </div>
                    <CardTitle className="text-xl font-serif font-bold text-gray-900">
                      Tren Deteksi 7 Hari Terakhir
                    </CardTitle>
                  </div>
                  <p className="text-sm text-gray-400 font-sans">Jumlah audit per hari</p>
                </CardHeader>
                <CardContent className="pb-6">
                  {stats?.daily_trend?.length ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={stats.daily_trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: "#9ca3af", fontFamily: "sans-serif" }}
                          tickFormatter={(v) =>
                            new Date(v).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })
                          }
                        />
                        <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} />
                        <Tooltip
                          contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
                          labelFormatter={(v) =>
                            new Date(v).toLocaleDateString("id-ID", {
                              weekday: "long", day: "2-digit", month: "long",
                            })
                          }
                        />
                        <Line
                          type="monotone" dataKey="count" name="Audit"
                          stroke="#0891b2" strokeWidth={3}
                          dot={{ fill: "#0891b2", r: 4, strokeWidth: 2, stroke: "#fff" }}
                          activeDot={{ r: 7, stroke: "#0891b2", strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[220px] flex flex-col items-center justify-center gap-3 text-gray-300">
                      <TrendingUp className="h-10 w-10 opacity-30" />
                      <p className="text-sm font-sans">Belum ada data tren</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Category Distribution */}
              <Card className="card-hover fade-right border border-gray-100 shadow-md bg-white rounded-2xl overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-amber-500" />
                <CardHeader className="pt-6">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                      <LayoutGrid className="h-4 w-4 text-amber-500" />
                    </div>
                    <CardTitle className="text-xl font-serif font-bold text-gray-900">
                      Distribusi Kategori Sampah
                    </CardTitle>
                  </div>
                  <p className="text-sm text-gray-400 font-sans">Jumlah deteksi per kategori</p>
                </CardHeader>
                <CardContent className="pb-6">
                  {stats?.category_distribution?.length ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={stats.category_distribution}
                        layout="vertical"
                        margin={{ left: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                        <YAxis
                          dataKey="label" type="category"
                          tick={{ fontSize: 11, fill: "#374151" }} width={90}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
                        />
                        <Bar dataKey="count" name="Jumlah" radius={[0, 8, 8, 0]}>
                          {stats.category_distribution.map((_, i) => (
                            <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[220px] flex flex-col items-center justify-center gap-3 text-gray-300">
                      <LayoutGrid className="h-10 w-10 opacity-30" />
                      <p className="text-sm font-sans">Belum ada data kategori</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <div className="section-divider" />

        {/* ── Recent Activity ──────────────────────────────────────────────── */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-10">
              <div className="fade-left">
                <span className="inline-block text-xs font-sans font-semibold tracking-widest text-cyan-600 uppercase bg-cyan-50 border border-cyan-100 rounded-full px-4 py-1.5 mb-3">
                  Aktivitas
                </span>
                <h2 className="text-3xl md:text-4xl font-serif font-black text-gray-900 mb-1">
                  Aktivitas Terbaru
                </h2>
                <p className="text-gray-500 font-sans text-sm">
                  5 deteksi terakhir yang dilakukan
                </p>
              </div>
              <div className="fade-right">
                <Link href="/history">
                  <Button
                    variant="outline"
                    className="border-cyan-200 text-cyan-600 hover:bg-cyan-50 hover:border-cyan-400 font-sans font-bold rounded-xl transition-all duration-300 btn-primary-glow"
                  >
                    Lihat Semua <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {recentActivity.length === 0 ? (
              <Card className="border border-gray-100 shadow-md rounded-2xl fade-up">
                <CardContent className="py-20 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-8 w-8 text-gray-300" />
                  </div>
                  <p className="text-gray-400 font-sans text-sm">Belum ada aktivitas deteksi</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {recentActivity.map((item, idx) => (
                  <Card
                    key={item.audit_id}
                    className={`activity-row fade-up delay-${idx + 1} border border-gray-100 shadow-sm hover:shadow-md bg-white rounded-2xl overflow-hidden cursor-default`}
                  >
                    <CardContent className="py-4 px-6">
                      <div className="flex items-center gap-5">
                        {/* Thumbnail */}
                        <div className="thumbnail-wrap w-14 h-14 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100 shadow-sm">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.top_label}
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">
                              🖼️
                            </div>
                          )}
                        </div>

                        {/* Label + meta */}
                        <div className="flex-1 min-w-0">
                          <p className="font-serif font-bold text-gray-900 capitalize text-base">
                            {item.top_label}
                          </p>
                          <p className="text-xs text-gray-400 font-sans mt-0.5">
                            {item.total_detections} objek &bull; {formatDate(item.created_at)}
                          </p>
                        </div>

                        {/* Confidence */}
                        <span
                          className={`text-xs font-sans font-bold px-3 py-1.5 rounded-full flex-shrink-0 ${confidenceBadge(item.average_confidence)}`}
                        >
                          {(item.average_confidence * 100).toFixed(0)}% conf
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="section-divider" />

        {/* ── Quick Navigation ─────────────────────────────────────────────── */}
        <section className="py-20 bg-gray-50 relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-100/30 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center mb-12 fade-up">
              <span className="inline-block text-xs font-sans font-semibold tracking-widest text-cyan-600 uppercase bg-cyan-50 border border-cyan-100 rounded-full px-4 py-1.5 mb-4">
                Navigasi Cepat
              </span>
              <h2 className="text-3xl md:text-4xl font-serif font-black text-gray-900 mb-3">
                Akses Fitur Utama
              </h2>
              <p className="text-lg text-gray-500 font-sans max-w-2xl mx-auto leading-relaxed">
                Akses fitur utama sistem dengan mudah dan langsung dari dashboard.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  href: "/classify",
                  icon: <ScanLine className="h-8 w-8 text-cyan-600" />,
                  bg: "bg-cyan-50",
                  accent: "bg-gradient-to-r from-cyan-400 to-cyan-600",
                  title: "Deteksi Sampah",
                  desc: "Upload gambar atau gunakan kamera untuk mendeteksi dan mengklasifikasi jenis sampah secara otomatis.",
                  delay: "delay-1",
                },
                {
                  href: "/history",
                  icon: <LayoutGrid className="h-8 w-8 text-amber-600" />,
                  bg: "bg-amber-50",
                  accent: "bg-gradient-to-r from-amber-400 to-amber-500",
                  title: "Riwayat Deteksi",
                  desc: "Lihat riwayat lengkap semua hasil deteksi yang telah dilakukan sebelumnya.",
                  delay: "delay-2",
                },
                {
                  href: "/reports",
                  icon: <TrendingUp className="h-8 w-8 text-cyan-600" />,
                  bg: "bg-cyan-50",
                  accent: "bg-gradient-to-r from-cyan-400 to-cyan-600",
                  title: "Laporan Analitik",
                  desc: "Analisis mendalam dengan grafik dan statistik lengkap untuk monitoring pengelolaan sampah.",
                  delay: "delay-3",
                },
              ].map((nav) => (
                <Card
                  key={nav.href}
                  className={`nav-card fade-up ${nav.delay} border border-gray-100 shadow-md bg-white rounded-2xl overflow-hidden cursor-default`}
                >
                  <div className={`h-1 w-full ${nav.accent}`} />
                  <CardHeader className="text-center pb-4 pt-8">
                    <div className={`nav-icon w-16 h-16 ${nav.bg} rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors duration-300`}>
                      {nav.icon}
                    </div>
                    <CardTitle className="text-xl font-serif font-bold">
                      {nav.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center pb-8">
                    <p className="text-gray-500 font-sans mb-6 text-sm leading-relaxed">{nav.desc}</p>
                    <Link href={nav.href}>
                      <Button
                        className="bg-cyan-600 hover:bg-cyan-700 text-white font-sans font-bold w-full rounded-xl btn-primary-glow"
                      >
                        Buka Fitur <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <div className="section-divider" />

        {/* ── Manfaat ──────────────────────────────────────────────────────── */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="fade-left">
                <span className="inline-block text-xs font-sans font-semibold tracking-widest text-cyan-600 uppercase bg-cyan-50 border border-cyan-100 rounded-full px-4 py-1.5 mb-5">
                  Keunggulan
                </span>
                <h2 className="text-3xl md:text-4xl font-serif font-black text-gray-900 mb-5 leading-tight">
                  Monitoring Sistem Secara Efisien
                </h2>
                <p className="text-lg text-gray-500 mb-10 font-sans leading-relaxed">
                  Dashboard ini dirancang sebagai pusat kontrol untuk memantau seluruh aktivitas deteksi dan audit sampah sehingga pengguna dapat melakukan analisis awal sebelum masuk ke halaman yang lebih detail.
                </p>
                <div className="space-y-4">
                  {[
                    { title: "Data Real-time", desc: "Informasi terbaru langsung dari sistem tanpa perlu membuka halaman audit secara terpisah." },
                    { title: "Visualisasi Intuitif", desc: "Grafik dan statistik yang mudah dipahami untuk semua tingkat pengguna." },
                    { title: "Navigasi Efisien", desc: "Akses semua fitur utama hanya dengan satu klik dari dashboard." },
                  ].map((item) => (
                    <div key={item.title} className="check-item flex items-start gap-4 p-4 rounded-xl hover:bg-cyan-50/60 hover:border-cyan-100 border border-transparent transition-all duration-300 cursor-default">
                      <div className="flex-shrink-0 w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center mt-0.5">
                        <CheckCircle className="h-5 w-5 text-cyan-600" />
                      </div>
                      <div>
                        <h3 className="text-base font-serif font-bold text-gray-900 mb-1">{item.title}</h3>
                        <p className="text-gray-500 font-sans text-sm leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="fade-right">
                <div className="relative bg-gradient-to-br from-cyan-50 to-gray-50 rounded-2xl p-8 shadow-xl border border-gray-100">
                  {/* Decorative corner accents */}
                  <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-cyan-100 rounded-2xl -z-10" />
                  <div className="absolute -top-4 -left-4 w-14 h-14 bg-amber-100 rounded-xl -z-10" />

                  <div className="space-y-5">
                    {[
                      { label: "Plastik", pct: 75, color: "bg-cyan-500" },
                      { label: "Kertas", pct: 52, color: "bg-amber-400" },
                      { label: "Logam", pct: 38, color: "bg-emerald-500" },
                      { label: "Organik", pct: 61, color: "bg-orange-400" },
                    ].map((bar) => (
                      <div key={bar.label}>
                        <div className="flex justify-between text-sm font-sans mb-2">
                          <span className="font-semibold text-gray-700">{bar.label}</span>
                          <span className="text-gray-400 font-medium">{bar.pct}%</span>
                        </div>
                        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${bar.color} transition-all duration-700`}
                            style={{ width: `${bar.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-gray-400 font-sans text-center pt-2">
                      Contoh distribusi kategori sampah
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA Section ──────────────────────────────────────────────────── */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <div className="cta-bg rounded-3xl p-12 text-center relative overflow-hidden shadow-2xl shadow-cyan-900/20 fade-up">
              <div className="absolute top-[-40px] right-[-40px] w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-[-40px] left-[-40px] w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
              <div className="relative">
                <span className="inline-block text-xs font-sans font-semibold tracking-widest text-cyan-200 uppercase bg-white/10 rounded-full px-4 py-1.5 mb-6">
                  Mulai Sekarang
                </span>
                <h2 className="text-3xl md:text-4xl font-serif font-black text-white mb-4 leading-tight">
                  Siap Memulai Deteksi?
                </h2>
                <p className="text-cyan-100 font-sans text-lg mb-10 max-w-xl mx-auto leading-relaxed">
                  Gunakan fitur klasifikasi sampah AI sekarang dan dapatkan hasil analisis secara instan.
                </p>
                <Link href="/classify">
                  <Button
                    size="lg"
                    className="bg-white text-cyan-700 hover:bg-cyan-50 font-bold px-9 py-6 text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  >
                    Mulai Deteksi <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <footer className="bg-gray-900 text-white py-12 border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
              <div className="md:col-span-2">
                <h3 className="text-2xl font-serif font-black text-cyan-400 mb-3">HargAI</h3>
                <p className="text-gray-400 font-sans text-sm leading-relaxed max-w-2xl">
                  HargAI adalah platform klasifikasi sampah berbasis AI yang membantu pengguna mengenali jenis sampah dan melihat estimasi harga secara cepat.
                </p>
              </div>
              <div className="md:text-right">
                <h4 className="text-lg font-serif font-bold mb-4">Mulai Menggunakan</h4>
                <p className="text-gray-400 font-sans text-sm mb-4">Daftar akun untuk mengakses fitur.</p>
                <Link href="/register">
                  <Button className="bg-cyan-600 hover:bg-cyan-700 text-white font-sans font-bold rounded-xl btn-primary-glow">
                    Sign Up / Register
                  </Button>
                </Link>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-gray-400 font-sans text-sm text-center md:text-left">
                © 2026 HargAI. All rights reserved.
              </p>
              <p className="text-gray-500 font-sans text-xs text-center md:text-right">
                Powered by HargAI Waste Classification System
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}