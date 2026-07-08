'use client'

import { useEffect, useState } from 'react'
import { Brain, TrendingUp, ExternalLink, Star, Zap, ChevronRight, AlertTriangle, CheckCircle2, Info, Tag } from 'lucide-react'
import Link from 'next/link'
import { getBookmakersByCountry, UK_SAFER_GAMBLING, AU_SAFER_GAMBLING, type Bookmaker } from '@/lib/bookmakers'

interface MatchOdds {
  matchKey: string
  teamA: string
  teamB: string
  aiOddsA: number
  aiOddsB: number
  probA: number
  probB: number
  favourite: string
  favProb: number
  confidence: string
  valueRating: 'STRONG' | 'GOOD' | 'FAIR' | 'AVOID'
  valueLabel: string
}

const CONFIDENCE_META: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  VERY_HIGH: { color: 'text-emerald-400', icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: 'Very High' },
  HIGH:      { color: 'text-emerald-400', icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: 'High' },
  MEDIUM:    { color: 'text-yellow-400',  icon: <Info className="w-3.5 h-3.5" />,          label: 'Medium' },
  LOW:       { color: 'text-gray-400',    icon: <AlertTriangle className="w-3.5 h-3.5" />,  label: 'Low' },
}

// Labeled by AI confidence, not a real bookmaker-odds comparison — this site
// has no live market-odds feed (SportMonks' odds endpoint returns empty for
// every match tested), so "value bet" language was overclaiming what these
// tiers actually measure.
const VALUE_META = {
  STRONG: { bg: 'bg-emerald-500/15 border-emerald-500/30', text: 'text-emerald-400', badge: 'bg-emerald-500 text-white', label: '🔥 High Confidence' },
  GOOD:   { bg: 'bg-blue-500/10 border-blue-500/20',       text: 'text-blue-400',    badge: 'bg-blue-500 text-white',    label: '✅ Good Confidence' },
  FAIR:   { bg: 'bg-gray-800/80 border-gray-700',          text: 'text-gray-400',    badge: 'bg-gray-700 text-gray-300', label: 'Even Match' },
  AVOID:  { bg: 'bg-red-500/5 border-red-500/10',          text: 'text-red-400',     badge: 'bg-red-900 text-red-300',   label: 'Low Confidence' },
}

export default function OddsPage() {
  const [matches, setMatches] = useState<MatchOdds[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'value' | 'strong'>('all')
  const [offers, setOffers] = useState<Bookmaker[]>([])
  const [country, setCountry] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/odds/featured')
      .then(r => r.json())
      .then(d => { setMatches(d.matches || []); setLoading(false) })
      .catch(() => setLoading(false))

    fetch('/api/geo')
      .then(r => r.json())
      .then(({ country }: { country: string }) => {
        setCountry(country)
        setOffers(getBookmakersByCountry(country))
      })
      .catch(() => {})
  }, [])

  const filtered = matches.filter(m => {
    if (activeTab === 'value')  return m.valueRating === 'STRONG' || m.valueRating === 'GOOD'
    if (activeTab === 'strong') return m.valueRating === 'STRONG'
    return true
  })

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-950/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h1 className="text-lg font-extrabold text-white">Best Odds Comparison</h1>
            </div>
            <p className="text-gray-500 text-xs mt-0.5">AI-implied odds · Compare bookmakers · 18+</p>
          </div>
          <Link href="/" className="text-xs text-gray-500 hover:text-white border border-gray-800 px-3 py-1.5 rounded-lg transition-colors">← Home</Link>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-4 pb-3 flex gap-2">
          {[
            { key: 'all',    label: 'All Matches', count: matches.length },
            { key: 'value',  label: '🔥 High Confidence', count: matches.filter(m => m.valueRating === 'STRONG' || m.valueRating === 'GOOD').length },
            { key: 'strong', label: '⚡ Strong Only', count: matches.filter(m => m.valueRating === 'STRONG').length },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${activeTab === t.key ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
              {t.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === t.key ? 'bg-white/20' : 'bg-gray-700'}`}>{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 grid lg:grid-cols-3 gap-6">

        {/* Match odds list */}
        <div className="lg:col-span-2 space-y-4">
          {loading && [...Array(4)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-800/40 rounded-2xl animate-pulse" />
          ))}

          {!loading && filtered.length === 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
              <Brain className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 font-semibold">No matches in this filter</p>
              <button onClick={() => setActiveTab('all')} className="text-emerald-400 text-sm mt-2 hover:text-emerald-300">Show all matches →</button>
            </div>
          )}

          {filtered.map(m => {
            const vm = VALUE_META[m.valueRating]
            const cm = CONFIDENCE_META[m.confidence] || CONFIDENCE_META.LOW
            return (
              <div key={m.matchKey} className={`border rounded-2xl overflow-hidden ${vm.bg}`}>

                {/* Top bar */}
                <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-white font-bold">{m.teamA} <span className="text-gray-500 font-normal">vs</span> {m.teamB}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`flex items-center gap-1 text-[11px] font-semibold ${cm.color}`}>
                        {cm.icon} AI Confidence: {cm.label}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${vm.badge}`}>{vm.label}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 justify-end text-xs text-emerald-400 font-bold">
                      <Brain className="w-3.5 h-3.5" /> AI Pick
                    </div>
                    <p className="text-white font-extrabold">{m.favourite}</p>
                    <p className="text-xs text-gray-400">{m.favProb}% win chance</p>
                  </div>
                </div>

                {/* Prob bar */}
                <div className="px-5 pb-3">
                  <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-1">
                    <div className="bg-emerald-500 rounded-l-full transition-all" style={{ width: `${m.probA}%` }} />
                    <div className="bg-gray-600 rounded-r-full transition-all" style={{ width: `${m.probB}%` }} />
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-500">
                    <span>{m.teamA} {m.probA}%</span>
                    <span>{m.teamB} {m.probB}%</span>
                  </div>
                </div>

                {/* AI Odds */}
                <div className="px-5 pb-3">
                  <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium mb-2">AI Implied Odds</p>
                  <div className="flex gap-3">
                    <div className={`flex-1 rounded-xl p-3 text-center border ${m.probA >= m.probB ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-gray-800/60 border-gray-700'}`}>
                      <p className="text-[10px] text-gray-400 mb-0.5">{m.teamA}</p>
                      <p className={`text-xl font-extrabold ${m.probA >= m.probB ? 'text-emerald-400' : 'text-gray-300'}`}>{m.aiOddsA}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{m.probA}% prob</p>
                    </div>
                    <div className="flex items-center text-gray-600 text-sm font-bold">VS</div>
                    <div className={`flex-1 rounded-xl p-3 text-center border ${m.probB > m.probA ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-gray-800/60 border-gray-700'}`}>
                      <p className="text-[10px] text-gray-400 mb-0.5">{m.teamB}</p>
                      <p className={`text-xl font-extrabold ${m.probB > m.probA ? 'text-emerald-400' : 'text-gray-300'}`}>{m.aiOddsB}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{m.probB}% prob</p>
                    </div>
                  </div>
                </div>

                {/* Bookmaker buttons */}
                {offers.length > 0 && (
                  <div className="border-t border-white/5 px-5 py-3">
                    <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium mb-2.5">Bet Now at</p>
                    <div className="flex flex-wrap gap-2">
                      {offers.map(o => (
                        <a key={o.id} href={o.url} target="_blank" rel="noopener noreferrer nofollow sponsored"
                          className={`flex items-center gap-1.5 ${o.logoBg} hover:opacity-80 px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity`}>
                          {o.name} <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">

          {/* Confidence tier explanation */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" /> How These Odds Are Calculated
            </h3>
            <div className="space-y-2.5 text-xs text-gray-400">
              <p>The odds shown here are <span className="text-white font-semibold">AI-implied odds</span> — our model's win probability converted to decimal odds format, not real bookmaker prices.</p>
              <p>The confidence tiers below reflect how strongly our AI backs its own pick, not a comparison against any bookmaker's actual odds — we don't currently have a live odds feed to compare against.</p>
              <div className="pt-1 space-y-1.5">
                {Object.entries(VALUE_META).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.badge}`}>{v.label}</span>
                    <span className="text-gray-500 text-[10px]">{
                      k === 'STRONG' ? 'AI win probability >70%, high confidence' :
                      k === 'GOOD'   ? 'AI win probability 60–70%' :
                      k === 'FAIR'   ? 'Close match, no strong lean' :
                                       'Low AI confidence in either side'
                    }</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top bookmakers */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" /> {country === 'GB' ? 'UKGC-Licensed Bookmakers' : country === 'AU' ? 'Licensed AU Bookmakers' : 'Top Bookmakers'}
              </h3>
              <span className="text-[10px] bg-amber-500 text-black font-bold px-1.5 py-0.5 rounded">18+</span>
            </div>
            {country === 'GB' && (
              <p className="text-[10px] text-emerald-400 font-semibold mb-3">
                🇬🇧 Licensed and regulated by the UK Gambling Commission
              </p>
            )}
            {country === 'AU' && (
              <p className="text-[10px] text-emerald-400 font-semibold mb-3">
                🇦🇺 Licensed Australian wagering operators
              </p>
            )}
            <div className="space-y-2.5">
              {offers.map(o => (
                <a key={o.id} href={o.url} target="_blank" rel="noopener noreferrer nofollow sponsored"
                  className="flex items-center gap-3 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-gray-600 rounded-xl px-3 py-2.5 transition-colors group">
                  <div className={`w-9 h-9 rounded-lg ${o.logoBg} flex items-center justify-center text-[10px] font-extrabold flex-shrink-0`}>
                    {o.logo}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-white text-xs font-bold">{o.name}</p>
                    </div>
                    <p className="text-gray-400 text-[10px] truncate">{o.bonus || o.tagline}</p>
                    {o.promo && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Tag className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />
                        <p className="text-[9px] font-bold text-amber-400 truncate">{o.promo}</p>
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 flex-shrink-0" />
                </a>
              ))}
            </div>
            <p className="text-[10px] text-gray-600 mt-3 text-center">
              {country === 'AU' ? (
                <><strong className="text-gray-500">{AU_SAFER_GAMBLING.tagline}</strong> 18+ · T&Cs apply · {AU_SAFER_GAMBLING.callToAction}</>
              ) : (
                <>18+ · New customers only · T&Cs apply · Gamble responsibly</>
              )}
              {country === 'GB' && <> · {UK_SAFER_GAMBLING.helplineName} {UK_SAFER_GAMBLING.helplinePhone}</>}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
