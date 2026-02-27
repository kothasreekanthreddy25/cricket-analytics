/**
 * RSS Feed scraper for top cricket news websites.
 * Fetches headlines + summaries from multiple sources.
 */

export interface ScrapedArticle {
  title: string
  summary: string
  link: string
  source: string
  pubDate: string | null
}

const RSS_FEEDS = [
  {
    url: 'https://www.espncricinfo.com/rss/content/story/feeds/0.xml',
    source: 'ESPNcricinfo',
  },
  {
    url: 'https://www.cricbuzz.com/rss/cb-top-stories',
    source: 'Cricbuzz',
  },
  {
    url: 'https://www.icc-cricket.com/rss',
    source: 'ICC',
  },
  {
    url: 'https://feeds.feedburner.com/CricketWorldLiveFeed',
    source: 'CricketWorld',
  },
]

/**
 * Minimal XML tag parser — extracts text between opening and closing tags.
 * Handles CDATA sections. No external XML library needed.
 */
function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
  const match = xml.match(regex)
  if (!match) return ''
  return (match[1] || match[2] || '').trim()
}

/** Strip HTML tags from a string */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim()
}

/** Parse RSS XML into articles */
function parseRss(xml: string, source: string): ScrapedArticle[] {
  const articles: ScrapedArticle[] = []

  // Split by <item> or <entry> tags
  const items = xml.split(/<item[\s>]/).slice(1) // RSS 2.0
  const entries = xml.split(/<entry[\s>]/).slice(1) // Atom

  const rawItems = items.length > 0 ? items : entries

  for (const raw of rawItems.slice(0, 10)) {
    const title = stripHtml(extractTag(raw, 'title'))
    const link =
      extractTag(raw, 'link') ||
      (raw.match(/<link[^>]*href="([^"]+)"/) || [])[1] ||
      ''
    const summary = stripHtml(
      extractTag(raw, 'description') || extractTag(raw, 'summary') || extractTag(raw, 'content')
    )
    const pubDate = extractTag(raw, 'pubDate') || extractTag(raw, 'published') || extractTag(raw, 'updated') || null

    if (title && title.length > 10) {
      articles.push({
        title: title.slice(0, 200),
        summary: summary.slice(0, 500),
        link: link.trim(),
        source,
        pubDate,
      })
    }
  }

  return articles
}

/** Fetch a single RSS feed with timeout */
async function fetchFeed(
  feedUrl: string,
  source: string
): Promise<ScrapedArticle[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(feedUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'CricketAnalytics/1.0 RSS Reader' },
      cache: 'no-store',
    })
    clearTimeout(timeout)

    if (!res.ok) {
      console.warn(`[Scraper] ${source} returned ${res.status}`)
      return []
    }

    const xml = await res.text()
    return parseRss(xml, source)
  } catch (err: any) {
    console.warn(`[Scraper] Failed to fetch ${source}:`, err.message)
    return []
  }
}

/**
 * Scrape all cricket news RSS feeds.
 * Returns deduplicated articles sorted by recency.
 */
export async function scrapeAllFeeds(): Promise<ScrapedArticle[]> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map((f) => fetchFeed(f.url, f.source))
  )

  const allArticles: ScrapedArticle[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') {
      allArticles.push(...r.value)
    }
  }

  // Deduplicate by title similarity (exact match after lowering)
  const seen = new Set<string>()
  const unique = allArticles.filter((a) => {
    const key = a.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Sort by pub date (newest first)
  unique.sort((a, b) => {
    const da = a.pubDate ? new Date(a.pubDate).getTime() : 0
    const db = b.pubDate ? new Date(b.pubDate).getTime() : 0
    return db - da
  })

  console.log(`[Scraper] Fetched ${unique.length} unique articles from ${RSS_FEEDS.length} feeds`)
  return unique.slice(0, 15)
}
