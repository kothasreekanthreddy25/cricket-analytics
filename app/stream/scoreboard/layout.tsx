import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CricketTips Live Scoreboard',
  robots: { index: false },
}

export default function ScoreboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
              html, body { width: 1920px; height: 1080px; overflow: hidden; background: #040d1a; }
              body { font-family: 'Inter', system-ui, sans-serif; }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
