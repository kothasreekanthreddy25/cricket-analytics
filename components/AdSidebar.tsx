'use client'

import { ExternalLink, Star, Zap, Shield, Trophy } from 'lucide-react'

// ── Affiliate config — update links here ─────────────────────────────────────
const AFFILIATES = {
  onexbet: {
    url: 'https://reffpa.com/L?tag=d_5312130m_1236c_1x_4546809&site=5312130&ad=1236',
    name: '1xBet',
    tagline: 'World\'s #1 Betting Platform',
    bonus: '₹26,000 Welcome Bonus',
    bonusDetail: '100% on first deposit up to ₹26,000',
    rating: 4.8,
    features: ['Live Cricket Betting', 'Fastest Payouts', '1000+ Markets'],
    badge: 'TOP PICK',
    badgeColor: 'bg-amber-500 text-black',
    btnColor: 'bg-amber-500 hover:bg-amber-400 text-black',
    accentColor: 'from-amber-600/20 to-amber-900/10',
    borderColor: 'border-amber-500/30',
    logo: '1X',
    logoBg: 'bg-amber-500 text-black',
  },
  mostbet: {
    url: 'https://mostbet.com', // TODO: replace with your Mostbet affiliate link
    name: 'Mostbet',
    tagline: 'Best Odds for Cricket',
    bonus: '₹25,000 Welcome Bonus',
    bonusDetail: '125% on first deposit up to ₹25,000',
    rating: 4.6,
    features: ['IPL Special Odds', 'Live Streaming', 'Fast Withdrawals'],
    badge: 'HOT',
    badgeColor: 'bg-red-500 text-white',
    btnColor: 'bg-blue-600 hover:bg-blue-500 text-white',
    accentColor: 'from-blue-600/20 to-blue-900/10',
    borderColor: 'border-blue-500/30',
    logo: 'MB',
    logoBg: 'bg-blue-600 text-white',
  },
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${i <= Math.floor(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}`}
        />
      ))}
      <span className="text-xs text-amber-400 font-semibold ml-1">{rating}</span>
    </div>
  )
}

function AffiliateCard({ site }: { site: typeof AFFILIATES.onexbet }) {
  return (
    <div className={`rounded-xl bg-gray-900 border ${site.borderColor} overflow-hidden`}>
      {/* Header */}
      <div className={`bg-gradient-to-r ${site.accentColor} px-4 py-3 flex items-center justify-between border-b ${site.borderColor}`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-lg ${site.logoBg} flex items-center justify-center font-extrabold text-sm shrink-0`}>
            {site.logo}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-sm">{site.name}</span>
              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${site.badgeColor}`}>
                {site.badge}
              </span>
            </div>
            <p className="text-[10px] text-gray-400">{site.tagline}</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Rating */}
        <StarRating rating={site.rating} />

        {/* Bonus */}
        <div className="mt-3 bg-gray-800/60 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-amber-400">{site.bonus}</span>
          </div>
          <p className="text-[10px] text-gray-400">{site.bonusDetail}</p>
        </div>

        {/* Features */}
        <ul className="mt-3 space-y-1.5">
          {site.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-[11px] text-gray-300">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <a
          href={site.url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className={`mt-4 flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg text-xs font-bold transition-colors ${site.btnColor}`}
        >
          Claim Bonus <ExternalLink className="w-3 h-3" />
        </a>

        <p className="text-[9px] text-gray-600 text-center mt-2">
          18+ · T&Cs apply · Gamble responsibly
        </p>
      </div>
    </div>
  )
}

export default function AdSidebar() {
  return (
    <div className="sticky top-20 space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2 px-1">
        <Shield className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
          Recommended Bookmakers
        </span>
      </div>

      <AffiliateCard site={AFFILIATES.onexbet} />
      <AffiliateCard site={AFFILIATES.mostbet} />

      {/* Responsible gambling note */}
      <div className="rounded-xl bg-gray-900/50 border border-gray-800 p-3">
        <div className="flex items-start gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-semibold text-gray-400 mb-1">Bet Responsibly</p>
            <p className="text-[9px] text-gray-600 leading-relaxed">
              These are paid partnerships. Betting involves risk. Never bet more than you can afford to lose.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
