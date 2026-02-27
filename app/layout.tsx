import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import LiveMatchesTicker from '@/components/LiveMatchesTicker'
import PageWithSidebar from '@/components/PageWithSidebar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Cricket Analytics - Live Scores & Stats',
  description: 'Real-time cricket scores, match analytics, team and player statistics',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navbar />
        <LiveMatchesTicker />
        <main className="min-h-screen">
          <PageWithSidebar>{children}</PageWithSidebar>
        </main>
      </body>
    </html>
  )
}
