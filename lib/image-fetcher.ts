/**
 * Cricket image fetcher for blog posts.
 * Downloads images and uploads them to Sanity CDN.
 *
 * Strategy:
 *  1. If PEXELS_API_KEY is set → search Pexels for relevant cricket images
 *  2. Fallback → curated pool of free cricket images (Unsplash)
 */

import { writeClient } from '@/sanity/lib/write-client'

/* ── Curated pool of free cricket images (Unsplash – free to use) ── */
const CRICKET_IMAGES = [
  {
    url: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=1200&q=80',
    alt: 'Cricket bat and stumps on green pitch',
    tags: ['bat', 'equipment', 'general', 'test'],
  },
  {
    url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1200&q=80',
    alt: 'Cricket stadium under floodlights',
    tags: ['stadium', 'venue', 'match', 'night', 't20'],
  },
  {
    url: 'https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?w=1200&q=80',
    alt: 'Cricket player batting in action',
    tags: ['batting', 'player', 'action', 'match'],
  },
  {
    url: 'https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=1200&q=80',
    alt: 'Cricket ball on grass',
    tags: ['ball', 'bowling', 'equipment', 'general'],
  },
  {
    url: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=1200&q=80',
    alt: 'Cricket ground aerial view',
    tags: ['ground', 'aerial', 'stadium', 'venue'],
  },
  {
    url: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=1200&q=80',
    alt: 'Cricket stumps and bails close-up',
    tags: ['stumps', 'wicket', 'bowling', 'general'],
  },
  {
    url: 'https://images.unsplash.com/photo-1595341888016-a392ef81b7de?w=1200&q=80',
    alt: 'Cricket match in progress',
    tags: ['match', 'playing', 'action', 'game'],
  },
  {
    url: 'https://images.unsplash.com/photo-1594470117722-de4b9a02ebed?w=1200&q=80',
    alt: 'Cricket batsman hitting a shot',
    tags: ['batting', 'hit', 'player', 'action'],
  },
  {
    url: 'https://images.unsplash.com/photo-1587385789097-0197a7fbd179?w=1200&q=80',
    alt: 'Cricket field with players',
    tags: ['field', 'team', 'players', 'match'],
  },
  {
    url: 'https://images.unsplash.com/photo-1554178286-db408c69256a?w=1200&q=80',
    alt: 'Cricket bowler in action',
    tags: ['bowling', 'bowler', 'action', 'player'],
  },
  {
    url: 'https://images.unsplash.com/photo-1589801258579-18e091f4ca26?w=1200&q=80',
    alt: 'Cricket helmet and protective gear',
    tags: ['helmet', 'gear', 'equipment', 'safety'],
  },
  {
    url: 'https://images.unsplash.com/photo-1593766788306-28561086694e?w=1200&q=80',
    alt: 'Cricket fans cheering in stadium',
    tags: ['fans', 'crowd', 'stadium', 'tournament'],
  },
  {
    url: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=1200&q=80',
    alt: 'Cricket pitch and ground view',
    tags: ['pitch', 'ground', 'venue', 'test', 'championship'],
  },
]

/** Track which images from the pool have been used (avoid duplicates within a run) */
let usedIndices = new Set<number>()

/**
 * Pick the best matching image from the curated pool based on title & keywords.
 */
function pickFromPool(
  title: string,
  keywords: string[]
): { url: string; alt: string } {
  const searchTerms = [
    ...keywords,
    ...title.toLowerCase().split(/\s+/),
  ].map((t) => t.toLowerCase())

  // Score each image
  let bestIdx = 0
  let bestScore = -1

  for (let i = 0; i < CRICKET_IMAGES.length; i++) {
    if (usedIndices.has(i)) continue // skip already used
    const img = CRICKET_IMAGES[i]
    let score = 0
    for (const tag of img.tags) {
      if (searchTerms.some((t) => t.includes(tag) || tag.includes(t))) {
        score += 2
      }
    }
    // Add small random factor to avoid always picking same image
    score += Math.random() * 0.5
    if (score > bestScore) {
      bestScore = score
      bestIdx = i
    }
  }

  // If all images used, reset pool
  if (usedIndices.size >= CRICKET_IMAGES.length) {
    usedIndices = new Set()
  }
  usedIndices.add(bestIdx)

  return CRICKET_IMAGES[bestIdx]
}

/**
 * Search Pexels for a cricket-related image (if API key is available).
 */
async function searchPexels(
  query: string
): Promise<{ url: string; alt: string } | null> {
  const apiKey = process.env.PEXELS_API_KEY
  if (!apiKey) return null

  try {
    const searchQuery = `cricket ${query}`.slice(0, 80)
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=5&orientation=landscape`,
      { headers: { Authorization: apiKey } }
    )

    if (!res.ok) return null

    const data = await res.json()
    if (!data.photos || data.photos.length === 0) return null

    // Pick a random photo from top 5
    const photo = data.photos[Math.floor(Math.random() * data.photos.length)]
    return {
      url: photo.src.landscape || photo.src.large,
      alt: photo.alt || `Cricket - ${query}`,
    }
  } catch (err) {
    console.error('[ImageFetcher] Pexels search failed:', err)
    return null
  }
}

/**
 * Download an image from URL and return as Buffer.
 */
async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'CricketAnalytics/1.0 (blog image fetcher)',
    },
  })

  if (!res.ok) {
    throw new Error(`Failed to download image: ${res.status} ${res.statusText}`)
  }

  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Upload an image buffer to Sanity and return the asset reference.
 */
async function uploadToSanity(
  imageBuffer: Buffer,
  filename: string
): Promise<{ _type: 'image'; asset: { _type: 'reference'; _ref: string } }> {
  const asset = await writeClient.assets.upload('image', imageBuffer, {
    filename,
    contentType: 'image/jpeg',
  })

  return {
    _type: 'image',
    asset: {
      _type: 'reference',
      _ref: asset._id,
    },
  }
}

/**
 * Main function: Fetch a relevant cricket image, upload to Sanity, return reference.
 *
 * @param title - Blog post title
 * @param keywords - SEO keywords for the post
 * @returns Sanity image reference object or null
 */
export async function fetchAndUploadImage(
  title: string,
  keywords: string[] = []
): Promise<{
  imageRef: { _type: 'image'; asset: { _type: 'reference'; _ref: string } }
  alt: string
} | null> {
  try {
    // 1. Try Pexels first (better, more relevant images)
    const shortTitle = title.split(/[:\-–|]/).shift()?.trim() || title
    let imageSource = await searchPexels(shortTitle)

    // 2. Fallback to curated pool
    if (!imageSource) {
      imageSource = pickFromPool(title, keywords)
    }

    console.log(`[ImageFetcher] Downloading image for: "${title.slice(0, 40)}..."`)

    // 3. Download
    const buffer = await downloadImage(imageSource.url)

    // 4. Upload to Sanity
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 40)
    const filename = `blog-${slug}-${Date.now()}.jpg`
    const imageRef = await uploadToSanity(buffer, filename)

    console.log(`[ImageFetcher] Uploaded: ${filename} (${(buffer.length / 1024).toFixed(0)} KB)`)

    return { imageRef, alt: imageSource.alt }
  } catch (err) {
    console.error('[ImageFetcher] Failed to fetch/upload image:', err)
    return null
  }
}

/** Reset the used-images tracker (call between pipeline runs) */
export function resetImagePool() {
  usedIndices = new Set()
}
