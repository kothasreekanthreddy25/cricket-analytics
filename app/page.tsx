import React, { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'CricketTips.ai – Free AI Cricket Predictions, Live Scores & T20 WC 2026 Tips',
  description:
    'Get free AI-powered cricket predictions for T20 World Cup 2026, IPL, and all international matches. Live scores, win probability, ball-by-ball commentary, pitch analysis, and betting tips. 18+ Gamble responsibly.',
  alternates: { canonical: 'https://crickettips.ai' },
  openGraph: {
    title: 'CricketTips.ai – Free AI Cricket Predictions & Live Scores',
    description:
      'Free AI cricket predictions for T20 WC 2026 & IPL. Live scores, win probability, tips. 18+ Gamble responsibly.',
    url: 'https://crickettips.ai',
  },
}

// JSON-LD structured data for homepage
const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'CricketTips.ai',
  url: 'https://crickettips.ai',
  description: 'AI-powered cricket predictions, live scores, and match analysis',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://crickettips.ai/analysis?match={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
}

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'CricketTips.ai',
  url: 'https://crickettips.ai',
  logo: 'https://crickettips.ai/logo.png',
  sameAs: [
    'https://youtube.com/channel/UCOj7_rLFFhCzX7-VdTLg-eA',
  ],
}
import FeaturedMatchCards from '@/components/FeaturedMatchCards'
import LiveScoreCard from '@/components/LiveScoreCard'
import PredictionStatsWidget from '@/components/PredictionStatsWidget'
import LatestNews from '@/components/LatestNews'
import {
  Activity,
  TrendingUp,
  Users,
  Trophy,
  ArrowRight,
  Brain,
  Shield,
  Zap,
  Check,
  Radio,
  BarChart3,
  Newspaper,
} from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* JSON-LD Structured Data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />

      {/* ── Section 1: Hero ── */}
      <section className="relative bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 py-10 md:py-14 px-4 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto grid md:grid-cols-5 gap-8 items-center">
          {/* Left — Text */}
          <div className="md:col-span-3">
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-medium">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                T20 World Cup 2026 Coverage
              </span>
              <span className="bg-amber-500 text-black text-xs font-extrabold px-2 py-0.5 rounded">
                18+
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
              Cricket Analysis{' '}
              <br className="hidden sm:block" />
              Powered by{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                AI
              </span>
            </h1>

            <p className="text-base md:text-lg text-gray-400 max-w-xl mt-4">
              Real-time scores, TensorFlow.js match analysis, and data-driven
              insights for every cricket match worldwide. For informational
              purposes only — please gamble responsibly.
            </p>

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
          </div>

          {/* Right — Real match prediction card */}
          <div className="hidden md:block md:col-span-2">
            <FeaturedMatchCards variant="hero" />
          </div>
        </div>
      </section>

      {/* ── Section 2: Trust Stats Bar ── */}
      <section className="bg-gray-900 border-y border-gray-800 py-5 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <StatCard
            icon={<Brain className="w-5 h-5 text-emerald-400" />}
            value="AI-Powered"
            label="TensorFlow.js Predictions"
          />
          <StatCard
            icon={<Zap className="w-5 h-5 text-emerald-400" />}
            value="Live Updates"
            label="Real-Time Score Tracking"
          />
          <StatCard
            icon={<Trophy className="w-5 h-5 text-emerald-400" />}
            value="T20 WC 2026"
            label="Full Tournament Coverage"
          />
          <StatCard
            icon={<Shield className="w-5 h-5 text-emerald-400" />}
            value="Official Data"
            label="Roanuz Cricket API"
          />
        </div>
      </section>

      {/* ── Section 3: Live Scores ── */}
      <section className="bg-gray-950 py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
                Live Scores
              </h2>
              <p className="text-gray-400 text-sm mt-0.5">
                Real-time updates every 5 seconds via Socket.IO
              </p>
            </div>
          </div>
          <Suspense fallback={<div className="bg-gray-800/50 rounded-2xl h-32 animate-pulse" />}>
            <LiveScoreCard />
          </Suspense>
        </div>
      </section>

      {/* ── Section 4: Upcoming Matches ── */}
      <section className="bg-gray-900 py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white">
                Upcoming Matches
              </h2>
              <p className="text-gray-400 text-sm mt-0.5">
                Next 5 T20 World Cup 2026 matches with AI confidence levels
              </p>
            </div>
            <Link
              href="/analysis"
              className="hidden sm:inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors"
            >
              Analyze All
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <FeaturedMatchCards variant="carousel" />
        </div>
      </section>

      {/* ── Section 5: AI Predictions Highlight ── */}
      <section className="bg-gradient-to-b from-gray-950 to-gray-900 py-12 px-4">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8 items-center">
          <FeaturedMatchCards variant="analysis" />

          <div>
            <span className="text-emerald-400 font-semibold text-xs uppercase tracking-wider">
              Powered by TensorFlow.js
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-white mt-2">
              AI Match Predictions
            </h2>
            <p className="text-gray-400 mt-3 text-base leading-relaxed">
              Our neural network analyzes 14 key features including team
              rankings, recent form, head-to-head records, and venue
              conditions to predict match outcomes with confidence ratings.
            </p>

            <ul className="mt-4 space-y-2">
              {[
                'Win probability for every match',
                'Players to watch recommendations',
                'Pitch and weather condition analysis',
                'Recent form and momentum trends',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-gray-300 text-sm">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href="/analysis"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-semibold text-sm mt-6 transition-colors"
            >
              Analyze Matches
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section 6: Prediction Stats Widget ── */}
      <PredictionStatsWidget />

      {/* ── Section 7: Quick Links Grid ── */}
      <section className="bg-gray-900 py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-white">
              Explore Cricket Analytics
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Everything you need for cricket analysis in one place
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickLinkCard
              href="/odds"
              icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
              title="Live Odds"
              description="Pre-match and live odds with winning probability analysis"
            />
            <QuickLinkCard
              href="/analysis"
              icon={<Brain className="w-5 h-5 text-emerald-400" />}
              title="AI Analysis"
              description="TensorFlow.js powered match predictions and insights"
            />
            <QuickLinkCard
              href="/teams"
              icon={<Shield className="w-5 h-5 text-emerald-400" />}
              title="Teams"
              description="Team rankings, stats, and historical performance data"
            />
            <QuickLinkCard
              href="/predictions"
              icon={<BarChart3 className="w-5 h-5 text-emerald-400" />}
              title="Prediction Stats"
              description="Track our AI accuracy & see ₹10,000 investment simulation"
            />
          </div>
        </div>
      </section>

      {/* ── Section 8: Mobile App CTA ── */}
      <section className="bg-gray-950 py-10 px-4 border-t border-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-gray-900 via-gray-800/80 to-gray-900 border border-emerald-500/20 rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center gap-8">
            {/* Left */}
            <div className="flex-1 text-center md:text-left">
              <span className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-medium mb-3">
                <Zap className="w-3 h-3" />
                New — Mobile App
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-white mt-2">
                Cricket on the go
              </h2>
              <p className="text-gray-400 text-sm mt-3 max-w-md md:max-w-none">
                Live scores, ball-by-ball, AI win probability and match predictions — all in
                your pocket. Available now via Expo Go on Android &amp; iOS.
              </p>
              <ul className="mt-4 space-y-1.5">
                {[
                  'Real-time Socket.IO live scores',
                  'AI win probability bars',
                  'Ball-by-ball commentary',
                  'Latest cricket news & blog',
                ].map(f => (
                  <li key={f} className="flex items-center gap-2 text-gray-300 text-sm justify-center md:justify-start">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <a
                  href="https://expo.dev/go"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
                >
                  <Activity className="w-4 h-4" />
                  Get Expo Go
                </a>
                <a
                  href="https://youtube.com/channel/UCOj7_rLFFhCzX7-VdTLg-eA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
                >
                  <Radio className="w-4 h-4" />
                  YouTube Live
                </a>
              </div>
            </div>

            {/* Right — Phone mockup placeholder */}
            <div className="hidden md:flex flex-col items-center gap-3">
              <div className="w-48 h-96 bg-gray-900 border-2 border-gray-700 rounded-3xl p-2 shadow-2xl shadow-emerald-500/10 relative overflow-hidden">
                {/* Status bar */}
                <div className="h-5 bg-gray-800 rounded-t-2xl flex items-center justify-center mb-1">
                  <div className="w-12 h-1 bg-gray-700 rounded-full" />
                </div>
                {/* Screen content */}
                <div className="bg-gray-950 rounded-2xl flex-1 h-[calc(100%-28px)] p-3 space-y-2 overflow-hidden">
                  <div className="text-center text-white text-xs font-bold py-1">CricketTips</div>
                  {/* Live card mock */}
                  <div className="bg-gray-800/80 rounded-lg p-2 border border-emerald-500/20">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[8px] text-red-400 font-bold">● LIVE</span>
                      <span className="text-[8px] text-gray-500">T20</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span className="text-emerald-400 font-bold">IND</span>
                      <span className="text-emerald-400 font-mono font-bold">186/4</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span className="text-cyan-400 font-bold">AUS</span>
                      <span className="text-gray-400 font-mono">Yet to bat</span>
                    </div>
                    {/* Win prob bar */}
                    <div className="mt-1.5 h-1.5 bg-gray-700 rounded-full overflow-hidden flex">
                      <div className="h-full bg-emerald-500 w-[62%]" />
                      <div className="h-full bg-cyan-500 flex-1" />
                    </div>
                    <div className="flex justify-between text-[7px] text-gray-500 mt-0.5">
                      <span>62%</span>
                      <span>38%</span>
                    </div>
                  </div>
                  {/* Ball strip mock */}
                  <div className="bg-gray-800/60 rounded-lg p-1.5">
                    <div className="text-[7px] text-gray-500 mb-1">Over 18</div>
                    <div className="flex gap-1">
                      {['•','4','1','W','6','2'].map((b, i) => (
                        <span key={i} className={`w-4 h-4 rounded-full flex items-center justify-center text-[6px] font-bold ${b === 'W' ? 'bg-red-500 text-white' : b === '6' ? 'bg-purple-500 text-white' : b === '4' ? 'bg-blue-500 text-white' : b === '•' ? 'bg-gray-700 text-gray-500' : 'bg-emerald-600 text-white'}`}>{b}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-gray-500">Scan QR in Expo Go</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 9: Latest News ── */}
      <section className="bg-gray-950 py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-emerald-400" />
                Latest News
              </h2>
              <p className="text-gray-400 text-sm mt-0.5">
                AI-generated cricket news and match analysis
              </p>
            </div>
            <Link
              href="/blog"
              className="hidden sm:inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors"
            >
              View All
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <LatestNews />
        </div>
      </section>

      {/* ── Section 10: Final CTA Banner ── */}
      <section className="bg-gradient-to-r from-emerald-600 to-emerald-500 py-10 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Ready to Get Smarter About Cricket?
          </h2>
          <p className="text-emerald-50 text-base mb-6 max-w-2xl mx-auto">
            Join cricket fans using AI-powered analytics for real-time insights
            and match analysis. For informational and entertainment purposes only.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/auth/signup"
              className="bg-white text-emerald-700 px-6 py-2.5 rounded-lg font-semibold text-base hover:bg-emerald-50 transition-colors"
            >
              Sign Up Free
            </Link>
            <Link
              href="/analysis"
              className="bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-semibold text-base border border-emerald-400/30 hover:bg-emerald-800 transition-colors"
            >
              Try AI Analysis
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: string
  label: string
}) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/10 mb-2">
        {icon}
      </div>
      <p className="text-xl md:text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}

function QuickLinkCard({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-emerald-500/50 rounded-xl p-4 transition-all duration-300"
    >
      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3 group-hover:bg-emerald-500/20 transition-colors">
        {icon}
      </div>
      <h3 className="text-base font-bold text-white mb-1">{title}</h3>
      <p className="text-gray-400 text-xs mb-3">{description}</p>
      <span className="text-emerald-400 text-xs font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
        Explore <ArrowRight className="w-3.5 h-3.5" />
      </span>
    </Link>
  )
}
