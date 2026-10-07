import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://twinlanterns.co';

  // Define your static routes
  const routes = [
    '',
    '/apply',
    '/companies',
    '/partner/info',
    '/partner/apply',
    '/partner/refer',
    '/partner/gopro',
    '/partner/gopro/apply',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));
  return [...routes];
}