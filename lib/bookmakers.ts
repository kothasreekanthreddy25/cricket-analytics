export type Bookmaker = {
  id: string
  name: string
  logo: string
  logoBg: string
  badge: string
  badgeCls: string
  // bonus/detail are omitted for AU operators: NSW prohibits publishing sign-up
  // inducements (bonus bets, deposit offers) on any site accessible from NSW,
  // with no disclaimer defence — so AU cards carry no offer content at all.
  bonus?: string
  detail?: string
  promo?: string
  url: string
  btnCls: string
  borderCls: string
  accentCls: string
  tagline: string
}

// SA + NZ + default (offshore operators licensed in those regions)
const SA_NZ: Bookmaker[] = [
  {
    id: '1xbet',
    name: '1xBet',
    logo: '1X',
    logoBg: 'bg-amber-500 text-black',
    badge: 'TOP',
    badgeCls: 'bg-amber-500 text-black',
    bonus: '₹26,000 Bonus',
    detail: '100% first deposit',
    promo: 'd_5312130m_1599c_1x_5227150',
    url: 'https://reffpa.com/L?tag=d_5312130m_1599c_&site=5312130&ad=1599',
    btnCls: 'bg-amber-500 hover:bg-amber-400 text-black',
    borderCls: 'border-amber-500/30',
    accentCls: 'from-amber-600/10',
    tagline: "World's #1 Betting Platform",
  },
  {
    id: 'mostbet',
    name: 'Mostbet',
    logo: 'MB',
    logoBg: 'bg-blue-600 text-white',
    badge: 'HOT',
    badgeCls: 'bg-red-500 text-white',
    bonus: '₹25,000 Bonus',
    detail: '125% first deposit',
    url: 'https://xtsplkmost.com/QIjU',
    btnCls: 'bg-blue-600 hover:bg-blue-500 text-white',
    borderCls: 'border-blue-500/30',
    accentCls: 'from-blue-600/10',
    tagline: 'Best Odds for Cricket',
  },
  {
    id: 'melbet',
    name: 'Melbet',
    logo: 'ML',
    logoBg: 'bg-emerald-600 text-white',
    badge: 'NEW',
    badgeCls: 'bg-emerald-500 text-white',
    bonus: '₹10,400 Bonus',
    detail: '130% first deposit',
    url: 'https://refpa3665.com/L?tag=d_5312608m_45415c_&site=5312608&ad=45415',
    btnCls: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    borderCls: 'border-emerald-500/30',
    accentCls: 'from-emerald-600/10',
    tagline: 'Huge Cricket Markets & Fast Payouts',
  },
]

// Australia — ACMA-licensed operators only. No bonus/detail/promo fields:
// advertising sign-up inducements is illegal in NSW (and restricted in other
// states) for any site accessible from there, so AU cards are offer-free.
const AU: Bookmaker[] = [
  {
    id: 'bet365au',
    name: 'Bet365',
    logo: '365',
    logoBg: 'bg-green-700 text-white',
    badge: 'TOP',
    badgeCls: 'bg-green-600 text-white',
    url: 'https://www.bet365.com.au',
    btnCls: 'bg-green-700 hover:bg-green-600 text-white',
    borderCls: 'border-green-600/30',
    accentCls: 'from-green-700/10',
    tagline: 'Australia\'s Most Trusted Bookmaker',
  },
  {
    id: 'sportsbet',
    name: 'Sportsbet',
    logo: 'SB',
    logoBg: 'bg-blue-700 text-white',
    badge: 'HOT',
    badgeCls: 'bg-orange-500 text-white',
    url: 'https://www.sportsbet.com.au',
    btnCls: 'bg-blue-700 hover:bg-blue-600 text-white',
    borderCls: 'border-blue-600/30',
    accentCls: 'from-blue-700/10',
    tagline: 'Australia\'s Favourite Sports Betting',
  },
  {
    id: 'tab',
    name: 'TAB',
    logo: 'TAB',
    logoBg: 'bg-yellow-600 text-black',
    badge: 'NEW',
    badgeCls: 'bg-yellow-500 text-black',
    url: 'https://www.tab.com.au',
    btnCls: 'bg-yellow-600 hover:bg-yellow-500 text-black',
    borderCls: 'border-yellow-500/30',
    accentCls: 'from-yellow-600/10',
    tagline: 'Australia\'s Official Sports Wagering',
  },
]

// UK — UKGC-licensed operators only
const UK: Bookmaker[] = [
  {
    id: 'bet365uk',
    name: 'Bet365',
    logo: '365',
    logoBg: 'bg-green-700 text-white',
    badge: 'TOP',
    badgeCls: 'bg-green-600 text-white',
    bonus: 'Up to £50 Bonus',
    detail: 'New customers, T&Cs apply',
    url: 'https://www.bet365.com',
    btnCls: 'bg-green-700 hover:bg-green-600 text-white',
    borderCls: 'border-green-600/30',
    accentCls: 'from-green-700/10',
    tagline: 'UK\'s #1 Licensed Bookmaker',
  },
  {
    id: 'williamhill',
    name: 'William Hill',
    logo: 'WH',
    logoBg: 'bg-blue-800 text-white',
    badge: 'HOT',
    badgeCls: 'bg-red-500 text-white',
    bonus: '£30 in Free Bets',
    detail: 'New customers only',
    url: 'https://www.williamhill.com',
    btnCls: 'bg-blue-800 hover:bg-blue-700 text-white',
    borderCls: 'border-blue-700/30',
    accentCls: 'from-blue-800/10',
    tagline: 'Est. 1934 · UKGC Licensed',
  },
  {
    id: 'paddypower',
    name: 'Paddy Power',
    logo: 'PP',
    logoBg: 'bg-green-600 text-white',
    badge: 'NEW',
    badgeCls: 'bg-emerald-500 text-white',
    bonus: '£20 Money Back',
    detail: 'If your first bet loses',
    url: 'https://www.paddypower.com',
    btnCls: 'bg-green-600 hover:bg-green-500 text-white',
    borderCls: 'border-green-500/30',
    accentCls: 'from-green-600/10',
    tagline: 'Fun, Fair & UKGC Licensed',
  },
]

export function getBookmakersByCountry(country: string): Bookmaker[] {
  const code = country.toUpperCase()
  if (code === 'AU') return AU
  if (code === 'GB') return UK
  return SA_NZ  // ZA, NZ, and everywhere else
}

export const COUNTRY_LABELS: Record<string, string> = {
  ZA: 'South Africa',
  NZ: 'New Zealand',
  AU: 'Australia',
  GB: 'United Kingdom',
}

// GambleAware (BeGambleAware.org) wound down operations on 31 March 2026 as part of the
// UK's move to a statutory levy — GamCare's National Gambling Helpline is the current
// live signposting resource for Great Britain. Do not reintroduce begambleaware.org links.
export const UK_SAFER_GAMBLING = {
  helplineName: 'National Gambling Helpline (GamCare)',
  helplinePhone: '0808 8020 133',
  helplineUrl: 'https://www.gamcare.org.uk',
  selfExcludeUrl: 'https://www.gamstop.co.uk',
}

// Australia's Consistent Gambling Messaging (mandatory since 30 March 2023)
// replaced "Gamble responsibly" with seven rotating taglines plus a fixed
// call-to-action. Websites must use a tagline + the support line verbatim.
export const AU_SAFER_GAMBLING = {
  tagline: 'Chances are you’re about to lose.',
  callToAction:
    'For free and confidential support call 1800 858 858 or visit gamblinghelponline.org.au',
  helplineName: 'Gambling Help Online',
  helplinePhone: '1800 858 858',
  helplineUrl: 'https://www.gamblinghelponline.org.au',
  selfExcludeName: 'BetStop',
  selfExcludeUrl: 'https://www.betstop.gov.au',
}
