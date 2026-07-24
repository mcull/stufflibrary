// Pure module (no side-effectful imports — house rule): the library
// invitation email. Reshaped from product-newsletter to personal note so it
// reaches the Primary tab (dossier Section D): a note-first body, the
// sender's own words, real item art + count, one modest CTA to the guest
// preview, privacy answered in the footer. Inline styles + a single-column
// layout for email clients; images referenced by absolute blob URLs.

// Mirror of brandTokens (can't import the theme here without dragging in MUI).
const INK_BLUE = '#1E3A5F';
const WARM_CREAM = '#F9F5EB';
const CHARCOAL = '#333333';
const WORDMARK_TOMATO = '#FF6347'; // = brandTokens.tomatoRed (pure module, no import)

export interface InviteEmailArt {
  url: string;
  name: string;
}

/** Style-matched fallbacks generated with the app's own watercolor pipeline. */
export const STOCK_WATERCOLORS: InviteEmailArt[] = [
  {
    url: 'https://znr9cqeimzcbaqpo.public.blob.vercel-storage.com/email/watercolors/ladder_600.webp',
    name: 'A shared ladder',
  },
  {
    url: 'https://znr9cqeimzcbaqpo.public.blob.vercel-storage.com/email/watercolors/leaf-blower_600.webp',
    name: 'A shared leaf blower',
  },
  {
    url: 'https://znr9cqeimzcbaqpo.public.blob.vercel-storage.com/email/watercolors/tent_600.webp',
    name: 'A shared tent',
  },
];

export interface LibraryInviteEmailInput {
  libraryName: string;
  /** The sender's full name; the builder derives the first name for subject/footer. */
  senderName?: string | null | undefined;
  shareLink: string;
  /** The sender's own words (already trimmed/capped by the caller). Blank → a default sentence. */
  note?: string | null | undefined;
  /** Total active items on the shelves; omits the count line when undefined/0. */
  itemCount?: number | null | undefined;
  /** Neighborhood/location descriptor for the subject line. */
  location?: string | null | undefined;
  /** Up to 3 of the library's own item watercolors; stock art fills the gap. */
  itemWatercolors?: InviteEmailArt[];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName.trim();
}

export function buildLibraryInviteEmail(input: LibraryInviteEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const rawLibraryName = input.libraryName;
  const rawSenderFull = input.senderName?.trim() || null;
  const rawSenderFirst = rawSenderFull ? firstName(rawSenderFull) : null;
  const rawLocation = input.location?.trim() || null;
  const rawNote = input.note?.trim() || null;
  const defaultNote = `I set aside a library card for you at ${rawLibraryName} — borrow anything, free.`;
  const noteText = rawNote || defaultNote;

  const count =
    typeof input.itemCount === 'number' &&
    Number.isFinite(input.itemCount) &&
    input.itemCount > 0
      ? Math.floor(input.itemCount)
      : null;
  const countPhrase = count
    ? `${count} ${count === 1 ? 'thing' : 'things'} on the shelves`
    : null;

  // Subject — no exclamation point (deliverability).
  const subject = rawSenderFirst
    ? rawLocation
      ? `${rawSenderFirst} invited you to ${rawLibraryName} — the stuff library for ${rawLocation}`
      : `${rawSenderFirst} invited you to ${rawLibraryName}`
    : `Someone invited you to ${rawLibraryName}`;

  // Escaped for HTML.
  const libraryName = escapeHtml(rawLibraryName);
  const senderFull = escapeHtml(rawSenderFull || 'A neighbor');
  const senderFirst = escapeHtml(rawSenderFirst || 'them');
  const noteHtml = escapeHtml(noteText);

  const art = (
    input.itemWatercolors?.length ? input.itemWatercolors : STOCK_WATERCOLORS
  ).slice(0, 3);

  // shareLink and art urls are server-generated (join link + app blob URLs),
  // never user input, so they are intentionally interpolated unescaped into
  // href/src. Every user-controlled field above IS escaped.
  const artCells = art
    .map(
      (a) => `
              <td align="center" style="padding: 6px;">
                <img src="${a.url}" alt="${escapeHtml(a.name)}" width="150" height="150"
                     style="display: block; width: 150px; height: 150px; border-radius: 12px; border: 1px solid #eee4d0;" />
              </td>`
    )
    .join('');

  const countLineHtml = countPhrase
    ? `
      <p style="font-size: 13px; color: ${CHARCOAL}; opacity: 0.7; text-align: center; margin: 0 0 24px 0; font-family: Arial, Helvetica, sans-serif;">
        …and ${escapeHtml(countPhrase)}.
      </p>`
    : '';

  const html = `
  <div style="background-color: ${WARM_CREAM}; padding: 32px 16px; font-family: Georgia, 'Times New Roman', serif;">
    <div style="max-width: 560px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #eee4d0; border-radius: 16px; padding: 32px; box-sizing: border-box;">

      <p style="font-size: 16px; line-height: 1.7; color: ${CHARCOAL}; margin: 0 0 16px 0;">Hi —</p>

      <p style="font-size: 16px; line-height: 1.7; color: ${CHARCOAL}; margin: 0 0 20px 0;">
        <strong>${senderFull}</strong> set aside a library card for you at <strong>${libraryName}</strong> — a lending library of stuff your neighbors stock together. Borrow anything, free.
      </p>

      <div style="border-left: 3px solid ${WORDMARK_TOMATO}; background-color: ${WARM_CREAM}; padding: 12px 18px; margin: 0 0 24px 0;">
        <p style="margin: 0; color: ${CHARCOAL}; font-size: 15px; line-height: 1.6; font-style: italic;">${noteHtml}</p>
      </div>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto 8px auto;">
        <tr>${artCells}
        </tr>
      </table>${countLineHtml}

      <div style="text-align: center; margin: 28px 0 12px 0;">
        <a href="${input.shareLink}"
           style="background-color: ${INK_BLUE}; color: #FFFFFF; padding: 15px 34px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; display: inline-block; font-family: Arial, Helvetica, sans-serif;">
          Have a look at the shelves
        </a>
      </div>
      <p style="font-size: 13px; color: ${CHARCOAL}; opacity: 0.7; text-align: center; margin: 0 0 24px 0; font-family: Arial, Helvetica, sans-serif;">
        No account needed to look. Or paste this in your browser:<br>${input.shareLink}
      </p>

      <hr style="border: none; border-top: 1px solid #eee4d0; margin: 24px 0 16px 0;" />
      <p style="font-size: 12.5px; color: ${CHARCOAL}; opacity: 0.7; line-height: 1.7; margin: 0; font-family: Arial, Helvetica, sans-serif;">
        This card is reserved for this email address and expires in 7 days. Only members can see who's in a library — your name, face and address are never public. Didn't expect this? Ignore it; nothing happens. You can reply to this email — it goes to ${senderFirst}.
      </p>
    </div>

    <p style="text-align: center; margin: 20px 0 0 0;">
      <span style="display: inline-block; background-color: ${WORDMARK_TOMATO}; color: #FFFFFF; font-family: 'Courier New', Courier, monospace; font-weight: bold; letter-spacing: 3px; padding: 4px 10px; font-size: 12px;">STUFFLIBRARY</span>
    </p>
  </div>`;

  const textLines = [
    'Hi —',
    '',
    `${rawSenderFull || 'A neighbor'} set aside a library card for you at ${rawLibraryName} — a lending library of stuff your neighbors stock together. Borrow anything, free.`,
    '',
    noteText,
    '',
    countPhrase
      ? `On the shelves: ${count} ${count === 1 ? 'thing' : 'things'}.`
      : null,
    countPhrase ? '' : null,
    'Have a look at the shelves (no account needed to look):',
    input.shareLink,
    '',
    `This card is reserved for this email address and expires in 7 days. Only members can see who's in a library — your name, face and address are never public. Didn't expect this? Ignore it. You can reply to this email — it goes to ${rawSenderFirst || 'them'}.`,
  ].filter((line) => line !== null);

  const text = textLines.join('\n');

  return { subject, html, text };
}
