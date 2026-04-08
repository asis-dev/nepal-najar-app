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

async function fetchBrief(date) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/daily_briefs?date=eq.${date}&select=*&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const rows = await res.json();
    return rows?.[0] || null;
  } catch { return null; }
}

function clean(s, max = 180) {
  if (!s) return '';
  s = String(s).replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

async function generateCaptions(lang = 'ne', date) {
  const day = dayInOffice();
  date = date || new Date().toISOString().slice(0, 10);
  const brief = await fetchBrief(date);

  const stories = brief?.top_stories || [];
  const moved = brief?.commitments_moved || [];
  const score = brief?.republic_score ?? brief?.ghanti_score;
  const grade = brief?.grade;
  const nStarted = stories.length;

  // Pick top 3 headlines
  const titles = stories.slice(0, 3).map(s => lang === 'ne' ? (s.title_ne || s.title) : (s.title_en || s.title)).filter(Boolean);
  const top1 = clean(titles[0], 140);
  const top2 = clean(titles[1], 120);
  const top3 = clean(titles[2], 120);

  const movedCount = moved.length;
  const scoreLine = (score != null)
    ? (lang === 'ne'
        ? `📊 आजको रिपब्लिक स्कोर: ${score}/100${grade ? ` (${grade})` : ''}`
        : `📊 Today's Republic Score: ${score}/100${grade ? ` (${grade})` : ''}`)
    : '';

  if (lang === 'ne') {
    const headlines = [top1, top2, top3].filter(Boolean).map((t, i) => `${i + 1}️⃣ ${t}`).join('\n');
    const movedLine = movedCount > 0 ? `\n📌 ${movedCount} वचनबद्धतामा प्रगति` : '';
    const reel = [
      `🇳🇵 दिन ${day} — सरकार जवाफदेही रिपोर्ट`,
      scoreLine,
      '',
      headlines || 'आजको मुख्य समाचार भिडियोमा हेर्नुहोस् 👆',
      movedLine,
      '',
      '🤖 AI ले हरेक दिन १०९ वचनबद्धता ट्र्याक गर्दैछ',
      '👉 nepalrepublic.org',
      '',
      'सरकारलाई कति अंक दिनुहुन्छ? कमेन्टमा भन्नुहोस् 👇',
      '',
      '#नेपालरिपब्लिक #बालेनशाह #नेपाल #सरकार #जवाफदेही #RSP #Day' + day,
    ].filter(Boolean).join('\n');

    return {
      reel,
      short: `दिन ${day} 🇳🇵 ${top1 || 'नेपाल सरकार अपडेट'}\n${scoreLine}\n👉 nepalrepublic.org`,
      tweet: clean(`दिन ${day}: ${top1 || 'सरकार अपडेट'}\n${scoreLine}\n👉 nepalrepublic.org\n#नेपालरिपब्लिक #Day${day}`, 270),
      hashtagsNe: ['#नेपालरिपब्लिक', '#बालेनशाह', '#सरकार', '#जवाफदेही', '#नेपाल', '#RSP', `#Day${day}`],
    };
  }

  const headlines = [top1, top2, top3].filter(Boolean).map((t, i) => `${i + 1}️⃣ ${t}`).join('\n');
  const movedLine = movedCount > 0 ? `\n📌 ${movedCount} commitments moved today` : '';
  const reel = [
    `🇳🇵 Day ${day} — Nepal Government Accountability Report`,
    scoreLine,
    '',
    headlines || "Today's top stories in the video 👆",
    movedLine,
    '',
    '🤖 AI tracking all 109 RSP promises in real-time',
    '👉 nepalrepublic.org',
    '',
    'How would you grade this government? Drop your score 👇',
    '',
    '#NepalRepublic #BalenShah #Nepal #Accountability #RSP #Day' + day,
  ].filter(Boolean).join('\n');

  return {
    reel,
    short: `Day ${day} 🇳🇵 ${top1 || 'Nepal Government Update'}\n${scoreLine}\n👉 nepalrepublic.org`,
    tweet: clean(`Day ${day}: ${top1 || 'Nepal government update'}\n${scoreLine}\n👉 nepalrepublic.org\n#NepalRepublic #Day${day}`, 270),
    hashtagsEn: ['#NepalRepublic', '#Nepal', '#BalenShah', '#Accountability', '#RSP', `#Day${day}`, '#NepalPolitics'],
  };
}

async function postToAllPlatforms({ videoPath, lang = 'ne', date }) {
  const captions = await generateCaptions(lang, date);
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
