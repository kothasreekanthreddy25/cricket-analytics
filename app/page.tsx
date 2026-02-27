import React from 'react'
import Link from 'next/link'
import FeaturedMatchCards from '@/components/FeaturedMatchCards'
import LiveScoreCard from '@/components/LiveScoreCard'
import PredictionStatsWidget from '@/components/PredictionStatsWidget'
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
} from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* ── Section 1: Hero ── */}
      <section className="relative bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 py-20 md:py-28 px-4 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto grid md:grid-cols-5 gap-12 items-center">
          {/* Left — Text */}
          <div className="md:col-span-3">
            <span className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              T20 World Cup 2026 Coverage
            </span>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
              Cricket Predictions{' '}
              <br className="hidden sm:block" />
              Powered by{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                AI
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-400 max-w-xl mt-6">
              Real-time scores, TensorFlow.js match analysis, and data-driven
              insights for every cricket match worldwide.
            </p>

            <div className="flex flex-wrap gap-4 mt-8">
              <Link
                href="/analysis"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3.5 rounded-lg font-semibold text-lg transition-colors"
              >
                <Brain className="w-5 h-5" />
                Get AI Predictions
              </Link>
              <Link
                href="/matches"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-8 py-3.5 rounded-lg font-semibold text-lg border border-white/20 transition-colors"
              >
                <Activity className="w-5 h-5" />
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
      <section className="bg-gray-900 border-y border-gray-800 py-8 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          <StatCard
            icon={<Brain className="w-6 h-6 text-emerald-400" />}
            value="AI-Powered"
            label="TensorFlow.js Predictions"
          />
          <StatCard
            icon={<Zap className="w-6 h-6 text-emerald-400" />}
            value="Live Updates"
            label="Real-Time Score Tracking"
          />
          <StatCard
            icon={<Trophy className="w-6 h-6 text-emerald-400" />}
            value="T20 WC 2026"
            label="Full Tournament Coverage"
          />
          <StatCard
            icon={<Shield className="w-6 h-6 text-emerald-400" />}
            value="Official Data"
            label="Roanuz Cricket API"
          />
        </div>
      </section>

      {/* ── Section 3: Live Scores (auto-updates via Socket.IO) ── */}
      <section className="bg-gray-950 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                <Radio className="w-6 h-6 text-emerald-400 animate-pulse" />
                Live Scores
              </h2>
              <p className="text-gray-400 mt-1">
                Real-time updates every 5 seconds via Socket.IO
              </p>
            </div>
          </div>
          <LiveScoreCard />
        </div>
      </section>

      {/* ── Section 4: Upcoming Matches Carousel ── */}
      <section className="bg-gray-900 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white">
                Upcoming Matches
              </h2>
              <p className="text-gray-400 mt-1">
                Next 5 T20 World Cup 2026 matches with AI confidence levels
              </p>
            </div>
            <Link
              href="/analysis"
              className="hidden sm:inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              Analyze All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <FeaturedMatchCards variant="carousel" />
        </div>
      </section>

      {/* ── Section 4: AI Predictions Highlight ── */}
      <section className="bg-gradient-to-b from-gray-950 to-gray-900 py-20 px-4">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          {/* Left — Real AI prediction preview */}
          <FeaturedMatchCards variant="analysis" />

          {/* Right — Text */}
          <div>
            <span className="text-emerald-400 font-semibold text-sm uppercase tracking-wider">
              Powered by TensorFlow.js
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mt-3">
              AI Match Predictions
            </h2>
            <p className="text-gray-400 mt-4 text-lg leading-relaxed">
              Our neural network analyzes 14 key features including team
              rankings, recent form, head-to-head records, and venue
              conditions to predict match outcomes with confidence ratings.
            </p>

            <ul className="mt-6 space-y-3">
              {[
                'Win probability for every match',
                'Players to watch recommendations',
                'Pitch and weather condition analysis',
                'Recent form and momentum trends',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href="/analysis"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold mt-8 transition-colors"
            >
              Analyze Matches
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section 5: Prediction Stats Widget ── */}
      <PredictionStatsWidget />

      {/* ── Section 6: Quick Links Grid ── */}
      <section className="bg-gray-900 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              Explore Cricket Analytics
            </h2>
            <p className="text-gray-400 mt-2">
              Everything you need for cricket analysis in one place
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <QuickLinkCard
              href="/odds"
              icon={<TrendingUp className="w-6 h-6 text-emerald-400" />}
              title="Live Odds"
              description="Pre-match and live odds with winning probability analysis"
            />
            <QuickLinkCard
              href="/analysis"
              icon={<Brain className="w-6 h-6 text-emerald-400" />}
              title="AI Analysis"
              description="TensorFlow.js powered match predictions and insights"
            />
            <QuickLinkCard
              href="/teams"
              icon={<Shield className="w-6 h-6 text-emerald-400" />}
              title="Teams"
              description="Team rankings, stats, and historical performance data"
            />
            <QuickLinkCard
              href="/predictions"
              icon={<BarChart3 className="w-6 h-6 text-emerald-400" />}
              title="Prediction Stats"
              description="Track our AI accuracy & see ₹10,000 investment simulation"
            />
          </div>
        </div>
      </section>

      {/* ── Section 7: Final CTA Banner ── */}
      <section className="bg-gradient-to-r from-emerald-600 to-emerald-500 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Get Smarter About Cricket?
          </h2>
          <p className="text-emerald-50 text-lg mb-8 max-w-2xl mx-auto">
            Join cricket fans using AI-powered analytics to stay ahead of
            the game with real-time insights and predictions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="bg-white text-emerald-700 px-8 py-3.5 rounded-lg font-semibold text-lg hover:bg-emerald-50 transition-colors"
            >
              Sign Up Free
            </Link>
            <Link
              href="/analysis"
              className="bg-emerald-700 text-white px-8 py-3.5 rounded-lg font-semibold text-lg border border-emerald-400/30 hover:bg-emerald-800 transition-colors"
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
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 mb-3">
        {icon}
      </div>
      <p className="text-2xl md:text-3xl font-bold text-white">{value}</p>
      <p className="text-sm text-gray-400 mt-1">{label}</p>
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
      className="group bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-emerald-500/50 rounded-xl p-6 transition-all duration-300"
    >
      <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm mb-4">{description}</p>
      <span className="text-emerald-400 text-sm font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
        Explore <ArrowRight className="w-4 h-4" />
      </span>
    </Link>
  )
}
