import { MetadataRoute } from 'next'
import { client } from '@/sanity/lib/client'
import { POSTS_QUERY } from '@/sanity/lib/queries'
import { prisma } from '@/lib/prisma'

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
    {
      url: `${BASE_URL}/predictions/history`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/schedule`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/uk`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/au`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
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

  // ── Per-match prediction/analysis pages ──
  // Distinct matchKeys from recent MatchAnalysis rows — this is the
  // canonical prediction URL (/analysis?match=X), not /live/{matchKey}
  // (excluded: that page is real-time ball-by-ball, too ephemeral to be
  // worth indexing) or the orphaned /match, /matches/[id] routes (unlinked
  // from anywhere in the app).
  let matchRoutes: MetadataRoute.Sitemap = []
  try {
    const recent = await prisma.matchAnalysis.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } },
      distinct: ['matchKey'],
      orderBy: { createdAt: 'desc' },
      take: 1000,
      select: { matchKey: true, createdAt: true },
    })
    matchRoutes = recent.map((m) => ({
      url: `${BASE_URL}/analysis?match=${encodeURIComponent(m.matchKey)}`,
      lastModified: m.createdAt,
      changeFrequency: 'daily' as const,
      priority: 0.75,
    }))
  } catch {
    // DB unreachable — skip match routes rather than fail the whole sitemap
  }

  // ── Team / player / venue detail pages ──
  // Populated by lib/entity-crawler.ts (daily job) — real SportMonks data,
  // never AI-hallucinated, never dependent on the dead Roanuz endpoints the
  // old /teams and /players pages used.
  let entityRoutes: MetadataRoute.Sitemap = []
  try {
    const [teams, players, venues] = await Promise.all([
      prisma.team.findMany({ select: { slug: true, updatedAt: true } }),
      prisma.player.findMany({ select: { slug: true, updatedAt: true } }),
      prisma.venue.findMany({ select: { slug: true, updatedAt: true } }),
    ])
    entityRoutes = [
      ...teams.map((t) => ({
        url: `${BASE_URL}/teams/${t.slug}`,
        lastModified: t.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.65,
      })),
      ...players.map((p) => ({
        url: `${BASE_URL}/players/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      })),
      ...venues.map((v) => ({
        url: `${BASE_URL}/venues/${v.slug}`,
        lastModified: v.updatedAt,
        changeFrequency: 'monthly' as const,
        priority: 0.55,
      })),
    ]
  } catch {
    // DB unreachable — skip entity routes rather than fail the whole sitemap
  }

  return [...staticRoutes, ...blogRoutes, ...matchRoutes, ...entityRoutes]
}
