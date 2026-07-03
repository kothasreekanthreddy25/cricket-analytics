import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Live Score Overlay',
}

export default function OverlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
              html, body { background: transparent !important; overflow: hidden; }
              body { font-family: 'Inter', system-ui, sans-serif; }
            `,
          }}
        />
      </head>
      <body style={{ background: 'transparent' }}>{children}</body>
    </html>
  )
}
