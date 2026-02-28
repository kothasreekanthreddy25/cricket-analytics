'use client'

import Link from 'next/link'
import { Shield, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useSession, signOut } from '@/lib/auth-client'

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

          {/* Auth — Desktop */}
          <div className="hidden md:flex items-center gap-3">
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
