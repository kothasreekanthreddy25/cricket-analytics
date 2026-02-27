/**
 * AI-powered blog post generator.
 * Takes a scraped news article → uses OpenAI GPT-4o-mini → returns
 * a fully formed blog post with SEO metadata + Sanity Portable Text body.
 */

import OpenAI from 'openai'
import type { ScrapedArticle } from './news-scraper'

/** Lazy-init OpenAI client — ensures env var is loaded before use */
let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

/** Categories that match our Sanity schema */
const VALID_CATEGORIES = [
  'Match Updates',
  'Player News',
  'Tournament News',
  'Analysis',
  'Transfer News',
  'Records & Stats',
]

export interface GeneratedPost {
  title: string
  slug: string
  excerpt: string
  seoTitle: string
  seoDescription: string
  seoKeywords: string[]
  category: string
  body: SanityBlock[]
  source: string
}

interface SanityBlock {
  _type: 'block'
  _key: string
  style: string
  markDefs: any[]
  children: { _type: 'span'; _key: string; text: string; marks: string[] }[]
}

/** Convert plain paragraphs into Sanity Portable Text blocks */
function textToPortableText(sections: { style: string; text: string }[]): SanityBlock[] {
  return sections.map((s, i) => ({
    _type: 'block',
    _key: `blk${i}${Date.now()}`,
    style: s.style,
    markDefs: [],
    children: [
      {
        _type: 'span',
        _key: `spn${i}${Date.now()}`,
        text: s.text,
        marks: [],
      },
    ],
  }))
}

/** Create a URL-friendly slug */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 96)
    .replace(/^-|-$/g, '')
}

/**
 * Generate a full blog post from a scraped article using AI.
 */
export async function generateBlogPost(
  article: ScrapedArticle
): Promise<GeneratedPost | null> {
  const systemPrompt = `You are an expert cricket journalist and SEO specialist writing for "Cricket Analytics", a popular cricket news website. Your job is to create ORIGINAL blog posts from news headlines. Rules:
- Write 100% original content — NEVER copy the source text
- Write in an engaging, informative sports journalism style
- Target 400-600 words
- Include cricket-specific insights and context
- Structure with a compelling title, clear sections with H2/H3 headings, and a conclusion
- Optimize for Google SEO with natural keyword usage

Output ONLY valid JSON with this exact structure:
{
  "title": "SEO-optimized article title (max 70 chars)",
  "seoTitle": "Title for <title> tag (max 60 chars)",
  "seoDescription": "Meta description (max 155 chars)",
  "seoKeywords": ["keyword1", "keyword2", ...8-12 keywords],
  "category": "one of: ${VALID_CATEGORIES.join(', ')}",
  "excerpt": "2-sentence preview for blog cards (max 200 chars)",
  "sections": [
    { "style": "h2", "text": "Section Heading" },
    { "style": "normal", "text": "Paragraph text..." },
    ...more sections
  ]
}`

  const userPrompt = `Write an original blog post based on this cricket news:

HEADLINE: ${article.title}
SUMMARY: ${article.summary || 'No summary available'}
SOURCE: ${article.source}
DATE: ${article.pubDate || 'Today'}

Remember: write ORIGINAL content, do NOT copy the source. Include SEO keywords naturally. Output ONLY the JSON.`

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) {
      console.error('[BlogGen] Empty AI response')
      return null
    }

    const data = JSON.parse(raw)

    // Validate required fields
    if (!data.title || !data.sections || !Array.isArray(data.sections)) {
      console.error('[BlogGen] Invalid AI response structure')
      return null
    }

    // Validate category
    const category = VALID_CATEGORIES.includes(data.category)
      ? data.category
      : 'Match Updates'

    return {
      title: data.title.slice(0, 100),
      slug: slugify(data.title),
      excerpt: (data.excerpt || data.seoDescription || '').slice(0, 200),
      seoTitle: (data.seoTitle || data.title).slice(0, 60),
      seoDescription: (data.seoDescription || '').slice(0, 160),
      seoKeywords: Array.isArray(data.seoKeywords)
        ? data.seoKeywords.slice(0, 12).map((k: string) => String(k).toLowerCase())
        : [],
      category,
      body: textToPortableText(data.sections),
      source: article.link,
    }
  } catch (err: any) {
    const errDetail = err?.response?.data || err?.error || err?.message || 'Unknown error'
    console.error('[BlogGen] AI generation failed:', JSON.stringify(errDetail))
    throw new Error(`AI generation failed: ${typeof errDetail === 'string' ? errDetail : JSON.stringify(errDetail)}`)
  }
}
