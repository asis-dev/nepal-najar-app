/**
 * Canonical narration script for "About this app" audio.
 * Keep this as the single source of truth, then regenerate
 * public/audio/about-en.mp3 and public/audio/about-ne.mp3.
 *
 * Regenerate: npx tsx scripts/generate-about-audio.ts
 */

export const ABOUT_AUDIO_SCRIPT = {
  en: `Welcome to Nepal Republic — an AI-powered citizen platform for Nepal.

Nepal Republic stands between you and Nepal's government. You describe what you need in plain language or voice, and AI handles the rest.

Here is what it does.

First, AI fills your forms. Whether it is a passport application, a driving license, land registration, or a hospital referral — you tell us what you need. AI identifies the right service from over 95 government services and fills out all the required forms for you.

Second, your case gets routed to the right desk. Nepal Republic has mapped 58 government authorities — ministries, departments, municipalities, hospitals, courts, and universities — with 87 active routes. Your request goes directly to the office responsible for it.

Third, every route has a deadline. From 1 hour for ambulance dispatch to 90 days for trademark registration. The system tracks these deadlines, sends warnings when they are approaching, and escalates when authorities miss them.

Fourth, government can respond directly. Authorities receive secure reply links. No login required on their side. They can approve, reject, update the status, or request more information. Every response is logged in your case history.

Now, here is what is already fully live and running every day.

The intelligence engine runs twice daily, scanning over 80 news sources, 17 YouTube channels, and social media across Nepal. It produces a daily intelligence brief with audio in both English and Nepali — covering what changed today, what ministers said, which promises moved, and which ones stalled.

109 government promises are tracked and scored with letter grades from A to F. Every commitment has progress data, evidence, and linked sources. You can see which ministers and ministries are delivering and which are falling behind.

The platform tracks what changed this week — new developments, contradictions between what officials say and what actually happens, corruption signals, and accountability updates. All sourced, all linked, all public record.

Report cards, minister scorecards, ministry performance, weekly summaries, and a searchable watchlist are all live and updated continuously.

The service operations side — AI form filling, case routing to government desks, SLA enforcement, and the partner reply system — is currently in beta. These features are live and growing every day, but some things may change as we improve. Your feedback helps shape what comes next.

Nepal Republic. AI between you and your government.`,

  ne: `नेपाल रिपब्लिकमा स्वागत छ — नेपालका नागरिकका लागि AI-संचालित प्लेटफर्म।

नेपाल रिपब्लिक तपाईं र नेपालको सरकारबीच बस्छ। तपाईंले आफ्नो आवश्यकता सरल भाषामा वा आवाजमा भन्नुहोस् — AI ले बाँकी सबै सम्हाल्छ।

यसले के गर्छ भने:

पहिलो, AI ले तपाईंको फारम भर्छ। पासपोर्ट, ड्राइभिङ लाइसेन्स, जग्गा दर्ता, वा अस्पताल रेफरल — जे चाहिन्छ भन्नुहोस्। AI ले ९५ भन्दा बढी सरकारी सेवाहरूबाट सही सेवा पहिचान गर्छ र सबै आवश्यक फारम तपाईंको लागि भर्छ।

दोस्रो, तपाईंको केस सही डेस्कमा पठाइन्छ। नेपाल रिपब्लिकले ५८ सरकारी निकायहरू जोडेको छ — मन्त्रालय, विभाग, नगरपालिका, अस्पताल, अदालत, र विश्वविद्यालय — ८७ सक्रिय मार्गहरूसहित। तपाईंको अनुरोध सिधै जिम्मेवार कार्यालयमा पुग्छ।

तेस्रो, हरेक मार्गमा समयसीमा हुन्छ। एम्बुलेन्सको लागि १ घण्टादेखि ट्रेडमार्क दर्ताको लागि ९० दिनसम्म। प्रणालीले यी समयसीमाहरू ट्र्याक गर्छ, नजिक आउँदा चेतावनी दिन्छ, र निकायले बेवास्ता गर्दा माथि पठाउँछ।

चौथो, सरकारले सिधै जवाफ दिन सक्छ। निकायहरूले सुरक्षित लिङ्कबाट जवाफ दिन्छन् — उनीहरूको तर्फबाट लगइन चाहिँदैन। स्वीकृत, अस्वीकृत, स्थिति अपडेट, वा थप जानकारी माग गर्न सक्छन्। हरेक जवाफ तपाईंको केस इतिहासमा रेकर्ड हुन्छ।

अब, के पूर्ण रूपमा सक्रिय छ र हरेक दिन चलिरहेको छ भन्ने कुरा:

बुद्धिमत्ता इन्जिन दिनमा दुई पटक चल्छ, नेपालभरका ८० भन्दा बढी समाचार स्रोत, १७ YouTube च्यानल, र सोसल मिडिया स्क्यान गर्दै। यसले अंग्रेजी र नेपाली दुवैमा अडियोसहित दैनिक बुद्धिमत्ता ब्रिफ उत्पादन गर्छ — आज के परिवर्तन भयो, मन्त्रीहरूले के भने, कुन वचन अगाडि बढ्यो, र कुन रोकियो।

१०९ सरकारी वचनहरूलाई A देखि F सम्म ग्रेड दिइन्छ। हरेक वचनमा प्रगति डेटा, प्रमाण, र स्रोत लिङ्कहरू छन्। कुन मन्त्री र मन्त्रालयले काम गरिरहेका छन् र कुन पछि परेका छन् हेर्न सकिन्छ।

प्लेटफर्मले यो हप्ता के परिवर्तन भयो भन्ने ट्र्याक गर्छ — नयाँ विकास, अधिकारीहरूको भनाइ र वास्तविकतामा विरोधाभास, भ्रष्टाचार संकेत, र जवाफदेहिता अपडेट। सबै स्रोतसहित, सबै जोडिएको, सबै सार्वजनिक अभिलेख।

रिपोर्ट कार्ड, मन्त्री स्कोरकार्ड, मन्त्रालय प्रदर्शन, साप्ताहिक सारांश, र खोज्न मिल्ने वाचलिस्ट सबै सक्रिय छन् र निरन्तर अपडेट हुन्छन्।

सेवा सञ्चालन पक्ष — AI फारम भर्ने, सरकारी डेस्कमा केस राउटिङ, SLA समयसीमा लागू, र साझेदार जवाफ प्रणाली — हाल बिटामा छ। यी सुविधाहरू सक्रिय छन् र हरेक दिन बढ्दैछन्, तर सुधार हुँदा केही परिवर्तन हुन सक्छन्। तपाईंको प्रतिक्रियाले अर्को चरण बनाउन मद्दत गर्छ।

नेपाल रिपब्लिक। तपाईं र तपाईंको सरकारबीचको AI।`,
} as const;
