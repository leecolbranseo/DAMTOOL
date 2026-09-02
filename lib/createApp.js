// lib/createApp.js
//
// Builds the Express app shared between local dev (server.js) and the
// Cloudflare Worker entry point (worker-entry.js) — one definition of the
// API routes, so the two environments can't drift apart.
//
// Static file serving (public/) is deliberately NOT included here: locally
// it's handled by express.static in server.js, and on Cloudflare it's
// handled entirely by the Workers "assets" feature (see wrangler.jsonc)
// instead, since Workers have no filesystem for express.static to read from.

const express = require('express');
const { PILLARS } = require('../config/assessment.config');
const submitRouter = require('../routes/submit');
const previewRouter = require('../routes/preview');

/**
 * Hand-rolled replacement for express.json(). Deliberately NOT using
 * express.json()/body-parser here: body-parser's JSON parser lazily pulls in
 * raw-body -> iconv-lite, and iconv-lite needs more of Node's `stream`
 * module than Cloudflare Workers' nodejs_compat currently implements —
 * this throws "require_streams(...) is not a function" at deploy time
 * (Cloudflare Workers error 10021). This is a real, currently-unfixed gap
 * in Cloudflare's compat layer, not a bug in this app. Since this API only
 * ever needs to parse plain UTF-8 JSON bodies, a small manual parser
 * sidesteps the whole broken dependency chain.
 */
function parseJsonBody(req, res, next) {
  if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH') {
    req.body = req.body || {};
    return next();
  }
  let raw = '';
  req.on('data', (chunk) => { raw += chunk; });
  req.on('end', () => {
    if (!raw) {
      req.body = {};
      return next();
    }
    try {
      req.body = JSON.parse(raw);
      next();
    } catch (err) {
      res.status(400).json({ success: false, message: 'Invalid JSON body' });
    }
  });
  req.on('error', next);
}

function createApp() {
  const app = express();
  app.use(parseJsonBody);

  app.get('/api/questions', (_req, res) => {
    res.json({
      pillars: PILLARS.map((p) => ({
        id: p.id,
        label: p.label,
        question: p.question,
        options: p.options.map((o) => ({ key: o.key, text: o.text })),
      })),
    });
  });

  app.use(submitRouter);
  app.use(previewRouter);

  return app;
}

module.exports = createApp;