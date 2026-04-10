import type { MetadataRoute } from 'next'

const BASE_URL = 'https://bubbles.fyi'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/privacy', '/terms', '/group/'],
        disallow: ['/auth', '/auth/', '/dashboard', '/dashboard/', '/profile/', '/groups/', '/api/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
