import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PortableText } from '@portabletext/react'
import { client } from '@/sanity/lib/client'
import { POST_BY_SLUG_QUERY, POSTS_QUERY } from '@/sanity/lib/queries'
import AffiliateBanner from '@/components/AffiliateBanner'

interface Post {
  _id: string
  title: string
  slug: { current: string }
  publishedAt: string
  body: any[]
  excerpt?: string
  source?: string
  seoTitle?: string
  seoDescription?: string
  seoKeywords?: string[]
  imageUrl?: string
  categories?: { _id: string; title: string; slug: { current: string } }[]
}

export const revalidate = 300

// ── Dynamic SEO metadata ──
export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  let post: Post | null = null
  try {
    post = await client.fetch<Post>(POST_BY_SLUG_QUERY, { slug: params.slug })
  } catch {
    return { title: 'Post Not Found' }
  }
  if (!post) return { title: 'Post Not Found' }

  const title = post.seoTitle || post.title
  const description =
    post.seoDescription || post.excerpt || `Read ${post.title} on Cricket Analytics`
  const url = `https://crickettips.ai/blog/${post.slug.current}`

  return {
    title: `${title} | Cricket Analytics`,
    description,
    keywords: post.seoKeywords?.join(', '),
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: post.publishedAt,
      url,
      images: post.imageUrl ? [{ url: post.imageUrl }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: post.imageUrl ? [post.imageUrl] : [],
    },
    alternates: { canonical: url },
  }
}

// ── Portable Text components ──
const ptComponents = {
  block: {
    h2: ({ children }: any) => (
      <h2 className="text-2xl font-bold text-white mt-8 mb-3">{children}</h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-xl font-bold text-white mt-6 mb-2">{children}</h3>
    ),
    h4: ({ children }: any) => (
      <h4 className="text-lg font-semibold text-gray-200 mt-5 mb-2">{children}</h4>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-emerald-500 pl-4 my-4 text-gray-400 italic">
        {children}
      </blockquote>
    ),
    normal: ({ children }: any) => (
      <p className="text-gray-300 leading-relaxed mb-4">{children}</p>
    ),
  },
  marks: {
    link: ({ children, value }: any) => (
      <a
        href={value?.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-emerald-400 underline hover:text-emerald-300"
      >
        {children}
      </a>
    ),
    strong: ({ children }: any) => (
      <strong className="font-bold text-white">{children}</strong>
    ),
    em: ({ children }: any) => <em className="italic">{children}</em>,
  },
  list: {
    bullet: ({ children }: any) => (
      <ul className="list-disc list-inside space-y-1 text-gray-300 mb-4 ml-2">
        {children}
      </ul>
    ),
    number: ({ children }: any) => (
      <ol className="list-decimal list-inside space-y-1 text-gray-300 mb-4 ml-2">
        {children}
      </ol>
    ),
  },
}

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string }
}) {
  let post: Post | null = null
  try {
    post = await client.fetch<Post>(POST_BY_SLUG_QUERY, { slug: params.slug })
  } catch {
    // Sanity not configured
  }

  if (!post) notFound()

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    datePublished: post.publishedAt,
    author: { '@type': 'Organization', name: 'Cricket Analytics' },
    publisher: { '@type': 'Organization', name: 'Cricket Analytics' },
    ...(post.imageUrl && { image: post.imageUrl }),
    mainEntityOfPage: `https://crickettips.ai/blog/${post.slug.current}`,
    keywords: post.seoKeywords?.join(', '),
  }

  // Fetch related posts
  let relatedPosts: Post[] = []
  try {
    const all = await client.fetch<Post[]>(POSTS_QUERY, { limit: 6 })
    relatedPosts = all
      .filter((p) => p._id !== post!._id)
      .slice(0, 3)
  } catch {}

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="max-w-3xl mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-white transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-white transition-colors">
            Blog
          </Link>
          <span>/</span>
          <span className="text-gray-400 truncate max-w-[200px]">{post.title}</span>
        </nav>

        {/* Categories */}
        {post.categories && post.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {post.categories.map((c) => (
              <span
                key={c._id}
                className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded"
              >
                {c.title}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-4">
          {post.title}
        </h1>

        {/* Date */}
        <p className="text-sm text-gray-500 mb-8">
          {new Date(post.publishedAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}
        </p>

        {/* Featured image */}
        {post.imageUrl && (
          <div className="rounded-xl overflow-hidden mb-8">
            <img
              src={post.imageUrl}
              alt={post.title}
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        {/* SEO keywords as tags */}
        {post.seoKeywords && post.seoKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {post.seoKeywords.map((kw, i) => (
              <span
                key={i}
                className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded"
              >
                #{kw}
              </span>
            ))}
          </div>
        )}

        {/* Body — Portable Text */}
        <div className="prose prose-invert max-w-none">
          {post.body ? (
            <PortableText value={post.body} components={ptComponents} />
          ) : (
            <p className="text-gray-500">No content.</p>
          )}
        </div>

        {/* Source */}
        {post.source && (
          <p className="mt-8 text-xs text-gray-600">
            Original source:{' '}
            <a
              href={post.source}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-300 underline"
            >
              {new URL(post.source).hostname}
            </a>
          </p>
        )}

        {/* Affiliate Banner */}
        <AffiliateBanner />
      </article>

      {/* Related posts */}
      {relatedPosts.length > 0 && (
        <section className="max-w-3xl mx-auto px-4 pb-16">
          <h2 className="text-lg font-bold text-white mb-4">More News</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {relatedPosts.map((rp) => (
              <Link
                key={rp._id}
                href={`/blog/${rp.slug.current}`}
                className="bg-gray-900 rounded-lg border border-gray-800 p-4 hover:border-emerald-500/30 transition-colors"
              >
                <h3 className="text-sm font-semibold text-white line-clamp-2 mb-2">
                  {rp.title}
                </h3>
                <p className="text-[10px] text-gray-600">
                  {new Date(rp.publishedAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
