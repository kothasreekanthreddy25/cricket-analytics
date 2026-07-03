'use client'

import { LogOut } from 'lucide-react'
import { useState } from 'react'

export function SignOutButton() {
  const [loading, setLoading] = useState(false)

  async function handleSignOut() {
    setLoading(true)
    try {
      await fetch('/api/user/logout', { method: 'POST' })
    } catch {
      // ignore network errors — still redirect
    }
    window.location.href = '/auth/signin'
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
    >
      <LogOut className="w-4 h-4" />
      {loading ? 'Signing out...' : 'Sign out'}
    </button>
  )
}
