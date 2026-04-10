import { NextRequest, NextResponse } from 'next/server';
import {
  canAccessServiceDepartment,
  getDepartmentMembership,
  getServiceOpsAuthContext,
} from '@/lib/service-ops/access';
import { processQueuedServiceAIRuns } from '@/lib/service-ops/ai-worker';
import { bearerMatchesSecret, getBearerToken, secretsEqual } from '@/lib/security/request-auth';

export const runtime = 'nodejs';

function hasWorkerSecret(request: NextRequest) {
  const workerSecret = process.env.SERVICE_OPS_WORKER_SECRET?.trim() || null;
  const cronSecret = process.env.CRON_SECRET?.trim() || null;
  const bearerSecret = getBearerToken(request);
  const headerSecret = request.headers.get('x-service-ops-worker-secret')?.trim() || null;
  const cronHeaderSecret = request.headers.get('x-vercel-cron-secret');

  return (
    bearerMatchesSecret(request, workerSecret) ||
    bearerMatchesSecret(request, cronSecret) ||
    secretsEqual(headerSecret, workerSecret) ||
    secretsEqual(cronHeaderSecret, workerSecret) ||
    secretsEqual(cronHeaderSecret, cronSecret) ||
    secretsEqual(bearerSecret, workerSecret) ||
    secretsEqual(bearerSecret, cronSecret)
  );
}

async function canRunWorker(request: NextRequest, departmentKey?: string | null) {
  if (hasWorkerSecret(request)) return true;

  const ctx = await getServiceOpsAuthContext();
  if (!ctx) return false;
  if (ctx.isElevated) return true;
  if (!departmentKey || !canAccessServiceDepartment(ctx, departmentKey)) return false;

  const membership = await getDepartmentMembership(ctx.userId, departmentKey);
  if (!membership) return false;
  return ['owner', 'manager'].includes(membership.member_role);
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const departmentKey = typeof body.department_key === 'string' ? body.department_key.trim() : null;
  const limit = typeof body.limit === 'number' ? body.limit : 10;

  if (!(await canRunWorker(request, departmentKey))) {
    return NextResponse.json({ error: 'AI worker permission required' }, { status: 403 });
  }

  try {
    const result = await processQueuedServiceAIRuns(limit);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI worker failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
