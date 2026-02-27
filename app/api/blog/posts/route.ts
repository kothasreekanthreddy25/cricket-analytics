import { NextResponse } from 'next/server'
import { client } from '@/sanity/lib/client'
import { POSTS_QUERY, POST_BY_SLUG_QUERY } from '@/sanity/lib/queries'

/**
 * GET /api/blog/posts?slug=xxx&limit=12
 *
 * Fetch blog posts from Sanity.
 * If slug is provided, returns a single post.
 * Otherwise returns a paginated list.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  const limit = Math.min(Number(searchParams.get('limit') || 12), 50)

  try {
    if (slug) {
      const post = await client.fetch(POST_BY_SLUG_QUERY, { slug })
      if (!post) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 })
      }
      return NextResponse.json(post)
    }

    const posts = await client.fetch(POSTS_QUERY, { limit })
    return NextResponse.json({ posts, count: posts.length })
  } catch (err: any) {
    console.error('[Blog API]', err.message)
    return NextResponse.json(
      { error: 'Failed to fetch posts', detail: err.message },
      { status: 500 }
    )
  }
}
