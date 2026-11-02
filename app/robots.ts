// app/robots.ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Internal tools; /ops pages are also noindex.
      disallow: ['/admin/', '/ops/'],
    },
    sitemap: 'https://twinlanterns.co/sitemap.xml',
  }
}