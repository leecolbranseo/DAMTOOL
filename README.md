# Data & Analytics Maturity Assessment — Concept (Node)

A working, click-through concept of the new lead-gen quiz, built to the same
shape as WPRA (7 weighted questions → tease screen → email gate → full
results + two Brevo emails). Built in Node from day one — no PHP step, per
the dev spec — so this code can go straight to a dev with no conversion risk.

## What's real vs placeholder here

**Real / working:**
- 7-question quiz flow, tease screen, email-gated results screen
- Deterministic scoring engine (`lib/calculateResult.js`) with the WPRA fixes
  built in: priority-based tie-break, constraint eligibility floor (a pillar
  only qualifies as "biggest limitation" on a C/D answer), and a "no
  constraint found" fallback that's a genuine part of the design, not a gap
  - Band structure: 5 bands (IX Maturity Curve — Functional → Connected →
  Integrated → Adaptive → Intelligent), thresholds derived from a 7-pillar,
  equal-weight, 4-point scale (range 7–28)
- Submit endpoint validates required contact fields but does **not** block
  submission when `primary_constraint_name` is legitimately empty
- `user_name` is resolved once, server-side, from `user_firstname` +
  `user_surname` — avoiding WPRA's suspected template field mismatch
- Brevo sending is mocked (logs the exact payloads that would be sent) when
  `BREVO_API_KEY` isn't set, so you can test the whole flow with zero
  external accounts

**Placeholder — needs your decisions before this goes to a dev:**
- Pillar wording and answer copy (`config/assessment.config.js`) — currently
  the draft table from the spec
- Tie-break priority ranking — currently defaults to pillar order 1–7
- Per-pillar weighting — currently equal (1 each), matching the spec's
  default recommendation
- Band names use the spec's wording (Functional/Connected/Integrated/
  Adaptive/Intelligent) — note this differs from the "Fragmented/
  Foundational/Operational/Optimising/Strategic" labels on the "Data
  maturity journey" slide, worth reconciling before this is finalised
- Real Brevo template IDs / API key — the send call in `routes/submit.js`
  is stubbed out, ready to wire up

Everything above lives in `config/assessment.config.js` and `lib/copy.js` —
change the config, not the logic, to test different scoring or copy.

## Running locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000. Submit the form — check your terminal to
see the "emails" that would have been sent via Brevo.

## Testing in GitHub Codespaces

1. Create a new empty repository in your GitHub account.
2. Push this folder's contents to it (or upload via the GitHub web UI).
3. On the repo page, click **Code → Codespaces → Create codespace on main**.
4. Once it opens, run in the terminal:
   ```bash
   npm install
   npm run dev
   ```
5. Codespaces will prompt to open a forwarded port — click through to test
   the live quiz in your browser.

## Testing checklist (carried over from the spec)

- [ ] All-A through all-D, run repeatedly — same result every time
- [ ] A genuine two-pillar tie — confirm the higher tie-break-priority pillar wins
- [ ] All-A / all-B answers — confirm "no constraint found" fallback copy shows
      (not a forced/contradictory limitation)
- [ ] Band boundary scores (score right at 10/11, 14/15, 18/19, 22/23) —
      confirm correct band assignment at the edges
- [ ] Full submit flow for a "no constraint found" result — confirm it isn't
      rejected by required-field validation
