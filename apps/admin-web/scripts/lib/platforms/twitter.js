/**
 * X/Twitter posting module — API v2 + Media Upload
 *
 * Setup:
 * 1. Apply for X Developer account at https://developer.twitter.com/
 * 2. Create a project/app with Read + Write permissions
 * 3. Generate OAuth 1.0a tokens
 * 4. Add to .env.local:
 *    X_API_KEY=...
 *    X_API_SECRET=...
 *    X_ACCESS_TOKEN=...
 *    X_ACCESS_TOKEN_SECRET=...
 */

const { readFileSync, existsSync, statSync } = require('fs');
const crypto = require('crypto');

// OAuth 1.0a signing
function oauthSign(method, url, params, consumerSecret, tokenSecret) {
  const sortedParams = Object.keys(params).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
  const baseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  return crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
}

function oauthHeader(method, url, extraParams = {}) {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const token = process.env.X_ACCESS_TOKEN;
  const tokenSecret = process.env.X_ACCESS_TOKEN_SECRET;

  const oauthParams = {
    oauth_consumer_key: apiKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: token,
    oauth_version: '1.0',
    ...extraParams,
  };

  oauthParams.oauth_signature = oauthSign(method, url, oauthParams, apiSecret, tokenSecret);

  const headerParts = Object.keys(oauthParams)
    .filter(k => k.startsWith('oauth_'))
    .sort()
    .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
    .join(', ');

  return `OAuth ${headerParts}`;
}

async function uploadMedia(videoPath) {
  const UPLOAD_URL = 'https://upload.twitter.com/1.1/media/upload.json';
  const fileSize = statSync(videoPath).size;
  const mediaType = 'video/mp4';

  // INIT
  const initParams = { command: 'INIT', total_bytes: String(fileSize), media_type: mediaType, media_category: 'tweet_video' };
  const initRes = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: oauthHeader('POST', UPLOAD_URL, initParams),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(initParams),
  });
  const initData = await initRes.json();
  if (!initData.media_id_string) return null;
  const mediaId = initData.media_id_string;

  // APPEND (single chunk for <15MB files)
  const videoBuffer = readFileSync(videoPath);
  const boundary = '----XFormBoundary' + crypto.randomBytes(8).toString('hex');
  const appendBody = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="command"\r\n\r\nAPPEND\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="media_id"\r\n\r\n${mediaId}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="segment_index"\r\n\r\n0\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="media_data"; filename="video.mp4"\r\nContent-Type: video/mp4\r\n\r\n`),
    videoBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: oauthHeader('POST', UPLOAD_URL),
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body: appendBody,
  });

  // FINALIZE
  const finParams = { command: 'FINALIZE', media_id: mediaId };
  const finRes = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: oauthHeader('POST', UPLOAD_URL, finParams),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(finParams),
  });
  const finData = await finRes.json();

  // Wait for processing
  if (finData.processing_info) {
    let checkAfter = finData.processing_info.check_after_secs || 5;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, checkAfter * 1000));
      const statusRes = await fetch(`${UPLOAD_URL}?command=STATUS&media_id=${mediaId}`, {
        headers: { Authorization: oauthHeader('GET', UPLOAD_URL, { command: 'STATUS', media_id: mediaId }) },
      });
      const statusData = await statusRes.json();
      if (statusData.processing_info?.state === 'succeeded') break;
      if (statusData.processing_info?.state === 'failed') return null;
      checkAfter = statusData.processing_info?.check_after_secs || 5;
    }
  }

  return mediaId;
}

async function postVideo({ videoPath, caption }) {
  if (!process.env.X_API_KEY) {
    return { success: false, error: 'Missing X API credentials. Set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET.' };
  }
  if (!existsSync(videoPath)) return { success: false, error: `Video not found: ${videoPath}` };

  console.log(`  [twitter] Uploading video...`);
  const mediaId = await uploadMedia(videoPath);
  if (!mediaId) return { success: false, error: 'Media upload failed' };

  // Post tweet with media
  const tweetUrl = 'https://api.twitter.com/2/tweets';
  const tweetBody = JSON.stringify({
    text: caption.slice(0, 280),
    media: { media_ids: [mediaId] },
  });

  const res = await fetch(tweetUrl, {
    method: 'POST',
    headers: {
      Authorization: oauthHeader('POST', tweetUrl),
      'Content-Type': 'application/json',
    },
    body: tweetBody,
  });
  const data = await res.json();

  if (!res.ok || data.errors) {
    return { success: false, error: data.errors?.[0]?.message || JSON.stringify(data) };
  }

  const tweetId = data.data?.id;
  console.log(`  [twitter] ✅ Posted! Tweet ID: ${tweetId}`);
  return { success: true, postId: tweetId, postUrl: `https://x.com/i/status/${tweetId}` };
}

async function postThread({ tweets }) {
  // Post a thread of text tweets
  if (!process.env.X_API_KEY) return { success: false, error: 'Missing X API credentials' };
  const tweetUrl = 'https://api.twitter.com/2/tweets';
  let lastId = null;

  for (const text of tweets) {
    const body = { text: text.slice(0, 280) };
    if (lastId) body.reply = { in_reply_to_tweet_id: lastId };

    const res = await fetch(tweetUrl, {
      method: 'POST',
      headers: {
        Authorization: oauthHeader('POST', tweetUrl),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.errors?.[0]?.message || 'Thread failed' };
    lastId = data.data?.id;
  }

  return { success: true, postId: lastId, postUrl: `https://x.com/i/status/${lastId}` };
}

module.exports = { postVideo, postThread, uploadMedia };
