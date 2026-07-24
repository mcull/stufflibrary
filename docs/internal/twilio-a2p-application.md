# Twilio A2P 10DLC Campaign Application — Copy

_Drafted July 2026 for the SMS-primary switch. Paste-ready answers for the Twilio
campaign registration form, plus the website prerequisites carriers verify before
approving. Each form field below keeps its revision history — paste whichever
revision is marked CURRENT. See "Before you submit" at the bottom for the
website-side checks; item 5 is still open._

---

## Brand registration

- **Legal entity:** Register as the real legal entity behind StuffLibrary. If there's
  an LLC/nonprofit with an EIN, use Standard brand registration (higher throughput,
  better trust score). If not, Twilio's **Sole Proprietor** brand type works for a
  beta (caps: ~1,000 msg segments/day, T-Mobile daily cap, one phone number) — enough
  for a one-to-two-neighborhood soft launch.
- **Brand display name:** StuffLibrary
- **Website:** https://www.stufflibrary.org (the apex domain 307-redirects here; give reviewers the www form)
- **Vertical:** Technology (or "Communication" — either passes; avoid "Social").

## Campaign use case

**Low Volume Mixed** — covers account notifications + two-factor authentication in
one campaign, which fits both borrow-flow texts and SMS sign-in codes. (If sign-in
codes stay email-only, use **Account Notifications** instead — single-use-case
campaigns get slightly better filtering treatment.)

---

## Form answers

### Campaign description

_**Rev 4 (CURRENT — paste this).** Rev 3 cleared the 30886 description problem
but the campaign was then rejected with **Error 30909** — reviewers could not
verify the call to action, because our opt-in lives behind a member login and
we gave them nothing to look at ("No proof provided, hence unable to verify").
Rev 4 changes two things: it points at the public proof page
`www.stufflibrary.org/sms`, and it **drops the one-time-code phone
verification claim** — `phoneVerified` is never set true in the product, and
claiming a step we don't perform is exactly what a reviewer would catch. This
exact string is 1003 characters (limit is 1024):_

> This campaign is sent by StuffLibrary (www.stufflibrary.org), the
> consumer-facing brand of Cull Ventures LLC - a free neighborhood
> item-lending platform. Recipients are StuffLibrary's registered account
> holders: U.S. consumers with an account who added their mobile number in
> profile settings and checked an unchecked-by-default consent box agreeing to
> receive account texts. The opt-in flow and consent wording are published for
> review, no login required, at www.stufflibrary.org/sms. Messages are sent
> when the member's account activity requires attention: (1) account
> notifications - a neighbor requested to borrow the member's item, the
> member's request was approved or declined, or a borrowed item is due back;
> (2) two-factor authentication - one-time sign-in codes the member requests at
> login. Frequency varies with activity, typically 0-10 msgs per month. No
> marketing or third-party content is sent. STOP and HELP are honored on every
> message; phone numbers are never shared with third parties.

_Rev 3 (as submitted, kept for the record — claimed OTP verification we don't
do; 1021 characters):_

> This campaign is sent by StuffLibrary (stufflibrary.org), the consumer-facing
> brand of Cull Ventures LLC - a free neighborhood item-lending platform.
> Recipients are StuffLibrary's registered account holders: U.S. consumers with
> an account who added their mobile number in profile settings, verified it
> with a one-time code, and checked an unchecked-by-default consent box
> agreeing to receive account texts (SMS terms at stufflibrary.org/privacy and
> stufflibrary.org/terms). Messages are sent when the member's account activity
> requires attention: (1) account notifications - a neighbor requested to
> borrow the member's item, the member's request was approved or declined, a
> borrowed item is due back, or a lent item was returned; (2) two-factor
> authentication - one-time sign-in codes the member requests at login.
> Frequency varies with activity, typically 0-10 messages per month. No
> marketing or third-party content is sent. STOP and HELP are honored on every
> message; phone numbers are never shared with third parties.

_The longer rev-2 narrative below is kept for reference (over the 1024 limit;
do not paste):_

> This campaign is operated and sent by StuffLibrary (stufflibrary.org), a free
> neighborhood item-lending platform. Message recipients are StuffLibrary's own
> registered account holders: adult U.S. consumers who created an account on
> stufflibrary.org, added their mobile number in profile settings, verified it
> with a one-time code, and checked an unchecked-by-default consent checkbox
> agreeing to receive account text messages (consent language and SMS terms at
> stufflibrary.org/privacy and stufflibrary.org/terms). Messages are sent when
> the member's own account activity requires attention, in two categories
> matching this use case: (1) account notifications — a neighbor has requested
> to borrow the member's item, the member's borrow request was approved or
> declined, a borrowed item is due back soon, or a lent item was returned; and
> (2) two-factor authentication — a one-time sign-in code the member requests at
> login. Message frequency varies with each member's activity, typically 0–10
> messages per month. No marketing, promotional, or third-party content is ever
> sent. STOP opt-out and HELP are honored on every message, and phone numbers
> are never shared with third parties.

### Message flow / call to action (how consent is collected)

_**Rev 2 (CURRENT — paste this).** This is the field that drew Error 30909. The
rev-1 text below described the flow accurately enough but handed reviewers no
way to see it: the checkbox is behind a member login, so they stopped at the
sign-in wall. Rev 2 leads with the public proof page, numbers the steps, names
the exact URLs, and drops the two claims the product does not support (OTP
verification; phone collection "during signup" — only profile settings collects
a number)._

> Consent is collected on our own website, in the member's profile settings.
> The entire flow is published for review at https://www.stufflibrary.org/sms —
> a public page that requires no account, no invitation, and no payment. It
> shows the opt-in checkbox exactly as members see it, with the verbatim
> consent wording, message samples, frequency, and STOP/HELP instructions.
>
> Step 1: A person creates a StuffLibrary account at
> https://www.stufflibrary.org/auth/signin. Signup is open to the public and is
> verified by a code emailed to the address they enter.
>
> Step 2: Signed in, they open their own profile settings at
> https://www.stufflibrary.org/profile and find the "Text Notifications"
> section.
>
> Step 3: They enter their mobile number and must actively check a consent box
> that is unchecked by default. It reads: "Text me borrow requests and account
> updates from StuffLibrary. Message and data rates may apply. Message
> frequency varies. Reply HELP for help, STOP to cancel." Entering a number
> without checking that box results in no messages being sent.
>
> Step 4: They press Save. We record the date and time of consent and send one
> confirmation message. Notifications begin only after that.
>
> Because steps 2–4 sit behind the member's own login,
> https://www.stufflibrary.org/sms reproduces that exact checkbox, unchecked,
> on a public page so reviewers can verify it without an account.
>
> Consent is optional and not a condition of using the service; every
> notification is also available by email. Phone numbers are collected only
> through this flow — never purchased, imported, or provided by third parties —
> and are never shared with third parties or affiliates for marketing purposes.
> SMS terms: https://www.stufflibrary.org/terms (section 10) and
> https://www.stufflibrary.org/privacy.

_Rev 1 (as submitted — rejected with 30909, "No proof provided"):_

> End users create an account at https://stufflibrary.org and add a mobile number
> in profile settings or during signup. At the point of collection, the user must
> check an unchecked-by-default consent box that reads: "Text me borrow requests
> and account updates from StuffLibrary. Message and data rates may apply. Message
> frequency varies. Reply HELP for help, STOP to cancel." The number is then
> verified with a one-time code before any notifications are sent. Consent to
> receive notification texts is optional and not a condition of using the service.
> Phone numbers are collected only through this flow — never purchased, imported,
> or provided by third parties — and are not shared with third parties or
> affiliates for marketing purposes. Opt-in language and SMS terms:
> https://stufflibrary.org/privacy and https://stufflibrary.org/terms.

### Opt-in proof URL

Wherever the console offers a field for opt-in proof, a CTA screenshot, or
supporting documentation, give it:

> https://www.stufflibrary.org/sms

If the console will only take an uploaded image, screenshot that page (or the
"Text Notifications" section of a signed-in profile) and upload it — but still
paste the URL into the message-flow field, since reviewers follow links.

### Sample messages

Carriers want the brand name in every message and STOP language in recurring
notification types. Links must be on our own domain (see prerequisites).

1. **Opt-in confirmation (double opt-in ack):**

   > StuffLibrary: You're signed up for borrow updates and account texts.
   > Msg&data rates may apply. Msg frequency varies. Reply HELP for help,
   > STOP to opt out.

2. **Borrow request (to owner):**

   > StuffLibrary: Sarah R. wants to borrow your extension ladder. Watch her
   > request and respond: https://www.stufflibrary.org/b/x7Kq2 Reply STOP to opt out.

3. **Request decision (to borrower):**

   > StuffLibrary: Marcus approved your request for the tile saw. Pickup details:
   > https://www.stufflibrary.org/b/p3Wm8

4. **Due-date reminder (to borrower):**

   > StuffLibrary: Reminder — the stand mixer you borrowed from Priya is due back
   > Fri, Jul 18. Arrange the return: https://www.stufflibrary.org/b/n9Tc4

5. **Sign-in code (2FA — only if using Low Volume Mixed):**
   > StuffLibrary: Your sign-in code is 482913. It expires in 10 minutes. We will
   > never call or text to ask for this code.

### Opt-in keywords and confirmation

- **Opt-in method:** Web form (checkbox + OTP verification), described above.
- **Opt-in keywords:** START, UNSTOP, YES
- **Opt-in confirmation message:** sample message 1 above.

### Opt-out

- **Keywords:** STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT
- **Opt-out message:**
  > StuffLibrary: You're opted out and will receive no more texts. You'll still
  > get borrow updates by email. Reply START to opt back in.

### Help

- **Keywords:** HELP, INFO
- **Help message:**
  > StuffLibrary: Neighborhood item-sharing notifications. Help:
  > https://www.stufflibrary.org/faq or support@stufflibrary.org. Msg&data rates may
  > apply. Reply STOP to opt out.

### Campaign attribute questions

| Question                            | Answer  | Note                                                                                                                                     |
| ----------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Embedded links?                     | **Yes** | Own-domain links only. Public URL shorteners (bit.ly etc.) cause rejection/filtering.                                                    |
| Embedded phone numbers?             | **No**  | Keep phone numbers out of message bodies.                                                                                                |
| Age-gated content?                  | **No**  |                                                                                                                                          |
| Direct lending or loan arrangement? | **No**  | This question means _financial_ loans/credit. Item lending is not that. Answer No — answering Yes routes you into a restricted use case. |
| Affiliate marketing?                | **No**  |                                                                                                                                          |
| Number pooling?                     | **No**  | One number is plenty for the beta.                                                                                                       |

---

## Before you submit — website prerequisites carriers actually check

1. ✅ **Privacy policy SMS clause (hard blocker).** `/privacy` states, near the
   data-sharing section: _"No mobile information will be shared with third parties or
   affiliates for marketing or promotional purposes. All other categories exclude
   text messaging originator opt-in data and consent; this information will not be
   shared with any third parties."_ Campaign reviews fail on this exact check
   constantly. Shipped in PR #476.
2. ✅ **Terms of service SMS section.** `/terms` section 10: message types,
   frequency ("varies"), "message and data rates may apply," HELP/STOP
   instructions, carriers not liable for delays. Shipped in PR #476.
3. ✅ **The opt-in UI exists as described** — unchecked-by-default checkbox with
   the quoted consent language, at the point where the phone number is collected
   (`ProfileView`, PR #478).
4. ✅ **Reviewers can see it without an account (the 30909 fix).**
   `/sms` is a public page reproducing that checkbox from the same source
   constants (`src/lib/sms-consent.ts`), so the page can never drift from the
   consent members actually give. Linked in the footer and the sitemap so it
   stays findable on re-review. Issue #505.
5. ⛔️ **Short links on our own domain — still to build. A send-time blocker,
   not an approval blocker.** We already have the `/j/[token]` pattern for
   invites; borrow-flow texts need an equivalent (e.g. `/b/[token]`, which can
   redirect into the existing `borrow-approval/[token]` flow). This does _not_
   gate campaign approval: the sample-message tokens (`x7Kq2`, etc.) are
   illustrative, they render as plain text on `/sms` (not clickable), and
   Twilio's link check is about domain reputation (no public shorteners) — which
   an own-domain `/b/…` link satisfies whether or not it resolves yet. The real
   deadline is operational: `/b/[token]` must resolve before we send the first
   real borrow-flow text, so members don't receive a dead link.

## Not claimed, on purpose

Two things the earlier submissions asserted that the product does not do. Both
were removed rather than hand-waved; if either gets built later, put it back.

- **One-time-code phone verification.** `phoneVerified` exists in the schema but
  is only ever set to `false` (`src/app/api/profile/route.ts`); nothing sets it
  true. It is also circular pre-approval — sending an SMS code needs a sender.
  (Twilio Verify has its own compliant sender pool and would sidestep that, if
  we decide the verification is worth building.)
- **Phone collection during signup.** Signup and `/profile/create` never ask for
  a number; only profile settings does.

## Compliance flag: invites

Platform-sent SMS invites to non-members are the one piece of the SMS-primary plan
that does **not** fit this campaign: the recipient hasn't consented, and
"friend-referral" texts to third-party-provided numbers are explicitly disallowed
under CTIA guidelines — including them risks rejection of the whole campaign.

Compliant alternative that's arguably better anyway: the invite CTA opens the
inviter's own Messages app pre-filled with the invite text + `/j/[token]` link
(`sms:` deep link / share sheet). The text then comes from a neighbor's real
number, not a five-digit code — which is the right feel for this product. Email
invites stay platform-sent as today.

Suggested pre-filled invite text (sent from the inviter's phone, so no compliance
constraints — this is product copy, not carrier copy):

> I put some of my stuff in our neighborhood library — come borrow it. Here's
> your invite: https://stufflibrary.org/j/x7Kq2
