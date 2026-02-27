import Link from 'next/link'
import { client } from '@/sanity/lib/client'
import { POSTS_QUERY, CATEGORIES_QUERY } from '@/sanity/lib/queries'
import BlogList from './BlogList'

export const metadata = {
  title: 'Cricket News & Blog | Cricket Analytics',
  description:
    'Latest cricket news, match updates, player analysis, and tournament insights — updated daily with AI-powered coverage.',
  keywords: [
    'cricket news',
    'cricket blog',
    'IPL news',
    'T20 World Cup updates',
    'cricket analysis',
    'match predictions',
    'cricket player news',
  ],
  openGraph: {
    title: 'Cricket News & Blog | Cricket Analytics',
    description: 'Daily cricket news updates with AI-powered analysis.',
    type: 'website',
  },
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
