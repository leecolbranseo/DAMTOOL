// lib/createApp.js
const express = require('express');
const { PILLARS } = require('../config/assessment.config');
const submitRouter = require('../routes/submit');
const previewRouter = require('../routes/preview');

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
