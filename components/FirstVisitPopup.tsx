'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, Brain, MessageCircle, ChevronRight, CheckCircle2, Trophy, Zap } from 'lucide-react'

const STORAGE_KEY = 'ct_popup_dismissed'

export default function FirstVisitPopup() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'choice' | 'whatsapp' | 'success'>('choice')
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Show after 3 seconds on first visit
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (!dismissed) {
      const t = setTimeout(() => setOpen(true), 3000)
      return () => clearTimeout(t)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!whatsapp.trim()) { setError('Please enter your WhatsApp number'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp: whatsapp.trim(), name: name.trim() || undefined }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed')
      setStep('success')
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={dismiss}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 border border-gray-700/60 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">

        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-500" />

        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* ── Step: choice ── */}
        {step === 'choice' && (
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                <Brain className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-white font-extrabold text-lg leading-tight">Get Free AI Predictions</h2>
                <p className="text-gray-400 text-xs mt-0.5">Join 10,000+ cricket fans</p>
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-2 mb-5">
              {[
                { icon: <Trophy className="w-3.5 h-3.5 text-amber-400" />, text: 'Daily match predictions direct to WhatsApp' },
                { icon: <Zap className="w-3.5 h-3.5 text-emerald-400" />, text: 'Live win probability alerts for every match' },
                { icon: <Brain className="w-3.5 h-3.5 text-cyan-400" />, text: 'AI-powered tips before match starts' },
              ].map(b => (
                <div key={b.text} className="flex items-start gap-2.5 bg-gray-800/50 rounded-xl px-3 py-2">
                  <div className="mt-0.5 flex-shrink-0">{b.icon}</div>
                  <p className="text-gray-300 text-xs leading-snug">{b.text}</p>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="space-y-2.5">
              <button
                onClick={() => setStep('whatsapp')}
                className="flex items-center justify-between w-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-xl font-bold text-sm transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Get Predictions on WhatsApp
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>

              <Link
                href="/auth/signup"
                onClick={dismiss}
                className="flex items-center justify-between w-full bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-xl font-bold text-sm border border-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-emerald-400" />
                  Create Free Account
                </div>
                <ChevronRight className="w-4 h-4" />
              </Link>

              <button
                onClick={dismiss}
                className="w-full text-gray-600 hover:text-gray-400 text-xs py-1.5 transition-colors"
              >
                No thanks, continue browsing
              </button>
            </div>
          </div>
        )}

        {/* ── Step: whatsapp form ── */}
        {step === 'whatsapp' && (
          <form onSubmit={handleSubmit} className="p-6">
            <button
              type="button"
              onClick={() => setStep('choice')}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-300 text-xs mb-4 transition-colors"
            >
              ← Back
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h2 className="text-white font-extrabold text-lg">WhatsApp Predictions</h2>
                <p className="text-gray-400 text-xs mt-0.5">100% free · No spam · Unsubscribe anytime</p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs text-gray-400 font-medium mb-1.5 block">Your Name (optional)</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Srikanth"
                  className="w-full bg-gray-800 border border-gray-700 focus:border-emerald-500 text-white placeholder-gray-600 rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium mb-1.5 block">WhatsApp Number <span className="text-red-400">*</span></label>
                <div className="flex gap-2">
                  <div className="flex items-center bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-400 flex-shrink-0">
                    +91
                  </div>
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={e => setWhatsapp(e.target.value)}
                    placeholder="9876543210"
                    className="flex-1 bg-gray-800 border border-gray-700 focus:border-emerald-500 text-white placeholder-gray-600 rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
                    maxLength={15}
                  />
                </div>
                {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-4 py-3 rounded-xl font-bold text-sm transition-colors"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <MessageCircle className="w-4 h-4" />
              )}
              {loading ? 'Sending…' : 'Send Me Predictions'}
            </button>

            <p className="text-center text-[10px] text-gray-600 mt-3">
              By submitting you agree to receive WhatsApp messages from CricketTips.ai. 18+ only.
            </p>
          </form>
        )}

        {/* ── Step: success ── */}
        {step === 'success' && (
          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-white font-extrabold text-xl mb-2">You're In! 🎉</h2>
            <p className="text-gray-400 text-sm mb-1">
              We'll send your first AI prediction shortly on WhatsApp.
            </p>
            <p className="text-gray-600 text-xs mb-6">Check your messages before the next match starts.</p>
            <button
              onClick={dismiss}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-colors"
            >
              Start Exploring Predictions
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
