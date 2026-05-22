"use client"

import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation" // <-- tambahkan usePathname
import { Menu, X, LogOut, User, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { logout, isAuthenticated, getStoredUser } from "@/lib/auth"

type UserInfo = {
  username: string
  email: string
  role: string
}

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [user, setUser] = useState<UserInfo | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname() // <-- gunakan ini untuk path saat ini

  useEffect(() => {
    const auth = isAuthenticated()
    setLoggedIn(auth)
    if (auth) {
      const stored = getStoredUser() as UserInfo | null
      setUser(stored)
    }
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleLogout = () => {
    logout()
    setLoggedIn(false)
    setUser(null)
    setDropdownOpen(false)
    setIsMenuOpen(false)
    router.push("/login")
  }

  const navLinks = [
    { href: "/profile", label: "Dashboard" },
    { href: "/classify", label: "Klasifikasi" },
    { href: "/audits", label: "Audit" },
    { href: "/history", label: "Riwayat" },
    { href: "/reports", label: "Laporan" },
  ]

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <style>
        {`
          .glow-effect {
            text-shadow: 0 0 8px rgba(0, 255, 255, 0.7);
          }
        `}
      </style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-serif font-black text-cyan-600">
              HargAI
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-2">
                {navLinks.map((item) => {
                  const isActive = pathname === item.href // <-- pakai pathname
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "text-cyan-600 font-bold glow-effect"
                          : "text-gray-600 hover:text-cyan-600"
                      }`}
                    >
                      {item.label}
                    </Link>
                  )
                })}
                <Link
                  href="/about"
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    pathname === "/about"
                      ? "text-cyan-600 font-bold glow-effect"
                      : "text-gray-600 hover:text-cyan-600"
                  }`}
                >
                  About
                </Link>
              </div>
            </div>
          </div>

          {/* Desktop right side */}
          <div className="hidden md:flex items-center gap-3">
            {loggedIn && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-full border border-gray-200 hover:border-cyan-300 hover:bg-cyan-50 transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 font-serif font-black text-sm flex-shrink-0">
                    {user.username?.[0]?.toUpperCase()}
                  </div>
                  <div className="text-left leading-tight">
                    <p className="text-sm font-semibold text-gray-800 font-sans leading-none">
                      {user.username}
                    </p>
                    <p className="text-xs text-cyan-600 font-sans uppercase font-semibold">
                      {user.role}
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-100 rounded-xl shadow-xl py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100 mb-1">
                      <p className="text-xs text-gray-400 font-sans truncate">{user.email}</p>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-cyan-50 hover:text-cyan-700 font-sans transition-colors"
                    >
                      <User className="h-4 w-4" />
                      Dashboard
                    </Link>
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-sans transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login">
                <Button className="bg-cyan-600 hover:bg-cyan-700 text-white font-sans font-bold">
                  Login
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-cyan-600 p-2"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200">
            {loggedIn && user && (
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
                <div className="w-9 h-9 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 font-serif font-black">
                  {user.username?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 font-sans">{user.username}</p>
                  <p className="text-xs text-cyan-600 font-sans uppercase font-semibold">{user.role}</p>
                </div>
              </div>
            )}

            <div className="px-2 pt-2 pb-3 space-y-1">
              {navLinks.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`block px-3 py-2 text-base font-medium font-sans transition-colors ${
                      isActive
                        ? "text-cyan-600 font-bold glow-effect"
                        : "text-gray-600 hover:text-cyan-600"
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
              <Link
                href="/about"
                onClick={() => setIsMenuOpen(false)}
                className={`block px-3 py-2 text-base font-medium font-sans transition-colors ${
                  pathname === "/about"
                    ? "text-cyan-600 font-bold glow-effect"
                    : "text-gray-600 hover:text-cyan-600"
                }`}
              >
                About
              </Link>

              {loggedIn ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 text-base font-medium text-red-600 hover:text-red-700 font-sans"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-2 text-base font-medium text-cyan-600 hover:text-cyan-700 font-sans"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}