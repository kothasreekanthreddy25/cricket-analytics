'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Newspaper } from 'lucide-react'

interface Post {
  _id: string
  title: string
  slug: { current: string }
  excerpt?: string
  category?: string
  publishedAt?: string
  mainImage?: { asset?: { url?: string } }
}

export default function LatestNews() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/blog/posts?limit=4')
      .then((r) => r.json())
      .then((data) => {
        setPosts(data.posts?.slice(0, 4) || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-800/50 rounded-xl p-4 animate-pulse h-36" />
        ))}
      </div>
    )
  }

  if (!posts.length) return null

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {posts.map((post) => (
        <Link
          key={post._id}
          href={`/blog/${post.slug?.current}`}
          className="group bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-emerald-500/30 rounded-xl p-4 transition-all duration-300 flex flex-col"
        >
          {post.category && (
            <span className="text-emerald-400 text-xs font-medium uppercase tracking-wider mb-2">
              {post.category}
            </span>
          )}
          <h3 className="text-white text-sm font-semibold leading-snug mb-2 group-hover:text-emerald-300 transition-colors line-clamp-2">
            {post.title}
          </h3>
          {post.excerpt && (
            <p className="text-gray-400 text-xs leading-relaxed line-clamp-2 flex-1">
              {post.excerpt}
            </p>
          )}
          <span className="text-emerald-400 text-xs font-medium inline-flex items-center gap-1 mt-3 group-hover:gap-2 transition-all">
            Read more <ArrowRight className="w-3 h-3" />
          </span>
        </Link>
      ))}
    </div>
  )
}
