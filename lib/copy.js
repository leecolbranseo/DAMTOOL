// copy.js
//
// Dynamic copy generation. Per spec: "what this means for your business" and
// the "no constraint found" fallback must be built as parameters from day
// one, not static template blocks retrofitted later.

/**
 * "No constraint found" fallback — used when every pillar scored A/B (no
 * pillar was weak enough to clear the eligibility floor). This must read as
 * a genuine positive result, not a broken/empty state.
 */
const NO_CONSTRAINT_PRIMARY = {
  name: '',
  description:
    "No significant limitation was found — your answers didn't flag any single area as a blocker to your data maturity.",
};

const NO_CONSTRAINT_SECONDARY_HTML =
  '<p>No secondary areas of concern were identified from your answers.</p>';

/**
 * Builds the "what this means for your business" HTML block for a given
 * band + primary constraint. Dynamic by construction — swap in copy per
 * band/constraint pairing without touching the email template itself.
 */
function buildWhatThisMeansHtml(band, primaryConstraint) {
  const bandLine = `<p>${band.intro}</p>`;
  const constraintLine = primaryConstraint
    ? `<p>Right now, <strong>${primaryConstraint.name}</strong> looks like the area most worth focusing on first.</p>`
    : `<p>${NO_CONSTRAINT_PRIMARY.description}</p>`;
  return `${bandLine}\n${constraintLine}`;
}

/**
 * Builds the secondary constraints HTML list, or the fallback copy if none exist.
 */
function buildSecondaryConstraintsHtml(secondaryConstraints) {
  if (!secondaryConstraints.length) return NO_CONSTRAINT_SECONDARY_HTML;
  const items = secondaryConstraints
    .map((c) => `<li><strong>${c.name}</strong> — ${c.description}</li>`)
    .join('\n');
  return `<ul>${items}</ul>`;
}

module.exports = {
  NO_CONSTRAINT_PRIMARY,
  NO_CONSTRAINT_SECONDARY_HTML,
  buildWhatThisMeansHtml,
  buildSecondaryConstraintsHtml,
};
