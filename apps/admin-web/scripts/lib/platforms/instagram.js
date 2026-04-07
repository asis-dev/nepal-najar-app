/**
 * Instagram posting module — Reels via Facebook Graph API
 *
 * Prerequisites:
 * 1. Instagram Business Account linked to Facebook Page
 * 2. Add IG_USER_ID to .env.local (get via: GET /me/accounts?fields=instagram_business_account)
 * 3. FB_PAGE_ACCESS_TOKEN needs instagram_basic + instagram_content_publish permissions
 *
 * Flow: Upload video to public URL → Create container → Wait → Publish
 */

const { readFileSync, existsSync } = require('fs');

async function uploadToSupabaseStorage(videoPath) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const fileName = `reels/${Date.now()}-${require('path').basename(videoPath)}`;
  const videoBuffer = readFileSync(videoPath);

  const res = await fetch(`${url}/storage/v1/object/social-videos/${fileName}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'video/mp4',
      'x-upsert': 'true',
    },
    body: videoBuffer,
  });

  if (!res.ok) return null;
  return `${url}/storage/v1/object/public/social-videos/${fileName}`;
}

async function postReel({ videoPath, caption, videoUrl }) {
  const igUserId = process.env.IG_USER_ID;
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!igUserId || !token) return { success: false, error: 'Missing IG_USER_ID or FB_PAGE_ACCESS_TOKEN. Set up Instagram Business Account.' };
  if (!existsSync(videoPath) && !videoUrl) return { success: false, error: 'No video file or URL' };

  // Step 1: Get public video URL (Instagram requires URL, not file upload)
  let publicUrl = videoUrl;
  if (!publicUrl) {
    console.log(`  [instagram] Uploading to Supabase Storage for public URL...`);
    publicUrl = await uploadToSupabaseStorage(videoPath);
    if (!publicUrl) return { success: false, error: 'Could not upload to Supabase Storage. Create a "social-videos" bucket first.' };
  }

  // Step 2: Create media container
  console.log(`  [instagram] Creating Reel container...`);
  const createRes = await fetch(`https://graph.facebook.com/v25.0/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: token,
      media_type: 'REELS',
      video_url: publicUrl,
      caption,
      share_to_feed: true,
    }),
  });
  const createData = await createRes.json();
  if (!createRes.ok || createData.error) {
    return { success: false, error: createData.error?.message || 'Container creation failed' };
  }
  const containerId = createData.id;

  // Step 3: Wait for processing (poll every 5s, max 2 min)
  console.log(`  [instagram] Waiting for video processing...`);
  for (let i = 0; i < 24; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const statusRes = await fetch(`https://graph.facebook.com/v25.0/${containerId}?fields=status_code&access_token=${token}`);
    const statusData = await statusRes.json();
    if (statusData.status_code === 'FINISHED') break;
    if (statusData.status_code === 'ERROR') {
      return { success: false, error: 'Instagram video processing failed' };
    }
  }

  // Step 4: Publish
  console.log(`  [instagram] Publishing...`);
  const pubRes = await fetch(`https://graph.facebook.com/v25.0/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: token, creation_id: containerId }),
  });
  const pubData = await pubRes.json();
  if (!pubRes.ok || pubData.error) {
    return { success: false, error: pubData.error?.message || 'Publish failed' };
  }

  console.log(`  [instagram] ✅ Reel posted! ID: ${pubData.id}`);
  return { success: true, postId: pubData.id, postUrl: `https://www.instagram.com/reel/${pubData.id}/` };
}

module.exports = { postReel, uploadToSupabaseStorage };
