// server.js — local development entry point.
//
// Cloudflare deployment uses worker-entry.js instead (see wrangler.jsonc).
// Both share the exact same route definitions via lib/createApp.js, so
// local behavior and deployed behavior can't quietly drift apart.

require('dotenv').config();
const express = require('express');
const path = require('path');
const createApp = require('./lib/createApp');

const PORT = process.env.PORT || 3000;
const app = createApp();

// Static file serving — local-only. On Cloudflare this is handled by the
// Workers "assets" feature instead (public/ has no Express involved there,
// since Workers have no filesystem for express.static to read from).
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Data & Analytics Maturity Assessment concept running at http://localhost:${PORT}`);
  if (!process.env.BREVO_API_KEY) {
    console.log('(No BREVO_API_KEY set — emails will be mocked/logged to this console.)');
  }
});
