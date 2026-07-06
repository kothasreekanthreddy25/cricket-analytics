'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, Trophy, Tag } from 'lucide-react'
import { getBookmakersByCountry, UK_SAFER_GAMBLING, AU_SAFER_GAMBLING, type Bookmaker } from '@/lib/bookmakers'

export default function MobileAdStrip() {
  // Empty until geo resolves — never default to a specific region's operators,
  // since some (e.g. 1xBet) aren't licensed in every jurisdiction (GB in particular).
  const [offers, setOffers] = useState<Bookmaker[]>([])
  const [country, setCountry] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/geo')
      .then(r => r.json())
      .then(({ country }: { country: string }) => {
        setCountry(country)
        setOffers(getBookmakersByCountry(country))
      })
      .catch(() => {})
  }, [])

  if (offers.length === 0) {
    return (
      <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden animate-pulse">
        <div className="px-3 py-2 border-b border-gray-800 h-8" />
        <div className="flex gap-3 p-3">
          {[1, 2, 3].map(i => <div key={i} className="w-[160px] h-32 bg-gray-800/60 rounded-xl flex-shrink-0" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
          {country === 'GB' ? '🇬🇧 UKGC-Licensed Bookmakers' : country === 'AU' ? '🇦🇺 Licensed AU Bookmakers' : 'Recommended Bookmakers'}
        </span>
        <span className="text-[9px] text-gray-600">Ad · 18+</span>
      </div>

      {/* Horizontal scrollable cards */}
      <div className="flex gap-3 p-3 overflow-x-auto scrollbar-hide">
        {offers.map((o) => (
          <div
            key={o.id}
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

            {/* Bonus — absent for AU operators (NSW inducement ban) */}
            {o.bonus ? (
              <div className="flex items-center gap-1 mb-2">
                <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
                <div>
                  <p className="text-[11px] font-bold text-amber-400 leading-tight">{o.bonus}</p>
                  <p className="text-[9px] text-gray-500">{o.detail}</p>
                </div>
              </div>
            ) : (
              <p className="text-[9px] text-gray-500 mb-2 leading-tight">{o.tagline}</p>
            )}

            {/* Promo code */}
            {o.promo && (
              <div className="flex items-center gap-1 mb-1.5">
                <Tag className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />
                <p className="text-[9px] font-bold text-amber-400 truncate">{o.promo}</p>
              </div>
            )}

            {/* CTA */}
            <a
              href={o.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className={`flex items-center justify-center gap-1 w-full py-2 rounded-lg text-[11px] font-bold transition-colors ${o.btnCls}`}
            >
              {o.bonus ? 'Claim' : 'Visit'} <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="px-3 py-1.5 border-t border-gray-800">
        <p className="text-[9px] text-gray-600 text-center">
          {country === 'AU' && <><span className="font-bold text-gray-500">{AU_SAFER_GAMBLING.tagline}</span> {AU_SAFER_GAMBLING.callToAction} · </>}
          Paid partnerships · Betting involves risk · T&Cs apply
          {country === 'GB' && <> · {UK_SAFER_GAMBLING.helplineName} {UK_SAFER_GAMBLING.helplinePhone}</>}
        </p>
      </div>
    </div>
  )
}
