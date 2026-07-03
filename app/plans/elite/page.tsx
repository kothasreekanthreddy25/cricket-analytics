import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, Brain, MessageCircle, Crown, Phone, TrendingUp, BookOpen } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import LiveMatchWidget from '@/components/LiveMatchWidget'
import { SignOutButton } from '@/components/SignOutButton'

export const dynamic = 'force-dynamic'

export default async function EliteDashboardPage() {
  const session = await getSession()
  if (!session) redirect('/auth/signin')
  if (session.plan !== 'elite') redirect('/auth/select-plan')

  const predictions = await prisma.matchAnalysis.findMany({
    orderBy: { createdAt: 'desc' },
    take: 15,
    select: { matchKey: true, teamA: true, teamB: true, winProbabilityA: true, winProbabilityB: true, confidence: true, tips: true, createdAt: true },
  })

  const highConfidence = predictions.filter(p =>
    p.confidence === 'HIGH' || p.confidence === 'VERY_HIGH'
  )

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-full">
              <Crown className="w-3 h-3" /> Elite Plan
            </span>
            <h1 className="text-2xl font-extrabold text-white mt-2">
              Welcome, {session.name || session.email.split('@')[0]} 👑
            </h1>
            <p className="text-gray-500 text-sm mt-1">VIP access · All predictions · 1-on-1 tipster support</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xs text-gray-500 hover:text-white border border-gray-800 px-3 py-2 rounded-xl transition-colors">
              ← Home
            </Link>
            <SignOutButton />
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'VIP Predictions', value: `${highConfidence.length}`, icon: Crown, color: 'text-yellow-400' },
            { label: 'All Predictions', value: `${predictions.length}+`, icon: Brain, color: 'text-emerald-400' },
            { label: 'Accuracy', value: '74%', icon: TrendingUp, color: 'text-blue-400' },
          ].map(s => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
              <s.icon className={`w-5 h-5 ${s.color} mx-auto mb-1`} />
              <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* VIP channels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-green-900/20 border border-green-500/30 rounded-2xl p-4 flex items-start gap-3">
            <Phone className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-bold text-sm">WhatsApp VIP Group</p>
              <p className="text-gray-400 text-xs mt-1">Direct tips from our tipster 30 min before each match</p>
            </div>
          </div>
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-4 flex items-start gap-3">
            <MessageCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-bold text-sm">Telegram Channel</p>
              <a href="https://t.me/crickettipsai" target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs mt-1 underline block">Join @crickettipsai →</a>
            </div>
          </div>
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-2xl p-4 flex items-start gap-3">
            <BookOpen className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-bold text-sm">Match Previews</p>
              <p className="text-gray-400 text-xs mt-1">In-depth analysis 24h before every major match</p>
            </div>
          </div>
        </div>

        {/* Live Match Widget */}
        <div className="mb-8">
          <h2 className="font-bold text-white mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
            <Crown className="w-4 h-4 text-yellow-400" /> Live Match Center
          </h2>
          <LiveMatchWidget />
        </div>

        {/* VIP high-confidence predictions */}
        {highConfidence.length > 0 && (
          <div className="bg-yellow-900/10 border border-yellow-500/20 rounded-2xl overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-yellow-500/20 flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-400" />
              <h2 className="font-bold text-white">VIP High-Confidence Predictions</h2>
              <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full ml-auto">{highConfidence.length} matches</span>
            </div>
            <div className="divide-y divide-yellow-500/10">
              {highConfidence.map(p => {
                const winner = p.winProbabilityA >= p.winProbabilityB ? p.teamA : p.teamB
                const prob = Math.max(p.winProbabilityA, p.winProbabilityB)
                return (
                  <div key={p.matchKey} className="px-5 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-semibold">{p.teamA} vs {p.teamB}</p>
                      <p className="text-gray-400 text-xs mt-0.5">Pick: <span className="text-yellow-400 font-bold">{winner}</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-yellow-400 font-extrabold text-lg">{(prob * 100).toFixed(0)}%</p>
                      <p className="text-gray-500 text-xs capitalize">{p.confidence.toLowerCase().replace('_', ' ')}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* All predictions */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Brain className="w-4 h-4 text-emerald-400" />
              All AI Predictions
            </h2>
            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">Full access</span>
          </div>

          {predictions.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-600 text-sm">No predictions yet — check back soon</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {predictions.map(p => {
                const winner = p.winProbabilityA >= p.winProbabilityB ? p.teamA : p.teamB
                const prob = Math.max(p.winProbabilityA, p.winProbabilityB)
                const barA = Math.round(p.winProbabilityA * 100)
                const barB = Math.round(p.winProbabilityB * 100)
                return (
                  <div key={p.matchKey} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white text-sm font-semibold">{p.teamA} vs {p.teamB}</p>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${p.confidence === 'HIGH' || p.confidence === 'VERY_HIGH' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'bg-gray-800 text-gray-400'}`}>
                        {p.confidence}
                      </span>
                    </div>
                    <div className="flex gap-1 h-2 rounded-full overflow-hidden mb-1.5">
                      <div className="bg-emerald-500 rounded-l-full" style={{ width: `${barA}%` }} />
                      <div className="bg-gray-600 rounded-r-full" style={{ width: `${barB}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{p.teamA} {barA}%</span>
                      <span className="text-emerald-400 font-semibold">→ {winner} ({(prob * 100).toFixed(0)}%)</span>
                      <span>{p.teamB} {barB}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
