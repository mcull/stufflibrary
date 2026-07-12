# Twilio A2P 10DLC Campaign Application — Copy

_Drafted July 2026 for the SMS-primary switch. Paste-ready answers for the Twilio
campaign registration form, plus the website prerequisites carriers verify before
approving. See "Before you submit" at the bottom — two of those items are hard
blockers for approval._

---

## Brand registration

- **Legal entity:** Register as the real legal entity behind StuffLibrary. If there's
  an LLC/nonprofit with an EIN, use Standard brand registration (higher throughput,
  better trust score). If not, Twilio's **Sole Proprietor** brand type works for a
  beta (caps: ~1,000 msg segments/day, T-Mobile daily cap, one phone number) — enough
  for a one-to-two-neighborhood soft launch.
- **Brand display name:** StuffLibrary
- **Website:** https://stufflibrary.org
- **Vertical:** Technology (or "Communication" — either passes; avoid "Social").

## Campaign use case

**Low Volume Mixed** — covers account notifications + two-factor authentication in
one campaign, which fits both borrow-flow texts and SMS sign-in codes. (If sign-in
codes stay email-only, use **Account Notifications** instead — single-use-case
campaigns get slightly better filtering treatment.)

---

## Form answers

### Campaign description

> StuffLibrary (stufflibrary.org) is a neighborhood item-sharing platform. Members
> join a private neighborhood library where they lend and borrow household items
> (ladders, tools, camping gear) from verified neighbors. This campaign sends
> transactional account notifications to registered members who have added a mobile
> number, completed one-time-code verification of that number, and checked an
> opt-in box on our website: new borrow-request alerts, request approvals and
> declines, due-date reminders, return confirmations, and sign-in verification
> codes. Message frequency depends on the member's lending activity. This campaign
> sends no marketing or promotional content.

### Message flow / call to action (how consent is collected)

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

### Sample messages

Carriers want the brand name in every message and STOP language in recurring
notification types. Links must be on our own domain (see prerequisites).

1. **Opt-in confirmation (double opt-in ack):**

   > StuffLibrary: You're signed up for borrow updates and account texts.
   > Msg&data rates may apply. Msg frequency varies. Reply HELP for help,
   > STOP to opt out.

2. **Borrow request (to owner):**

   > StuffLibrary: Sarah R. wants to borrow your extension ladder. Watch her
   > request and respond: https://stufflibrary.org/b/x7Kq2 Reply STOP to opt out.

3. **Request decision (to borrower):**

   > StuffLibrary: Marcus approved your request for the tile saw. Pickup details:
   > https://stufflibrary.org/b/p3Wm8

4. **Due-date reminder (to borrower):**

   > StuffLibrary: Reminder — the stand mixer you borrowed from Priya is due back
   > Fri, Jul 18. Arrange the return: https://stufflibrary.org/b/n9Tc4

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
  > https://stufflibrary.org/faq or support@stufflibrary.org. Msg&data rates may
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

1. **Privacy policy SMS clause (hard blocker).** `/privacy` must state, near the
   data-sharing section, words to the effect of: _"No mobile information will be
   shared with third parties or affiliates for marketing or promotional purposes.
   All other categories exclude text messaging originator opt-in data and consent;
   this information will not be shared with any third parties."_ Campaign reviews
   fail on this exact check constantly.
2. **Terms of service SMS section.** Message types, frequency ("varies"),
   "message and data rates may apply," HELP/STOP instructions, supported carriers
   not liable for delays.
3. **The opt-in UI must exist as described** — unchecked-by-default checkbox with
   the quoted consent language, at the point where the phone number is collected.
   Reviewers sometimes request a screenshot.
4. **Short links on our own domain.** We already have the `/j/[token]` pattern for
   invites; borrow-flow texts need an equivalent (e.g. `/b/[token]`, which can
   redirect into the existing `borrow-approval/[token]` flow).

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
