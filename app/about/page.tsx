import Navigation from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Leaf, Eye, BarChart3, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function AboutPage() {
  return (
    <>
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.08); }
          66% { transform: translate(-20px, 20px) scale(0.94); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(28px); }
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
        @keyframes pulse-ring {
          0%   { transform: scale(0.9); opacity: 0.6; }
          70%  { transform: scale(1.15); opacity: 0; }
          100% { transform: scale(1.15); opacity: 0; }
        }

        .animate-blob       { animation: blob 9s infinite ease-in-out; }
        .animate-blob-delay { animation: blob 11s infinite ease-in-out 3s; }
        .animate-float      { animation: float 4s ease-in-out infinite; }
        .animate-ping       { animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite; }

        .fade-up   { animation: fadeInUp   0.7s ease both; }
        .fade-left { animation: fadeInLeft 0.7s ease both; }
        .fade-right{ animation: fadeInRight 0.7s ease both; }

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

        .card-hover {
          transition: transform 0.35s cubic-bezier(.22,.68,0,1.2),
                      box-shadow 0.35s ease,
                      border-color 0.3s ease;
        }
        .card-hover:hover {
          transform: translateY(-8px) scale(1.01);
          box-shadow: 0 24px 48px -12px rgba(8,145,178,0.18);
          border-color: rgba(8,145,178,0.3) !important;
        }
        .card-hover:hover .icon-wrap { background: rgba(8,145,178,0.15); }
        .card-hover:hover .icon-wrap svg { transform: scale(1.15) rotate(-5deg); }

        .icon-wrap svg { transition: transform 0.3s ease; }

        .team-card {
          transition: transform 0.35s cubic-bezier(.22,.68,0,1.2), box-shadow 0.35s ease, border-color 0.3s ease;
        }
        .team-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px -10px rgba(8,145,178,0.2);
          border-color: rgba(8,145,178,0.25) !important;
        }
        .team-card:hover .team-avatar {
          transform: scale(1.06);
          box-shadow: 0 8px 24px rgba(8,145,178,0.25);
        }

        .team-avatar {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .check-item {
          transition: transform 0.25s ease, background 0.25s ease;
        }
        .check-item:hover { transform: translateX(4px); }

        .btn-primary-glow {
          box-shadow: 0 0 0 0 rgba(8,145,178,0);
          transition: box-shadow 0.3s ease, transform 0.2s ease;
        }
        .btn-primary-glow:hover {
          box-shadow: 0 0 24px 4px rgba(8,145,178,0.35);
          transform: translateY(-2px);
        }

        .section-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(8,145,178,0.25), transparent);
        }

        .image-frame {
          position: relative;
        }
        .image-frame::before {
          content: '';
          position: absolute;
          inset: -10px;
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(8,145,178,0.2), transparent 60%);
          z-index: 0;
        }
        .image-frame img { position: relative; z-index: 1; }

        .badge-float {
          animation: float 3.5s ease-in-out infinite;
        }

        .cta-bg {
          background: linear-gradient(135deg, #0891b2 0%, #0e7490 60%, #164e63 100%);
        }

        .amber-hover:hover .icon-wrap { background: rgba(217,119,6,0.15) !important; }
      `}</style>

      <div className="min-h-screen bg-white overflow-x-hidden">
        <Navigation />

        {/* ── Hero Section ── */}
        <section className="relative bg-gradient-to-br from-gray-50 via-white to-cyan-50/30 py-28 overflow-hidden">
          <div className="absolute top-[-80px] left-[-80px] w-[400px] h-[400px] rounded-full bg-cyan-200/25 blur-3xl animate-blob pointer-events-none" />
          <div className="absolute bottom-[-60px] right-[-60px] w-[350px] h-[350px] rounded-full bg-cyan-300/15 blur-3xl animate-blob-delay pointer-events-none" />
          <div className="absolute inset-0 hero-grid pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* Floating badge */}
            <div className="flex justify-center mb-8 fade-up">
              <div className="badge-float inline-flex items-center gap-2 bg-white border border-cyan-200 rounded-full px-4 py-2 shadow-md text-sm font-sans text-cyan-700">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                </span>
                Platform Klasifikasi Sampah Berbasis AI
              </div>
            </div>

            <h1 className="fade-up delay-1 text-5xl md:text-6xl lg:text-7xl font-serif font-black text-gray-900 mb-6 leading-tight">
              Tentang{" "}
              <span className="shimmer-text">HargAI</span>
            </h1>
            <p className="fade-up delay-2 text-xl text-gray-500 mb-10 max-w-3xl mx-auto font-sans leading-relaxed">
              Merevolusi pengelolaan limbah melalui integrasi Computer Vision dan Analitik Data untuk masa depan yang lebih berkelanjutan.
            </p>
          </div>
        </section>

        <div className="section-divider" />

        {/* ── Our Story ── */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="fade-left">
                <span className="inline-block text-xs font-sans font-semibold tracking-widest text-cyan-600 uppercase bg-cyan-50 border border-cyan-100 rounded-full px-4 py-1.5 mb-5">
                  Latar Belakang
                </span>
                <h2 className="text-4xl font-serif font-black text-gray-900 mb-6 leading-tight">
                  Cerita Kami
                </h2>

                <p className="text-lg text-gray-500 mb-5 font-sans leading-relaxed">
                  Dimulai dari kesadaran akan rendahnya tingkat pemilahan sampah,
                  HargAI hadir sebagai solusi cerdas berbasis Artificial Intelligence
                  untuk membantu masyarakat mengenali jenis sampah dengan lebih mudah
                  dan modern.
                </p>

                <p className="text-lg text-gray-500 mb-5 font-sans leading-relaxed">
                  Melalui teknologi deteksi YOLOv8, pengguna dapat melakukan
                  klasifikasi sampah secara instan menggunakan kamera maupun unggahan
                  gambar. Sistem juga membantu menampilkan estimasi nilai ekonomi dari
                  sampah yang berhasil dikenali.
                </p>

                <p className="text-lg text-gray-500 font-sans leading-relaxed">
                  Saat ini, HargAI terus dikembangkan untuk mendukung pengelolaan
                  sampah yang lebih praktis, efisien, dan mudah digunakan oleh
                  masyarakat umum maupun industri.
                </p>
              </div>

              <div className="fade-right image-frame">
                <img
                  src="/images/gambar-3.jpeg"
                  alt="Pengembangan Teknologi HargAI"
                  className="rounded-2xl shadow-2xl w-full object-cover animate-float"
                />
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-cyan-100 rounded-2xl -z-10" />
                <div className="absolute -top-4 -left-4 w-16 h-16 bg-amber-100 rounded-xl -z-10" />
              </div>
            </div>
          </div>
        </section>

        <div className="section-divider" />

        {/* ── Our Values ── */}
        <section className="py-24 bg-gray-50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-100/40 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center mb-16 fade-up">
              <span className="inline-block text-xs font-sans font-semibold tracking-widest text-cyan-600 uppercase bg-cyan-50 border border-cyan-100 rounded-full px-4 py-1.5 mb-4">
                Prinsip Kami
              </span>
              <h2 className="text-4xl font-serif font-black text-gray-900 mb-4">
                Nilai Utama Kami
              </h2>
              <p className="text-xl text-gray-500 max-w-3xl mx-auto font-sans leading-relaxed">
                Prinsip yang mendasari setiap inovasi teknologi yang kami kembangkan.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: Eye,
                  bg: "bg-cyan-50",
                  iconColor: "text-cyan-600",
                  accent: "bg-gradient-to-r from-cyan-400 to-cyan-600",
                  title: "Inovasi Presisi",
                  desc: "Menggunakan teknologi Computer Vision modern untuk membantu proses deteksi sampah secara cepat dan akurat.",
                  delay: "delay-1",
                },
                {
                  icon: Leaf,
                  bg: "bg-amber-50",
                  iconColor: "text-amber-600",
                  accent: "bg-gradient-to-r from-amber-400 to-amber-500",
                  title: "Keberlanjutan",
                  desc: "Membantu meningkatkan kesadaran pengelolaan sampah untuk mendukung lingkungan yang lebih bersih dan berkelanjutan.",
                  delay: "delay-2",
                  amber: true,
                },
                {
                  icon: BarChart3,
                  bg: "bg-cyan-50",
                  iconColor: "text-cyan-600",
                  accent: "bg-gradient-to-r from-cyan-400 to-cyan-600",
                  title: "Data Terukur",
                  desc: "Menampilkan informasi klasifikasi dan estimasi harga secara jelas agar lebih mudah dipahami pengguna.",
                  delay: "delay-3",
                },
              ].map(({ icon: Icon, bg, iconColor, accent, title, desc, delay, amber }) => (
                <Card
                  key={title}
                  className={`card-hover ${amber ? "amber-hover" : ""} fade-up ${delay} border border-gray-100 shadow-md bg-white rounded-2xl overflow-hidden cursor-default`}
                >
                  <div className={`h-1 w-full ${accent}`} />
                  <CardHeader className="text-center pb-4 pt-8">
                    <div className={`icon-wrap w-16 h-16 ${bg} rounded-2xl flex items-center justify-center mx-auto mb-5 transition-colors duration-300`}>
                      <Icon className={`h-8 w-8 ${iconColor}`} />
                    </div>
                    <CardTitle className="text-xl font-serif font-bold">{title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-8">
                    <p className="text-gray-500 font-sans text-center text-sm leading-relaxed">{desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <div className="section-divider" />

        {/* ── Team Section ── */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 fade-up">
              <span className="inline-block text-xs font-sans font-semibold tracking-widest text-cyan-600 uppercase bg-cyan-50 border border-cyan-100 rounded-full px-4 py-1.5 mb-4">
                Tim Kami
              </span>
              <h2 className="text-4xl font-serif font-black text-gray-900 mb-4">
                Tim Pengembang
              </h2>
              <p className="text-xl text-gray-500 max-w-2xl mx-auto font-sans leading-relaxed">
                Talenta-talenta di balik platform HargAI.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  src: "/images/avatar/raihan.png",
                  name: "Raihan Maulana",
                  role: "AI Engineer",
                  desc: "Optimasi model YOLOv8 untuk akurasi deteksi sampah yang tinggi.",
                  delay: "delay-1",
                },
                {
                  src: "/images/avatar/allwan.png",
                  name: "Allwan Raharjo",
                  role: "Data Engineer",
                  desc: "Arsitektur pipeline data dan manajemen database audit sampah.",
                  delay: "delay-2",
                },
                {
                  src: "/images/avatar/geihan.png",
                  name: "Geihansyah",
                  role: "Backend Developer",
                  desc: "Pengembangan API, keamanan sistem, dan logika sisi server.",
                  delay: "delay-3",
                },
                {
                  src: "/images/avatar/farel.png",
                  name: "Farel Rabbani",
                  role: "Frontend Developer",
                  desc: "Membangun UI responsif dan visualisasi dashboard analitik.",
                  delay: "delay-4",
                },
              ].map(({ src, name, role, desc, delay }) => (
                <Card
                  key={name}
                  className={`team-card fade-up ${delay} border border-gray-100 shadow-md bg-white rounded-2xl overflow-hidden text-center cursor-default`}
                >
                  <div className="h-1 w-full bg-gradient-to-r from-cyan-400 to-cyan-600" />
                  <CardContent className="pt-8 pb-6 px-5">
                    <div className="mb-4">
                      <img
                        src={src}
                        alt={name}
                        className="team-avatar w-20 h-20 rounded-2xl mx-auto object-cover shadow-md border-2 border-cyan-50"
                      />
                    </div>
                    <h3 className="text-base font-serif font-bold text-gray-900 mb-1">{name}</h3>
                    <p className="text-cyan-600 font-sans text-xs font-semibold uppercase tracking-wide mb-3">{role}</p>
                    <p className="text-gray-500 font-sans text-xs leading-relaxed">{desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <div className="section-divider" />

        {/* ── Our Approach ── */}
        <section className="py-24 bg-gray-50 relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-100/30 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center mb-16 fade-up">
              <span className="inline-block text-xs font-sans font-semibold tracking-widest text-cyan-600 uppercase bg-cyan-50 border border-cyan-100 rounded-full px-4 py-1.5 mb-4">
                Cara Kerja
              </span>
              <h2 className="text-4xl font-serif font-black text-gray-900 mb-4">
                Metodologi Kami
              </h2>
              <p className="text-xl text-gray-500 max-w-3xl mx-auto font-sans leading-relaxed">
                Alur kerja cerdas yang mengubah gambar menjadi informasi yang bermanfaat.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <div className="fade-left space-y-4">
                {[
                  {
                    title: "Deteksi Real-time YOLOv8",
                    desc: "Proses identifikasi jenis sampah secara otomatis melalui kamera maupun unggahan gambar.",
                  },
                  {
                    title: "Estimasi Nilai Ekonomi",
                    desc: "Sistem menampilkan estimasi harga berdasarkan kategori sampah yang berhasil dikenali oleh AI.",
                  },
                  {
                    title: "Pengalaman Pengguna Sederhana",
                    desc: "Dirancang agar mudah digunakan oleh pengguna umum tanpa memerlukan pemahaman teknis yang kompleks.",
                  },
                ].map(({ title, desc }) => (
                  <div
                    key={title}
                    className="check-item flex items-start gap-4 p-4 rounded-xl hover:bg-white hover:border-cyan-100 border border-transparent hover:shadow-md transition-all duration-300 cursor-default"
                  >
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

              <div className="fade-right image-frame">
                <img
                  src="/images/gambar-4.jpeg"
                  alt="Analisis Data Sampah"
                  className="rounded-2xl shadow-2xl w-full object-cover"
                />
                <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-cyan-100 rounded-2xl -z-10" />
                <div className="absolute -top-4 -left-4 w-14 h-14 bg-amber-100 rounded-xl -z-10" />
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA Section ── */}
        <section className="py-24 px-4 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="cta-bg rounded-3xl p-12 text-center relative overflow-hidden shadow-2xl shadow-cyan-900/20 fade-up">
              <div className="absolute top-[-40px] right-[-40px] w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-[-40px] left-[-40px] w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />

              <div className="relative">
                <span className="inline-block text-xs font-sans font-semibold tracking-widest text-cyan-200 uppercase bg-white/10 rounded-full px-4 py-1.5 mb-6">
                  Bergabung Sekarang
                </span>
                <h2 className="text-4xl font-serif font-black text-white mb-4 leading-tight">
                  Siap Mulai Menggunakan HargAI?
                </h2>
                <p className="text-cyan-100 font-sans text-lg mb-10 max-w-xl mx-auto leading-relaxed">
                  Bergabung sekarang dan gunakan fitur klasifikasi sampah berbasis AI
                  dengan pengalaman yang cepat dan mudah digunakan.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/register">
                    <Button
                      size="lg"
                      className="bg-white text-cyan-700 hover:bg-cyan-50 font-bold px-9 py-6 text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                    >
                      Join Now
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="bg-gray-900 text-white py-12 border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
              <div className="md:col-span-2">
                <h3 className="text-2xl font-serif font-black text-cyan-400 mb-3">
                  HargAI
                </h3>
                <p className="text-gray-400 font-sans text-sm leading-relaxed max-w-2xl">
                  HargAI adalah platform klasifikasi sampah berbasis AI yang membantu pengguna mengenali jenis sampah dan melihat estimasi harga secara cepat.
                </p>
              </div>

              <div className="md:text-right">
                <h4 className="text-lg font-serif font-bold mb-4">
                  Mulai Menggunakan
                </h4>
                <p className="text-gray-400 font-sans text-sm mb-4">
                  Daftar akun untuk mengakses fitur.
                </p>
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