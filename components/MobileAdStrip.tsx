'use client'

import { ExternalLink, Trophy } from 'lucide-react'

const OFFERS = [
  {
    name: '1xBet',
    bonus: '₹26,000 Bonus',
    detail: '100% first deposit',
    url: 'https://reffpa.com/L?tag=d_5312130m_1236c_1x_4546809&site=5312130&ad=1236',
    badge: 'TOP',
    badgeCls: 'bg-amber-500 text-black',
    btnCls: 'bg-amber-500 hover:bg-amber-400 text-black',
    borderCls: 'border-amber-500/30',
    accentCls: 'from-amber-600/10',
    logo: '1X',
    logoBg: 'bg-amber-500 text-black',
  },
  {
    name: 'Mostbet',
    bonus: '₹25,000 Bonus',
    detail: '125% first deposit',
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
    bonus: '₹10,400 Bonus',
    detail: '130% first deposit',
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

export default function MobileAdStrip() {
  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
          Recommended Bookmakers
        </span>
        <span className="text-[9px] text-gray-600">Ad · 18+</span>
      </div>

      {/* Horizontal scrollable cards */}
      <div className="flex gap-3 p-3 overflow-x-auto scrollbar-hide">
        {OFFERS.map((o) => (
          <div
            key={o.name}
            className={`flex-shrink-0 w-[160px] rounded-xl bg-gradient-to-br ${o.accentCls} to-transparent border ${o.borderCls} p-3`}
          >
            {/* Logo + name */}
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg ${o.logoBg} flex items-center justify-center font-extrabold text-xs shrink-0`}>
                {o.logo}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-white font-bold text-xs">{o.name}</span>
                  <span className={`text-[9px] font-extrabold px-1 py-0.5 rounded ${o.badgeCls}`}>
                    {o.badge}
                  </span>
                </div>
              </div>
            </div>

            {/* Bonus */}
            <div className="flex items-center gap-1 mb-2">
              <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-amber-400 leading-tight">{o.bonus}</p>
                <p className="text-[9px] text-gray-500">{o.detail}</p>
              </div>
            </div>

            {/* CTA */}
            <a
              href={o.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className={`flex items-center justify-center gap-1 w-full py-2 rounded-lg text-[11px] font-bold transition-colors ${o.btnCls}`}
            >
              Claim <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="px-3 py-1.5 border-t border-gray-800">
        <p className="text-[9px] text-gray-600 text-center">
          Paid partnerships · Betting involves risk · T&Cs apply
        </p>
      </div>
    </div>
  )
}
