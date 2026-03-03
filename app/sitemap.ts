import { MetadataRoute } from 'next'
import { client } from '@/sanity/lib/client'
import { POSTS_QUERY } from '@/sanity/lib/queries'

const BASE_URL = 'https://crickettips.ai'

interface SanityPost {
  slug: { current: string }
  publishedAt: string
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // ── Static pages ──
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/matches`,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/predictions`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/analysis`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/odds`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/teams`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/players`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ]

  // ── Blog posts from Sanity ──
  let blogRoutes: MetadataRoute.Sitemap = []
  try {
    const posts = await client.fetch<SanityPost[]>(POSTS_QUERY, { limit: 500 })
    blogRoutes = (posts || []).map((post) => ({
      url: `${BASE_URL}/blog/${post.slug.current}`,
      lastModified: post.publishedAt ? new Date(post.publishedAt) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }))
  } catch {
    // Sanity not configured or unreachable — skip blog routes
  }

  return [...staticRoutes, ...blogRoutes]
}
