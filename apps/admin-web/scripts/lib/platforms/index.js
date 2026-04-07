/**
 * Platform orchestrator — posts to all configured platforms
 *
 * Each platform module is optional — if credentials aren't set, it skips gracefully.
 * Results are logged to Supabase social_posts table.
 */

const facebook = require('./facebook');
const instagram = require('./instagram');
const tiktok = require('./tiktok');
const youtube = require('./youtube');
const twitter = require('./twitter');

const GOV_START = new Date('2026-03-26T00:00:00+05:45');

function dayInOffice() {
  return Math.max(1, Math.floor((Date.now() - GOV_START.getTime()) / 86400000) + 1);
}

function generateCaptions(lang = 'ne') {
  const day = dayInOffice();

  if (lang === 'ne') {
    return {
      reel: `📊 दिन ${day} — सरकारले आज के गर्यो?\n\n🔴 आजका मुख्य समाचार + १०९ वचनबद्धता ट्र्याकर + PM स्कोरकार्ड — सबै एकै ठाउँमा!\n\nAI ले हरेक दिन ट्र्याक गर्दैछ। ${day} दिनमा कति प्रगति?\n\n👉 nepalrepublic.org\n\nसरकारलाई कति अंक दिनुहुन्छ? कमेन्टमा भन्नुहोस् 👇`,
      short: `📊 दिन ${day} — सरकारको ${day} दिनको कार्यसम्पादन 🇳🇵\n\n👉 nepalrepublic.org`,
      tweet: `📊 दिन ${day} — सरकारले आज के गर्यो?\n\n🔴 AI ले ट्र्याक गरिरहेको छ!\n\n👉 nepalrepublic.org\n\n#नेपालरिपब्लिक #बालेनशाह #Day${day}`,
      hashtagsNe: ['#नेपालरिपब्लिक', '#बालेनशाह', '#सरकार', '#जवाफदेही', '#नेपाल', '#प्रधानमन्त्री', '#RSP', `#Day${day}`],
    };
  }

  return {
    reel: `📊 Day ${day} — What has Nepal's government done today?\n\n🔴 Top headlines + 109 promise tracker + PM scorecard — all in 60 seconds!\n\nAI-powered daily accountability tracker.\n\n👉 nepalrepublic.org\n\nHow would you grade this government? Drop your score 👇`,
    short: `📊 Day ${day} — Nepal Government Accountability Check 🇳🇵\n\n👉 nepalrepublic.org`,
    tweet: `📊 Day ${day} — Nepal's government accountability update.\n\nAI tracking 109 promises in real-time.\n\n👉 nepalrepublic.org\n\n#NepalRepublic #Nepal #BalenShah #Day${day}`,
    hashtagsEn: ['#NepalRepublic', '#Nepal', '#BalenShah', '#GovernmentTracker', '#Accountability', '#AI', `#Day${day}`, '#RSP', '#NepalPolitics'],
  };
}

async function postToAllPlatforms({ videoPath, lang = 'ne', date }) {
  const captions = generateCaptions(lang);
  const results = {};

  console.log(`\n📱 Posting ${lang.toUpperCase()} reel to all platforms...\n`);

  // Facebook — always try (primary platform)
  try {
    results.facebook = await facebook.postReel({ videoPath, caption: captions.reel });
  } catch (err) {
    results.facebook = { success: false, error: err.message };
  }

  // Instagram — try if configured
  try {
    results.instagram = await instagram.postReel({ videoPath, caption: captions.reel + '\n\n' + (captions.hashtagsNe || captions.hashtagsEn || []).join(' ') });
  } catch (err) {
    results.instagram = { success: false, error: err.message };
  }

  // TikTok — try if configured
  try {
    results.tiktok = await tiktok.postVideo({ videoPath, caption: captions.short });
  } catch (err) {
    results.tiktok = { success: false, error: err.message };
  }

  // YouTube Shorts — try if configured
  try {
    results.youtube = await youtube.postShort({
      videoPath,
      caption: captions.reel,
      hashtags: captions.hashtagsEn || captions.hashtagsNe || [],
    });
  } catch (err) {
    results.youtube = { success: false, error: err.message };
  }

  // X/Twitter — try if configured
  try {
    results.twitter = await twitter.postVideo({ videoPath, caption: captions.tweet });
  } catch (err) {
    results.twitter = { success: false, error: err.message };
  }

  // Log results
  console.log(`\n📊 Posting results:`);
  for (const [platform, result] of Object.entries(results)) {
    console.log(`  ${result.success ? '✅' : '❌'} ${platform}: ${result.success ? result.postUrl || result.postId : result.error?.slice(0, 80)}`);
  }

  // Save to Supabase
  await logToSupabase(results, lang, date);

  return results;
}

async function logToSupabase(results, lang, date) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  const rows = Object.entries(results).map(([platform, result]) => ({
    date,
    platform,
    content_type: 'reel',
    language: lang,
    post_id: result.postId || null,
    post_url: result.postUrl || null,
    status: result.success ? 'posted' : 'failed',
    error_message: result.error || null,
    posted_at: result.success ? new Date().toISOString() : null,
  }));

  try {
    await fetch(`${url}/rest/v1/social_posts`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(rows),
    });
  } catch {}
}

module.exports = { postToAllPlatforms, generateCaptions };
