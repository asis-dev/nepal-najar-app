type OpsSeverity = 'info' | 'warning' | 'error';

interface OpsAlertPayload {
  severity: OpsSeverity;
  source: 'sweep' | 'worker' | 'ops';
  title: string;
  message: string;
  details?: Record<string, unknown>;
}

function getAlertWebhookUrl(): string | null {
  const url = process.env.INTELLIGENCE_ALERT_WEBHOOK_URL || process.env.OPS_ALERT_WEBHOOK_URL;
  return typeof url === 'string' && url.trim().length > 0 ? url.trim() : null;
}

export async function sendOpsAlert(payload: OpsAlertPayload): Promise<void> {
  const webhookUrl = getAlertWebhookUrl();
  if (!webhookUrl) return;

  const body = {
    text: `[${payload.severity.toUpperCase()}] ${payload.title}`,
    source: payload.source,
    message: payload.message,
    details: payload.details || {},
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'unknown',
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (error) {
    // Alert failures should never crash pipeline routes.
    console.warn(
      '[ops-alerts] Failed to send alert:',
      error instanceof Error ? error.message : 'unknown',
    );
  }
}
