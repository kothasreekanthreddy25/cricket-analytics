import { ExternalLink, Trophy, Shield } from 'lucide-react'

const OFFERS = [
  {
    name: '1xBet',
    tagline: 'World\'s #1 Betting Platform',
    bonus: '₹26,000 Welcome Bonus',
    detail: '100% on first deposit',
    url: 'https://reffpa.com/L?tag=d_5312130m_1236c_1x_4546809&site=5312130&ad=1236',
    badge: 'TOP PICK',
    badgeCls: 'bg-amber-500 text-black',
    btnCls: 'bg-amber-500 hover:bg-amber-400 text-black',
    borderCls: 'border-amber-500/30',
    accentCls: 'from-amber-600/10',
    logo: '1X',
    logoBg: 'bg-amber-500 text-black',
  },
  {
    name: 'Mostbet',
    tagline: 'Best Odds for Cricket',
    bonus: '₹25,000 Welcome Bonus',
    detail: '125% on first deposit',
    url: 'https://mloz82mb.com/LIjU',
    badge: 'HOT',
    badgeCls: 'bg-red-500 text-white',
    btnCls: 'bg-blue-600 hover:bg-blue-500 text-white',
    borderCls: 'border-blue-500/30',
    accentCls: 'from-blue-600/10',
    logo: 'MB',
    logoBg: 'bg-blue-600 text-white',
  },
  {
    name: 'Melbet',
    tagline: 'Huge Cricket Markets & Fast Payouts',
    bonus: '₹10,400 Welcome Bonus',
    detail: '130% on first deposit',
    url: 'https://refpa3665.com/L?tag=d_5312608m_45415c_ml_2217822&site=5312608&ad=45415',
    badge: 'NEW',
    badgeCls: 'bg-emerald-500 text-white',
    btnCls: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    borderCls: 'border-emerald-500/30',
    accentCls: 'from-emerald-600/10',
    logo: 'ML',
    logoBg: 'bg-emerald-600 text-white',
  },
]

export default function AffiliateBanner() {
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
        {OFFERS.map((o) => (
          <div key={o.name} className={`p-4 bg-gradient-to-br ${o.accentCls} to-transparent`}>
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
