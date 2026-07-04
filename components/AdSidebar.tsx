import { ExternalLink, Star, Zap, Shield, Trophy, Tag } from 'lucide-react'
import { headers } from 'next/headers'
import { getBookmakersByCountry, type Bookmaker } from '@/lib/bookmakers'

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${i <= Math.floor(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}`}
        />
      ))}
      <span className="text-xs text-amber-400 font-semibold ml-1">4.7</span>
    </div>
  )
}

function AffiliateCard({ site }: { site: Bookmaker }) {
  return (
    <div className={`rounded-xl bg-gray-900 border ${site.borderCls} overflow-hidden`}>
      {/* Header */}
      <div className={`bg-gradient-to-r ${site.accentCls} to-transparent px-4 py-3 flex items-center justify-between border-b ${site.borderCls}`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-lg ${site.logoBg} flex items-center justify-center font-extrabold text-sm shrink-0`}>
            {site.logo}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-sm">{site.name}</span>
              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${site.badgeCls}`}>
                {site.badge}
              </span>
            </div>
            <p className="text-[10px] text-gray-400">{site.tagline}</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <StarRating rating={4.7} />

        {/* Bonus */}
        <div className="mt-3 bg-gray-800/60 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-amber-400">{site.bonus}</span>
          </div>
          <p className="text-[10px] text-gray-400">{site.detail}</p>
        </div>

        {/* Promo code */}
        {site.promo && (
          <div className="mt-3 flex items-center gap-2 bg-black/30 border border-amber-500/20 rounded-lg px-3 py-2">
            <Tag className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-[9px] text-gray-500 leading-none">Promo Code</p>
              <p className="text-xs font-extrabold text-amber-400 tracking-wide">{site.promo}</p>
            </div>
          </div>
        )}

        {/* CTA */}
        <a
          href={site.url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className={`mt-3 flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg text-xs font-bold transition-colors ${site.btnCls}`}
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

export default async function AdSidebar() {
  const headersList = await headers()
  const country =
    headersList.get('x-country') ||
    headersList.get('x-vercel-ip-country') ||
    headersList.get('cf-ipcountry') ||
    'ZA'

  const bookmakers = getBookmakersByCountry(country)

  return (
    <div className="sticky top-20 space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Shield className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
          Recommended Bookmakers
        </span>
      </div>

      {bookmakers.map((bk) => (
        <AffiliateCard key={bk.id} site={bk} />
      ))}

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
