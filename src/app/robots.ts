import type { MetadataRoute } from 'next';

// SEO baseline: the public pages are for everyone; the app itself — member
// surfaces, auth flows, APIs — is not search material (and the FAQ promises
// "no search engine sees your garage").
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/home',
          '/auth/',
          '/profile',
          '/stuff/',
          '/library/',
          '/lobby',
          '/borrow-request',
          '/borrow-requests/',
          '/borrow-approval/',
          '/lender/',
          '/notifications',
          '/admin/',
          '/add-item',
          '/dashboard',
          '/invite/',
          '/j/',
        ],
      },
    ],
    sitemap: 'https://www.stufflibrary.org/sitemap.xml',
  };
}
