'use client'

import Link from 'next/link'
import { Shield, Menu, X, Send } from 'lucide-react'
import { useState } from 'react'
import { useSession, signOut } from '@/lib/auth-client'

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.258 5.63 5.906-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  )
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const { data: session } = useSession()

  return (
    <nav className="bg-gray-950 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-4">
        <div className="flex justify-between items-center h-12">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Shield className="w-6 h-6 text-emerald-400" />
            <span className="text-base font-extrabold text-white tracking-tight">
              CricketTips<span className="text-emerald-400">.ai</span>
            </span>
          </Link>

          {/* Auth + Social — Desktop */}
          <div className="hidden md:flex items-center gap-4">
            {/* Social icons */}
            <div className="flex items-center gap-2.5">
              <a href="https://t.me/crickettipsai" target="_blank" rel="noopener noreferrer" title="Telegram"
                className="text-sky-400 hover:text-sky-300 transition-colors">
                <Send className="w-4 h-4" />
              </a>
              <a href="https://instagram.com/crickettipsai" target="_blank" rel="noopener noreferrer" title="Instagram"
                className="text-pink-400 hover:text-pink-300 transition-colors">
                <InstagramIcon className="w-4 h-4" />
              </a>
              <a href="https://x.com/aicrickettips" target="_blank" rel="noopener noreferrer" title="X (Twitter)"
                className="text-gray-200 hover:text-white transition-colors">
                <XIcon className="w-4 h-4" />
              </a>
            </div>
            <div className="w-px h-4 bg-gray-700" />
            {session ? (
              <>
                <span className="text-xs text-gray-400 max-w-[180px] truncate">
                  {session.user?.email}
                </span>
                <Link
                  href="/dashboard/user"
                  className="text-xs font-medium text-gray-300 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-gray-800"
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => signOut()}
                  className="text-xs font-medium text-gray-400 hover:text-white transition"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  className="text-xs font-medium text-gray-300 hover:text-white transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                >
                  Sign Up Free
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-1.5 text-gray-400 hover:text-white"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-3 space-y-1 border-t border-gray-800">
            {[
              { href: '/', label: 'Home' },
              { href: '/matches', label: 'Live Scores' },
              { href: '/analysis', label: 'AI Analysis' },
              { href: '/predictions', label: 'Predictions' },
              { href: '/odds', label: 'Odds' },
              { href: '/teams', label: 'Teams' },
              { href: '/players', label: 'Players' },
              { href: '/blog', label: 'News' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="block py-2 px-3 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-gray-800 flex gap-2 px-1">
              {session ? (
                <>
                  <Link href="/dashboard/user" onClick={() => setIsOpen(false)} className="flex-1 text-center py-2 text-sm text-gray-300 hover:text-white bg-gray-800 rounded-lg">Dashboard</Link>
                  <button onClick={() => { signOut(); setIsOpen(false) }} className="flex-1 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 rounded-lg">Sign Out</button>
                </>
              ) : (
                <>
                  <Link href="/auth/signin" onClick={() => setIsOpen(false)} className="flex-1 text-center py-2 text-sm text-gray-300 hover:text-white bg-gray-800 rounded-lg">Sign In</Link>
                  <Link href="/auth/signup" onClick={() => setIsOpen(false)} className="flex-1 text-center py-2 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg">Sign Up</Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
