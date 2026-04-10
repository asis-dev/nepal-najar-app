#!/usr/bin/env node

/**
 * Launch preflight checks (non-destructive).
 * Run manually before go-live: npm run -w @nepal-progress/admin-web launch:check
 */

const path = require('path');
const { loadEnvConfig } = require('@next/env');

loadEnvConfig(path.join(__dirname, '..'));

function check(name, test, message) {
  if (test) {
    console.log(`PASS  ${name}`);
    return true;
  }
  console.log(`FAIL  ${name} - ${message}`);
  return false;
}

function warn(name, message) {
  console.log(`WARN  ${name} - ${message}`);
}

function hasValue(name) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim().length > 0;
}

function minLen(name, n) {
  const value = process.env[name];
  return typeof value === 'string' && value.length >= n;
}

function hasAnyValue(names) {
  return names.some((name) => hasValue(name));
}

let ok = true;

ok = check('SCRAPE_SECRET', minLen('SCRAPE_SECRET', 24), 'Set SCRAPE_SECRET to a long random secret.') && ok;
ok = check('CRON_SECRET', minLen('CRON_SECRET', 24), 'Set CRON_SECRET so cron routes are protected.') && ok;
ok = check(
  'SERVICE_OPS_WORKER_SECRET',
  minLen('SERVICE_OPS_WORKER_SECRET', 24) || minLen('CRON_SECRET', 24),
  'Set SERVICE_OPS_WORKER_SECRET (or rely on CRON_SECRET) so the service ops AI worker cron is protected.',
) && ok;
ok = check('JWT_SECRET', minLen('JWT_SECRET', 32), 'Set JWT_SECRET to a long random value.') && ok;
ok = check(
  'Legacy admin secret disabled',
  process.env.ENABLE_LEGACY_ADMIN_SECRET === 'false',
  'Set ENABLE_LEGACY_ADMIN_SECRET=false unless explicitly needed.',
) && ok;

if (process.env.INTELLIGENCE_ALLOW_DIRECT_STATUS_WRITES === 'true') {
  warn(
    'Direct status writes enabled',
    'This bypasses review-safe status changes. Keep false for public launch unless intentional.',
  );
}

if (process.env.INTELLIGENCE_STATUS_AUTOPILOT_AUTO_APPLY === 'true') {
  warn(
    'Autopilot auto-apply enabled',
    'Recommendations can be applied automatically. Keep false for safer launch.',
  );
}

if (
  !hasAnyValue([
    'INTELLIGENCE_ALERT_WEBHOOK_URL',
    'OPS_ALERT_WEBHOOK_URL',
    'RESEND_API_KEY',
    'SMTP_USER',
    'SMTP_PASS',
  ])
) {
  warn(
    'Ops alert delivery',
    'No webhook or email provider configured. Failures will only appear in logs.',
  );
}

if (!hasAnyValue(['OWNER_USER_ID', 'OWNER_USER_IDS', 'OWNER_EMAIL', 'OWNER_EMAILS'])) {
  warn('Owner lock', 'No OWNER_* value set. Any admin can access dashboard/admin APIs.');
}

if (process.env.ADMIN_ROLE_PROMOTION_ENABLED === 'true') {
  warn(
    'Elevated promotions enabled',
    'New users can be promoted to verifier/admin. Keep false for tighter control.',
  );
}

if (ok) {
  console.log('\nPreflight complete: core launch checks passed.');
  process.exit(0);
}

console.log('\nPreflight failed: fix FAIL items before public launch.');
process.exit(1);
