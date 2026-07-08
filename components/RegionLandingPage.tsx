'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { Brain, Activity, ArrowRight, ExternalLink, ShieldAlert, Radio } from 'lucide-react'
import FeaturedMatchCards from '@/components/FeaturedMatchCards'
import LiveScoreCard from '@/components/LiveScoreCard'
import AIoddsWidget from '@/components/AIoddsWidget'
import PredictionStatsWidget from '@/components/PredictionStatsWidget'
import RecentWinningPredictions from '@/components/RecentWinningPredictions'
import HeroTrustStrip from '@/components/HeroTrustStrip'
import { getBookmakersByCountry, UK_SAFER_GAMBLING, AU_SAFER_GAMBLING } from '@/lib/bookmakers'

interface RegionConfig {
  countryCode: 'GB' | 'AU'
  flag: string
  heroHeadline: React.ReactNode
  heroSubcopy: string
  leagues: string[]
  bookmakerHeading: string
  bookmakerSubcopy: string
}

// AU's Consistent Gambling Messaging scheme is mandatory verbatim copy, not
// a paraphrase — see lib/bookmakers.ts for why the tagline/CTA text can't be reworded.
function SaferGambling({ countryCode }: { countryCode: 'GB' | 'AU' }) {
  if (countryCode === 'AU') {
    return (
      <div className="bg-red-950/20 border border-red-900/40 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-bold text-sm">{AU_SAFER_GAMBLING.tagline}</p>
            <p className="text-gray-400 text-xs mt-1">{AU_SAFER_GAMBLING.callToAction}</p>
            <p className="text-gray-500 text-xs mt-2">
              Self-exclude via{' '}
              <a href={AU_SAFER_GAMBLING.selfExcludeUrl} target="_blank" rel="noopener noreferrer" className="text-red-300 underline">
                {AU_SAFER_GAMBLING.selfExcludeName}
              </a>
              . 18+.
            </p>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-white font-bold text-sm">18+ Gamble responsibly</p>
          <p className="text-gray-400 text-xs mt-1">
            Free confidential support: {UK_SAFER_GAMBLING.helplineName}{' '}
            <a href={`tel:${UK_SAFER_GAMBLING.helplinePhone.replace(/\s/g, '')}`} className="text-emerald-400 underline">
              {UK_SAFER_GAMBLING.helplinePhone}
            </a>
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Self-exclude via{' '}
            <a href={UK_SAFER_GAMBLING.selfExcludeUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline">
              GAMSTOP
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}

export default function RegionLandingPage({ config }: { config: RegionConfig }) {
  const { countryCode, flag, heroHeadline, heroSubcopy, leagues, bookmakerHeading, bookmakerSubcopy } = config
  const bookmakers = getBookmakersByCountry(countryCode)

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 py-10 md:py-14 px-4 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto grid md:grid-cols-5 gap-8 items-center">
          <div className="md:col-span-3">
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-medium">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                {flag} AI Cricket Predictions
              </span>
              <span className="bg-amber-500 text-black text-xs font-extrabold px-2 py-0.5 rounded">18+</span>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
              {heroHeadline}
            </h1>

            <p className="text-base md:text-lg text-gray-400 max-w-xl mt-4">{heroSubcopy}</p>

            <div className="flex flex-wrap gap-2 mt-4">
              {leagues.map(l => (
                <span key={l} className="text-xs text-gray-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                  {l}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 mt-6">
              <Link
                href="/analysis"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-semibold text-base transition-colors"
              >
                <Brain className="w-4 h-4" />
                Get AI Predictions
              </Link>
              <Link
                href="/matches"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-lg font-semibold text-base border border-white/20 transition-colors"
              >
                <Activity className="w-4 h-4" />
                Live Matches
              </Link>
            </div>

            <HeroTrustStrip />
          </div>

          <div className="md:col-span-2">
            <RecentWinningPredictions variant="grid" />
          </div>
        </div>
      </section>

      {/* Live scores & upcoming matches */}
      <section className="bg-gray-950 py-10 px-4 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <Radio className="w-5 h-5 text-red-400 animate-pulse" />
                Live Scores & Upcoming Matches
              </h2>
              <p className="text-gray-400 text-sm mt-0.5">Real-time scores · win probability · AI predictions</p>
            </div>
            <Link href="/matches" className="text-emerald-400 text-sm font-medium hover:text-emerald-300 transition-colors flex items-center gap-1">
              All matches <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 min-w-0">
              <Suspense fallback={<div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6 animate-pulse h-64" />}>
                <LiveScoreCard />
              </Suspense>
            </div>
            <div className="lg:col-span-2 min-w-0">
              <FeaturedMatchCards variant="carousel" />
            </div>
          </div>
        </div>
      </section>

      {/* AI odds + track record */}
      <section className="bg-gray-950 py-10 px-4 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <Brain className="w-5 h-5 text-emerald-400" />
                AI Predictions & Implied Odds
              </h2>
              <p className="text-gray-400 text-sm mt-0.5">AI-calculated win probability for every match</p>
            </div>
            <Link href="/analysis" className="text-emerald-400 text-sm font-medium hover:text-emerald-300 flex items-center gap-1">
              All predictions <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 min-w-0">
              <AIoddsWidget />
            </div>
            <div className="lg:col-span-1 min-w-0">
              <PredictionStatsWidget />
            </div>
          </div>
        </div>
      </section>

      {/* Regional bookmakers */}
      <section className="bg-gray-950 py-10 px-4 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-white">{bookmakerHeading}</h2>
          <p className="text-gray-400 text-sm mt-0.5 mb-6">{bookmakerSubcopy}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {bookmakers.map(b => (
              <div key={b.id} className={`bg-gray-900 border ${b.borderCls} rounded-2xl p-5 relative overflow-hidden`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${b.accentCls} to-transparent pointer-events-none`} />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-extrabold text-sm ${b.logoBg}`}>
                      {b.logo}
                    </div>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-1 rounded-full ${b.badgeCls}`}>{b.badge}</span>
                  </div>
                  <p className="text-white font-bold">{b.name}</p>
                  <p className="text-gray-400 text-xs mt-1">{b.tagline}</p>
                  {b.bonus && (
                    <div className="mt-3 bg-black/20 rounded-lg px-3 py-2">
                      <p className="text-emerald-400 text-sm font-bold">{b.bonus}</p>
                      {b.detail && <p className="text-gray-500 text-[11px]">{b.detail}</p>}
                    </div>
                  )}
                  <a
                    href={`/api/out?id=${b.id}&src=${countryCode.toLowerCase()}-landing`}
                    target="_blank"
                    rel="noopener noreferrer nofollow sponsored"
                    className={`mt-4 flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${b.btnCls}`}
                  >
                    Visit {b.name} <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          <SaferGambling countryCode={countryCode} />
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-br from-emerald-600 to-emerald-800 py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white">Never miss a prediction</h2>
          <p className="text-emerald-100 mt-2">Free AI cricket tips, live scores, and match analysis — updated every match.</p>
          <div className="flex flex-wrap gap-3 justify-center mt-6">
            <Link href="/auth/signup" className="bg-white hover:bg-gray-100 text-emerald-700 px-6 py-2.5 rounded-lg font-semibold transition-colors">
              Sign Up Free
            </Link>
            <Link href="/analysis" className="bg-emerald-700/50 hover:bg-emerald-700/70 text-white px-6 py-2.5 rounded-lg font-semibold border border-white/20 transition-colors">
              Try AI Analysis
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
