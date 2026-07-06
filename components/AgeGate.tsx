'use client'

import { useEffect, useState } from 'react'
import { Shield, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { UK_SAFER_GAMBLING, AU_SAFER_GAMBLING } from '@/lib/bookmakers'

const STORAGE_KEY = 'ct_age_verified'

export default function AgeGate() {
  const [visible, setVisible] = useState(false)
  const [country, setCountry] = useState<string | null>(null)

  useEffect(() => {
    const verified = localStorage.getItem(STORAGE_KEY)
    if (!verified) setVisible(true)

    fetch('/api/geo')
      .then(r => r.json())
      .then(({ country }: { country: string }) => setCountry(country))
      .catch(() => {})
  }, [])

  function confirm() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  function deny() {
    window.location.href = 'https://www.google.com'
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="bg-amber-500 px-6 py-4 flex items-center gap-3">
          <Shield className="w-6 h-6 text-black flex-shrink-0" />
          <div>
            <p className="text-black font-extrabold text-lg leading-tight">Age Verification Required</p>
            <p className="text-black/70 text-xs">This site contains gambling-related content</p>
          </div>
          <span className="ml-auto bg-black text-amber-400 font-extrabold text-sm px-2.5 py-1 rounded-lg flex-shrink-0">18+</span>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <p className="text-white font-bold text-base mb-2">Are you 18 years of age or older?</p>
          <p className="text-gray-400 text-sm leading-relaxed mb-4">
            CricketTips.ai provides cricket predictions and links to licensed betting operators.
            Access is strictly restricted to adults aged <strong className="text-white">18 and over</strong>.
          </p>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-5 text-xs text-gray-400 leading-relaxed">
            By entering this site you confirm that:
            <ul className="mt-2 space-y-1 list-disc list-inside text-gray-500">
              <li>You are at least 18 years old</li>
              <li>Online gambling is legal in your jurisdiction</li>
              <li>You accept our{' '}
                <Link href="/terms" className="text-emerald-400 underline hover:text-emerald-300" onClick={confirm}>Terms & Conditions</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-emerald-400 underline hover:text-emerald-300" onClick={confirm}>Privacy Policy</Link>
              </li>
            </ul>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={confirm}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-3 rounded-xl text-sm transition-colors"
            >
              Yes, I am 18+
            </button>
            <button
              onClick={deny}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-3 rounded-xl text-sm transition-colors"
            >
              No, I am under 18
            </button>
          </div>

          {/* Responsible gambling */}
          <div className="mt-4 flex items-center justify-center gap-4">
            {country === 'GB' ? (
              <>
                <a href={UK_SAFER_GAMBLING.helplineUrl} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-gray-600 hover:text-amber-400 flex items-center gap-1 transition-colors">
                  {UK_SAFER_GAMBLING.helplineName} · {UK_SAFER_GAMBLING.helplinePhone} <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <a href={UK_SAFER_GAMBLING.selfExcludeUrl} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-gray-600 hover:text-amber-400 flex items-center gap-1 transition-colors">
                  GAMSTOP <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </>
            ) : country === 'AU' ? (
              <>
                <a href={AU_SAFER_GAMBLING.helplineUrl} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-gray-600 hover:text-amber-400 flex items-center gap-1 transition-colors">
                  {AU_SAFER_GAMBLING.helplineName} · {AU_SAFER_GAMBLING.helplinePhone} <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <a href={AU_SAFER_GAMBLING.selfExcludeUrl} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-gray-600 hover:text-amber-400 flex items-center gap-1 transition-colors">
                  {AU_SAFER_GAMBLING.selfExcludeName} <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </>
            ) : (
              <a href="https://www.responsiblegambling.org.za" target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-gray-600 hover:text-amber-400 flex items-center gap-1 transition-colors">
                Responsible Gambling SA <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
