import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Zap, Lock, TrendingUp, Star, CheckCircle2, ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getRecentPredictions() {
  return prisma.matchAnalysis.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
  })
}

export default async function FreeDashboard() {
  const predictions = await getRecentPredictions()

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-gray-800 border border-gray-700 px-3 py-1 rounded-full text-xs text-gray-400 mb-3">
          <Zap className="w-3 h-3" /> Free Plan
        </div>
        <h1 className="text-2xl font-extrabold text-white">Your Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">3 free AI predictions per week. Upgrade for unlimited access.</p>
      </div>

      {/* Upgrade banner */}
      <div className="bg-gradient-to-r from-emerald-900/40 to-emerald-800/20 border border-emerald-500/30 rounded-2xl p-5 mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-white font-bold text-sm">Unlock unlimited predictions</p>
          <p className="text-gray-400 text-xs mt-0.5">Get Pro for ₹299/month — WhatsApp tips, advanced analysis & more</p>
        </div>
        <Link
          href="/pricing"
          className="shrink-0 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5"
        >
          Upgrade <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Predictions Used', value: '0 / 3', sub: 'this week', color: 'text-white' },
          { label: 'Win Rate', value: '—', sub: 'upgrade to see', color: 'text-gray-500' },
          { label: 'Active Tips', value: '—', sub: 'upgrade to see', color: 'text-gray-500' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
            <p className="text-gray-400 text-xs mt-0.5">{s.label}</p>
            <p className="text-gray-600 text-[10px] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Predictions (limited preview) */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-sm">This Week's Predictions</h2>
          <span className="text-xs text-gray-500">3 of 3 used</span>
        </div>

        <div className="space-y-3">
          {predictions.slice(0, 3).map((p, i) => {
            const winner = p.winProbabilityA >= p.winProbabilityB ? p.teamA : p.teamB
            const prob = Math.max(p.winProbabilityA, p.winProbabilityB)
            const isLocked = i >= 1

            return (
              <div key={p.id} className={`relative bg-gray-900 border rounded-xl p-4 ${isLocked ? 'border-gray-800' : 'border-emerald-500/20'}`}>
                {isLocked && (
                  <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-[2px] rounded-xl flex items-center justify-center gap-2 z-10">
                    <Lock className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-400 text-sm font-semibold">Upgrade to unlock</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold text-sm">{p.teamA} vs {p.teamB}</p>
                    <p className="text-emerald-400 text-xs mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Pick: {winner}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-extrabold text-lg">{prob.toFixed(0)}%</p>
                    <p className="text-gray-500 text-xs">confidence</p>
                  </div>
                </div>
              </div>
            )
          })}

          {predictions.length === 0 && (
            <div className="text-center py-12 text-gray-600 bg-gray-900 border border-gray-800 rounded-xl">
              No predictions available yet
            </div>
          )}
        </div>
      </div>

      {/* Locked features */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-gray-500" /> Locked Features
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { icon: TrendingUp, label: 'Unlimited AI predictions', plan: 'Pro' },
            { icon: CheckCircle2, label: 'Live win probability', plan: 'Pro' },
            { icon: Star, label: 'WhatsApp & Telegram tips', plan: 'Pro' },
            { icon: Star, label: 'VIP WhatsApp group', plan: 'Elite' },
            { icon: Star, label: 'Early access 24h before', plan: 'Elite' },
            { icon: Star, label: 'Bankroll management guide', plan: 'Elite' },
          ].map(f => (
            <div key={f.label} className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/50">
              <Lock className="w-3.5 h-3.5 text-gray-600 shrink-0" />
              <span className="text-gray-400 text-xs flex-1">{f.label}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${f.plan === 'Elite' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                {f.plan}
              </span>
            </div>
          ))}
        </div>
        <Link
          href="/pricing"
          className="mt-5 w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-sm transition-colors"
        >
          View Plans & Pricing <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

    </div>
  )
}
