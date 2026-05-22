"use client"

import Navigation from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Camera,
  Upload,
  AlertCircle,
  RefreshCw,
  X,
  Circle,
  Tag,
  Loader2,
  CheckCircle,
  ArrowRight,
  ChevronDown,
  ScanLine,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"

type WastePrice = {
  id: string
  name: string
  category: string
  unit: string
  current_price: number | string | null
  currency: string
}

type BackendDetection = {
  label: string
  confidence: number
  bbox: {
    x1: number
    y1: number
    x2: number
    y2: number
  }
  price?: WastePrice | null
}

type DetectWasteResponse = {
  audit_id: number | string
  image_url: string
  preview_image?: string
  detections: BackendDetection[]
  top_prediction: string
  created_at: string
  raw_response?: unknown
}

const normalizeLabel = (value: string) => {
  return value.trim().toLowerCase().replace(/[_-]/g, " ")
}

const formatCurrency = (
  value: number | string | null | undefined,
  currency = "IDR"
) => {
  const numberValue = Number(value)
  if (value === null || value === undefined || Number.isNaN(numberValue)) {
    return "Harga belum tersedia"
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(numberValue)
}

const findWastePrice = (label: string, wasteTypes: WastePrice[]) => {
  const target = normalizeLabel(label)
  return (
    wasteTypes.find((item) => normalizeLabel(item.name) === target) ||
    wasteTypes.find((item) => target.includes(normalizeLabel(item.name))) ||
    wasteTypes.find((item) => normalizeLabel(item.name).includes(target)) ||
    null
  )
}

const normalizeConfidence = (value: unknown): number => {
  const numberValue = Number(value)
  if (Number.isNaN(numberValue)) return 0
  if (numberValue > 1) return numberValue / 100
  return numberValue
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
    result.detections, result.results, result.predictions, result.objects,
    result.items, result.data?.detections, result.data?.results,
    result.data?.predictions, result.output?.detections, result.output?.results,
    result.output?.predictions,
  ]
  const foundArray = possibleArrays.find((value) => Array.isArray(value))
  return Array.isArray(foundArray) ? foundArray : []
}

const getLabelFromItem = (item: any, index: number): string => {
  return String(
    item?.label ?? item?.class ?? item?.class_name ?? item?.className ??
    item?.name ?? item?.category ?? item?.prediction ?? item?.predicted_class ??
    item?.predicted_label ?? item?.cls ?? item?.object ?? item?.type ?? `Objek ${index + 1}`
  )
}

const getConfidenceFromItem = (item: any): number => {
  return normalizeConfidence(
    item?.confidence ?? item?.score ?? item?.conf ?? item?.probability ?? item?.prob ?? item?.accuracy ?? 0
  )
}

const getDetections = (result: any, wasteTypes: WastePrice[] = []): BackendDetection[] => {
  if (!result) return []
  const rawDetections = getRawDetections(result)
  if (rawDetections.length > 0) {
    return rawDetections.map((item: any, index: number) => {
      const label = getLabelFromItem(item, index)
      return { label, confidence: getConfidenceFromItem(item), bbox: normalizeBBox(item), price: findWastePrice(label, wasteTypes) }
    })
  }
  const singleLabel =
    result.top_prediction ?? result.top_label ?? result.prediction ?? result.label ??
    result.class ?? result.class_name ?? result.predicted_class ?? result.predicted_label ??
    result.result ?? result.category ?? result.data?.top_prediction ?? result.data?.top_label ??
    result.data?.prediction ?? result.data?.label ?? result.output?.top_prediction ??
    result.output?.top_label ?? result.output?.prediction ?? result.output?.label
  if (!singleLabel) return []
  const label = String(singleLabel)
  return [{
    label,
    confidence: normalizeConfidence(
      result.confidence ?? result.score ?? result.conf ?? result.probability ??
      result.data?.confidence ?? result.data?.score ?? result.output?.confidence ?? result.output?.score ?? 0
    ),
    bbox: { x1: 0, y1: 0, x2: 0, y2: 0 },
    price: findWastePrice(label, wasteTypes),
  }]
}

const getTopPrediction = (result: any, wasteTypes: WastePrice[] = []): string => {
  if (!result) return "Tidak diketahui"
  const detections = getDetections(result, wasteTypes)
  return String(
    result.top_prediction ?? result.top_label ?? result.prediction ?? result.label ??
    result.class ?? result.class_name ?? result.predicted_class ?? result.predicted_label ??
    result.result ?? result.category ?? result.data?.top_prediction ?? result.data?.top_label ??
    result.data?.prediction ?? result.data?.label ?? result.output?.top_prediction ??
    result.output?.top_label ?? result.output?.prediction ?? result.output?.label ??
    detections[0]?.label ?? "Tidak diketahui"
  )
}

const getImageUrl = (result: any): string => {
  return String(
    result?.image_url ?? result?.imageUrl ?? result?.image ?? result?.url ??
    result?.file_url ?? result?.fileUrl ?? result?.data?.image_url ??
    result?.data?.imageUrl ?? result?.data?.image ?? result?.output?.image_url ?? ""
  )
}

const normalizeDetectResponse = (result: any, wasteTypes: WastePrice[] = []): DetectWasteResponse => {
  return {
    audit_id: result?.audit_id ?? result?.auditId ?? result?.id ?? `local-${Date.now()}`,
    image_url: getImageUrl(result),
    detections: getDetections(result, wasteTypes),
    top_prediction: getTopPrediction(result, wasteTypes),
    created_at: result?.created_at ?? result?.createdAt ?? result?.timestamp ?? result?.data?.created_at ?? new Date().toISOString(),
    raw_response: result,
  }
}

// ─── Safari iOS detection helper ───────────────────────────────────────────
const isSafariIOS = (): boolean => {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent
  return /iP(hone|od|ad)/.test(ua) && /WebKit/.test(ua)
}

// ─── Attach stream to video element safely for Safari iOS ──────────────────
const attachStreamToVideo = (video: HTMLVideoElement, stream: MediaStream) => {
  // Required attributes for Safari iOS — must be set before srcObject
  video.setAttribute("playsinline", "true")
  video.setAttribute("webkit-playsinline", "true")
  video.setAttribute("x5-playsinline", "true")
  video.muted = true
  video.autoplay = true

  video.srcObject = stream

  const tryPlay = () => {
    const promise = video.play()
    if (promise !== undefined) {
      promise.catch((err) => {
        console.warn("video.play() failed:", err)
        // On Safari iOS, sometimes a second attempt after a tick works
        setTimeout(() => video.play().catch(console.error), 300)
      })
    }
  }

  if (video.readyState >= 2) {
    tryPlay()
  } else {
    video.onloadedmetadata = () => tryPlay()
  }
}

export default function WasteDetectionPage() {
  const router = useRouter()

  const [previewImage, setPreviewImage]         = useState<string | null>(null)
  const [detectResult, setDetectResult]         = useState<DetectWasteResponse | null>(null)
  const [wasteTypes, setWasteTypes]             = useState<WastePrice[]>([])
  const [isLoading, setIsLoading]               = useState(false)
  const [isPriceLoading, setIsPriceLoading]     = useState(false)
  const [isCameraOpen, setIsCameraOpen]         = useState(false)
  const [isLiveDetecting, setIsLiveDetecting]   = useState(false)
  const [isLiveProcessing, setIsLiveProcessing] = useState(false)
  const [liveDetections, setLiveDetections]     = useState<BackendDetection[]>([])
  const [cameraError, setCameraError]           = useState<string | null>(null)
  const [stream, setStream]                     = useState<MediaStream | null>(null)
  const [errorMessage, setErrorMessage]         = useState("")
  const [isRedirecting, setIsRedirecting]       = useState(false)
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 })

  const fileInputRef      = useRef<HTMLInputElement>(null)
  const videoRef          = useRef<HTMLVideoElement>(null)
  const canvasRef         = useRef<HTMLCanvasElement>(null)
  const liveIntervalRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const liveProcessingRef = useRef(false)
  const liveFailCountRef  = useRef(0)
  const detectionAreaRef  = useRef<HTMLDivElement>(null)

  const detections    = detectResult?.detections ?? []
  const topPrediction = detectResult?.top_prediction ?? "Tidak diketahui"

  const detectedPrices = useMemo(() => {
    return detections.map((item) => item.price).filter((item): item is WastePrice => Boolean(item))
  }, [detections])

  const totalEstimatedPrice = useMemo(() => {
    return detectedPrices.reduce((total, item) => {
      const price = Number(item.current_price)
      return total + (Number.isNaN(price) ? 0 : price)
    }, 0)
  }, [detectedPrices])

  useEffect(() => {
    const fetchWasteTypes = async () => {
      setIsPriceLoading(true)
      try {
        const { data } = await api.get("/waste-types")
        setWasteTypes(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error("Gagal mengambil data harga sampah:", error)
      } finally {
        setIsPriceLoading(false)
      }
    }
    fetchWasteTypes()
  }, [])

  // ── Attach stream to video when camera opens ──────────────────────────────
  // NOTE: We do NOT call play() here for Safari iOS — it's handled inside
  // attachStreamToVideo via onloadedmetadata to avoid autoplay policy blocks.
  useEffect(() => {
    if (isCameraOpen && stream && videoRef.current) {
      attachStreamToVideo(videoRef.current, stream)
    }
  }, [isCameraOpen, stream])

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop())
      if (liveIntervalRef.current) clearInterval(liveIntervalRef.current)
    }
  }, [stream])

  useEffect(() => {
    if ((isCameraOpen || previewImage) && detectionAreaRef.current) {
      setTimeout(() => {
        detectionAreaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 100)
    }
  }, [isCameraOpen, previewImage])

  const stopLiveDetection = () => {
    setIsLiveDetecting(false)
    setIsLiveProcessing(false)
    setLiveDetections([])
    liveProcessingRef.current = false
    liveFailCountRef.current = 0
    if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current)
      liveIntervalRef.current = null
    }
  }

  const runLiveDetection = async () => {
    if (liveProcessingRef.current) return
    if (!videoRef.current || !canvasRef.current) return
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (video.videoWidth === 0 || video.videoHeight === 0) return

    liveProcessingRef.current = true
    setIsLiveProcessing(true)

    try {
      canvas.width  = video.videoWidth
      canvas.height = video.videoHeight
      const context = canvas.getContext("2d")
      if (!context) return
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.8)
      })
      if (!blob) return
      const file     = new File([blob], `live-${Date.now()}.jpg`, { type: "image/jpeg" })
      const formData = new FormData()
      formData.append("file", file)
      const { data } = await api.post("/detect?preview=true", formData)
      const normalizedData = normalizeDetectResponse(data, wasteTypes)
      setLiveDetections(normalizedData.detections)
      liveFailCountRef.current = 0
    } catch (error: any) {
      console.error("Live detection error:", error)
      const status = error?.response?.status
      if (status === 401 || status === 403) {
        liveFailCountRef.current += 1
        if (liveFailCountRef.current >= 3) {
          setCameraError(
            "Live detection membutuhkan login aktif. Kamu masih bisa ambil foto manual — tekan tombol Ambil Foto."
          )
          stopLiveDetection()
        }
      }
    } finally {
      liveProcessingRef.current = false
      setIsLiveProcessing(false)
    }
  }

  const startLiveDetection = async () => {
    if (liveIntervalRef.current) return
    setErrorMessage("")
    setDetectResult(null)
    setPreviewImage(null)
    setLiveDetections([])
    setIsLiveDetecting(true)
    liveFailCountRef.current = 0
    await runLiveDetection()
    liveIntervalRef.current = setInterval(() => { runLiveDetection() }, 1500)
  }

  // ── Open Camera — Safari iOS compatible ───────────────────────────────────
  const handleOpenCamera = async () => {
    setCameraError(null)
    setPreviewImage(null)
    setDetectResult(null)
    setErrorMessage("")
    setImageNaturalSize({ width: 0, height: 0 })
    setLiveDetections([])

    try {
      let mediaStream: MediaStream

      if (isSafariIOS()) {
        // Safari iOS: use simple constraints — complex ones often cause OverconstrainedError
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false,
          })
        } catch (firstErr) {
          console.warn("Safari iOS: retrying with basic video constraint", firstErr)
          try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            })
          } catch (secondErr: any) {
            throw secondErr
          }
        }
      } else {
        // Desktop / Android Chrome
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
      }

      setStream(mediaStream)
      setIsCameraOpen(true)

      // Safari iOS: also imperatively attach here in case useEffect fires before
      // the component has re-rendered with isCameraOpen=true
      if (isSafariIOS() && videoRef.current) {
        setTimeout(() => {
          if (videoRef.current) {
            attachStreamToVideo(videoRef.current, mediaStream)
          }
        }, 50)
      }
    } catch (err: any) {
      console.error("getUserMedia error:", err)
      let message = "Gagal membuka kamera."
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        message = "Akses kamera ditolak. Izinkan akses kamera di pengaturan browser / Safari."
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        message = "Kamera tidak ditemukan di perangkat ini."
      } else if (err?.name === "NotReadableError" || err?.name === "TrackStartError") {
        message = "Kamera sedang digunakan aplikasi lain. Tutup aplikasi lain dan coba lagi."
      } else if (err?.name === "OverconstrainedError") {
        message = "Kamera tidak mendukung resolusi yang diminta. Coba reload halaman."
      } else if (err?.name === "SecurityError") {
        message = "Akses kamera diblokir. Pastikan halaman dibuka melalui HTTPS."
      } else if (err?.message) {
        message = err.message
      }
      setCameraError(message)
    }
  }

  const handleCloseCamera = () => {
    stopLiveDetection()
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current.onloadedmetadata = null
    }
    setIsCameraOpen(false)
    setCameraError(null)
  }

  const redirectToAudit = (normalizedData: DetectWasteResponse) => {
    try {
      sessionStorage.setItem("latest_detection_result", JSON.stringify(normalizedData))
    } catch (error) {
      console.error("Gagal menyimpan hasil ke sessionStorage:", error)
    }
    setIsRedirecting(true)
    setTimeout(() => { router.push("/audits") }, 600)
  }

  const detectWaste = async (file: File, preview: string) => {
    setIsLoading(true)
    setErrorMessage("")
    setPreviewImage(preview)
    setDetectResult(null)
    setImageNaturalSize({ width: 0, height: 0 })
    try {
      if (file.size > 5 * 1024 * 1024) { setErrorMessage("Ukuran file melebihi 5MB."); return }
      const validTypes = ["image/jpeg", "image/jpg", "image/png"]
      if (!validTypes.includes(file.type)) { setErrorMessage("Format file harus JPG, JPEG, atau PNG."); return }
      let latestWasteTypes = wasteTypes
      if (latestWasteTypes.length === 0) {
        try {
          const { data: wasteData } = await api.get("/waste-types")
          latestWasteTypes = Array.isArray(wasteData) ? wasteData : []
          setWasteTypes(latestWasteTypes)
        } catch (error) {
          console.error("Gagal mengambil data harga sebelum deteksi:", error)
        }
      }
      const formData = new FormData()
      formData.append("file", file)
      const { data } = await api.post("/detect?preview=false", formData)
      const normalizedData: DetectWasteResponse = {
        ...normalizeDetectResponse(data, latestWasteTypes),
        preview_image: preview,
      }
      setDetectResult(normalizedData)
      redirectToAudit(normalizedData)
    } catch (error: any) {
      const status    = error?.response?.status
      const errorData = error?.response?.data
      let message     = "Gagal mendeteksi gambar."
      if (status === 413)             message = "Ukuran file melebihi 5MB."
      else if (status === 415)        message = "Format file harus JPG, JPEG, atau PNG."
      else if (status === 500)        message = "Terjadi kesalahan pada model AI."
      else if (status === 401 || status === 403) message = "Sesi login habis. Silakan login ulang dan coba lagi."
      else if (status === 503)        message = errorData?.message || errorData?.detail || "Backend deteksi sedang tidak bisa dijangkau."
      else if (status === 400)        message = errorData?.message || errorData?.detail || "Request tidak valid."
      else if (!status)               message = "Koneksi ke server gagal. Cek backend dan base URL."
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) { setErrorMessage("Video atau canvas reference tidak tersedia."); return }
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (video.videoWidth === 0 || video.videoHeight === 0) { setErrorMessage("Video belum siap. Tunggu sebentar dan coba lagi."); return }
    try {
      stopLiveDetection()
      canvas.width  = video.videoWidth
      canvas.height = video.videoHeight
      const context = canvas.getContext("2d")
      if (!context) { setErrorMessage("Tidak dapat mengakses canvas context."); return }
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob | null>((resolve) => { canvas.toBlob(resolve, "image/jpeg", 0.92) })
      if (!blob) { setErrorMessage("Gagal mengkonversi gambar."); return }
      const file    = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" })
      const preview = canvas.toDataURL("image/jpeg", 0.92)
      handleCloseCamera()
      await detectWaste(file, preview)
    } catch (err: any) {
      setErrorMessage(`Error saat capture: ${err.message}`)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (readerEvent) => {
      const preview = readerEvent.target?.result as string
      await detectWaste(file, preview)
    }
    reader.readAsDataURL(file)
    // Reset input so the same file can be re-selected (iOS quirk)
    event.target.value = ""
  }

  const handleReset = () => {
    stopLiveDetection()
    setPreviewImage(null)
    setDetectResult(null)
    setErrorMessage("")
    setImageNaturalSize({ width: 0, height: 0 })
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // ── onLoadedMetadata handler for <video> — starts live detection ──────────
  const handleVideoReady = () => {
    if (videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.warn("play() in onLoadedMetadata failed:", err)
        setTimeout(() => videoRef.current?.play().catch(console.error), 300)
      })
    }
    startLiveDetection()
  }

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
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes gridFade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes scroll-bounce {
          0%, 100% { transform: translateY(0); opacity: 1; }
          50%       { transform: translateY(6px); opacity: 0.5; }
        }
        @keyframes pulse-live {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .animate-blob       { animation: blob 9s infinite ease-in-out; }
        .animate-blob-delay { animation: blob 11s infinite ease-in-out 3s; }
        .animate-float      { animation: float 4s ease-in-out infinite; }
        .animate-ping       { animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite; }
        .animate-pulse-live { animation: pulse-live 1.5s ease-in-out infinite; }

        .fade-up   { animation: fadeInUp  0.7s ease both; }
        .fade-left { animation: fadeInLeft 0.7s ease both; }

        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        .delay-3 { animation-delay: 0.35s; }

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

        .badge-float { animation: float 3.5s ease-in-out infinite; }

        .btn-primary-glow {
          transition: box-shadow 0.3s ease, transform 0.2s ease;
        }
        .btn-primary-glow:hover {
          box-shadow: 0 0 24px 4px rgba(8,145,178,0.35);
          transform: translateY(-2px);
        }

        .action-btn {
          transition: transform 0.3s cubic-bezier(.22,.68,0,1.2),
                      box-shadow 0.3s ease,
                      border-color 0.25s ease,
                      background 0.25s ease;
        }
        .action-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(8,145,178,0.15);
        }

        .card-hover {
          transition: transform 0.35s cubic-bezier(.22,.68,0,1.2),
                      box-shadow 0.35s ease, border-color 0.3s ease;
        }
        .card-hover:hover {
          transform: translateY(-6px) scale(1.01);
          box-shadow: 0 20px 40px -10px rgba(8,145,178,0.18);
          border-color: rgba(8,145,178,0.25) !important;
        }
        .card-hover:hover .icon-wrap { background: rgba(8,145,178,0.15); }

        .section-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(8,145,178,0.25), transparent);
        }

        .scroll-cue { animation: scroll-bounce 1.8s ease-in-out infinite; }

        .cta-bg {
          background: linear-gradient(135deg, #0891b2 0%, #0e7490 60%, #164e63 100%);
        }

        .detection-panel {
          transition: all 0.4s cubic-bezier(.22,.68,0,1.2);
        }

        .check-item {
          transition: transform 0.25s ease, background 0.25s ease;
        }
        .check-item:hover { transform: translateX(4px); }
      `}</style>

      <div className="min-h-screen bg-white overflow-x-hidden">
        <Navigation />

        {/* ── Hero ── */}
        <section className="relative bg-gradient-to-br from-gray-50 via-white to-cyan-50/30 py-24 overflow-hidden">
          <div className="absolute top-[-80px] left-[-80px] w-[400px] h-[400px] rounded-full bg-cyan-200/25 blur-3xl animate-blob pointer-events-none" />
          <div className="absolute bottom-[-60px] right-[-60px] w-[350px] h-[350px] rounded-full bg-cyan-300/15 blur-3xl animate-blob-delay pointer-events-none" />
          <div className="absolute inset-0 hero-grid pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex justify-center mb-8 fade-up">
              <div className="badge-float inline-flex items-center gap-2 bg-white border border-cyan-200 rounded-full px-4 py-2 shadow-md text-sm font-sans text-cyan-700">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                </span>
                Deteksi Sampah Real-time dengan YOLOv8
              </div>
            </div>

            <h1 className="fade-up delay-1 text-5xl md:text-6xl font-serif font-black text-gray-900 mb-5 leading-tight">
              Klasifikasi Sampah &{" "}
              <span className="shimmer-text">Estimasi Harga</span>
            </h1>
            <p className="fade-up delay-2 text-xl text-gray-500 mb-10 max-w-3xl mx-auto font-sans leading-relaxed">
              Buka kamera untuk deteksi langsung atau unggah gambar. Setelah berhasil, kamu akan diarahkan ke halaman audit untuk melihat hasil lengkap.
            </p>

            <div className="fade-up delay-3 flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button
                onClick={handleOpenCamera}
                disabled={isLoading || isRedirecting || isCameraOpen}
                className="action-btn inline-flex items-center justify-center gap-3 bg-cyan-600 hover:bg-cyan-700 text-white font-sans font-bold px-8 py-4 rounded-xl text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none btn-primary-glow"
              >
                <Camera className="h-5 w-5" />
                Buka Kamera
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isRedirecting}
                className="action-btn inline-flex items-center justify-center gap-3 bg-white border border-cyan-200 hover:border-cyan-400 hover:bg-cyan-50 text-cyan-700 font-sans font-bold px-8 py-4 rounded-xl text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <Upload className="h-5 w-5" />
                Unggah Gambar
              </button>
            </div>

            <div className="scroll-cue text-cyan-300 flex justify-center">
              <ChevronDown className="h-6 w-6" />
            </div>
          </div>
        </section>

        <div className="section-divider" />

        {/* ── Detection Area ── */}
        <section ref={detectionAreaRef} className="py-14 bg-white scroll-mt-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            {/*
              File input — no `capture` attribute so user can choose gallery OR camera.
              On iOS Safari the native picker handles both.
            */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Error message */}
            {errorMessage && (
              <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <p className="text-sm font-sans font-semibold text-red-800">{errorMessage}</p>
              </div>
            )}

            {/* Camera error (shown inside camera card too, but also here for when camera is closed) */}
            {cameraError && !isCameraOpen && (
              <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                <p className="text-sm font-sans font-semibold text-amber-800">{cameraError}</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

              {/* ── Sidebar ── */}
              <aside className="space-y-4 lg:col-span-4 xl:col-span-3">
                <Card className="border border-gray-100 shadow-md rounded-2xl overflow-hidden">
                  <div className="h-1 w-full bg-gradient-to-r from-cyan-400 to-cyan-600" />
                  <CardHeader className="pb-3 pt-5">
                    <CardTitle className="text-base font-serif font-bold text-slate-900 flex items-center gap-2">
                      <ScanLine className="h-4 w-4 text-cyan-600" />
                      Mulai Deteksi
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-5">
                    {!isCameraOpen ? (
                      <button
                        onClick={handleOpenCamera}
                        disabled={isLoading || isRedirecting}
                        className="action-btn flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-cyan-300 hover:bg-cyan-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
                          <Camera className="h-5 w-5" />
                        </span>
                        <span>
                          <span className="block font-serif font-bold text-slate-900 text-sm">Buka Kamera</span>
                          <span className="block text-xs text-slate-500 font-sans mt-0.5">Live detection langsung aktif</span>
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={handleCloseCamera}
                        className="action-btn flex w-full items-center gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-left hover:bg-red-100"
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
                          <X className="h-5 w-5" />
                        </span>
                        <span>
                          <span className="block font-serif font-bold text-red-800 text-sm">Tutup Kamera</span>
                          <span className="block text-xs text-red-600 font-sans mt-0.5">Hentikan kamera dan live detection</span>
                        </span>
                      </button>
                    )}

                    {!isCameraOpen && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading || isRedirecting}
                        className="action-btn flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-sky-300 hover:bg-sky-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                          <Upload className="h-5 w-5" />
                        </span>
                        <span>
                          <span className="block font-serif font-bold text-slate-900 text-sm">Unggah Gambar</span>
                          <span className="block text-xs text-slate-500 font-sans mt-0.5">JPG, JPEG, PNG maks. 5MB</span>
                        </span>
                      </button>
                    )}

                    {(previewImage || detectResult) && !isCameraOpen && !isRedirecting && (
                      <button
                        onClick={handleReset}
                        className="action-btn flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm font-sans font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Reset Hasil
                      </button>
                    )}
                  </CardContent>
                </Card>

                <Card className="border border-gray-100 shadow-md rounded-2xl overflow-hidden">
                  <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-amber-500" />
                  <CardContent className="p-5">
                    <div className="mb-2 flex items-center gap-2">
                      <Tag className="h-4 w-4 text-amber-600" />
                      <p className="font-serif font-bold text-slate-900 text-sm">Data Harga Sampah</p>
                    </div>
                    <p className="text-xs leading-6 text-slate-500 font-sans">
                      {isPriceLoading
                        ? "Mengambil data harga..."
                        : `${wasteTypes.length} jenis sampah tersedia untuk dicocokkan dengan hasil deteksi.`}
                    </p>
                  </CardContent>
                </Card>
              </aside>

              {/* ── Main Panel ── */}
              <main className="space-y-6 lg:col-span-8 xl:col-span-9">

                {/* Camera card */}
                {isCameraOpen && (
                  <Card className="detection-panel overflow-hidden border border-gray-100 shadow-md rounded-2xl">
                    <div className="h-1 w-full bg-gradient-to-r from-cyan-400 to-cyan-600" />
                    <CardHeader className="border-b border-slate-100 bg-white pt-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <CardTitle className="text-xl font-serif font-bold text-slate-900">
                            Kamera Live
                          </CardTitle>
                          <p className="mt-1 text-sm text-slate-400 font-sans">
                            Arahkan kamera ke sampah. Deteksi berjalan otomatis.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 bg-cyan-50 border border-cyan-100 rounded-full px-4 py-1.5 w-fit">
                          {isLiveDetecting && (
                            <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse-live" />
                          )}
                          <span className="text-xs font-sans font-semibold text-cyan-700">
                            {isLiveDetecting ? "Live detection aktif" : "Menyiapkan kamera..."}
                          </span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-0">
                      <div className="relative bg-slate-950" style={{ minHeight: "360px" }}>
                        {/*
                          SAFARI iOS CRITICAL:
                          - `playsInline` (React camelCase) renders as `playsinline` in DOM ✓
                          - `webkit-playsinline` must be set via setAttribute (done in attachStreamToVideo)
                          - DO NOT set `src` — only `srcObject` via ref
                          - `autoPlay` + `muted` are required for autoplay policy on iOS
                        */}
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          onLoadedMetadata={handleVideoReady}
                          className="block w-full"
                          style={{ maxHeight: "640px", objectFit: "contain", backgroundColor: "#020617" }}
                        />

                        {liveDetections.map((result, index) => {
                          const videoWidth  = videoRef.current?.videoWidth  || 0
                          const videoHeight = videoRef.current?.videoHeight || 0
                          const hasValidBox = result.bbox.x2 > result.bbox.x1 && result.bbox.y2 > result.bbox.y1 && videoWidth > 0 && videoHeight > 0
                          if (!hasValidBox) return null
                          const isNorm  = result.bbox.x2 <= 1 && result.bbox.y2 <= 1
                          const left    = isNorm ? result.bbox.x1 * 100 : (result.bbox.x1 / videoWidth) * 100
                          const top     = isNorm ? result.bbox.y1 * 100 : (result.bbox.y1 / videoHeight) * 100
                          const width   = isNorm ? (result.bbox.x2 - result.bbox.x1) * 100 : ((result.bbox.x2 - result.bbox.x1) / videoWidth) * 100
                          const height  = isNorm ? (result.bbox.y2 - result.bbox.y1) * 100 : ((result.bbox.y2 - result.bbox.y1) / videoHeight) * 100
                          return (
                            <div key={`live-bbox-${result.label}-${index}`}
                              className="pointer-events-none absolute rounded-lg border-2 border-cyan-400"
                              style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
                            >
                              <div className="absolute -top-8 left-0 whitespace-nowrap rounded-md bg-cyan-600 px-2 py-1 text-xs font-sans font-semibold text-white shadow-sm">
                                {result.label} • {(result.confidence * 100).toFixed(1)}%
                              </div>
                            </div>
                          )
                        })}

                        {isLiveProcessing && (
                          <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-sm px-3 py-2 text-xs font-sans font-semibold text-slate-700 shadow-sm">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-600" />
                            Memproses
                          </div>
                        )}
                      </div>

                      {cameraError && (
                        <div className="border-t border-amber-200 bg-amber-50 p-4">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                            <p className="text-sm text-amber-800 font-sans">{cameraError}</p>
                          </div>
                        </div>
                      )}

                      <div className="border-t border-slate-100 bg-white p-5">
                        <Button
                          onClick={handleCapture}
                          disabled={isLoading || isRedirecting}
                          className="w-full rounded-xl bg-cyan-600 py-6 text-base font-sans font-bold text-white hover:bg-cyan-700 disabled:opacity-60 btn-primary-glow"
                        >
                          <Circle className="mr-2 h-5 w-5" fill="currentColor" />
                          Ambil Foto & Simpan Hasil
                        </Button>
                        <p className="mt-3 text-center text-xs text-slate-400 font-sans">
                          Setelah foto diambil, hasil otomatis disimpan dan kamu diarahkan ke halaman audit.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Preview card */}
                {previewImage && (
                  <Card className="detection-panel overflow-hidden border border-gray-100 shadow-md rounded-2xl">
                    <div className="h-1 w-full bg-gradient-to-r from-cyan-400 to-cyan-600" />
                    <CardHeader className="border-b border-slate-100 pt-5">
                      <CardTitle className="text-xl font-serif font-bold text-slate-900">
                        Preview Gambar
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="relative overflow-hidden rounded-xl bg-slate-950">
                        <img
                          src={previewImage}
                          alt="Preview"
                          className="h-auto w-full"
                          onLoad={(event) => setImageNaturalSize({
                            width:  event.currentTarget.naturalWidth,
                            height: event.currentTarget.naturalHeight,
                          })}
                        />
                        {!isLoading && detections.map((result, index) => {
                          const hasValidBox = result.bbox.x2 > result.bbox.x1 && result.bbox.y2 > result.bbox.y1 && imageNaturalSize.width > 0 && imageNaturalSize.height > 0
                          if (!hasValidBox) return null
                          const isNorm  = result.bbox.x2 <= 1 && result.bbox.y2 <= 1
                          const left    = isNorm ? result.bbox.x1 * 100 : (result.bbox.x1 / imageNaturalSize.width)  * 100
                          const top     = isNorm ? result.bbox.y1 * 100 : (result.bbox.y1 / imageNaturalSize.height) * 100
                          const width   = isNorm ? (result.bbox.x2 - result.bbox.x1) * 100 : ((result.bbox.x2 - result.bbox.x1) / imageNaturalSize.width)  * 100
                          const height  = isNorm ? (result.bbox.y2 - result.bbox.y1) * 100 : ((result.bbox.y2 - result.bbox.y1) / imageNaturalSize.height) * 100
                          return (
                            <div key={`bbox-${result.label}-${index}`}
                              className="pointer-events-none absolute rounded-lg border-2 border-cyan-400"
                              style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
                            >
                              <div className="absolute -top-8 left-0 whitespace-nowrap rounded-md bg-cyan-600 px-2 py-1 text-xs font-sans font-semibold text-white shadow-sm">
                                {result.label} • {(result.confidence * 100).toFixed(1)}%
                              </div>
                            </div>
                          )
                        })}
                        {isLoading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
                            <div className="rounded-2xl bg-white px-6 py-5 text-center shadow-xl">
                              <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-cyan-600" />
                              <p className="text-sm font-sans font-semibold text-slate-800">Memproses deteksi...</p>
                            </div>
                          </div>
                        )}
                        {isRedirecting && !isLoading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
                            <div className="rounded-2xl bg-white px-6 py-5 text-center shadow-xl">
                              <CheckCircle className="mx-auto mb-3 h-7 w-7 text-green-500" />
                              <p className="text-sm font-sans font-semibold text-slate-800">Deteksi tersimpan. Mengarahkan ke audit...</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Result summary card */}
                {detectResult && !isLoading && (
                  <Card className="detection-panel border border-gray-100 shadow-md rounded-2xl overflow-hidden">
                    <div className="h-1 w-full bg-gradient-to-r from-emerald-400 to-emerald-500" />
                    <CardHeader className="border-b border-slate-100 pt-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <CardTitle className="text-xl font-serif font-bold text-slate-900">Ringkasan Deteksi</CardTitle>
                        <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 rounded-full px-4 py-1.5 w-fit text-xs font-sans font-semibold text-green-700">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Tersimpan
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5 p-5">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
                          <p className="text-xs text-slate-500 font-sans uppercase tracking-wide">Total Deteksi</p>
                          <p className="mt-2 text-3xl font-serif font-black text-cyan-600">{detections.length}</p>
                        </div>
                        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                          <p className="text-xs text-slate-500 font-sans uppercase tracking-wide">Prediksi Utama</p>
                          <p className="mt-2 text-2xl font-serif font-black text-amber-600">{topPrediction}</p>
                        </div>
                        <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
                          <p className="text-xs text-slate-500 font-sans uppercase tracking-wide">Estimasi Harga</p>
                          <p className="mt-2 text-2xl font-serif font-black text-green-700">{formatCurrency(totalEstimatedPrice, "IDR")}</p>
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <p className="text-sm text-slate-500 font-sans leading-relaxed">
                          Hasil lengkap deteksi ditampilkan di halaman audit. Detail bounding box, harga per item, dan informasi waktu deteksi tersedia di sana.
                        </p>
                      </div>
                      <Button
                        onClick={() => router.push("/audits")}
                        disabled={isRedirecting}
                        className="w-full rounded-xl bg-cyan-600 py-6 text-base font-sans font-bold text-white hover:bg-cyan-700 disabled:opacity-60 btn-primary-glow"
                      >
                        {isRedirecting ? (
                          <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Mengarahkan ke Audit...</>
                        ) : (
                          <>Lihat Detail di Halaman Audit<ArrowRight className="ml-2 h-5 w-5" /></>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Empty state */}
                {!previewImage && !isCameraOpen && !errorMessage && !cameraError && (
                  <Card className="border-dashed border-2 border-slate-200 bg-white shadow-sm rounded-2xl">
                    <CardContent className="px-6 py-20 text-center">
                      <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-300">
                        <Camera className="h-10 w-10" />
                      </div>
                      <p className="text-xl font-serif font-bold text-slate-700 mb-2">
                        Siap untuk mendeteksi sampah
                      </p>
                      <p className="mx-auto max-w-md text-sm leading-6 text-slate-400 font-sans">
                        Gunakan tombol di atas untuk membuka kamera atau unggah gambar. Hasil deteksi otomatis tersimpan dan kamu akan diarahkan ke halaman audit.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </main>
            </div>
          </div>
        </section>

        <div className="section-divider" />

        {/* ── Tutorial ── */}
        <section className="py-20 bg-gray-50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-100/40 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center mb-14 fade-up">
              <span className="inline-block text-xs font-sans font-semibold tracking-widest text-cyan-600 uppercase bg-cyan-50 border border-cyan-100 rounded-full px-4 py-1.5 mb-4">
                Panduan
              </span>
              <h2 className="text-3xl md:text-4xl font-serif font-black text-gray-900 mb-3">
                Cara Menggunakan Fitur Klasifikasi
              </h2>
              <p className="text-lg text-gray-500 max-w-2xl mx-auto font-sans leading-relaxed">
                Panduan sederhana agar proses deteksi sampah bisa dilakukan dengan mudah.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {[
                {
                  icon: Camera,
                  bg: "bg-cyan-50",
                  color: "text-cyan-600",
                  accent: "bg-gradient-to-r from-cyan-400 to-cyan-600",
                  title: "1. Buka Kamera",
                  desc: "Klik tombol buka kamera, lalu izinkan akses kamera dari browser. Setelah terbuka, live detection berjalan otomatis.",
                  delay: "delay-1",
                },
                {
                  icon: Circle,
                  bg: "bg-amber-50",
                  color: "text-amber-600",
                  accent: "bg-gradient-to-r from-amber-400 to-amber-500",
                  title: "2. Arahkan ke Sampah",
                  desc: "Arahkan kamera ke objek sampah dengan pencahayaan yang cukup. Sistem menampilkan kotak deteksi dan nama jenis sampah.",
                  delay: "delay-2",
                },
                {
                  icon: ArrowRight,
                  bg: "bg-cyan-50",
                  color: "text-cyan-600",
                  accent: "bg-gradient-to-r from-cyan-400 to-cyan-600",
                  title: "3. Lihat di Halaman Audit",
                  desc: "Tekan ambil foto atau unggah gambar. Hasil deteksi disimpan dan kamu diarahkan ke halaman audit secara otomatis.",
                  delay: "delay-3",
                },
              ].map(({ icon: Icon, bg, color, accent, title, desc, delay }) => (
                <Card key={title} className={`card-hover fade-up ${delay} border border-gray-100 shadow-md bg-white rounded-2xl overflow-hidden cursor-default`}>
                  <div className={`h-1 w-full ${accent}`} />
                  <CardHeader className="text-center pb-4 pt-8">
                    <div className={`icon-wrap w-16 h-16 ${bg} rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors duration-300`}>
                      <Icon className={`h-8 w-8 ${color}`} />
                    </div>
                    <CardTitle className="text-xl font-serif font-bold">{title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-8">
                    <p className="text-gray-500 font-sans text-center text-sm leading-relaxed">{desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    title: "Gunakan Pencahayaan yang Jelas",
                    desc: "Hasil deteksi akan lebih baik jika objek sampah terlihat jelas dan tidak terlalu gelap.",
                  },
                  {
                    title: "Satu Objek Lebih Mudah Dibaca",
                    desc: "Untuk pengguna baru, coba deteksi satu jenis sampah terlebih dahulu agar hasil lebih mudah dipahami.",
                  },
                ].map(({ title, desc }) => (
                  <div key={title} className="check-item flex items-start gap-4 p-4 rounded-xl hover:bg-cyan-50/60 hover:border-cyan-100 border border-transparent transition-all duration-300 cursor-default">
                    <div className="flex-shrink-0 w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center mt-0.5">
                      <CheckCircle className="h-5 w-5 text-cyan-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-serif font-bold text-gray-900 mb-1">{title}</h3>
                      <p className="text-gray-500 font-sans text-sm leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-20 px-4 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="cta-bg rounded-3xl p-12 text-center relative overflow-hidden shadow-2xl shadow-cyan-900/20 fade-up">
              <div className="absolute top-[-40px] right-[-40px] w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-[-40px] left-[-40px] w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
              <div className="relative">
                <span className="inline-block text-xs font-sans font-semibold tracking-widest text-cyan-200 uppercase bg-white/10 rounded-full px-4 py-1.5 mb-6">
                  Mulai Sekarang
                </span>
                <h2 className="text-3xl md:text-4xl font-serif font-black text-white mb-4 leading-tight">
                  Siap Mendeteksi Sampah?
                </h2>
                <p className="text-cyan-100 font-sans text-lg mb-10 max-w-xl mx-auto leading-relaxed">
                  Gunakan kamera atau unggah gambar sekarang untuk mendapatkan hasil klasifikasi dan estimasi harga secara instan.
                </p>
                <button
                  onClick={handleOpenCamera}
                  disabled={isCameraOpen || isLoading}
                  className="inline-flex items-center gap-3 bg-white text-cyan-700 hover:bg-cyan-50 font-bold px-9 py-4 text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-sans"
                >
                  <Camera className="h-5 w-5" />
                  Buka Kamera
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
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
              <p className="text-gray-400 font-sans text-sm text-center md:text-left">© 2026 HargAI. All rights reserved.</p>
              <p className="text-gray-500 font-sans text-xs text-center md:text-right">Powered by HargAI Waste Classification System</p>
            </div>
          </div>
        </footer>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </>
  )
}