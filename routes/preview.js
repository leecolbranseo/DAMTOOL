// routes/preview.js
//
// POST /api/preview — scores the answers and returns what the TEASE screen
// needs: the band name (revealed here, by product decision — DAM names the
// band explicitly at this stage rather than leaving it fully implicit like
// WPRA does), a band-specific headline/copy, and the primary constraint
// name. Still withheld: the numeric score, full constraint description, and
// secondary constraints — those stay behind the email gate as the incentive
// to submit.
//
// Note on architecture: the real WPRA embed computes this entirely
// client-side (the question set already ships with scores in the bundle, so
// there's nothing to hide). This concept instead scores server-side and
// exposes only a subset via this endpoint — a deliberately more
// conservative default. Fine to switch to client-side scoring to match
// WPRA exactly if preferred; the pure calculateResult() function works
// the same either way.

const express = require('express');
const { calculateResult } = require('../lib/calculateResult');
const { NO_CONSTRAINT_MESSAGE, NO_CONSTRAINT_TEASE_COPY } = require('../lib/copy');
const { PILLARS } = require('../config/assessment.config');

const router = express.Router();

router.post('/api/preview', (req, res) => {
  const body = req.body || {};
  const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};
  const answeredIds = PILLARS.map((p) => p.id);
  const missingAnswers = answeredIds.filter((id) => !answers[id]);
  if (missingAnswers.length) {
    return res.status(400).json({ success: false, message: `Missing answer(s) for: ${missingAnswers.join(', ')}` });
  }

  let result;
  try {
    result = calculateResult(answers);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }

  return res.status(200).json({
    success: true,
    band: result.band.name,
    bandColor: result.band.emailAccent.text,
    bandBg: result.band.emailAccent.bg,
    teaseHeadline: result.band.teaseHeadline,
    // teaseCopy swaps to the fixed no-constraint message, same as production —
    // teaseHeadline stays band-specific either way.
    teaseCopy: result.primaryConstraint ? result.band.teaseCopy : NO_CONSTRAINT_TEASE_COPY,
    primaryConstraintName: result.primaryConstraint ? result.primaryConstraint.name : null,
    noConstraintMessage: NO_CONSTRAINT_MESSAGE,
  });
});

module.exports = router;
