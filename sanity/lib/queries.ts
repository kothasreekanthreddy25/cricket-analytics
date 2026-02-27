/** All published posts — listing page */
export const POSTS_QUERY = `
  *[_type == "post" && defined(slug.current)] | order(publishedAt desc) [0...$limit] {
    _id, title, slug, publishedAt, excerpt,
    seoDescription,
    categories[]-> { _id, title, slug },
    "imageUrl": featuredImage.asset->url
  }
`

/** Single post by slug */
export const POST_BY_SLUG_QUERY = `
  *[_type == "post" && slug.current == $slug][0] {
    _id, title, slug, publishedAt, body, excerpt, source,
    seoTitle, seoDescription, seoKeywords,
    categories[]-> { _id, title, slug },
    "imageUrl": featuredImage.asset->url
  }
`

/** All slugs — for generateStaticParams */
export const POST_SLUGS_QUERY = `
  *[_type == "post" && defined(slug.current)].slug.current
`

/** Recent post titles — for deduplication */
export const RECENT_TITLES_QUERY = `
  *[_type == "post"] | order(publishedAt desc) [0...50] { title }
`

/** Posts by category */
export const POSTS_BY_CATEGORY_QUERY = `
  *[_type == "post" && $categoryId in categories[]->_id] | order(publishedAt desc) [0...$limit] {
    _id, title, slug, publishedAt, excerpt,
    seoDescription,
    categories[]-> { _id, title, slug },
    "imageUrl": featuredImage.asset->url
  }
`

/** All categories */
export const CATEGORIES_QUERY = `
  *[_type == "category"] | order(title asc) { _id, title, slug }
`
