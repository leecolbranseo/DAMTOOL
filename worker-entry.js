// worker-entry.js — Cloudflare Workers entry point.
//
// Deliberately does NOT use Express. Requiring the `express` package on
// Workers triggers a real Cloudflare compat bug: Express's own top-level
// code does `exports.json = bodyParser.json`, which eagerly triggers
// body-parser's lazy .json getter and pulls in raw-body -> iconv-lite,
// crashing with "require_streams(...) is not a function" (error 10021) —
// regardless of the nodejs_compat flag version, and regardless of whether
// app code ever calls express.json() itself. There's no app-level fix;
// the only way around it is not importing `express` in this bundle at all.
//
// This re-implements the same three API routes as native Workers fetch
// handlers (Web standard Request/Response), calling the exact same pure
// scoring/copy functions used by the Express version in lib/createApp.js
// (used for local dev via server.js) — so the actual business logic can't
// drift between environments, even though the request-handling glue here
// is necessarily separate from the Express routes.

const { calculateResult } = require('./lib/calculateResult');
const {
  buildWhatThisMeansHtml,
  buildSecondaryConstraintsHtml,
  NO_CONSTRAINT_MESSAGE,
  NO_CONSTRAINT_TEASE_COPY,
  NO_CONSTRAINT_NAME,
  NO_CONSTRAINT_RESULTS_MESSAGE,
} = require('./lib/copy');
const { PILLARS } = require('./config/assessment.config');

const REQUIRED_SUBMIT_FIELDS = ['user_firstname', 'user_surname', 'user_jobtitle', 'company_name', 'email'];
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function getMissingAnswers(answers) {
  const answeredIds = PILLARS.map((p) => p.id);
  return answeredIds.filter((id) => !answers || !answers[id]);
}

async function handleQuestions() {
  return json({
    pillars: PILLARS.map((p) => ({
      id: p.id,
      label: p.label,
      question: p.question,
      options: p.options.map((o) => ({ key: o.key, text: o.text })),
    })),
  });
}

async function handlePreview(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, message: 'Invalid JSON body' }, 400);
  }
  const answers = body && typeof body.answers === 'object' ? body.answers : {};
  const missing = getMissingAnswers(answers);
  if (missing.length) {
    return json({ success: false, message: `Missing answer(s) for: ${missing.join(', ')}` }, 400);
  }

  let result;
  try {
    result = calculateResult(answers);
  } catch (err) {
    return json({ success: false, message: err.message }, 400);
  }

  return json({
    success: true,
    band: result.band.name,
    bandColor: result.band.emailAccent.text,
    bandBg: result.band.emailAccent.bg,
    teaseHeadline: result.band.teaseHeadline,
    teaseCopy: result.primaryConstraint ? result.band.teaseCopy : NO_CONSTRAINT_TEASE_COPY,
    primaryConstraintName: result.primaryConstraint ? result.primaryConstraint.name : null,
    noConstraintMessage: NO_CONSTRAINT_MESSAGE,
  });
}

async function handleSubmit(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, message: 'Invalid JSON body' }, 400);
  }

  const str = (key) => (typeof body[key] === 'string' ? body[key].trim() : '');
  const missingFields = REQUIRED_SUBMIT_FIELDS.filter((f) => !str(f));
  if (missingFields.length) {
    return json({ success: false, message: `Missing required field(s): ${missingFields.join(', ')}` }, 400);
  }

  const email = str('email');
  if (!isValidEmail(email)) {
    return json({ success: false, message: 'Invalid email address' }, 400);
  }

  const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};
  const missingAnswers = getMissingAnswers(answers);
  if (missingAnswers.length) {
    return json({ success: false, message: `Missing answer(s) for: ${missingAnswers.join(', ')}` }, 400);
  }

  let result;
  try {
    result = calculateResult(answers);
  } catch (err) {
    return json({ success: false, message: err.message }, 400);
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
    primary_constraint_description: result.primaryConstraint ? result.primaryConstraint.description : NO_CONSTRAINT_RESULTS_MESSAGE,
    secondary_constraints_html: secondaryConstraintsHtml,
    what_this_means_html: whatThisMeansHtml,
  };

  console.log('[MOCK BREVO] user email to:', email, JSON.stringify({ ...assessmentPayload, user_email: email, user_jobtitle: jobTitle }));
  console.log('[MOCK BREVO] sales notification to: businessdevelopment@freshegg.com', JSON.stringify({ ...assessmentPayload, user_email: email, user_jobtitle: jobTitle, contact_email: email }));

  return json({
    success: true,
    message: 'Assessment submitted',
    emailStatus: 'mocked',
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
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/api/questions') {
      return handleQuestions();
    }
    if (request.method === 'POST' && url.pathname === '/api/preview') {
      return handlePreview(request);
    }
    if (request.method === 'POST' && url.pathname === '/api/submit') {
      return handleSubmit(request);
    }

    return new Response('Not found', { status: 404 });
  },
};
