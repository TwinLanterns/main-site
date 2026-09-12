// app/robots.ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/admin/', // Prevents crawling of the admin directory
    },
    sitemap: 'https://twinlanterns.co/sitemap.xml',
  }
}