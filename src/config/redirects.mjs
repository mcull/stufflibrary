// #399 URL consolidation: the naming ladder made the words library-native;
// these make the URLs match. Old paths 301 forever so testers' bookmarks and
// previously-sent invite links keep working.
//
// Plain .mjs (no TS, no imports) because next.config.mjs consumes it at build
// time; the vitest suite asserts the mapping.

/** @type {Array<{source: string, destination: string, permanent: boolean}>} */
export const legacyRedirects = [
  { source: '/stacks', destination: '/home', permanent: true },
  {
    source: '/collection/:path*',
    destination: '/library/:path*',
    permanent: true,
  },
  {
    source: '/branch/:path*',
    destination: '/library/:path*',
    permanent: true,
  },
  // #411: the pre-naming-ladder picker route was a full duplicate page.
  {
    source: '/stuff/m/add-to-collection/:path*',
    destination: '/stuff/m/add-to-library/:path*',
    permanent: true,
  },
  // The old Features & FAQ page retired when /faq (The Commons) became the
  // one FAQ: its questions merged into the keeper, its four marketing cards
  // said nothing the homepage doesn't say better.
  { source: '/features', destination: '/faq', permanent: true },
];
