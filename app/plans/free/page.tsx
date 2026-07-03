import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Lock, ArrowRight, Brain, Trophy } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { SignOutButton } from '@/components/SignOutButton'

export const dynamic = 'force-dynamic'

export default async function FreeDashboardPage() {
  const session = await getSession()
  if (!session) redirect('/auth/signin')
  if (session.plan !== 'free') redirect(`/plans/${session.plan}`)

  const recentPredictions = await prisma.matchAnalysis.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: { matchKey: true, teamA: true, teamB: true, winProbabilityA: true, winProbabilityB: true, confidence: true },
  })

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest bg-gray-800 px-2.5 py-1 rounded-full">Free Plan</span>
            <h1 className="text-2xl font-extrabold text-white mt-2">
              Welcome, {session.name || session.email.split('@')[0]} 👋
            </h1>
            <p className="text-gray-500 text-sm mt-1">3 free predictions per week</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xs text-gray-500 hover:text-white border border-gray-800 px-3 py-2 rounded-xl transition-colors">
              ← Home
            </Link>
            <SignOutButton />
          </div>
        </div>

        {/* Upgrade banner */}
        <div className="bg-gradient-to-r from-emerald-900/40 to-emerald-800/20 border border-emerald-500/30 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-white font-bold text-sm">Unlock unlimited predictions</p>
            <p className="text-gray-400 text-xs mt-0.5">Upgrade to Pro — WhatsApp tips, early access & more</p>
          </div>
          <Link
            href="/auth/select-plan"
            className="flex-shrink-0 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5"
          >
            Upgrade Now <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Predictions */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Brain className="w-4 h-4 text-emerald-400" />
              This Week&apos;s Predictions
            </h2>
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-full">3 / week limit</span>
          </div>

          {recentPredictions.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-600 text-sm">No predictions available yet</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {recentPredictions.map(p => {
                const winner = p.winProbabilityA >= p.winProbabilityB ? p.teamA : p.teamB
                const prob = Math.max(p.winProbabilityA, p.winProbabilityB)
                return (
                  <div key={p.matchKey} className="px-5 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-semibold">{p.teamA} vs {p.teamB}</p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        Predicted: <span className="text-emerald-400 font-semibold">{winner}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">{(prob * 100).toFixed(0)}%</p>
                      <p className="text-gray-600 text-xs capitalize">{p.confidence}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Locked features */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="font-bold text-white mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-500" />
            Locked on Free Plan
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
            {['Unlimited predictions', 'Live win probability', 'WhatsApp tips', 'Telegram alerts', 'Early match access', 'VIP tipster group'].map(f => (
              <div key={f} className="bg-gray-800/50 border border-gray-700/50 rounded-xl px-3 py-2.5 flex items-center gap-2 text-xs text-gray-500">
                <Lock className="w-3 h-3 flex-shrink-0" /> {f}
              </div>
            ))}
          </div>
          <Link
            href="/auth/select-plan"
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 rounded-2xl text-sm transition-colors"
          >
            <Trophy className="w-4 h-4" /> Upgrade — from ₹299/month
          </Link>
        </div>

      </div>
    </div>
  )
}
