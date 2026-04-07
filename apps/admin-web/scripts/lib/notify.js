/**
 * Notification system — Telegram bot + macOS native
 *
 * Setup: Create a Telegram bot via @BotFather, get the token.
 * Send a message to the bot, then get your chat_id via:
 *   curl https://api.telegram.org/bot<TOKEN>/getUpdates
 *
 * Add to .env.local:
 *   TELEGRAM_BOT_TOKEN=your_bot_token
 *   TELEGRAM_CHAT_ID=your_chat_id
 */

const { execSync } = require('child_process');

async function sendTelegram(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function sendMacNotification(title, message) {
  try {
    execSync(`osascript -e 'display notification "${message.replace(/"/g, '\\"')}" with title "${title.replace(/"/g, '\\"')}"'`);
    return true;
  } catch {
    return false;
  }
}

async function notify(title, message, { level = 'info' } = {}) {
  const emoji = level === 'error' ? '🔴' : level === 'warning' ? '🟡' : '🟢';
  const telegramMsg = `${emoji} <b>${title}</b>\n\n${message}`;

  const results = await Promise.allSettled([
    sendTelegram(telegramMsg),
    Promise.resolve(sendMacNotification(title, message.slice(0, 200))),
  ]);

  const sent = results.filter(r => r.status === 'fulfilled' && r.value).length;
  if (sent > 0) console.log(`  📬 Notification sent (${sent} channels)`);
  return sent > 0;
}

async function notifyPipelineResult(results) {
  const date = results.date;
  const day = results.day;
  const platforms = results.platforms || {};

  const lines = [`📊 Day ${day} Pipeline — ${date}`];

  if (results.renderSuccess) {
    lines.push(`\n🎬 Videos rendered successfully`);
  } else {
    lines.push(`\n❌ Render failed: ${results.renderError || 'unknown'}`);
  }

  for (const [platform, result] of Object.entries(platforms)) {
    if (result.success) {
      lines.push(`✅ ${platform}: Posted (ID: ${result.postId || 'n/a'})`);
    } else {
      lines.push(`❌ ${platform}: ${result.error || 'failed'}`);
    }
  }

  const successCount = Object.values(platforms).filter(r => r.success).length;
  const totalCount = Object.keys(platforms).length;
  lines.push(`\n${successCount}/${totalCount} platforms posted`);

  const level = successCount === totalCount ? 'info' : successCount > 0 ? 'warning' : 'error';
  await notify('Nepal Republic Pipeline', lines.join('\n'), { level });
}

module.exports = { notify, notifyPipelineResult, sendTelegram, sendMacNotification };
