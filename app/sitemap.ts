import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://twinlanterns.co';

  // Define your static routes
  const routes = [
    '',
    '/jobs',
    '/apply',
    '/companies',
    '/earn/info',
    '/earn/apply',
    '/earn/refer',
    '/earn/gopro',
    '/earn/gopro/apply',
    '/earn/speech',
    '/earn/speech/apply',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));
  return [...routes];
}