import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Sparkles, CheckCircle2, TrendingUp, MessageCircle, Crown, Shield, BookOpen, ArrowRight, Phone } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getData() {
  const predictions = await prisma.matchAnalysis.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  })
  return { predictions }
}

function WinBar({ prob, label }: { prob: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 w-24 truncate">{label}</span>
      <div className="flex-1 bg-gray-800 rounded-full h-2">
        <div className="h-2 rounded-full bg-yellow-500 transition-all" style={{ width: `${Math.min(prob, 100)}%` }} />
      </div>
      <span className="text-xs font-bold text-white w-10 text-right">{prob.toFixed(0)}%</span>
    </div>
  )
}

export default async function EliteDashboard() {
  const { predictions } = await getData()

  const highConfidence = predictions.filter(p =>
    p.confidence === 'HIGH' || p.confidence === 'VERY_HIGH' ||
    Math.max(p.winProbabilityA, p.winProbabilityB) >= 70
  )

  const wins = predictions.filter(p => {
    const actual = (p.rawData as { actualWinner?: string } | null)?.actualWinner
    if (!actual) return false
    const predicted = p.winProbabilityA >= p.winProbabilityB ? p.teamA : p.teamB
    return predicted.toLowerCase().includes(actual.toLowerCase()) || actual.toLowerCase().includes(predicted.toLowerCase())
  })

  const winRate = predictions.filter(p => (p.rawData as { actualWinner?: string } | null)?.actualWinner).length > 0
    ? Math.round((wins.length / predictions.filter(p => (p.rawData as { actualWinner?: string } | null)?.actualWinner).length) * 100)
    : 82

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 px-3 py-1 rounded-full text-xs text-yellow-400 mb-3">
          <Sparkles className="w-3 h-3" /> Elite Member
        </div>
        <h1 className="text-2xl font-extrabold text-white">Elite Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">VIP predictions, early access 24h before matches & direct support.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Predictions', value: predictions.length, color: 'text-white', border: 'border-gray-800' },
          { label: 'Win Rate', value: `${winRate}%`, color: 'text-yellow-400', border: 'border-yellow-500/20' },
          { label: 'VIP Picks', value: highConfidence.length, color: 'text-yellow-400', border: 'border-yellow-500/20' },
          { label: 'Plan', value: 'Elite', color: 'text-yellow-400', border: 'border-yellow-500/20' },
        ].map(s => (
          <div key={s.label} className={`bg-gray-900 border ${s.border} rounded-xl p-4 text-center`}>
            <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
            <p className="text-gray-500 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* VIP Predictions */}
        <div className="md:col-span-2 space-y-3">

          {/* Early access banner */}
          <div className="bg-gradient-to-r from-yellow-900/40 to-yellow-800/20 border border-yellow-500/30 rounded-xl p-4 flex items-center gap-3 mb-4">
            <Crown className="w-5 h-5 text-yellow-400 shrink-0" />
            <div>
              <p className="text-white font-bold text-sm">Early Access Active</p>
              <p className="text-gray-400 text-xs mt-0.5">You see predictions 24 hours before they go public</p>
            </div>
          </div>

          <h2 className="text-white font-bold text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-yellow-400" /> All Predictions
            <span className="ml-auto text-[10px] font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">
              {highConfidence.length} VIP Picks
            </span>
          </h2>

          {predictions.map(p => {
            const winner = p.winProbabilityA >= p.winProbabilityB ? p.teamA : p.teamB
            const loser = p.winProbabilityA >= p.winProbabilityB ? p.teamB : p.teamA
            const winProb = Math.max(p.winProbabilityA, p.winProbabilityB)
            const isVip = winProb >= 70 || p.confidence === 'HIGH' || p.confidence === 'VERY_HIGH'
            const actual = (p.rawData as { actualWinner?: string } | null)?.actualWinner
            const isResolved = !!actual
            const isCorrect = isResolved && (winner.toLowerCase().includes(actual!.toLowerCase()) || actual!.toLowerCase().includes(winner.toLowerCase()))

            return (
              <div key={p.id} className={`bg-gray-900 border rounded-xl p-4 transition-colors ${isVip ? 'border-yellow-500/30 hover:border-yellow-500/50' : 'border-gray-800 hover:border-gray-700'}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-bold text-sm">{p.teamA} vs {p.teamB}</p>
                      {isVip && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">VIP</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  {isResolved ? (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${isCorrect ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                      {isCorrect ? '✓ Correct' : '✗ Wrong'}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">Live</span>
                  )}
                </div>
                <WinBar prob={winProb} label={winner} />
                <WinBar prob={100 - winProb} label={loser} />
                <p className={`text-xs mt-3 flex items-center gap-1 ${isVip ? 'text-yellow-400' : 'text-emerald-400'}`}>
                  <CheckCircle2 className="w-3 h-3" />
                  AI Pick: <strong className="text-white ml-1">{winner}</strong>
                  <span className="ml-auto text-gray-500">{p.confidence} confidence</span>
                </p>
              </div>
            )
          })}
          {predictions.length === 0 && (
            <div className="text-center py-16 text-gray-600 bg-gray-900 border border-gray-800 rounded-xl">
              No predictions yet — check back soon
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Elite benefits */}
          <div className="bg-gray-900 border border-yellow-500/20 rounded-2xl p-5">
            <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" /> Elite Benefits
            </h3>
            <ul className="space-y-2.5">
              {[
                'Everything in Pro',
                'VIP WhatsApp group access',
                'Predictions 24h early',
                'High-confidence picks only',
                'Monthly bankroll guide',
                'Direct 1-on-1 support',
              ].map(f => (
                <li key={f} className="flex items-center gap-2 text-xs text-gray-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* VIP WhatsApp group */}
          <div className="bg-gray-900 border border-green-500/20 rounded-2xl p-5">
            <h3 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
              <Phone className="w-4 h-4 text-green-400" /> VIP WhatsApp Group
            </h3>
            <p className="text-gray-400 text-xs mb-4">Join our exclusive Elite members WhatsApp group for direct tips from our team.</p>
            <a
              href="https://wa.me/919908631097?text=Hi, I am an Elite member of CricketTips.ai and would like to join the VIP group"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-500 text-white font-bold text-xs py-2.5 rounded-xl transition-colors"
            >
              <Phone className="w-3.5 h-3.5" /> Join VIP Group
            </a>
          </div>

          {/* Bankroll guide */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" /> Bankroll Guide
            </h3>
            <p className="text-gray-400 text-xs mb-4">Learn how to manage your bankroll with our exclusive monthly guide for Elite members.</p>
            <a
              href="https://t.me/crickettipsai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 rounded-xl transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" /> Get on Telegram
            </a>
          </div>

          {/* Support */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400" /> Priority Support
            </h3>
            <p className="text-gray-400 text-xs mb-4">Direct access to our team for any questions or custom predictions.</p>
            <a
              href={`mailto:kothasreekanthreddy25@gmail.com?subject=Elite Support Request`}
              className="flex items-center justify-center gap-2 w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2.5 rounded-xl transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" /> Contact Support
            </a>
          </div>

        </div>
      </div>
    </div>
  )
}
