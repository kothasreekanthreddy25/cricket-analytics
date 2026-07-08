'use client'

import Script from 'next/script'

// Renders nothing until NEXT_PUBLIC_GA_MEASUREMENT_ID is set — create a GA4
// property at analytics.google.com, grab its Measurement ID (starts with
// "G-"), and add it as an env var to activate tracking. Matches the existing
// pattern of feature-gating on missing config (see lib/scheduler.ts's blog
// generation check).
export default function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  if (!gaId) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `}
      </Script>
    </>
  )
}

// Fire a custom GA4 event from anywhere client-side, e.g. affiliate clicks,
// lead-capture submissions, fantasy XI views. No-ops safely if GA isn't
// configured or hasn't loaded yet, so call sites never need their own guard.
export function trackEvent(name: string, params?: Record<string, string | number | boolean>) {
  if (typeof window === 'undefined') return
  const w = window as any
  if (typeof w.gtag !== 'function') return
  w.gtag('event', name, params)
}
