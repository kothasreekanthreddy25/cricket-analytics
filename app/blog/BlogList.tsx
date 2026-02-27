'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Calendar, Tag, ArrowRight } from 'lucide-react'

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

export default function BlogList({
  posts,
  categories,
}: {
  posts: Post[]
  categories: Category[]
}) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!activeCategory) return posts
    return posts.filter((p) =>
      p.categories?.some((c) => c._id === activeCategory)
    )
  }, [posts, activeCategory])

  if (posts.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
          <Tag className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">No posts yet</h2>
        <p className="text-gray-500 text-sm">
          Blog posts will appear here once the news pipeline is configured.
          <br />
          Add your Sanity project ID and OpenAI API key to .env to get started.
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Category pills */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !activeCategory
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() =>
                setActiveCategory(cat._id === activeCategory ? null : cat._id)
              }
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat._id
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {cat.title}
            </button>
          ))}
        </div>
      )}

      {/* Post grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((post) => (
          <Link
            key={post._id}
            href={`/blog/${post.slug.current}`}
            className="group bg-gray-900 rounded-xl border border-gray-800 overflow-hidden hover:border-emerald-500/40 transition-colors"
          >
            {/* Image */}
            {post.imageUrl ? (
              <div className="h-44 bg-gray-800 overflow-hidden">
                <img
                  src={post.imageUrl}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            ) : (
              <div className="h-44 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                <span className="text-4xl opacity-20">🏏</span>
              </div>
            )}

            <div className="p-4">
              {/* Categories */}
              {post.categories && post.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {post.categories.map((c) => (
                    <span
                      key={c._id}
                      className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded"
                    >
                      {c.title}
                    </span>
                  ))}
                </div>
              )}

              {/* Title */}
              <h2 className="text-base font-bold text-white leading-snug mb-2 line-clamp-2 group-hover:text-emerald-300 transition-colors">
                {post.title}
              </h2>

              {/* Excerpt */}
              <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                {post.excerpt || post.seoDescription || ''}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs text-gray-600">
                  <Calendar className="w-3 h-3" />
                  {new Date(post.publishedAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Read <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && activeCategory && (
        <p className="text-center text-gray-500 py-12 text-sm">
          No posts in this category yet.
        </p>
      )}
    </>
  )
}
