import type { MetadataRoute } from 'next';

const BASE = 'https://www.stufflibrary.org';

// The public pages, by search significance. The directory is the most
// search-relevant page of the set (BUILD_SPEC); content changes rarely, so
// lastModified rides deploy time.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (
    path: string,
    priority: number,
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] = 'monthly'
  ) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  });

  return [
    page('/', 1, 'weekly'),
    page('/lending-libraries', 0.9),
    page('/faq', 0.8),
    page('/further-reading', 0.7),
    page('/sharing-world', 0.7),
    page('/why-this-works', 0.7),
    page('/about', 0.6),
    page('/privacy', 0.3, 'yearly'),
    page('/terms', 0.3, 'yearly'),
    page('/cookies', 0.3, 'yearly'),
    page('/sms', 0.3, 'yearly'),
  ];
}
