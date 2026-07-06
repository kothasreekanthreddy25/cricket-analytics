import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Trophy, Brain, MessageCircle, Bell, TrendingUp, CheckCircle2, ExternalLink, Tag } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import LiveMatchWidget from '@/components/LiveMatchWidget'
import { SignOutButton } from '@/components/SignOutButton'
import { getBookmakersByCountry, UK_SAFER_GAMBLING } from '@/lib/bookmakers'

export const dynamic = 'force-dynamic'

export default async function ProDashboardPage() {
  const session = await getSession()
  if (!session) redirect('/auth/signin')
  if (session.plan === 'free') redirect('/auth/select-plan')
  if (session.plan === 'elite') redirect('/plans/elite')

  const predictions = await prisma.matchAnalysis.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { matchKey: true, teamA: true, teamB: true, winProbabilityA: true, winProbabilityB: true, confidence: true, createdAt: true },
  })

  const headersList = await headers()
  const country =
    headersList.get('x-country') ||
    headersList.get('x-vercel-ip-country') ||
    headersList.get('cf-ipcountry') ||
    'ZA'
  const BOOKMAKERS = getBookmakersByCountry(country)
  const featuredPromo = BOOKMAKERS.find(bk => bk.promo)

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              <Trophy className="w-3 h-3" /> Pro Plan
            </span>
            <h1 className="text-2xl font-extrabold text-white mt-2">
              Welcome back, {session.name || session.email.split('@')[0]} 🏏
            </h1>
            <p className="text-gray-500 text-sm mt-1">Unlimited AI predictions · WhatsApp tips active</p>
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
            { label: 'Predictions', value: predictions.length + '+', icon: Brain, color: 'text-emerald-400' },
            { label: 'Accuracy', value: '74%', icon: TrendingUp, color: 'text-blue-400' },
            { label: 'Active Tips', value: 'Live', icon: Bell, color: 'text-yellow-400' },
          ].map(s => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
              <s.icon className={`w-5 h-5 ${s.color} mx-auto mb-1`} />
              <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* WhatsApp / Telegram tip */}
        <div className="bg-green-900/20 border border-green-500/30 rounded-2xl p-5 mb-8 flex items-start gap-4">
          <MessageCircle className="w-8 h-8 text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-white font-bold text-sm">WhatsApp &amp; Telegram Tips Active</p>
            <p className="text-gray-400 text-xs mt-1">
              You&apos;ll receive match tips before every major game. Make sure you&apos;ve joined our{' '}
              <a href="https://t.me/crickettipsai" target="_blank" rel="noopener noreferrer" className="text-green-400 underline">Telegram channel</a>{' '}
              for instant alerts.
            </p>
          </div>
        </div>

        {/* Live Match Widget */}
        <div className="mb-8">
          <h2 className="font-bold text-white mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
            <Bell className="w-4 h-4 text-red-400 animate-pulse" /> Live Match Center
          </h2>
          <LiveMatchWidget />
        </div>

        {/* All predictions */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Brain className="w-4 h-4 text-emerald-400" />
              All AI Predictions
            </h2>
            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">Unlimited access</span>
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
                const aiOdds = parseFloat((1 / (prob * 1.05)).toFixed(2))
                const isHigh = p.confidence === 'HIGH' || p.confidence === 'VERY_HIGH'
                return (
                  <div key={p.matchKey} className="px-5 py-4">
                    <div className="flex items-start justify-between mb-2 gap-3">
                      <div>
                        <p className="text-white text-sm font-semibold">{p.teamA} vs {p.teamB}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${isHigh ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-800 text-gray-400'}`}>
                            {p.confidence}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            AI Pick: <span className="text-white font-semibold">{winner}</span>
                            <span className="text-emerald-400 ml-1">@ {aiOdds}</span>
                          </span>
                        </div>
                      </div>
                      {/* Place Bet buttons */}
                      <div className="flex gap-1.5 flex-shrink-0">
                        {BOOKMAKERS.map(bk => (
                          <a key={bk.id} href={bk.url} target="_blank" rel="noopener noreferrer nofollow sponsored"
                            className={`${bk.logoBg} hover:opacity-80 text-[10px] font-bold px-2 py-1 rounded-lg transition-opacity flex items-center gap-0.5`}>
                            {bk.name.slice(0, 3)} <ExternalLink className="w-2 h-2 opacity-70" />
                          </a>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1 h-1.5 rounded-full overflow-hidden mb-1.5">
                      <div className="bg-emerald-500 rounded-l-full transition-all" style={{ width: `${barA}%` }} />
                      <div className="bg-gray-600 rounded-r-full transition-all" style={{ width: `${barB}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{p.teamA} {barA}%</span>
                      <span className="text-emerald-400 font-semibold">{winner} wins ({(prob * 100).toFixed(0)}%)</span>
                      <span>{p.teamB} {barB}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Promo strip */}
        {featuredPromo && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 mb-4">
            <Tag className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-[9px] text-gray-500 leading-none">{featuredPromo.name} Promo Code</p>
              <p className="text-xs font-extrabold text-amber-400 tracking-wide">{featuredPromo.promo}</p>
            </div>
            <a href={featuredPromo.url} target="_blank" rel="noopener noreferrer sponsored"
              className={`ml-auto ${featuredPromo.logoBg} hover:opacity-90 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-opacity flex items-center gap-1`}>
              {featuredPromo.name} <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        )}
        <p className="text-[10px] text-gray-600 text-center mb-4">
          18+ · New customers only · T&Cs apply · Gamble responsibly
          {country === 'GB' && <> · {UK_SAFER_GAMBLING.helplineName} {UK_SAFER_GAMBLING.helplinePhone}</>}
        </p>

        {/* Upgrade to Elite */}
        <div className="bg-gradient-to-r from-yellow-900/20 to-yellow-800/10 border border-yellow-500/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-yellow-400 font-bold text-sm">Want VIP predictions?</p>
            <p className="text-gray-400 text-xs mt-0.5">Elite plan adds 1-on-1 tipster access, VIP group &amp; match previews 24h early</p>
          </div>
          <Link
            href="/auth/select-plan"
            className="flex-shrink-0 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Upgrade to Elite
          </Link>
        </div>

      </div>
    </div>
  )
}
