#!/usr/bin/env node

const BASE_URL = process.env.NEPALREPUBLIC_BASE_URL || 'http://127.0.0.1:3000';

async function postJson(path, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${path} returned non-JSON response (status ${response.status}): ${text.slice(0, 180)}`);
  }
  return { status: response.status, ok: response.ok, json };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  const checks = [];

  checks.push(async () => {
    const result = await postJson('/api/services/ask', {
      question: 'Book hospital appointment',
      locale: 'en',
    });
    assert(result.ok, 'hospital ask should return 200');
    assert(result.json.routeMode === 'ambiguous', 'hospital ask should be ambiguous');
    assert(result.json.topService === null, 'hospital ask should not hard-route');
    assert(Array.isArray(result.json.cited) && result.json.cited.length >= 3, 'hospital ask should return options');
    return 'hospital ambiguity';
  });

  checks.push(async () => {
    const result = await postJson('/api/services/ask', {
      question: 'bir hospital opd',
      locale: 'en',
    });
    assert(result.ok, 'Bir ask should return 200');
    assert(result.json.routeMode === 'direct', 'Bir ask should direct-route');
    assert(result.json.topService?.slug === 'bir-hospital-opd', 'Bir ask should route to bir-hospital-opd');
    return 'Bir direct route';
  });

  checks.push(async () => {
    const result = await postJson('/api/services/ask', {
      question: 'Pay my NEA bill',
      locale: 'en',
    });
    assert(result.ok, 'NEA ask should return 200');
    assert(result.json.routeMode === 'direct', 'NEA ask should direct-route');
    assert(result.json.topService?.slug === 'nea-electricity-bill', 'NEA ask should route to nea-electricity-bill');
    return 'NEA direct route';
  });

  checks.push(async () => {
    const result = await postJson('/api/me/service-tasks/from-query', {
      question: 'Book hospital appointment',
      locale: 'en',
    });
    assert(result.ok, 'task router hospital should return 200');
    assert(result.json.ambiguous === true, 'task router hospital should be ambiguous');
    assert(Array.isArray(result.json.serviceOptions) && result.json.serviceOptions.length >= 3, 'task router hospital should include service options');
    return 'task router ambiguity';
  });

  checks.push(async () => {
    const result = await postJson('/api/me/service-tasks/from-query', {
      question: 'Pay my NEA bill',
      locale: 'en',
    });
    assert(result.ok, 'task router NEA should return 200');
    assert(result.json.requiresAuth === true, 'guest NEA route should require auth');
    assert(result.json.service?.slug === 'nea-electricity-bill', 'guest NEA route should still identify service');
    return 'task router direct route';
  });

  const passed = [];
  for (const check of checks) {
    const label = await check();
    passed.push(label);
    console.log(`PASS ${label}`);
  }

  console.log(`\nSmoke check complete: ${passed.length} checks passed.`);
}

run().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exit(1);
});
