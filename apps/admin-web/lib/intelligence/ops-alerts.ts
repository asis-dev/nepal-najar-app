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

function getAlertEmailRecipient(): string | null {
  const raw =
    process.env.OPS_ALERT_EMAIL ||
    process.env.ALERT_TO_EMAIL ||
    process.env.OWNER_EMAIL ||
    process.env.OWNER_EMAILS ||
    '';
  const first = raw
    .split(',')
    .map((value) => value.trim())
    .find(Boolean);
  return first || null;
}

async function sendAlertEmail(payload: OpsAlertPayload): Promise<void> {
  const to = getAlertEmailRecipient();
  const apiKey = process.env.RESEND_API_KEY || '';
  if (!to || !apiKey) return;

  const from = process.env.RESEND_FROM || 'Nepal Republic <alerts@nepalrepublic.org>';
  const env = process.env.NODE_ENV || 'unknown';
  const subject = `[${payload.severity.toUpperCase()}] ${payload.title}`;
  const detailsJson = JSON.stringify(payload.details || {}, null, 2);
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:640px;margin:auto;padding:24px;background:#0b0b0b;color:#fafafa;border-radius:12px">
      <div style="font-size:12px;color:#dc143c;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px">Nepal Republic · Ops Alert</div>
      <h2 style="margin:0 0 12px 0;font-size:20px">${subject}</h2>
      <p style="margin:0 0 16px 0;color:#d4d4d8;line-height:1.6">${payload.message}</p>
      <div style="font-size:13px;color:#a1a1aa;line-height:1.6">
        <div><strong>Source:</strong> ${payload.source}</div>
        <div><strong>Severity:</strong> ${payload.severity}</div>
        <div><strong>Environment:</strong> ${env}</div>
        <div><strong>Time:</strong> ${new Date().toISOString()}</div>
      </div>
      <pre style="margin-top:16px;padding:16px;background:#18181b;border:1px solid #27272a;border-radius:8px;overflow:auto;font-size:12px;color:#d4d4d8">${detailsJson}</pre>
    </div>`;
  const text = [
    subject,
    '',
    payload.message,
    '',
    `Source: ${payload.source}`,
    `Severity: ${payload.severity}`,
    `Environment: ${env}`,
    `Time: ${new Date().toISOString()}`,
    '',
    'Details:',
    detailsJson,
  ].join('\n');

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        text,
      }),
    });
  } catch (error) {
    console.warn(
      '[ops-alerts] Failed to send email alert:',
      error instanceof Error ? error.message : 'unknown',
    );
  }
}

export async function sendOpsAlert(payload: OpsAlertPayload): Promise<void> {
  const webhookUrl = getAlertWebhookUrl();
  const body = {
    text: `[${payload.severity.toUpperCase()}] ${payload.title}`,
    source: payload.source,
    message: payload.message,
    details: payload.details || {},
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'unknown',
  };

  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (error) {
      // Alert failures should never crash pipeline routes.
      console.warn(
        '[ops-alerts] Failed to send webhook alert:',
        error instanceof Error ? error.message : 'unknown',
      );
    }
  }

  await sendAlertEmail(payload);
}
