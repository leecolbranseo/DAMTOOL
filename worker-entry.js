// worker-entry.js — Cloudflare Workers entry point.
//
// Wraps the same Express app used locally (lib/createApp.js) with Workers'
// Node-compat HTTP server bridge (httpServerHandler). Static files (public/)
// are NOT served here — they're handled entirely by the Workers "assets"
// feature configured in wrangler.jsonc, since Workers have no filesystem
// for express.static to read from.
//
// Requires the "nodejs_compat" compatibility flag (set in wrangler.jsonc)
// and a compatibility_date on or after 2025-08-15, per Cloudflare's Express
// support: https://developers.cloudflare.com/workers/tutorials/deploy-an-express-app/
//
// Uses require() for the local CommonJS modules — Wrangler's esbuild
// bundler handles the import/require mix fine in practice. If a deploy
// ever complains about this specifically, the fallback is converting
// lib/createApp.js and its dependencies to ESM.

import { httpServerHandler } from 'cloudflare:node';

const createApp = require('./lib/createApp');

const app = createApp();
app.listen(3000);

export default httpServerHandler({ port: 3000 });
