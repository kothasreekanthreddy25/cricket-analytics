import Link from 'next/link'
import { client } from '@/sanity/lib/client'
import { POSTS_QUERY, CATEGORIES_QUERY } from '@/sanity/lib/queries'
import BlogList from './BlogList'

export const metadata = {
  title: 'Cricket News & Blog – AI-Generated Match Updates & Analysis',
  description:
    'Latest cricket news, match previews, player analysis, and tournament insights — updated daily with AI-generated coverage. T20 World Cup 2026, IPL, and international cricket.',
  keywords: [
    'cricket news', 'cricket blog', 'cricket news today', 'cricket match updates',
    'IPL news', 'T20 World Cup 2026 news', 'cricket analysis articles',
    'cricket match preview', 'cricket player news', 'cricket tournament news',
    'AI cricket news', 'cricket insights', 'cricket match report',
    'cricket betting news', 'cricket tips blog',
  ],
  openGraph: {
    title: 'Cricket News & Blog | CricketTips.ai',
    description: 'Daily AI-generated cricket news, match previews, and analysis for T20 WC 2026 & IPL.',
    url: 'https://crickettips.ai/blog',
    type: 'website',
  },
  alternates: { canonical: 'https://crickettips.ai/blog' },
}

interface Post {
  _id: string
  title: string
  slug: { current: string }
  publishedAt: string
  excerpt?: string
  seoDescription?: string
  imageUrl?: string
  categories?: { _id: string; title: string; slug: { current: string } }[]
}

interface Category {
  _id: string
  title: string
  slug: { current: string }
}

export const revalidate = 300 // revalidate every 5 minutes

export default async function BlogPage() {
  let posts: Post[] = []
  let categories: Category[] = []

  try {
    ;[posts, categories] = await Promise.all([
      client.fetch<Post[]>(POSTS_QUERY, { limit: 30 }),
      client.fetch<Category[]>(CATEGORIES_QUERY),
    ])
  } catch {
    // Sanity not configured yet — show empty state
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm text-gray-400 hover:text-white transition-colors mb-4 inline-block"
          >
            &larr; Home
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Cricket News & Blog
          </h1>
          <p className="text-gray-500 mt-1">
            Daily AI-powered cricket news — match updates, player insights & tournament analysis
          </p>
        </div>

        {/* Client component handles filtering */}
        <BlogList posts={posts} categories={categories} />
      </div>
    </div>
  )
}
