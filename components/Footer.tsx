import Link from 'next/link'
import { Shield, ExternalLink } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-950 border-t border-gray-800">
      {/* Responsible Gambling Banner */}
      <div className="bg-amber-950/40 border-b border-amber-800/30 py-4 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="bg-amber-500 text-black text-xs font-extrabold px-2 py-0.5 rounded">
              18+
            </span>
            <p className="text-amber-200 text-xs">
              This site is for users aged 18 and over only. Gambling can be addictive — please play responsibly.
            </p>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <a
              href="https://www.begambleaware.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 text-xs font-medium underline underline-offset-2 inline-flex items-center gap-1"
            >
              BeGambleAware <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://www.gamcare.org.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 text-xs font-medium underline underline-offset-2 inline-flex items-center gap-1"
            >
              GamCare <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://www.gamblingtherapy.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 text-xs font-medium underline underline-offset-2 inline-flex items-center gap-1"
            >
              Gambling Therapy <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-emerald-400" />
              <span className="text-white font-bold text-lg">CricketTips.ai</span>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed">
              AI-powered cricket analytics and match predictions for informed
              fans worldwide. For entertainment and informational purposes only.
            </p>
            <div className="flex items-center gap-2 mt-4">
              <span className="bg-amber-500 text-black text-xs font-extrabold px-2 py-0.5 rounded">
                18+
              </span>
              <span className="text-gray-500 text-xs">Age restricted content</span>
            </div>
          </div>

          {/* Features */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-3">Features</h4>
            <ul className="space-y-2">
              {[
                { label: 'Live Scores', href: '/matches' },
                { label: 'AI Predictions', href: '/analysis' },
                { label: 'Match Odds', href: '/odds' },
                { label: 'Teams & Stats', href: '/teams' },
                { label: 'Prediction Stats', href: '/predictions' },
                { label: 'News & Blog', href: '/blog' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-emerald-400 text-xs transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-3">Account</h4>
            <ul className="space-y-2">
              {[
                { label: 'Sign Up Free', href: '/auth/signup' },
                { label: 'Log In', href: '/auth/login' },
                { label: 'Dashboard', href: '/dashboard/user' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-emerald-400 text-xs transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Responsible Gambling */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-3">Responsible Gambling</h4>
            <ul className="space-y-2">
              {[
                { label: 'BeGambleAware', href: 'https://www.begambleaware.org' },
                { label: 'GamCare', href: 'https://www.gamcare.org.uk' },
                { label: 'Gambling Therapy', href: 'https://www.gamblingtherapy.org' },
                { label: 'GamStop (UK)', href: 'https://www.gamstop.co.uk' },
                { label: 'National Problem Gambling Helpline', href: 'https://www.ncpgambling.org' },
              ].map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-amber-400 text-xs transition-colors inline-flex items-center gap-1"
                  >
                    {link.label} <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="mt-10 pt-6 border-t border-gray-800">
          <div className="bg-gray-900/50 rounded-xl p-4 mb-6">
            <p className="text-gray-500 text-xs leading-relaxed">
              <strong className="text-gray-400">Disclaimer:</strong> CricketTips.ai provides AI-generated cricket analysis and
              predictions for informational and entertainment purposes only. Our predictions are based on historical data,
              statistical models, and machine learning algorithms — they do not guarantee any specific outcome.
              No content on this site should be considered financial or betting advice. Past prediction accuracy
              does not guarantee future results. Always gamble responsibly and within your means.
              CricketTips.ai does not facilitate or accept bets. We are not affiliated with any bookmaker or
              betting exchange. Users are solely responsible for ensuring that online gambling is legal in their
              jurisdiction before participating.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-600 text-xs">
              © {currentYear} CricketTips.ai — All rights reserved. For entertainment purposes only.
            </p>
            <div className="flex items-center gap-4">
              <span className="bg-amber-500 text-black text-xs font-extrabold px-2 py-0.5 rounded">
                18+
              </span>
              <span className="text-gray-600 text-xs">Play Responsibly</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
