/**
 * YouTube Shorts posting module — Data API v3
 *
 * Setup:
 * 1. Create OAuth credentials in Google Cloud Console
 * 2. Enable YouTube Data API v3
 * 3. Run OAuth consent flow to get refresh token
 * 4. Add to .env.local:
 *    YOUTUBE_CLIENT_ID=...
 *    YOUTUBE_CLIENT_SECRET=...
 *    YOUTUBE_REFRESH_TOKEN=...
 *    YOUTUBE_CHANNEL_ID=...  (optional, for verification)
 */

const { readFileSync, existsSync, statSync } = require('fs');

async function getAccessToken() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  return data.access_token || null;
}

async function postShort({ videoPath, caption, hashtags = [] }) {
  if (!process.env.YOUTUBE_CLIENT_ID) {
    return { success: false, error: 'Missing YouTube OAuth credentials. Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN.' };
  }
  if (!existsSync(videoPath)) return { success: false, error: `Video not found: ${videoPath}` };

  const accessToken = await getAccessToken();
  if (!accessToken) return { success: false, error: 'Could not get YouTube access token' };

  const videoBuffer = readFileSync(videoPath);
  const fileSize = videoBuffer.length;
  const title = (caption.split('\n')[0] || 'Nepal Republic Daily Update').slice(0, 100);
  const description = caption + '\n\n#Shorts ' + hashtags.join(' ');

  console.log(`  [youtube] Uploading ${(fileSize / 1024 / 1024).toFixed(1)} MB Short...`);

  // Step 1: Initialize resumable upload
  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Length': String(fileSize),
        'X-Upload-Content-Type': 'video/mp4',
      },
      body: JSON.stringify({
        snippet: {
          title: title + ' #Shorts',
          description,
          tags: ['Nepal', 'NepalRepublic', 'BalenShah', 'Government', 'Accountability', ...hashtags.slice(0, 10)],
          categoryId: '25', // News & Politics
          defaultLanguage: caption.match(/[ा-ह]/) ? 'ne' : 'en',
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
          embeddable: true,
        },
      }),
    }
  );

  if (!initRes.ok) {
    const err = await initRes.text();
    return { success: false, error: `Upload init failed: ${err.slice(0, 200)}` };
  }

  const uploadUrl = initRes.headers.get('location');
  if (!uploadUrl) return { success: false, error: 'No upload URL returned' };

  // Step 2: Upload video data
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(fileSize),
    },
    body: videoBuffer,
  });

  const uploadData = await uploadRes.json();
  if (!uploadRes.ok || uploadData.error) {
    return { success: false, error: uploadData.error?.message || 'Upload failed' };
  }

  const videoId = uploadData.id;
  console.log(`  [youtube] ✅ Short uploaded! ID: ${videoId}`);
  return {
    success: true,
    postId: videoId,
    postUrl: `https://youtube.com/shorts/${videoId}`,
  };
}

module.exports = { postShort, getAccessToken };
