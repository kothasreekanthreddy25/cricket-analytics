import Link from 'next/link'
import { Shield, ExternalLink, Send } from 'lucide-react'

// Simple SVG icons for X and Instagram (not in lucide)
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.258 5.63 5.906-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  )
}

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

            {/* Social media links */}
            <div className="flex items-center gap-3 mt-4">
              <a
                href="https://t.me/crickettipsai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-sky-400 transition-colors"
                title="Telegram"
              >
                <Send className="w-4 h-4" />
              </a>
              <a
                href="https://instagram.com/crickettipsai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-pink-400 transition-colors"
                title="Instagram"
              >
                <InstagramIcon className="w-4 h-4" />
              </a>
              <a
                href="https://x.com/aicrickettips"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                title="X (Twitter)"
              >
                <XIcon className="w-4 h-4" />
              </a>
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
