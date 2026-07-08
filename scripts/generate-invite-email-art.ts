/**
 * One-off: generate the three stock watercolors (ladder, leaf blower, tent)
 * used by the invitation email when a library has no item art yet (#412).
 * Style language mirrors src/lib/watercolor-service.ts so they sit next to
 * real item renders seamlessly. Run: npx tsx scripts/generate-invite-email-art.ts
 */
import 'dotenv/config';

import { GoogleGenAI } from '@google/genai';
import { put } from '@vercel/blob';
import sharp from 'sharp';

const SUBJECTS: Array<{ slug: string; subject: string }> = [
  { slug: 'ladder', subject: 'an aluminum extension ladder' },
  { slug: 'leaf-blower', subject: 'a handheld leaf blower' },
  { slug: 'tent', subject: 'a small camping tent' },
];

const STYLE = `You are a production illustrator for StuffLibrary, a community tool-sharing app.
Create a watercolor illustration of {SUBJECT} with an "analog librarian" feel.
Style: subtle ink linework and soft watercolor washes; paper color warm cream (soft off-white); slightly desaturated palette; no drop shadows; no background clutter; no visible people.
Composition: center the object on canvas with ~10% margin; real-world proportions; no cartoonification.
CRITICAL: Do not add any text, numbers, codes, labels, or written characters. The image must contain only the illustration.`;

async function main() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY missing');
  const genAI = new GoogleGenAI({ apiKey });

  for (const { slug, subject } of SUBJECTS) {
    console.log(`🎨 Generating ${slug}...`);
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ text: STYLE.replace('{SUBJECT}', subject) }],
    });

    const part = response.candidates?.[0]?.content?.parts?.find(
      (p) => p.inlineData?.data
    );
    if (!part?.inlineData?.data) throw new Error(`No image for ${slug}`);

    const square = await sharp(Buffer.from(part.inlineData.data, 'base64'))
      .resize(600, 600, {
        fit: 'cover',
        position: 'center',
        background: { r: 249, g: 245, b: 235 }, // #F9F5EB
      })
      .webp({ quality: 85 })
      .toBuffer();

    const { url } = await put(`email/watercolors/${slug}_600.webp`, square, {
      access: 'public',
      contentType: 'image/webp',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    console.log(`✅ ${slug}: ${url}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
