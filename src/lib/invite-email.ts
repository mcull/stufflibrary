// Pure module (no side-effectful imports — house rule): the library
// invitation email, in brand (#412). Warm cream paper, ink-blue CTA, and a
// shelf of watercolors — the library's own items when it has art, the stock
// trio when it doesn't. Inline styles + a single-column layout for email
// clients; images referenced by absolute blob URLs.

// Mirror of brandTokens (can't import the theme here without dragging in MUI).
const INK_BLUE = '#1E3A5F';
const WARM_CREAM = '#F9F5EB';
const CHARCOAL = '#333333';
const WORDMARK_TOMATO = '#FF6347'; // matches the site wordmark (CSS `tomato`)

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
  senderName?: string | null | undefined;
  shareLink: string;
  description?: string | null | undefined;
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

export function buildLibraryInviteEmail(input: LibraryInviteEmailInput): {
  subject: string;
  html: string;
} {
  const libraryName = escapeHtml(input.libraryName);
  const senderName = escapeHtml(input.senderName || 'Someone');
  const description = input.description ? escapeHtml(input.description) : null;

  const art = (
    input.itemWatercolors?.length ? input.itemWatercolors : STOCK_WATERCOLORS
  ).slice(0, 3);

  const artCells = art
    .map(
      (a) => `
              <td align="center" style="padding: 6px;">
                <img src="${a.url}" alt="${escapeHtml(a.name)}" width="150" height="150"
                     style="display: block; width: 150px; height: 150px; border-radius: 12px; border: 1px solid #eee4d0;" />
              </td>`
    )
    .join('');

  const subject = `You're invited to join ${input.libraryName} on StuffLibrary!`;

  const html = `
  <div style="background-color: ${WARM_CREAM}; padding: 32px 16px; font-family: Georgia, 'Times New Roman', serif;">
    <div style="max-width: 560px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #eee4d0; border-radius: 16px; padding: 32px; box-sizing: border-box;">

      <div style="text-align: center; margin-bottom: 28px;">
        <span style="display: inline-block; background-color: ${WORDMARK_TOMATO}; color: #FFFFFF; font-family: 'Courier New', Courier, monospace; font-weight: bold; letter-spacing: 3px; padding: 6px 12px; font-size: 14px;">STUFFLIBRARY</span>
        <p style="color: ${CHARCOAL}; opacity: 0.7; font-size: 14px; margin: 10px 0 0 0; font-family: Arial, Helvetica, sans-serif;">Share more, buy less</p>
      </div>

      <h1 style="color: ${CHARCOAL}; font-size: 26px; font-weight: 700; text-align: center; margin: 0 0 8px 0;">
        ${libraryName}
      </h1>

      <p style="font-size: 16px; line-height: 1.6; color: ${CHARCOAL}; text-align: center; margin: 0 0 24px 0; font-family: Arial, Helvetica, sans-serif;">
        ${senderName} has invited you to join their library on StuffLibrary &mdash;
        a shelf your neighbors stock together, so everyone owns less and has more.
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto 8px auto;">
        <tr>${artCells}
        </tr>
      </table>
      <p style="font-size: 12px; color: ${CHARCOAL}; opacity: 0.6; text-align: center; margin: 0 0 24px 0; font-family: Arial, Helvetica, sans-serif;">
        ${input.itemWatercolors?.length ? `Already on the shelves of ${libraryName}.` : 'The kinds of things neighbors share on StuffLibrary.'}
      </p>
${
  description
    ? `
      <div style="background-color: ${WARM_CREAM}; padding: 16px 20px; border-radius: 12px; margin-bottom: 24px;">
        <p style="margin: 0; color: ${CHARCOAL}; font-size: 14px; line-height: 1.5; font-family: Arial, Helvetica, sans-serif;">${description}</p>
      </div>
`
    : ''
}
      <div style="text-align: center; margin: 28px 0;">
        <a href="${input.shareLink}"
           style="background-color: ${INK_BLUE}; color: #FFFFFF; padding: 15px 34px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; display: inline-block; font-family: Arial, Helvetica, sans-serif;">
          Join ${libraryName}
        </a>
      </div>

      <p style="font-size: 13px; color: ${CHARCOAL}; opacity: 0.7; text-align: center; margin: 0; font-family: Arial, Helvetica, sans-serif;">
        This invitation will expire in 7 days. If you don't have a StuffLibrary
        account, one will be created for you automatically.
      </p>
    </div>

    <p style="font-size: 12px; color: ${CHARCOAL}; opacity: 0.55; text-align: center; margin: 20px 0 0 0; font-family: Arial, Helvetica, sans-serif;">
      StuffLibrary &mdash; building sharing communities, one neighborhood at a time.<br>
      If you didn't expect this invitation, you can safely ignore this email.
    </p>
  </div>`;

  return { subject, html };
}
