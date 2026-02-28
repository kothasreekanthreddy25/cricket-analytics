import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import LiveMatchesTicker from '@/components/LiveMatchesTicker'
import PageWithSidebar from '@/components/PageWithSidebar'
import Footer from '@/components/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CricketTips.ai - AI Cricket Predictions & Live Scores | 18+',
  description: 'AI-powered cricket predictions, live scores, and match analysis. For informational and entertainment purposes only. 18+ Please gamble responsibly.',
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
        <Footer />
      </body>
    </html>
  )
}
