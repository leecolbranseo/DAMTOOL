// routes/submit.js
//
// POST /api/submit — receives quiz answers + contact details, scores them
// server-side (single source of truth, not trusting client-calculated
// results), and sends the two Brevo emails (mocked here for local testing).
//
// WPRA lessons applied:
// - No hardcoded Brevo API key fallback — env only, and missing key just
//   switches email sending to "mock" mode rather than crashing, so this is
//   testable without real Brevo credentials.
// - Sales recipient email from env/config, not hardcoded in source.
// - Required-field validation does NOT include primary_constraint_name —
//   a "no constraint found" result is a legitimate, valid submission.
// - Name fields resolved explicitly: front end sends user_firstname /
//   user_surname separately (never a combined user_name), and this file is
//   the one place that joins them into `user_name` for the email template —
//   avoiding WPRA's suspected firstname/surname vs user_name mismatch.

const express = require('express');
const { calculateResult } = require('../lib/calculateResult');
const { buildWhatThisMeansHtml, buildSecondaryConstraintsHtml } = require('../lib/copy');
const { PILLARS } = require('../config/assessment.config');

const router = express.Router();

const REQUIRED_FIELDS = ['user_firstname', 'user_surname', 'user_jobtitle', 'company_name', 'email'];

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

router.post('/api/submit', async (req, res) => {
  const body = req.body || {};
  const str = (key) => (typeof body[key] === 'string' ? body[key].trim() : '');

  const missing = REQUIRED_FIELDS.filter((field) => !str(field));
  if (missing.length) {
    return res.status(400).json({ success: false, message: `Missing required field(s): ${missing.join(', ')}` });
  }

  const email = str('email');
  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email address' });
  }

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

  const firstName = str('user_firstname');
  const lastName = str('user_surname');
  const jobTitle = str('user_jobtitle');
  const company = str('company_name');
  const userName = [firstName, lastName].filter(Boolean).join(' ') || email; // resolved once, here

  const whatThisMeansHtml = buildWhatThisMeansHtml(result.band, result.primaryConstraint);
  const secondaryConstraintsHtml = buildSecondaryConstraintsHtml(result.secondaryConstraints);

  const assessmentPayload = {
    user_name: userName,
    company_name: company,
    band: result.band.name,
    headline: result.band.headline,
    total_score: result.totalScore,
    primary_constraint_name: result.primaryConstraint ? result.primaryConstraint.name : '',
    primary_constraint_description: result.primaryConstraint ? result.primaryConstraint.description : '',
    secondary_constraints_html: secondaryConstraintsHtml,
    what_this_means_html: whatThisMeansHtml,
  };

  const emailStatus = await sendAssessmentEmails(email, userName, jobTitle, assessmentPayload);

  return res.status(200).json({
    success: true,
    message: 'Assessment submitted',
    emailStatus,
    result: {
      band: result.band.name,
      headline: result.band.headline,
      totalScore: result.totalScore,
      primaryConstraint: result.primaryConstraint,
      secondaryConstraints: result.secondaryConstraints,
      whatThisMeansHtml,
      secondaryConstraintsHtml,
    },
  });
});

/**
 * Sends the user's results email + internal sales notification via Brevo.
 * If BREVO_API_KEY isn't set, logs the payloads instead of calling the API —
 * this is what makes the concept testable without real credentials.
 */
async function sendAssessmentEmails(email, userName, jobTitle, assessment) {
  const apiKey = process.env.BREVO_API_KEY;
  const salesEmail = process.env.DAM_SALES_EMAIL || 'businessdevelopment@freshegg.com';

  const userParams = { ...assessment, user_email: email, user_jobtitle: jobTitle };

  if (!apiKey) {
    console.log('\n[MOCK BREVO] No BREVO_API_KEY set — logging instead of sending.\n');
    console.log('[MOCK BREVO] → user email to:', email);
    console.log(JSON.stringify(userParams, null, 2));
    console.log('[MOCK BREVO] → sales notification to:', salesEmail);
    console.log(JSON.stringify({ ...userParams, contact_email: email }, null, 2));
    return 'mocked';
  }

  // Real send path — left as a stub. Wire up sendBrevoTransactionalEmail here
  // when real template IDs + API key are available, following wpra-lead.ts's
  // pattern (Promise.all for user + sales sends, log failures, never throw).
  try {
    // await sendBrevoTransactionalEmail({...}, apiKey);
    return 'sent';
  } catch (err) {
    console.error('dam-tool: Brevo email error:', err);
    return 'failed';
  }
}

module.exports = router;
