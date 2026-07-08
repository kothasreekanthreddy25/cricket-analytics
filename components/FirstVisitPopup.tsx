'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Brain, MessageCircle, ChevronRight, CheckCircle2, Trophy, Zap } from 'lucide-react'

const STORAGE_KEY = 'ct_popup_dismissed'
const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME

const COUNTRY_CODES = [
  { code: '+91',  flag: '🇮🇳', name: 'India' },
  { code: '+1',   flag: '🇺🇸', name: 'USA' },
  { code: '+1',   flag: '🇨🇦', name: 'Canada' },
  { code: '+44',  flag: '🇬🇧', name: 'UK' },
  { code: '+61',  flag: '🇦🇺', name: 'Australia' },
  { code: '+64',  flag: '🇳🇿', name: 'New Zealand' },
  { code: '+94',  flag: '🇱🇰', name: 'Sri Lanka' },
  { code: '+92',  flag: '🇵🇰', name: 'Pakistan' },
  { code: '+880', flag: '🇧🇩', name: 'Bangladesh' },
  { code: '+27',  flag: '🇿🇦', name: 'South Africa' },
  { code: '+263', flag: '🇿🇼', name: 'Zimbabwe' },
  { code: '+93',  flag: '🇦🇫', name: 'Afghanistan' },
  { code: '+354', flag: '🇮🇪', name: 'Ireland' },
  { code: '+31',  flag: '🇳🇱', name: 'Netherlands' },
  { code: '+1',   flag: '🇼🇮', name: 'West Indies' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+968', flag: '🇴🇲', name: 'Oman' },
  { code: '+60',  flag: '🇲🇾', name: 'Malaysia' },
  { code: '+65',  flag: '🇸🇬', name: 'Singapore' },
  { code: '+49',  flag: '🇩🇪', name: 'Germany' },
  { code: '+33',  flag: '🇫🇷', name: 'France' },
  { code: '+971', flag: '🇦🇪', name: 'Dubai' },
  { code: '+974', flag: '🇶🇦', name: 'Qatar' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: '+255', flag: '🇹🇿', name: 'Tanzania' },
  { code: '+256', flag: '🇺🇬', name: 'Uganda' },
  { code: '+250', flag: '🇷🇼', name: 'Rwanda' },
]

export default function FirstVisitPopup() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'choice' | 'whatsapp' | 'success'>('choice')
  const [name, setName] = useState('')
  const [channel, setChannel] = useState<'whatsapp' | 'telegram'>('whatsapp')
  const [whatsapp, setWhatsapp] = useState('')
  const [telegram, setTelegram] = useState('')
  const [countryCode, setCountryCode] = useState('+91')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [leadId, setLeadId] = useState<string | null>(null)

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
    if (channel === 'whatsapp' && !whatsapp.trim()) { setError('Please enter your WhatsApp number'); return }
    if (channel === 'telegram' && !telegram.trim()) { setError('Please enter your Telegram username'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsapp: channel === 'whatsapp' ? `${countryCode}${whatsapp.trim()}` : undefined,
          telegram: channel === 'telegram' ? telegram.trim() : undefined,
          name: name.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed')
      setLeadId(data.leadId || null)
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
                  Get Predictions on WhatsApp / Telegram
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

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h2 className="text-white font-extrabold text-lg">Get Predictions</h2>
                <p className="text-gray-400 text-xs mt-0.5">100% free · No spam · Unsubscribe anytime</p>
              </div>
            </div>

            {/* Channel toggle */}
            <div className="flex gap-2 mb-4 bg-gray-800/60 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => { setChannel('whatsapp'); setError('') }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${channel === 'whatsapp' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </button>
              <button
                type="button"
                onClick={() => { setChannel('telegram'); setError('') }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${channel === 'telegram' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.43 13.625l-2.95-.924c-.64-.203-.658-.64.136-.954l11.57-4.461c.537-.194 1.006.131.708.935z"/></svg>
                Telegram
              </button>
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

              {channel === 'whatsapp' ? (
                <div>
                  <label className="text-xs text-gray-400 font-medium mb-1.5 block">WhatsApp Number <span className="text-red-400">*</span></label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={e => setCountryCode(e.target.value)}
                      className="bg-gray-800 border border-gray-700 focus:border-emerald-500 text-white rounded-xl px-2 py-2.5 text-sm outline-none transition-colors flex-shrink-0 max-w-[130px] cursor-pointer"
                    >
                      {COUNTRY_CODES.map((c, i) => (
                        <option key={i} value={c.code}>
                          {c.flag} {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={whatsapp}
                      onChange={e => setWhatsapp(e.target.value)}
                      placeholder="Phone number"
                      className="flex-1 bg-gray-800 border border-gray-700 focus:border-green-500 text-white placeholder-gray-600 rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
                      maxLength={15}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs text-gray-400 font-medium mb-1.5 block">Telegram Username <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold">@</span>
                    <input
                      type="text"
                      value={telegram}
                      onChange={e => setTelegram(e.target.value.replace(/^@/, ''))}
                      placeholder="yourusername"
                      className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 text-white placeholder-gray-600 rounded-xl pl-8 pr-4 py-2.5 text-sm outline-none transition-colors"
                    />
                  </div>
                  <p className="text-gray-600 text-[10px] mt-1">Find your username in Telegram → Settings → Username</p>
                </div>
              )}

              {error && <p className="text-red-400 text-xs">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`flex items-center justify-center gap-2 w-full disabled:opacity-50 text-white px-4 py-3 rounded-xl font-bold text-sm transition-colors ${channel === 'whatsapp' ? 'bg-green-600 hover:bg-green-500' : 'bg-blue-600 hover:bg-blue-500'}`}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <MessageCircle className="w-4 h-4" />
              )}
              {loading ? 'Sending…' : `Get Predictions via ${channel === 'whatsapp' ? 'WhatsApp' : 'Telegram'}`}
            </button>

            <p className="text-center text-[10px] text-gray-600 mt-3">
              By submitting you agree to receive messages from CricketTips.ai. 18+ only.
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

            {channel === 'telegram' && leadId && TELEGRAM_BOT_USERNAME ? (
              <>
                <p className="text-gray-400 text-sm mb-1">One more step — Telegram only lets bots message people who've said hi first.</p>
                <p className="text-gray-600 text-xs mb-5">Tap below and hit Start — takes 2 seconds.</p>
                <a
                  href={`https://t.me/${TELEGRAM_BOT_USERNAME}?start=${leadId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={dismiss}
                  className="flex items-center justify-center gap-2 w-full bg-[#229ED9] hover:bg-[#1e8dc2] text-white px-4 py-3 rounded-xl font-bold text-sm transition-colors mb-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.43 13.625l-2.95-.924c-.64-.203-.658-.64.136-.954l11.57-4.461c.537-.194 1.006.131.708.935z"/></svg>
                  Activate on Telegram
                </a>
              </>
            ) : (
              <>
                <p className="text-gray-400 text-sm mb-1">
                  We'll send your first AI prediction shortly on WhatsApp.
                </p>
                <p className="text-gray-600 text-xs mb-6">Check your messages before the next match starts.</p>
              </>
            )}

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
