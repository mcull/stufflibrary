# Onboarding & Library Card

## Why Onboarding Matters

StuffLibrary is built on trust. People are lending real, valuable things — ladders, tools, cameras — to neighbors they may not know well. That means the first impression of the app must feel _safe, human, and modern_.

Onboarding is not just "sign up." It’s how we establish credibility, create a sense of membership, and signal that we’re all accountable to one another.

---

## Guiding Principles

1. **Friction with purpose**  
   We avoid unnecessary clicks or complexity, but we _add deliberate friction_ when it builds trust (e.g. requiring a profile photo or video).

2. **The library metaphor**  
   Every user is issued a “library card” after onboarding. This card is symbolic (nostalgia, belonging) and functional (identity, trust marker).

3. **Modern identity, no passwords**  
   Passwords are a liability. We use passwordless auth with phone-first identity, plus optional email and biometric unlock.

4. **Human connection first**  
   The “selfie video” requirement transforms borrowing into a social handshake. It makes requests personal and harder to fake, while reinforcing neighborliness.

5. **Privacy is paramount**  
   All identity data, photos, and videos are shared only within a branch. Nothing is public or indexed. Media retention rules are transparent.

6. **Reputation accrues across branches**  
   Trust and reputation are earned by borrowing responsibly. This score decays over time so one mistake doesn’t haunt a member forever.

---

## Onboarding Flow (MVP)

1. **Auth**
   - User signs up with phone number.
   - Receives SMS OTP.
   - Optionally adds email fallback.
   - Biometric unlock on supported devices.

2. **Profile**
   - User enters name.
   - Uploads profile photo _and_ selfie video (short, <15s).
   - Video stored securely, visible only to branch members.

3. **Address Verification**
   - Enter address.
   - Verify via one of:
     - GPS/geofence match.
     - Driver’s license upload (OCR).
     - Mailed postcard with code (API via Lob.com).

4. **Library Card Issuance**
   - Once profile + address verified, card is issued.
   - Card includes: Name, member since, verification status, trust score (stub).
   - Card persists across sessions.

5. **Borrow Request Flow (Trust Handshake)**
   - Every borrow request prompts a short selfie video.
   - Video attaches to transaction, only visible to branch members.
   - Serves as both accountability + neighborly hello.

---

## Open Questions / Future Work

- Should trust/reputation be **branch-specific** or **global** by default?
- Should we explore **postcard QR invites** as a primary neighbor-acquisition channel?
- How much friction is too much — will selfie videos scale, or should we allow fallback (profile photo only) for low-value items?

---

## Deliverable for Milestone

By the end of the **Onboarding & Library Card** milestone:

- A new user can sign up, verify their identity, and receive a digital card.
- They can log out, log back in, and see their card.
- Borrow requests trigger the selfie video flow.

---

> Onboarding is where StuffLibrary declares its values. It’s not just about access; it’s about building a community that feels secure, accountable, and a little nostalgic.
