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
const { sendAssessmentEmails } = require('./lib/sendBrevo');

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

async function handleSubmit(request, env) {
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
    primary_constraint_description: result.primaryConstraint
      ? result.primaryConstraint.description
      : NO_CONSTRAINT_RESULTS_MESSAGE,
    secondary_constraints_html: secondaryConstraintsHtml,
    what_this_means_html: whatThisMeansHtml,
  };

  const emailStatus = await sendAssessmentEmails({
    apiKey: env && env.BREVO_API_KEY,
    salesEmail: env && env.DAM_SALES_EMAIL,
    email,
    userName,
    jobTitle,
    assessmentPayload,
  });

  return json({
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
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/api/questions') {
      return handleQuestions();
    }
    if (request.method === 'POST' && url.pathname === '/api/preview') {
      return handlePreview(request);
    }
    if (request.method === 'POST' && url.pathname === '/api/submit') {
      return handleSubmit(request, env);
    }

    return new Response('Not found', { status: 404 });
  },
};
