import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Suspense } from 'react'
import './globals.css'
import Navbar from '@/components/Navbar'
import LiveMatchesTicker from '@/components/LiveMatchesTicker'
import PageWithSidebar from '@/components/PageWithSidebar'
import Footer from '@/components/Footer'

const inter = Inter({ subsets: ['latin'] })

const BASE_URL = 'https://crickettips.ai'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'CricketTips.ai – AI Cricket Predictions, Live Scores & Match Analysis | 18+',
    template: '%s | CricketTips.ai',
  },
  description:
    'CricketTips.ai delivers AI-powered cricket predictions, live cricket scores, ball-by-ball commentary, win probability analysis, and T20 World Cup 2026 tips. Free cricket predictions by TensorFlow.js neural network. 18+ Gamble responsibly.',
  keywords: [
    // Core brand
    'CricketTips', 'CricketTips.ai', 'cricket tips', 'cricket predictions',
    // AI / analytics
    'AI cricket predictions', 'cricket AI analysis', 'cricket analytics',
    'TensorFlow cricket', 'neural network cricket predictions',
    'machine learning cricket', 'cricket win probability', 'cricket data analytics',
    // Live scores
    'live cricket scores', 'live cricket matches', 'cricket score today',
    'ball by ball cricket', 'cricket scorecard', 'cricket live updates',
    // Match prediction
    'cricket match prediction', 'cricket match prediction today',
    'cricket match analysis', 'today cricket match prediction',
    'cricket forecast', 'who will win today',
    // Tournament specific
    'T20 World Cup 2026', 'T20 WC 2026 predictions', 'ICC T20 World Cup tips',
    'T20 World Cup analysis', 'T20 cricket predictions',
    'IPL predictions', 'IPL 2026 tips', 'IPL match analysis',
    'Champions Trophy predictions', 'ODI World Cup predictions',
    // Betting / tips
    'cricket betting tips', 'free cricket tips', 'best cricket tips',
    'cricket tipster', 'cricket odds', 'cricket betting analysis',
    'cricket prediction site', 'cricket tips today',
    // Fantasy
    'cricket fantasy tips', 'fantasy cricket team', 'dream11 prediction',
    'fantasy cricket prediction', 'best fantasy cricket team today',
    // Teams / players
    'India cricket predictions', 'India vs Pakistan prediction',
    'England cricket tips', 'Australia cricket analysis',
    'cricket team stats', 'cricket player analysis',
    'players to watch cricket', 'cricket players performance',
    // Formats
    'T20 predictions', 'ODI predictions', 'Test match predictions',
    'T20 match tips', 'ODI match analysis',
    // General SEO
    'cricket news', 'cricket analysis', 'cricket statistics',
    'cricket winning tips', 'cricket prediction accuracy',
  ],
  authors: [{ name: 'CricketTips.ai', url: BASE_URL }],
  creator: 'CricketTips.ai',
  publisher: 'CricketTips.ai',
  category: 'sports',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    siteName: 'CricketTips.ai',
    title: 'CricketTips.ai – AI Cricket Predictions & Live Scores',
    description:
      'Free AI-powered cricket predictions, live scores, T20 WC 2026 tips, win probability analysis, and ball-by-ball commentary. 18+ Gamble responsibly.',
    images: [
      {
        url: `${BASE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'CricketTips.ai – AI Cricket Predictions',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@crickettipsai',
    creator: '@crickettipsai',
    title: 'CricketTips.ai – AI Cricket Predictions & Live Scores',
    description:
      'Free AI-powered cricket predictions, live scores, T20 WC 2026 tips & win probability. 18+ Gamble responsibly.',
    images: [`${BASE_URL}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: BASE_URL,
  },
  verification: {
    google: 'nsg-_3rxP_qcomcdtViWENyfJbPmO_ftj91F18_nGWk',
  },
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
        <Suspense fallback={<div className="bg-gray-900 border-b border-gray-800 h-[60px]" />}>
          <LiveMatchesTicker />
        </Suspense>
        <main className="min-h-screen">
          <PageWithSidebar>{children}</PageWithSidebar>
        </main>
        <Footer />
      </body>
    </html>
  )
}
