import { NextResponse } from 'next/server'
import { writeClient } from '@/sanity/lib/write-client'
import { client } from '@/sanity/lib/client'
import { fetchAndUploadImage, resetImagePool } from '@/lib/image-fetcher'

export const dynamic = 'force-dynamic'

/**
 * POST /api/blog/add-images
 *
 * Retroactively adds featured images to blog posts that don't have one.
 */
export async function POST() {
  try {
    // Fetch all posts without a featured image
    const postsWithoutImages = await client.fetch<
      { _id: string; title: string; seoKeywords?: string[] }[]
    >(`
      *[_type == "post" && !defined(featuredImage)] {
        _id, title, seoKeywords
      }
    `)

    if (postsWithoutImages.length === 0) {
      return NextResponse.json({
        message: 'All posts already have images',
        updated: 0,
      })
    }

    console.log(
      `[AddImages] Found ${postsWithoutImages.length} posts without images`
    )

    resetImagePool()
    const results: { title: string; status: string }[] = []
    let updated = 0

    for (const post of postsWithoutImages) {
      try {
        console.log(`[AddImages] Fetching image for: "${post.title.slice(0, 50)}..."`)

        const imgResult = await fetchAndUploadImage(
          post.title,
          post.seoKeywords || []
        )

        if (!imgResult) {
          results.push({ title: post.title, status: 'image_fetch_failed' })
          continue
        }

        // Patch the existing post with the image
        await writeClient
          .patch(post._id)
          .set({
            featuredImage: {
              ...imgResult.imageRef,
              alt: imgResult.alt,
            },
          })
          .commit()

        updated++
        results.push({ title: post.title, status: 'image_added' })
        console.log(`[AddImages] Added image to: "${post.title.slice(0, 40)}"`)

        // Small delay between downloads
        await new Promise((r) => setTimeout(r, 500))
      } catch (err: any) {
        console.error(`[AddImages] Error for "${post.title}":`, err.message)
        results.push({ title: post.title, status: `error: ${err.message}` })
      }
    }

    return NextResponse.json({
      message: `Added images to ${updated} posts`,
      updated,
      total: postsWithoutImages.length,
      results,
    })
  } catch (err: any) {
    console.error('[AddImages] Pipeline error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to add images' },
      { status: 500 }
    )
  }
}
