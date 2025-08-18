# Trust System: Hybrid Card Model

This document defines how StuffLibrary manages user identity, reputation, and trust across branches.  
It balances **local sovereignty** (trust within a branch) and **global identity** (reputation across branches).

---

## Principles

- Each user has one **Master Card** (global identity).
- Each branch issues a **Branch Card** (local trust + activity).
- Global reputation is an **aggregate** of branch trust, with **time-based decay**.
- Trust is **hard to earn, easy to dent, possible to repair**.

---

## Local Trust (Branch Cards)

- Tracks:
  - Items borrowed/lent
  - On-time returns
  - Care ratings (e.g. "returned clean," "needed repair")
  - Participation (approving invites, adding items)
- Determines rights within the branch (e.g. borrowing limits).

---

## Global Trust (Master Card)

- Weighted average of branch trust.
- Positive actions accumulate slowly (logarithmic).
- Negative actions count more strongly but **decay over time** (exponential).
- Reputation travels across branches, but local trust always takes precedence.

---

## Decay Model

- **Lost item:** Large penalty. Half-life ~3 months, fades after ~12 months.
- **Late return:** Small penalty. Fades in weeks.
- **Good behavior:** Small positive increments.
- Decay ensures bad events don’t haunt forever but are meaningful in the short term.

---

## Visualization

- **Master Card:** shows global stamps (trust ink).
- **Branch Cards:** show local borrow/return stamps and care ratings.
- Negative events appear as smudges or crossed-out stamps.
- Smudges visually fade over time, reinforcing repairability of trust.

---

## Design Goal

Trust should feel:

- **Visible** (reinforces norms of care).
- **Recoverable** (encourages long-term participation).
- **Localized** (each branch sets its own culture, but good reputation still carries weight).
