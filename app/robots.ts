import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/api/',
          '/studio/',
          '/auth/',
        ],
      },
    ],
    sitemap: 'https://crickettips.ai/sitemap.xml',
    host: 'https://crickettips.ai',
  }
}
