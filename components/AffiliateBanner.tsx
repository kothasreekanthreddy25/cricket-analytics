'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, Trophy, Shield, Tag } from 'lucide-react'
import { getBookmakersByCountry, UK_SAFER_GAMBLING, AU_SAFER_GAMBLING, type Bookmaker } from '@/lib/bookmakers'
import { trackEvent } from '@/components/GoogleAnalytics'

export default function AffiliateBanner() {
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
      <div className="rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden my-8 animate-pulse">
        <div className="h-10 border-b border-gray-800" />
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-800">
          {[1, 2, 3].map(i => <div key={i} className="h-52 bg-gray-800/30" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden my-8">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 bg-gray-900/80">
        <Shield className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
          {country === 'GB' ? '🇬🇧 UKGC-Licensed Bookmakers' : country === 'AU' ? '🇦🇺 Licensed AU Bookmakers' : 'Recommended Bookmakers'}
        </span>
        <span className="ml-auto text-[9px] text-gray-600">
          {country === 'AU' ? `Ad · 18+ · ${AU_SAFER_GAMBLING.tagline}` : 'Ad · 18+ · Gamble Responsibly'}
        </span>
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

            {/* Bonus — absent for AU operators (NSW inducement ban) */}
            {o.bonus && (
              <div className={`flex items-center gap-2 bg-gray-800/60 rounded-lg px-3 py-2 mb-3 border ${o.borderCls}`}>
                <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-400">{o.bonus}</p>
                  <p className="text-[10px] text-gray-400">{o.detail}</p>
                </div>
              </div>
            )}

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
              href={`/api/out?id=${o.id}&src=banner`}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={() => trackEvent('affiliate_click', { bookmaker: o.id, source: 'banner' })}
              className={`flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg text-xs font-bold transition-colors ${o.btnCls}`}
            >
              {o.bonus ? 'Claim Bonus' : 'Visit Site'} <ExternalLink className="w-3 h-3" />
            </a>
            <p className="text-[9px] text-gray-600 text-center mt-2">
              {o.bonus ? '18+ · New customers only · T&Cs apply' : '18+ · T&Cs apply'}
            </p>
          </div>
        ))}
      </div>

      {/* Footer disclaimer */}
      <div className="px-4 py-2 border-t border-gray-800 bg-gray-900/50">
        <p className="text-[9px] text-gray-600 text-center">
          These are paid partnerships. Betting involves risk — never bet more than you can afford to lose. T&Cs apply.
          {country === 'GB' && (
            <> {UK_SAFER_GAMBLING.helplineName}: <strong>{UK_SAFER_GAMBLING.helplinePhone}</strong> · Self-exclude at GAMSTOP.co.uk</>
          )}
          {country === 'AU' && (
            <> {AU_SAFER_GAMBLING.callToAction}. Self-exclude at {AU_SAFER_GAMBLING.selfExcludeName} (betstop.gov.au).</>
          )}
        </p>
      </div>
    </div>
  )
}
