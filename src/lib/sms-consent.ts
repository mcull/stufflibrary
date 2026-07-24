/**
 * Single source of truth for the SMS consent language.
 *
 * These strings render in two places that must never disagree: the opt-in
 * checkbox in profile settings, and the public /sms page carriers review during
 * A2P 10DLC campaign vetting. Reviewers compare the two word for word, so this
 * module is deliberately dependency-free — it imports nothing and can be pulled
 * into a server component, a client form, or a test without dragging a db or
 * env graph along with it.
 */

/** The consent statement the member actively agrees to. Brand name required. */
export const SMS_CONSENT_HEADLINE =
  'Text me borrow requests and account updates from StuffLibrary.';

/** CTIA disclosures that must sit at the point of consent, not a link away. */
export const SMS_CONSENT_DISCLOSURE =
  'Message and data rates may apply. Message frequency varies. Reply HELP for help, STOP to cancel.';

/** Open to anyone — no invitation required to create an account. */
export const SMS_SIGNUP_URL = 'https://www.stufflibrary.org/auth/signin';

/** Where the phone field and consent checkbox live (requires sign-in). */
export const SMS_OPT_IN_URL = 'https://www.stufflibrary.org/profile';

export interface SmsMessageType {
  /** What triggers the message, in the member's terms. */
  label: string;
  /** Verbatim sample, as registered with the campaign. */
  example: string;
}

export const SMS_MESSAGE_TYPES: readonly SmsMessageType[] = [
  {
    label: 'A neighbor asks to borrow one of your items',
    example:
      'StuffLibrary: Sarah R. wants to borrow your extension ladder. Watch her request and respond: https://www.stufflibrary.org/b/x7Kq2 Reply STOP to opt out.',
  },
  {
    label: 'Your borrow request is approved or declined',
    example:
      'StuffLibrary: Marcus approved your request for the tile saw. Pickup details: https://www.stufflibrary.org/b/p3Wm8',
  },
  {
    label: 'An item you borrowed is due back',
    example:
      'StuffLibrary: Reminder — the stand mixer you borrowed from Priya is due back Fri, Jul 18. Arrange the return: https://www.stufflibrary.org/b/n9Tc4',
  },
  {
    label: 'A sign-in code you asked for',
    example:
      'StuffLibrary: Your sign-in code is 482913. It expires in 10 minutes. We will never call or text to ask for this code.',
  },
] as const;

/** Sent once, immediately after the member saves the opt-in. */
export const SMS_OPT_IN_CONFIRMATION =
  'StuffLibrary: You’re signed up for borrow updates and account texts. Msg&data rates may apply. Msg frequency varies. Reply HELP for help, STOP to opt out.';

export const SMS_OPT_OUT_KEYWORDS = [
  'STOP',
  'STOPALL',
  'UNSUBSCRIBE',
  'CANCEL',
  'END',
  'QUIT',
] as const;

export const SMS_HELP_KEYWORDS = ['HELP', 'INFO'] as const;
