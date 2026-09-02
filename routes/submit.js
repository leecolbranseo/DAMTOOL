// routes/submit.js
const express = require('express');
const { calculateResult } = require('../lib/calculateResult');
const {
  buildWhatThisMeansHtml,
  buildSecondaryConstraintsHtml,
  NO_CONSTRAINT_NAME,
  NO_CONSTRAINT_RESULTS_MESSAGE,
} = require('../lib/copy');
const { PILLARS } = require('../config/assessment.config');
const { sendAssessmentEmails } = require('../lib/sendBrevo');

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
  const userName = [firstName, lastName].filter(Boolean).join(' ') || email;

  const whatThisMeansHtml = buildWhatThisMeansHtml(result.band);
  const secondaryConstraintsHtml = buildSecondaryConstraintsHtml(result.secondaryConstraints);

  const assessmentPayload = {
    user_name: userName,
    user_firstname: firstName,
    user_surname: lastName,
    company_name: company,
    band: result.band.name,
    band_color: result.band.emailAccent.text,
    band_bg: result.band.emailAccent.bg,
    headline: result.band.headline,
    copy: result.band.intro,
    total_score: result.totalScore,
    recommended_service: result.band.recommendedService,
    has_constraint: Boolean(result.primaryConstraint),
    primary_constraint_name: result.primaryConstraint ? result.primaryConstraint.name : NO_CONSTRAINT_NAME,
    primary_constraint_description: result.primaryConstraint
      ? result.primaryConstraint.description
      : NO_CONSTRAINT_RESULTS_MESSAGE,
    secondary_constraints_html: secondaryConstraintsHtml,
    what_this_means_html: whatThisMeansHtml,
  };

  const emailStatus = await sendAssessmentEmails({
    apiKey: process.env.BREVO_API_KEY,
    salesEmail: process.env.DAM_SALES_EMAIL,
    email,
    userName,
    jobTitle,
    assessmentPayload,
  });

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

module.exports = router;
