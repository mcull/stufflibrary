import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Loads a civic page's publishable markdown (src/content/*.md) at build
 * time. These files are extracted from docs/content/* with editorial notes
 * stripped — see docs/content/BUILD_SPEC.md. Server-side only.
 */
export function readCivicContent(
  name:
    | 'further-reading'
    | 'sharing-world'
    | 'why-this-works'
    | 'lending-libraries-intro'
): string {
  return readFileSync(
    join(process.cwd(), 'src', 'content', `${name}.md`),
    'utf8'
  );
}
