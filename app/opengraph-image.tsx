import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'CricketTips.ai — AI Cricket Predictions & Live Scores'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Default site-wide social share image — every page previously pointed to
// /og-image.png, a file that never existed in public/, so every share (link
// preview, WhatsApp, Twitter/X, Facebook) rendered with no image at all.
// This file-convention route replaces that dead static reference; Next.js
// wires it into both openGraph and twitter meta tags automatically.
export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #030712 0%, #0a1120 60%, #052e2b 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <div
            style={{
              display: 'flex',
              width: 72,
              height: 72,
              borderRadius: 20,
              background: 'linear-gradient(135deg, #34d399, #22d3ee)',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 40,
            }}
          >
            🏏
          </div>
          <div style={{ display: 'flex', fontSize: 56, fontWeight: 800, color: 'white' }}>
            CricketTips<span style={{ color: '#34d399' }}>.ai</span>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 34,
            fontWeight: 700,
            color: '#e5e7eb',
            textAlign: 'center',
            marginBottom: 18,
          }}
        >
          Cricket Analysis, Powered by AI
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 22,
            color: '#9ca3af',
            textAlign: 'center',
          }}
        >
          Live Scores · Win Probability · Match Predictions
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 40,
            padding: '10px 24px',
            borderRadius: 999,
            background: 'rgba(52, 211, 153, 0.12)',
            border: '1px solid rgba(52, 211, 153, 0.4)',
            color: '#34d399',
            fontSize: 20,
            fontWeight: 700,
          }}
        >
          18+ · Gamble Responsibly
        </div>
      </div>
    ),
    { ...size }
  )
}
