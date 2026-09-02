// calculateResult.js
//
// Pure scoring function — no randomness, no I/O. Same answers always produce
// the same result (WPRA lesson: this was tested explicitly because an early
// PHP→Node conversion introduced non-determinism in tie-breaking).

const { PILLARS, BANDS, CONSTRAINT_ELIGIBILITY_FLOOR } = require('../config/assessment.config');

/**
 * @param {Record<string, 'A'|'B'|'C'|'D'>} answers - map of pillar id -> chosen option key
 * @returns {{
 *   totalScore: number,
 *   band: object,
 *   pillarScores: Array<{id: string, label: string, rawScore: number, weightedScore: number, optionKey: string}>,
 *   primaryConstraint: {name: string, description: string} | null,
 *   secondaryConstraints: Array<{name: string, description: string}>,
 * }}
 */
function calculateResult(answers) {
  const pillarScores = PILLARS.map((pillar) => {
    const chosenKey = answers[pillar.id];
    const option = pillar.options.find((o) => o.key === chosenKey);
    if (!option) {
      throw new Error(`Missing or invalid answer for pillar "${pillar.id}"`);
    }
    return {
      id: pillar.id,
      label: pillar.label,
      rawScore: option.score,
      weightedScore: option.score * pillar.weight,
      optionKey: option.key,
      optionText: option.text,
      tieBreakPriority: pillar.tieBreakPriority,
    };
  });

  const totalScore = pillarScores.reduce((sum, p) => sum + p.weightedScore, 0);

  const band = BANDS.find((b) => totalScore >= b.min && totalScore <= b.max);
  if (!band) {
    // Should be unreachable if BANDS fully covers the possible score range —
    // fail loudly rather than silently defaulting, so a config mismatch is caught.
    throw new Error(`No band configured for totalScore=${totalScore}. Check BANDS range coverage.`);
  }

  // --- Constraint eligibility floor: only C/D answers (rawScore <= floor) qualify ---
  const eligible = pillarScores
    .filter((p) => p.rawScore <= CONSTRAINT_ELIGIBILITY_FLOOR)
    .sort((a, b) => {
      if (a.rawScore !== b.rawScore) return a.rawScore - b.rawScore; // weakest first
      return a.tieBreakPriority - b.tieBreakPriority; // deterministic tie-break
    });

  const primaryConstraint = eligible.length
    ? { name: eligible[0].label, description: eligible[0].optionText, pillarId: eligible[0].id }
    : null;

  // Capped at 2, matching WPRA's real slice(1, 3) — the tease/results screens
  // are designed to name the single biggest issue plus a couple of others,
  // not exhaustively list every weak pillar.
  const secondaryConstraints = eligible
    .slice(1, 3)
    .map((p) => ({ name: p.label, description: p.optionText, pillarId: p.id }));

  return { totalScore, band, pillarScores, primaryConstraint, secondaryConstraints };
}

module.exports = { calculateResult };
