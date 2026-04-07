/**
 * Facebook posting module — Videos + Reels
 * Uses Facebook Graph API v25.0
 */

const { readFileSync, existsSync } = require('fs');
const { execSync } = require('child_process');

const FFMPEG = `${process.env.HOME}/bin/ffmpeg`;

function buildMultipart(fields, fileField) {
  const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
  const parts = [];
  for (const [name, value] of Object.entries(fields)) {
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}`);
  }
  if (fileField) {
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="${fileField.name}"; filename="${fileField.filename}"\r\nContent-Type: ${fileField.contentType}\r\n\r\n`
    );
    const preamble = Buffer.from(parts.join('\r\n'));
    const epilogue = Buffer.from(`\r\n--${boundary}--\r\n`);
    return { body: Buffer.concat([preamble, fileField.data, epilogue]), boundary };
  }
  parts.push(`--${boundary}--`);
  return { body: Buffer.from(parts.join('\r\n')), boundary };
}

function prepareForFacebook(videoPath) {
  const fixedPath = videoPath.replace('.mp4', '-fb.mp4');
  if (existsSync(fixedPath)) return fixedPath; // Already prepared
  try {
    execSync(
      `"${FFMPEG}" -y -i "${videoPath}" -c:v libx264 -profile:v main -level 4.0 -pix_fmt yuv420p -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 -preset fast -crf 23 -c:a aac -ar 44100 -ac 2 -b:a 128k -movflags +faststart "${fixedPath}"`,
      { stdio: 'pipe', timeout: 120_000 }
    );
    return fixedPath;
  } catch {
    return videoPath; // Use original if re-encode fails
  }
}

async function postVideo({ videoPath, caption }) {
  const pageId = process.env.FB_PAGE_ID;
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) return { success: false, error: 'Missing FB_PAGE_ID or FB_PAGE_ACCESS_TOKEN' };
  if (!existsSync(videoPath)) return { success: false, error: `Video not found: ${videoPath}` };

  const uploadPath = prepareForFacebook(videoPath);
  const videoBuffer = readFileSync(uploadPath);
  const sizeMB = (videoBuffer.length / 1024 / 1024).toFixed(1);
  console.log(`  [facebook] Uploading ${sizeMB} MB...`);

  const { body, boundary } = buildMultipart(
    { access_token: token, description: caption, published: 'true' },
    { name: 'source', filename: 'reel.mp4', contentType: 'video/mp4', data: videoBuffer }
  );

  const res = await fetch(`https://graph.facebook.com/v25.0/${pageId}/videos`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  });
  const data = await res.json();

  if (!res.ok || data.error) {
    return { success: false, error: data.error?.message || JSON.stringify(data) };
  }

  console.log(`  [facebook] ✅ Posted! Video ID: ${data.id}`);
  return {
    success: true,
    postId: data.id,
    postUrl: `https://www.facebook.com/${pageId}/videos/${data.id}`,
  };
}

async function postReel({ videoPath, caption }) {
  // Facebook Reels get 2-5x more reach than regular video posts
  const pageId = process.env.FB_PAGE_ID;
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) return { success: false, error: 'Missing FB credentials' };
  if (!existsSync(videoPath)) return { success: false, error: `Video not found: ${videoPath}` };

  const uploadPath = prepareForFacebook(videoPath);
  const videoBuffer = readFileSync(uploadPath);
  console.log(`  [facebook-reel] Uploading ${(videoBuffer.length / 1024 / 1024).toFixed(1)} MB as Reel...`);

  const { body, boundary } = buildMultipart(
    { access_token: token, description: caption, published: 'true' },
    { name: 'source', filename: 'reel.mp4', contentType: 'video/mp4', data: videoBuffer }
  );

  // Try Reels endpoint first, fall back to regular video
  let res = await fetch(`https://graph.facebook.com/v25.0/${pageId}/video_reels`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  });
  let data = await res.json();

  if (res.ok && !data.error) {
    console.log(`  [facebook-reel] ✅ Reel posted! ID: ${data.id}`);
    return { success: true, postId: data.id, postUrl: `https://www.facebook.com/reel/${data.id}` };
  }

  // Fallback to regular video post
  console.log(`  [facebook-reel] Reel endpoint failed, falling back to video post...`);
  return postVideo({ videoPath, caption });
}

module.exports = { postVideo, postReel, prepareForFacebook };
