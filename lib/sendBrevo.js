// lib/sendBrevo.js
//
// Sends the two assessment emails via Brevo's REST API. Works identically
// in Node (server.js, via global fetch — Node 18+) and Cloudflare Workers
// (worker-entry.js) since both environments provide a native fetch().
// Falls back to logging the payloads instead of sending when no API key
// is provided, so this is safe to call in every environment/config.

const USER_TEMPLATE_ID = 44;   // Brevo: "Data & Analytics Result Tool EXTERNAL"
const SALES_TEMPLATE_ID = 45;  // Brevo: "Data & Analytics Result Tool INTERNAL"
const DEFAULT_SALES_EMAIL = 'businessdevelopment@freshegg.com';

async function sendBrevoTemplateEmail({ apiKey, templateId, to, toName, params, replyTo }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      templateId,
      to: [{ email: to, name: toName }],
      params,
      ...(replyTo ? { replyTo } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Brevo API error ${res.status}: ${text}`);
  }
  return res.json().catch(() => ({}));
}

async function sendAssessmentEmails({ apiKey, salesEmail, email, userName, jobTitle, assessmentPayload }) {
  const salesTo = salesEmail || DEFAULT_SALES_EMAIL;
  const userParams = { ...assessmentPayload, user_email: email, user_jobtitle: jobTitle };
  const salesParams = { ...userParams, contact_email: email };

  if (!apiKey) {
    console.log('[MOCK BREVO] No BREVO_API_KEY set — logging instead of sending.');
    console.log('[MOCK BREVO] -> user email to:', email, JSON.stringify(userParams));
    console.log('[MOCK BREVO] -> sales notification to:', salesTo, JSON.stringify(salesParams));
    return 'mocked';
  }

  try {
    await Promise.all([
      sendBrevoTemplateEmail({ apiKey, templateId: USER_TEMPLATE_ID, to: email, toName: userName, params: userParams }),
      sendBrevoTemplateEmail({
        apiKey,
        templateId: SALES_TEMPLATE_ID,
        to: salesTo,
        toName: 'FE Biz Dev Team',
        params: salesParams,
        replyTo: { email, name: userName },
      }),
    ]);
    return 'sent';
  } catch (err) {
    console.error('sendAssessmentEmails: Brevo error:', err.message || err);
    return 'failed';
  }
}

module.exports = { sendAssessmentEmails, USER_TEMPLATE_ID, SALES_TEMPLATE_ID, DEFAULT_SALES_EMAIL };
