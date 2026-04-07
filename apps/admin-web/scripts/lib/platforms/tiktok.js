/**
 * TikTok posting module — Content Posting API v2
 *
 * Setup:
 * 1. Register at https://developers.tiktok.com/
 * 2. Create an app with video.publish + video.upload scopes
 * 3. Complete OAuth flow to get access_token + refresh_token
 * 4. Add to .env.local:
 *    TIKTOK_CLIENT_KEY=...
 *    TIKTOK_CLIENT_SECRET=...
 *    TIKTOK_ACCESS_TOKEN=...
 *    TIKTOK_REFRESH_TOKEN=...
 */

const { readFileSync, existsSync, statSync } = require('fs');

async function refreshToken() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const refreshToken = process.env.TIKTOK_REFRESH_TOKEN;
  if (!clientKey || !clientSecret || !refreshToken) return null;

  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  const data = await res.json();
  if (data.access_token) {
    process.env.TIKTOK_ACCESS_TOKEN = data.access_token;
    if (data.refresh_token) process.env.TIKTOK_REFRESH_TOKEN = data.refresh_token;
    return data.access_token;
  }
  return null;
}

async function postVideo({ videoPath, caption, videoUrl }) {
  let token = process.env.TIKTOK_ACCESS_TOKEN;
  if (!token) return { success: false, error: 'Missing TIKTOK_ACCESS_TOKEN. Run OAuth setup first.' };
  if (!existsSync(videoPath) && !videoUrl) return { success: false, error: 'No video file or URL' };

  // Try posting, refresh token if needed
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const postBody = videoUrl
        ? {
            post_info: { title: caption.slice(0, 150), privacy_level: 'PUBLIC_TO_EVERYONE' },
            source_info: { source: 'PULL_FROM_URL', video_url: videoUrl },
          }
        : {
            post_info: { title: caption.slice(0, 150), privacy_level: 'PUBLIC_TO_EVERYONE' },
            source_info: {
              source: 'FILE_UPLOAD',
              video_size: statSync(videoPath).size,
              chunk_size: statSync(videoPath).size,
              total_chunk_count: 1,
            },
          };

      const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(postBody),
      });
      const initData = await initRes.json();

      if (initData.error?.code === 'access_token_invalid' && attempt === 0) {
        console.log(`  [tiktok] Token expired, refreshing...`);
        token = await refreshToken();
        if (!token) return { success: false, error: 'Token refresh failed' };
        continue;
      }

      if (initData.error) {
        return { success: false, error: initData.error.message || JSON.stringify(initData.error) };
      }

      // If FILE_UPLOAD, upload the video chunk
      if (!videoUrl && initData.data?.upload_url) {
        const videoBuffer = readFileSync(videoPath);
        console.log(`  [tiktok] Uploading ${(videoBuffer.length / 1024 / 1024).toFixed(1)} MB...`);
        const uploadRes = await fetch(initData.data.upload_url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'video/mp4',
            'Content-Range': `bytes 0-${videoBuffer.length - 1}/${videoBuffer.length}`,
          },
          body: videoBuffer,
        });
        if (!uploadRes.ok) {
          return { success: false, error: 'Video chunk upload failed' };
        }
      }

      const publishId = initData.data?.publish_id;
      console.log(`  [tiktok] ✅ Video submitted! Publish ID: ${publishId}`);
      return { success: true, postId: publishId, postUrl: 'https://www.tiktok.com/' };
    } catch (err) {
      if (attempt === 0) continue;
      return { success: false, error: err.message };
    }
  }
  return { success: false, error: 'Max retries exceeded' };
}

module.exports = { postVideo, refreshToken };
