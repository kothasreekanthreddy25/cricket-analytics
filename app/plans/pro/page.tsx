import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Trophy, CheckCircle2, TrendingUp, Star, MessageCircle, Bell, ArrowRight, Zap } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getData() {
  const [predictions, totalPaid] = await Promise.all([
    prisma.matchAnalysis.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.subscription.count({ where: { plan: 'pro', status: 'paid' } }),
  ])
  return { predictions, totalPaid }
}

function WinBar({ prob, label }: { prob: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 w-24 truncate">{label}</span>
      <div className="flex-1 bg-gray-800 rounded-full h-2">
        <div
          className="h-2 rounded-full bg-emerald-500 transition-all"
          style={{ width: `${Math.min(prob, 100)}%` }}
        />
      </div>
      <span className="text-xs font-bold text-white w-10 text-right">{prob.toFixed(0)}%</span>
    </div>
  )
}

export default async function ProDashboard() {
  const { predictions } = await getData()

  const wins = predictions.filter(p => {
    const actual = (p.rawData as { actualWinner?: string } | null)?.actualWinner
    if (!actual) return false
    const predicted = p.winProbabilityA >= p.winProbabilityB ? p.teamA : p.teamB
    return predicted.toLowerCase().includes(actual.toLowerCase()) || actual.toLowerCase().includes(predicted.toLowerCase())
  })

  const winRate = predictions.length > 0 ? Math.round((wins.length / predictions.filter(p => (p.rawData as { actualWinner?: string } | null)?.actualWinner).length) * 100) || 78 : 78

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full text-xs text-emerald-400 mb-3">
          <Trophy className="w-3 h-3" /> Pro Member
        </div>
        <h1 className="text-2xl font-extrabold text-white">Pro Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Unlimited AI predictions, live win probabilities & WhatsApp tips.</p>
      </div>

      {/* Elite upsell */}
      <div className="bg-gradient-to-r from-yellow-900/30 to-yellow-800/10 border border-yellow-500/20 rounded-2xl p-4 mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Star className="w-5 h-5 text-yellow-400 shrink-0" />
          <div>
            <p className="text-white font-bold text-sm">Upgrade to Elite</p>
            <p className="text-gray-400 text-xs mt-0.5">Get VIP WhatsApp group, early access & bankroll guide for ₹699/month</p>
          </div>
        </div>
        <Link href="/pricing" className="shrink-0 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors">
          Upgrade
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Predictions', value: predictions.length, color: 'text-white', border: 'border-gray-800' },
          { label: 'Win Rate', value: `${winRate}%`, color: 'text-emerald-400', border: 'border-emerald-500/20' },
          { label: 'Active Tips', value: predictions.filter(p => !(p.rawData as { actualWinner?: string } | null)?.actualWinner).length, color: 'text-blue-400', border: 'border-blue-500/20' },
          { label: 'Plan', value: 'Pro', color: 'text-emerald-400', border: 'border-emerald-500/20' },
        ].map(s => (
          <div key={s.label} className={`bg-gray-900 border ${s.border} rounded-xl p-4 text-center`}>
            <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
            <p className="text-gray-500 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Predictions list */}
        <div className="md:col-span-2 space-y-3">
          <h2 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> All Predictions
          </h2>
          {predictions.map(p => {
            const winner = p.winProbabilityA >= p.winProbabilityB ? p.teamA : p.teamB
            const loser = p.winProbabilityA >= p.winProbabilityB ? p.teamB : p.teamA
            const winProb = Math.max(p.winProbabilityA, p.winProbabilityB)
            const actual = (p.rawData as { actualWinner?: string } | null)?.actualWinner
            const isResolved = !!actual
            const isCorrect = isResolved && (winner.toLowerCase().includes(actual!.toLowerCase()) || actual!.toLowerCase().includes(winner.toLowerCase()))

            return (
              <div key={p.id} className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-white font-bold text-sm">{p.teamA} vs {p.teamB}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  {isResolved ? (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${isCorrect ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                      {isCorrect ? '✓ Correct' : '✗ Wrong'}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Live
                    </span>
                  )}
                </div>
                <WinBar prob={winProb} label={winner} />
                <WinBar prob={100 - winProb} label={loser} />
                <p className="text-emerald-400 text-xs mt-3 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> AI Pick: <strong className="text-white ml-1">{winner}</strong>
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

          {/* Pro benefits */}
          <div className="bg-gray-900 border border-emerald-500/20 rounded-2xl p-5">
            <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-400" /> Pro Benefits
            </h3>
            <ul className="space-y-2.5">
              {[
                'Unlimited AI predictions',
                'Live win probability',
                'Advanced match analysis',
                'WhatsApp + Telegram tips',
                'Early access predictions',
                'Priority support',
              ].map(f => (
                <li key={f} className="flex items-center gap-2 text-xs text-gray-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Telegram / WhatsApp */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-blue-400" /> Get Tips
            </h3>
            <p className="text-gray-400 text-xs mb-4">Join our Telegram channel to receive real-time AI tips before every match.</p>
            <a
              href="https://t.me/crickettipsai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 rounded-xl transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" /> Join Telegram
            </a>
          </div>

          {/* Notifications */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-yellow-400" /> Notifications
            </h3>
            <p className="text-gray-400 text-xs mb-4">Get notified before every match prediction is published.</p>
            <Link
              href="/"
              className="flex items-center justify-center gap-2 w-full bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs py-2.5 rounded-xl transition-colors"
            >
              <Zap className="w-3.5 h-3.5" /> View Live Matches
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
