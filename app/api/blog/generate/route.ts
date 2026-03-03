import { NextResponse } from 'next/server'
import { scrapeAllFeeds } from '@/lib/news-scraper'
import { generateBlogPost } from '@/lib/blog-generator'
import { fetchAndUploadImage, resetImagePool } from '@/lib/image-fetcher'
import { writeClient } from '@/sanity/lib/write-client'

export const dynamic = 'force-dynamic'
import { client } from '@/sanity/lib/client'
import { RECENT_TITLES_QUERY, CATEGORIES_QUERY } from '@/sanity/lib/queries'

/**
 * GET /api/blog/generate
 *
 * Triggered by Vercel Cron (runs daily at 6:00 AM UTC).
 * Vercel cron jobs send GET requests — this handler runs the full pipeline.
 */
export async function GET(req: Request) {
  const secret =
    req.headers.get('authorization')?.replace('Bearer ', '') ||
    new URL(req.url).searchParams.get('secret')

  if (
    process.env.NODE_ENV === 'production' &&
    process.env.BLOG_GENERATE_SECRET &&
    secret !== process.env.BLOG_GENERATE_SECRET
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return runPipeline(5)
}

/**
 * POST /api/blog/generate
 *
 * Full pipeline: Scrape RSS → AI rewrite → Publish to Sanity.
 * Secured with a simple API key check (BLOG_GENERATE_SECRET).
 * Can be triggered by:
 *   - External cron service
 *   - Admin manually
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const secret = body.secret || req.headers.get('x-api-secret')

  if (
    process.env.NODE_ENV === 'production' &&
    process.env.BLOG_GENERATE_SECRET &&
    secret !== process.env.BLOG_GENERATE_SECRET
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return runPipeline(body.limit ?? 5)
}

/**
 * Shared pipeline: Scrape RSS → AI rewrite → Publish to Sanity.
 */
async function runPipeline(maxPosts: number) {
  // Pre-flight checks
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY not configured' },
      { status: 500 }
    )
  }
  if (!process.env.SANITY_API_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'SANITY_API_WRITE_TOKEN not configured' },
      { status: 500 }
    )
  }

  try {
    // 1. Scrape RSS feeds
    console.log('[Generate] Scraping RSS feeds...')
    const articles = await scrapeAllFeeds()

    if (articles.length === 0) {
      return NextResponse.json({
        message: 'No articles found from RSS feeds',
        generated: 0,
        skipped: 0,
      })
    }

    // 2. Get existing titles for deduplication
    let existingTitles: string[] = []
    try {
      const existing: { title: string }[] = await client.fetch(
        RECENT_TITLES_QUERY
      )
      existingTitles = existing.map((e) =>
        e.title.toLowerCase().replace(/[^a-z0-9]/g, '')
      )
    } catch {
      // Sanity might not have data yet — proceed anyway
    }

    // 3. Get or create categories
    let categories: { _id: string; title: string }[] = []
    try {
      categories = await client.fetch(CATEGORIES_QUERY)
    } catch {}

    const categoryMap = new Map(categories.map((c) => [c.title, c._id]))

    const getCategoryRef = async (catName: string): Promise<string> => {
      if (categoryMap.has(catName)) {
        return categoryMap.get(catName)!
      }
      const slug = catName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
      const created = await writeClient.create({
        _type: 'category',
        title: catName,
        slug: { _type: 'slug', current: slug },
      })
      categoryMap.set(catName, created._id)
      return created._id
    }

    // 4. Filter new articles (not already published)
    const newArticles = articles.filter((a) => {
      const key = a.title.toLowerCase().replace(/[^a-z0-9]/g, '')
      return !existingTitles.some(
        (et) => et === key || levenshteinSimilar(et, key)
      )
    })

    console.log(
      `[Generate] ${newArticles.length} new articles (${articles.length - newArticles.length} duplicates skipped)`
    )

    // 5. Generate and publish posts (with images)
    const results: { title: string; status: string; slug?: string }[] = []
    let generated = 0
    resetImagePool()

    for (const article of newArticles.slice(0, maxPosts)) {
      try {
        console.log(`[Generate] Processing: ${article.title.slice(0, 50)}...`)
        const post = await generateBlogPost(article)

        if (!post) {
          results.push({ title: article.title, status: 'ai_failed' })
          continue
        }

        const catId = await getCategoryRef(post.category)

        let featuredImage: any = undefined
        try {
          const imgResult = await fetchAndUploadImage(
            post.title,
            post.seoKeywords
          )
          if (imgResult) {
            featuredImage = {
              ...imgResult.imageRef,
              alt: imgResult.alt,
            }
          }
        } catch (imgErr: any) {
          console.warn(`[Generate] Image fetch failed (non-fatal): ${imgErr.message}`)
        }

        await writeClient.create({
          _type: 'post',
          title: post.title,
          slug: { _type: 'slug', current: post.slug },
          excerpt: post.excerpt,
          publishedAt: new Date().toISOString(),
          body: post.body,
          seoTitle: post.seoTitle,
          seoDescription: post.seoDescription,
          seoKeywords: post.seoKeywords,
          source: post.source,
          autoGenerated: true,
          categories: [{ _type: 'reference', _ref: catId, _key: `cat${Date.now()}` }],
          ...(featuredImage && { featuredImage }),
        })

        generated++
        results.push({ title: post.title, status: 'published', slug: post.slug })
        console.log(`[Generate] Published: ${post.slug}`)

        // Trigger YouTube video generation on Hetzner VPS (fire-and-forget)
        const streamingUrl = process.env.STREAMING_SERVICE_URL
        if (streamingUrl) {
          fetch(`${streamingUrl}/video/news`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: post.title,
              excerpt: post.excerpt || '',
              slug: post.slug,
              keywords: post.seoKeywords || [],
            }),
          }).catch((e: any) =>
            console.warn('[Generate] Video trigger failed (non-fatal):', e.message)
          )
        }
      } catch (err: any) {
        console.error(`[Generate] Error processing article:`, err.message)
        results.push({ title: article.title, status: `error: ${err.message}` })
      }
    }

    return NextResponse.json({
      message: `Generated ${generated} posts`,
      generated,
      skipped: articles.length - newArticles.length,
      total_scraped: articles.length,
      results,
    })
  } catch (err: any) {
    console.error('[Generate] Pipeline error:', err)
    return NextResponse.json(
      { error: err.message || 'Pipeline failed' },
      { status: 500 }
    )
  }
}

/**
 * Simple similarity check — considers titles as duplicates if
 * they share >80% of characters (rough Levenshtein-like check).
 */
function levenshteinSimilar(a: string, b: string): boolean {
  if (a.length === 0 || b.length === 0) return false
  if (a.includes(b) || b.includes(a)) return true

  const setA = new Set(a.split(''))
  const setB = new Set(b.split(''))
  let overlap = 0
  for (const ch of setA) {
    if (setB.has(ch)) overlap++
  }
  const ratio = overlap / Math.max(setA.size, setB.size)
  return ratio > 0.85 && Math.abs(a.length - b.length) < 10
}
