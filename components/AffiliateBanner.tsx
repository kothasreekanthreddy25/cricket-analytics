import { ExternalLink, Trophy, Shield, Tag } from 'lucide-react'
import { headers } from 'next/headers'
import { getBookmakersByCountry } from '@/lib/bookmakers'

export default async function AffiliateBanner() {
  const headersList = await headers()
  const country =
    headersList.get('x-country') ||
    headersList.get('x-vercel-ip-country') ||
    headersList.get('cf-ipcountry') ||
    'ZA'

  const offers = getBookmakersByCountry(country)

  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden my-8">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 bg-gray-900/80">
        <Shield className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
          Recommended Bookmakers
        </span>
        <span className="ml-auto text-[9px] text-gray-600">Ad · 18+ · Gamble Responsibly</span>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-800">
        {offers.map((o) => (
          <div key={o.id} className={`p-4 bg-gradient-to-br ${o.accentCls} to-transparent`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl ${o.logoBg} flex items-center justify-center font-extrabold text-sm shrink-0`}>
                {o.logo}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-bold text-sm">{o.name}</span>
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${o.badgeCls}`}>
                    {o.badge}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 truncate">{o.tagline}</p>
              </div>
            </div>

            <div className={`flex items-center gap-2 bg-gray-800/60 rounded-lg px-3 py-2 mb-3 border ${o.borderCls}`}>
              <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-400">{o.bonus}</p>
                <p className="text-[10px] text-gray-400">{o.detail}</p>
              </div>
            </div>

            {o.promo && (
              <div className="flex items-center gap-1.5 bg-black/30 border border-amber-500/20 rounded-lg px-2.5 py-1.5 mb-2">
                <Tag className="w-3 h-3 text-amber-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] text-gray-500 leading-none">Promo Code</p>
                  <p className="text-[11px] font-extrabold text-amber-400 tracking-wide truncate">{o.promo}</p>
                </div>
              </div>
            )}

            <a
              href={o.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className={`flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg text-xs font-bold transition-colors ${o.btnCls}`}
            >
              Claim Bonus <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ))}
      </div>

      {/* Footer disclaimer */}
      <div className="px-4 py-2 border-t border-gray-800 bg-gray-900/50">
        <p className="text-[9px] text-gray-600 text-center">
          These are paid partnerships. Betting involves risk — never bet more than you can afford to lose. T&Cs apply.
        </p>
      </div>
    </div>
  )
}
