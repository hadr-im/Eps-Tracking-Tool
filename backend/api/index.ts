// Vercel serverless entry point.
//
// Vercel invokes the default export per request instead of running a listener,
// so this imports the configured Express app without src/server.ts, which owns
// app.listen() and the in-process cron scheduler. Those only apply to a
// persistent host; on Vercel the sync jobs run via /api/cron/* instead.

import app from '../src/app';

export default app;
