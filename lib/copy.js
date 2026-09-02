// copy.js
//
// Dynamic copy generation, modeled directly on the real wpraResults.ts:
// four distinct fallback messages for four distinct contexts, rather than
// one generic string reused everywhere. Per spec: "what this means for your
// business" and the "no constraint found" fallback must be built as
// parameters from day one, not static template blocks retrofitted later.

// Shown in the TEASE screen's constraint box in place of a name, when no
// pillar cleared the eligibility floor. Short — sits where a name would go.
const NO_CONSTRAINT_MESSAGE =
  "No significant limitation found — but that's rarely the whole story.";

// Replaces a band's own teaseCopy on the TEASE screen specifically when no
// constraint was found — every band still gets a distinct teaseHeadline,
// but the supporting line switches to this regardless of band.
const NO_CONSTRAINT_TEASE_COPY =
  "Even highly data-mature organisations tend to have hidden opportunities. In our experience, most reviews uncover additional wins, even for teams that pass every check — a second look from a specialist often reveals what a self-assessment can't.";

// Shown in the full RESULTS screen / email's primary constraint box —
// longer, since there's no teaser card competing for attention here.
const NO_CONSTRAINT_RESULTS_MESSAGE =
  'No significant limitation found. In our experience, most reviews find additional opportunities even for strong-performing organisations.';

// Used both on-screen and in the emailed "name" field. Kept short and
// separate from NO_CONSTRAINT_RESULTS_MESSAGE (which is the fuller
// description) — deliberately never sent as an empty string. WPRA's own
// automation payload still sends '' for primary_constraint_name in this
// case (worth flagging to that team); DAM avoids repeating it here.
const NO_CONSTRAINT_NAME = 'No significant limitation found';

const NO_SECONDARY_CONSTRAINTS_MESSAGE = 'Nothing of note based on the information shared.';

/**
 * Builds the "what this means for your business" HTML block for a band.
 * Matches production exactly: a headline sentence + bullet points that are
 * purely band-level — it does not reference the primary constraint, which
 * gets its own separate box.
 */
function buildWhatThisMeansHtml(band) {
  const points = band.whatThisMeansPoints.map((point) => `<li>${point}</li>`).join('\n');
  return `<p>${band.whatThisMeansHeadline}</p>\n<ul>${points}</ul>`;
}

/**
 * Builds the secondary constraints HTML list (capped at 2, set by
 * calculateResult), or the fallback copy if none exist.
 */
function buildSecondaryConstraintsHtml(secondaryConstraints) {
  if (!secondaryConstraints.length) return `<p>${NO_SECONDARY_CONSTRAINTS_MESSAGE}</p>`;
  const items = secondaryConstraints
    .map((c) => `<li><strong>${c.name}</strong> — ${c.description}</li>`)
    .join('\n');
  return `<ul>${items}</ul>`;
}

module.exports = {
  NO_CONSTRAINT_MESSAGE,
  NO_CONSTRAINT_TEASE_COPY,
  NO_CONSTRAINT_RESULTS_MESSAGE,
  NO_CONSTRAINT_NAME,
  NO_SECONDARY_CONSTRAINTS_MESSAGE,
  buildWhatThisMeansHtml,
  buildSecondaryConstraintsHtml,
};
