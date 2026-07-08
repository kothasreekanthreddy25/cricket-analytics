'use client'

import { useState } from 'react'
import { Link2, Check } from 'lucide-react'
import { trackEvent } from '@/components/GoogleAnalytics'

interface Props {
  // Text shown before the link in WhatsApp/X shares, e.g. "England vs India — AI predicts India to win (58%)"
  text: string
  // Defaults to the current page URL — pass explicitly for SSR/SSG contexts
  url?: string
  source: string // for GA event attribution, e.g. 'analysis-page'
}

export default function ShareButtons({ text, url, source }: Props) {
  const [copied, setCopied] = useState(false)

  function shareUrl() {
    return url || (typeof window !== 'undefined' ? window.location.href : '')
  }

  function fire(platform: string) {
    trackEvent('share_click', { platform, source })
  }

  function copyLink() {
    fire('copy_link')
    navigator.clipboard.writeText(shareUrl()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const encodedText = encodeURIComponent(text)
  const encodedUrl = encodeURIComponent(shareUrl())

  return (
    <div className="flex items-center gap-2">
      <a
        href={`https://wa.me/?text=${encodedText}%20${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => fire('whatsapp')}
        className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-800 hover:bg-[#25D366]/20 border border-gray-700 hover:border-[#25D366]/50 transition-colors"
        aria-label="Share on WhatsApp"
        title="Share on WhatsApp"
      >
        <svg className="w-4 h-4 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.43 13.625l-2.95-.924c-.64-.203-.658-.64.136-.954l11.57-4.461c.537-.194 1.006.131.708.935z"/>
        </svg>
      </a>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => fire('twitter')}
        className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-800 hover:bg-white/10 border border-gray-700 hover:border-gray-500 transition-colors"
        aria-label="Share on X"
        title="Share on X"
      >
        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => fire('facebook')}
        className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-800 hover:bg-[#1877F2]/20 border border-gray-700 hover:border-[#1877F2]/50 transition-colors"
        aria-label="Share on Facebook"
        title="Share on Facebook"
      >
        <svg className="w-4 h-4 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      </a>
      <button
        onClick={copyLink}
        className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 transition-colors"
        aria-label="Copy link"
        title="Copy link"
      >
        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Link2 className="w-4 h-4 text-gray-400" />}
      </button>
    </div>
  )
}
