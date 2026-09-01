// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const { PILLARS } = require('./config/assessment.config');
const submitRouter = require('./routes/submit');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serves the question set to the front end (answers scores included —
// this is a concept build, not a production security boundary).
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

app.listen(PORT, () => {
  console.log(`Data & Analytics Maturity Assessment concept running at http://localhost:${PORT}`);
  if (!process.env.BREVO_API_KEY) {
    console.log('(No BREVO_API_KEY set — emails will be mocked/logged to this console.)');
  }
});
