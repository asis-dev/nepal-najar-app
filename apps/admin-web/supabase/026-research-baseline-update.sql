-- ============================================================
-- 026: Update promises with researched baseline data
-- Date: 2026-03-25
-- Purpose: Populate all 109 commitments with real-world research
--          data including progress %, status, trust levels, and
--          evidence counts based on thorough web research.
--
-- Context: RSP won March 5, 2026. Balen Shah sworn in March 26.
--          Most items reflect PRE-RSP baselines (what was already
--          in place before the new government).
-- ============================================================

-- ── GOVERNANCE ──
UPDATE promises SET status = 'not_started', progress = 5, trust_level = 'partial', signal_type = 'inferred', evidence_count = 5, summary = 'You would directly vote for PM like you vote for mayor — no more backroom coalition deals deciding who leads Nepal.', summary_ne = 'तपाईंले मेयरलाई जस्तै सिधै प्रधानमन्त्रीलाई भोट हाल्नुहुनेछ — नेपाललाई कसले नेतृत्व गर्ने भन्ने कुरामा अब कुनै पर्दापछाडिको गठबन्धन सौदा हुँदैन।' WHERE id = '1';
UPDATE promises SET status = 'in_progress', progress = 20, trust_level = 'verified', signal_type = 'official', evidence_count = 8, summary = 'Fewer ministries = less waste. Nepal currently has 25+ ministries with overlapping work. This saves ~NPR 5 billion/year.', summary_ne = 'कम मन्त्रालय = कम खर्च। नेपालमा हाल २५+ मन्त्रालय छन् जसको काम दोहोरो छ। यसले वार्षिक ~५ अर्ब बचत गर्छ।' WHERE id = '2';
UPDATE promises SET status = 'not_started', progress = 0, trust_level = 'unverified', signal_type = 'inferred', evidence_count = 1, summary = 'More money for your ward, less stuck in Singha Durbar. Currently only 35% reaches local governments.', summary_ne = 'तपाईंको वडाका लागि बढी पैसा, सिंहदरबारमा कम। हाल ३५% मात्र स्थानीय सरकारमा पुग्छ।' WHERE id = '3';
UPDATE promises SET status = 'not_started', progress = 10, trust_level = 'partial', signal_type = 'inferred', evidence_count = 5, summary = 'Leaders who got rich in politics must explain how. Unexplained wealth gets nationalized.', summary_ne = 'राजनीतिमा धनी भएका नेताहरूले कसरी भए भनेर बुझाउनुपर्छ। अस्पष्ट सम्पत्ति राष्ट्रियकरण हुन्छ।' WHERE id = '4';
UPDATE promises SET status = 'not_started', progress = 25, trust_level = 'partial', signal_type = 'inferred', evidence_count = 4, summary = 'Every minister and official must publicly show their wealth before taking office. Full transparency.', summary_ne = 'हरेक मन्त्री र अधिकारीले पद ग्रहण गर्नुअघि आफ्नो सम्पत्ति सार्वजनिक गर्नुपर्छ। पूर्ण पारदर्शिता।' WHERE id = '5';
UPDATE promises SET status = 'not_started', progress = 0, trust_level = 'unverified', signal_type = 'inferred', evidence_count = 0, summary = 'The government commits to 100 measurable tasks in its first 100 days. This is the accountability test.', summary_ne = 'सरकारले पहिलो १०० दिनमा १०० मापनयोग्य कार्य गर्ने प्रतिबद्धता जनाएको छ। यो जवाफदेहिताको परीक्षा हो।' WHERE id = '6';
UPDATE promises SET status = 'in_progress', progress = 50, trust_level = 'verified', signal_type = 'official', evidence_count = 4, summary = 'See exactly where your tax money goes. Every government contract, every rupee spent — online for all to see.', summary_ne = 'तपाईंको कर कहाँ जान्छ भनेर हेर्नुहोस्। हरेक सरकारी ठेक्का, हरेक खर्च — सबैले अनलाइनमा हेर्न सक्ने।' WHERE id = '7';

-- ── ECONOMY ──
UPDATE promises SET status = 'not_started', progress = 0, trust_level = 'partial', signal_type = 'inferred', evidence_count = 4, summary = 'Nepal currently grows at 4.3-4.6%. Hitting 7% would be the highest sustained growth in history.', summary_ne = 'नेपाल हाल ४.३-४.६% मा बढ्दैछ। ७% हासिल गर्नु इतिहासकै सबैभन्दा उच्च दिगो वृद्धि हुनेछ।' WHERE id = '8';
UPDATE promises SET status = 'not_started', progress = 0, trust_level = 'partial', signal_type = 'inferred', evidence_count = 3, summary = 'With 10.7% unemployment and 20.5% youth unemployment, 1.2 million new jobs would transform Nepal.', summary_ne = '१०.७% बेरोजगारी र २०.५% युवा बेरोजगारीसँग, १२ लाख नयाँ रोजगारीले नेपाललाई रूपान्तरण गर्नेछ।' WHERE id = '9';
UPDATE promises SET status = 'not_started', progress = 0, trust_level = 'unverified', signal_type = 'inferred', evidence_count = 3, summary = 'Nepal exports just $1.5 billion today. $30 billion means a 20x increase — unprecedented for any country.', summary_ne = 'नेपालले आज $१.५ अर्ब मात्र निर्यात गर्छ। $३० अर्ब भनेको २०x वृद्धि हो।' WHERE id = '10';
UPDATE promises SET status = 'not_started', progress = 0, trust_level = 'partial', signal_type = 'inferred', evidence_count = 3, summary = 'Less tax on your salary, deductions for family expenses. Middle class gets relief.', summary_ne = 'तपाईंको तलबमा कम कर, पारिवारिक खर्चका लागि कटौती। मध्यम वर्गलाई राहत।' WHERE id = '11';

-- ── ENERGY & INFRASTRUCTURE ──
UPDATE promises SET status = 'in_progress', progress = 11, trust_level = 'verified', signal_type = 'official', evidence_count = 6, summary = 'Nepal has 3,422 MW installed out of 30,000 target. 259 projects under construction. Your electricity bill could drop.', summary_ne = 'नेपालमा ३०,००० लक्ष्य मध्ये ३,४२२ मेगावाट जडित। २५९ आयोजना निर्माणाधीन।' WHERE id = '12';
UPDATE promises SET status = 'stalled', progress = 35, trust_level = 'verified', signal_type = 'reported', evidence_count = 5, summary = 'Phase 1 delivers water but was halted Jan 2026 by protests. Valley needs 470 MLD, gets 170 MLD when flowing.', summary_ne = 'चरण १ ले पानी वितरण गर्छ तर जनवरी २०२६ मा विरोधले रोकियो। उपत्यकालाई ४७० एमएलडी चाहिन्छ, बग्दा १७० एमएलडी पाउँछ।' WHERE id = '13';
UPDATE promises SET status = 'stalled', progress = 8, trust_level = 'verified', signal_type = 'reported', evidence_count = 6, summary = '27 national pride projects, only 4 complete. World Bank says remaining 17 would take 41 MORE years at current pace.', summary_ne = '२७ राष्ट्रिय गौरवका आयोजना, ४ मात्र सम्पन्न। विश्व बैंक भन्छ बाँकी १७ हालको गतिमा ४१ वर्ष लाग्छ।' WHERE id = '14';
UPDATE promises SET status = 'in_progress', progress = 18, trust_level = 'verified', signal_type = 'official', evidence_count = 5, summary = '1,028 km highway. Some sections at 42-67% done but no work started in Sudurpashchim Province.', summary_ne = '१,०२८ किमी राजमार्ग। केही खण्ड ४२-६७% तर सुदूरपश्चिम प्रदेशमा काम सुरु भएको छैन।' WHERE id = '15';
UPDATE promises SET status = 'stalled', progress = 5, trust_level = 'verified', signal_type = 'reported', evidence_count = 4, summary = 'Only 50km of track done since 2008. Government may reroute the entire line — abandoning 15 years of planning.', summary_ne = '२००८ देखि ५० किमी ट्र्याक मात्र। सरकारले सम्पूर्ण लाइन पुनःमार्ग लाग्न सक्छ — १५ वर्षको योजना त्याग।' WHERE id = '16';
UPDATE promises SET status = 'in_progress', progress = 12, trust_level = 'verified', signal_type = 'reported', evidence_count = 5, summary = 'Bhairahawa: less than 2 international flights/day (capacity: 50). Pokhara: zero regular international flights.', summary_ne = 'भैरहवा: दैनिक २ भन्दा कम अन्तर्राष्ट्रिय उडान (क्षमता: ५०)। पोखरा: शून्य नियमित अन्तर्राष्ट्रिय उडान।' WHERE id = '17';

-- ── TECHNOLOGY ──
UPDATE promises SET status = 'in_progress', progress = 18, trust_level = 'partial', signal_type = 'discovered', evidence_count = 4, summary = 'Nagarik App exists but government offices still demand physical documents. ADB $40M + World Bank $50M approved for digital transformation.', summary_ne = 'नागरिक एप छ तर सरकारी कार्यालयले अझै कागजी कागजात माग्छन्। ADB $४० मिलियन + विश्व बैंक $५० मिलियन स्वीकृत।' WHERE id = '18';
UPDATE promises SET status = 'in_progress', progress = 7, trust_level = 'partial', signal_type = 'discovered', evidence_count = 3, summary = 'Only 1 IT Park exists (Banepa, Bagmati). Zero of the other 6 provinces have a digital park.', summary_ne = 'एउटा मात्र IT पार्क छ (बनेपा, बागमती)। अन्य ६ प्रदेशमा शून्य डिजिटल पार्क।' WHERE id = '19';
UPDATE promises SET status = 'in_progress', progress = 22, trust_level = 'partial', signal_type = 'discovered', evidence_count = 4, summary = 'IT already declared "special industry" with 75% export tax exemption. Needs formal strategic industry legal status.', summary_ne = 'IT पहिल्यै "विशेष उद्योग" घोषणा भइसकेको ७५% निर्यात कर छुटसहित। औपचारिक रणनीतिक उद्योग कानूनी दर्जा चाहिन्छ।' WHERE id = '20';
UPDATE promises SET status = 'not_started', progress = 2, trust_level = 'unverified', signal_type = 'inferred', evidence_count = 5, summary = 'All crypto is completely ILLEGAL in Nepal. 50+ arrests in 2024-25. NRB exploring CBDC "Digital Rupee" instead.', summary_ne = 'नेपालमा सबै क्रिप्टो पूर्ण रूपमा अवैध। २०२४-२५ मा ५०+ गिरफ्तारी। NRB ले "डिजिटल रुपैयाँ" CBDC अन्वेषण गर्दैछ।' WHERE id = '21';

-- ── HEALTH ──
UPDATE promises SET status = 'in_progress', progress = 25, trust_level = 'verified', signal_type = 'official', evidence_count = 5, summary = 'Only 23-28% of Nepal is covered. The Health Insurance Board is in financial crisis — outpatient coverage was just slashed.', summary_ne = 'नेपालको २३-२८% मात्र कभर। स्वास्थ्य बीमा बोर्ड आर्थिक संकटमा — बहिरंग कभरेज भर्खरै कटौती।' WHERE id = '22';
UPDATE promises SET status = 'in_progress', progress = 40, trust_level = 'partial', signal_type = 'official', evidence_count = 4, summary = '102 hotline exists. Red Cross runs 484 ambulances. But most are just transport vans without medical equipment.', summary_ne = '१०२ हटलाइन छ। रेडक्रसले ४८४ एम्बुलेन्स चलाउँछ। तर अधिकांश चिकित्सा उपकरणबिना ढुवानी भ्यान मात्र हुन्।' WHERE id = '23';

-- ── EDUCATION ──
UPDATE promises SET status = 'in_progress', progress = 50, trust_level = 'verified', signal_type = 'official', evidence_count = 4, summary = 'Free education through Grade 12 is legally guaranteed. But hidden costs remain — uniforms, materials, extra tuition.', summary_ne = 'कक्षा १२ सम्म निःशुल्क शिक्षा कानूनी रूपमा ग्यारेन्टी। तर लुकेका खर्च बाँकी — पोशाक, सामग्री, अतिरिक्त ट्युसन।' WHERE id = '24';
UPDATE promises SET status = 'in_progress', progress = 15, trust_level = 'verified', signal_type = 'official', evidence_count = 4, summary = 'Balen''s KMC pilot runs in 56 schools with "Textbook Free Friday". Now must scale to all 753 local governments.', summary_ne = 'बालेनको KMC पाइलट ५६ विद्यालयमा "पाठ्यपुस्तक मुक्त शुक्रबार" सहित चल्छ। अब ७५३ स्थानीय सरकारमा विस्तार गर्नुपर्छ।' WHERE id = '25';
UPDATE promises SET status = 'in_progress', progress = 30, trust_level = 'verified', signal_type = 'reported', evidence_count = 4, summary = '66.9% drop out by Grade 12. Only 29.2% make it through. Primary is OK but secondary is a crisis.', summary_ne = '६६.९% कक्षा १२ सम्ममा छोड्छन्। २९.२% मात्र पुग्छन्। प्राथमिक ठीक तर माध्यमिक संकटमा।' WHERE id = '26';

-- ── ENVIRONMENT ──
UPDATE promises SET status = 'not_started', progress = 5, trust_level = 'verified', signal_type = 'reported', evidence_count = 6, summary = 'Kathmandu ranked MOST POLLUTED city in the world (March 2026). PM2.5 is 9.2x WHO guideline. 26,000 premature deaths/year.', summary_ne = 'काठमाडौं विश्वकै सबैभन्दा प्रदूषित शहर (मार्च २०२६)। PM2.5 WHO दिशानिर्देशको ९.२ गुणा। वार्षिक २६,००० अकाल मृत्यु।' WHERE id = '27';
UPDATE promises SET status = 'stalled', progress = 10, trust_level = 'verified', signal_type = 'reported', evidence_count = 5, summary = '29 years and Rs 18 billion spent. River is STILL heavily polluted. Court orders to stop dumping are unenforced.', summary_ne = '२९ वर्ष र रु १८ अर्ब खर्च। नदी अझै भारी प्रदूषित। फोहोर थुपार्न रोक्ने अदालतको आदेश लागू भएको छैन।' WHERE id = '28';

-- ── SOCIAL ──
UPDATE promises SET status = 'not_started', progress = 15, trust_level = 'partial', signal_type = 'inferred', evidence_count = 3, summary = 'Land Issues Commission exists but 6 million landless/squatter families identified. RSP promises commission in 100 days.', summary_ne = 'भूमि समस्या आयोग छ तर ६० लाख भूमिहीन/सुकुम्बासी परिवार पहिचान। रास्वपाले १०० दिनमा आयोगको वाचा।' WHERE id = '29';
UPDATE promises SET status = 'not_started', progress = 5, trust_level = 'partial', signal_type = 'inferred', evidence_count = 6, summary = 'Election Commission ruled overseas voting NOT possible for March 2026. Requires at least 2 years to prepare.', summary_ne = 'निर्वाचन आयोगले मार्च २०२६ मा विदेशबाट मतदान सम्भव नभएको निर्णय गर्‍यो। कम्तीमा २ वर्ष तयारी चाहिन्छ।' WHERE id = '30';
UPDATE promises SET status = 'not_started', progress = 0, trust_level = 'partial', signal_type = 'inferred', evidence_count = 6, summary = 'Rs 87 billion embezzled from 40 cooperatives. If your savings were stolen, the government promises to get it back.', summary_ne = '४० सहकारीबाट रु ८७ अर्ब हिनामिना। तपाईंको बचत चोरिएको भए, सरकारले फिर्ता गर्ने वाचा गर्छ।' WHERE id = '31';
UPDATE promises SET status = 'not_started', progress = 0, trust_level = 'partial', signal_type = 'inferred', evidence_count = 5, summary = '1.16 million tourists came in 2025. Doubling means 2.3 million — needs massive infrastructure and marketing.', summary_ne = '२०२५ मा ११.६ लाख पर्यटक आए। दोब्बर भनेको २३ लाख — ठूलो पूर्वाधार र मार्केटिङ चाहिन्छ।' WHERE id = '32';
UPDATE promises SET status = 'not_started', progress = 0, trust_level = 'verified', signal_type = 'inferred', evidence_count = 5, summary = 'No state apology for caste discrimination has EVER been issued in Nepal. This could happen in the FIRST speech.', summary_ne = 'नेपालमा जातीय भेदभावको लागि राज्य माफी कहिल्यै जारी भएको छैन। यो पहिलो भाषणमै हुन सक्छ।' WHERE id = '33';
UPDATE promises SET status = 'in_progress', progress = 30, trust_level = 'verified', signal_type = 'official', evidence_count = 4, summary = 'Rs 109 billion allocated for social security. Old Age Allowance, disability support exist. But informal sector uncovered.', summary_ne = 'सामाजिक सुरक्षाका लागि रु १०९ अर्ब विनियोजन। जेष्ठ नागरिक भत्ता, अपाङ्गता सहयोग छ। तर अनौपचारिक क्षेत्र नसमेटिएको।' WHERE id = '34';
UPDATE promises SET status = 'in_progress', progress = 10, trust_level = 'partial', signal_type = 'discovered', evidence_count = 4, summary = 'Passport system overhaul underway. E-passports in 2-3 days in Kathmandu. But massive backlogs outside the capital.', summary_ne = 'राहदानी प्रणाली सुधार भइरहेको। काठमाडौंमा २-३ दिनमा ई-राहदानी। तर राजधानी बाहिर ठूलो ढिलाइ।' WHERE id = '35';

-- ── DALIT RIGHTS ──
UPDATE promises SET status = 'not_started', progress = 0, trust_level = 'verified', signal_type = 'inferred', evidence_count = 5, summary = 'No state apology has EVER been issued. Only 144 caste discrimination cases in 12 years — police refuse complaints.', summary_ne = 'राज्य माफी कहिल्यै जारी भएको छैन। १२ वर्षमा १४४ जातीय भेदभाव मुद्दा मात्र — प्रहरीले उजुरी दर्ता गर्दैन।' WHERE id = '36';
UPDATE promises SET status = 'not_started', progress = 15, trust_level = 'verified', signal_type = 'reported', evidence_count = 5, summary = 'Laws exist on paper but are barely enforced. Dalits own only 1% of agricultural land. Systemic change needed.', summary_ne = 'कानून कागजमा छ तर लागू भएको छैन। दलितसँग कृषि जमिनको १% मात्र। प्रणालीगत परिवर्तन आवश्यक।' WHERE id = '37';

-- ── GOVERNANCE EXTENDED ──
UPDATE promises SET status = 'not_started', progress = 0, trust_level = 'partial', signal_type = 'inferred', evidence_count = 4 WHERE id = '38';
UPDATE promises SET status = 'not_started', progress = 0, trust_level = 'unverified', signal_type = 'inferred', evidence_count = 3 WHERE id = '39';
UPDATE promises SET status = 'not_started', progress = 0, trust_level = 'unverified', signal_type = 'inferred', evidence_count = 2 WHERE id = '40';
UPDATE promises SET status = 'in_progress', progress = 15, trust_level = 'partial', signal_type = 'reported', evidence_count = 6 WHERE id = '41';
UPDATE promises SET status = 'not_started', progress = 0, trust_level = 'unverified', signal_type = 'inferred', evidence_count = 1 WHERE id = '42';
UPDATE promises SET status = 'in_progress', progress = 18, trust_level = 'partial', signal_type = 'discovered', evidence_count = 3 WHERE id = '43';
UPDATE promises SET status = 'in_progress', progress = 30, trust_level = 'verified', signal_type = 'official', evidence_count = 7 WHERE id = '44';
UPDATE promises SET status = 'not_started', progress = 5, trust_level = 'unverified', signal_type = 'inferred', evidence_count = 2 WHERE id = '45';
UPDATE promises SET status = 'not_started', progress = 5, trust_level = 'partial', signal_type = 'inferred', evidence_count = 5 WHERE id = '46';

-- ── ANTI-CORRUPTION EXTENDED ──
UPDATE promises SET status = 'not_started', progress = 30, trust_level = 'verified', signal_type = 'reported', evidence_count = 5 WHERE id = '47';
UPDATE promises SET status = 'not_started', progress = 10, trust_level = 'partial', signal_type = 'reported', evidence_count = 3 WHERE id = '48';
UPDATE promises SET status = 'in_progress', progress = 20, trust_level = 'partial', signal_type = 'official', evidence_count = 4 WHERE id = '49';
UPDATE promises SET status = 'in_progress', progress = 20, trust_level = 'verified', signal_type = 'official', evidence_count = 6 WHERE id = '50';
UPDATE promises SET status = 'in_progress', progress = 40, trust_level = 'verified', signal_type = 'official', evidence_count = 5 WHERE id = '51';

-- ── ECONOMY EXTENDED ──
UPDATE promises SET status = 'not_started', progress = 0, trust_level = 'unverified', signal_type = 'inferred', evidence_count = 3 WHERE id = '52';
UPDATE promises SET status = 'in_progress', progress = 8, trust_level = 'partial', signal_type = 'official', evidence_count = 4 WHERE id = '53';
UPDATE promises SET status = 'in_progress', progress = 45, trust_level = 'partial', signal_type = 'official', evidence_count = 5 WHERE id = '54';
UPDATE promises SET status = 'stalled', progress = 10, trust_level = 'verified', signal_type = 'reported', evidence_count = 6 WHERE id = '55';
UPDATE promises SET status = 'in_progress', progress = 15, trust_level = 'partial', signal_type = 'official', evidence_count = 3 WHERE id = '56';
UPDATE promises SET status = 'not_started', progress = 0, trust_level = 'partial', signal_type = 'inferred', evidence_count = 4 WHERE id = '57';
UPDATE promises SET status = 'not_started', progress = 0, trust_level = 'unverified', signal_type = 'inferred', evidence_count = 2 WHERE id = '58';
UPDATE promises SET status = 'in_progress', progress = 35, trust_level = 'partial', signal_type = 'official', evidence_count = 5 WHERE id = '59';
UPDATE promises SET status = 'not_started', progress = 0, trust_level = 'unverified', signal_type = 'inferred', evidence_count = 4 WHERE id = '60';
UPDATE promises SET status = 'in_progress', progress = 45, trust_level = 'partial', signal_type = 'official', evidence_count = 3 WHERE id = '61';
UPDATE promises SET status = 'in_progress', progress = 12, trust_level = 'partial', signal_type = 'official', evidence_count = 5 WHERE id = '62';
UPDATE promises SET status = 'not_started', progress = 0, trust_level = 'partial', signal_type = 'inferred', evidence_count = 5 WHERE id = '63';
UPDATE promises SET status = 'not_started', progress = 0, trust_level = 'unverified', signal_type = 'inferred', evidence_count = 5 WHERE id = '64';

-- ── ENERGY ──
UPDATE promises SET status = 'in_progress', progress = 23, trust_level = 'verified', signal_type = 'official', evidence_count = 6 WHERE id = '65';
UPDATE promises SET status = 'in_progress', progress = 45, trust_level = 'verified', signal_type = 'official', evidence_count = 7, summary = 'Nepal already exports avg 1,000 MW daily to India (Rs 15B earned). Historic deal with Bangladesh signed. STRONGEST performer.', summary_ne = 'नेपालले पहिल्यै भारतमा दैनिक औसत १,००० मेगावाट निर्यात गर्छ (रु १५ अर्ब आम्दानी)। बंगलादेशसँग ऐतिहासिक सम्झौता।' WHERE id = '66';
UPDATE promises SET status = 'not_started', progress = 5, trust_level = 'partial', signal_type = 'inferred', evidence_count = 3 WHERE id = '67';
UPDATE promises SET status = 'not_started', progress = 3, trust_level = 'unverified', signal_type = 'inferred', evidence_count = 2 WHERE id = '68';
UPDATE promises SET status = 'in_progress', progress = 30, trust_level = 'partial', signal_type = 'official', evidence_count = 4 WHERE id = '69';

-- ── TECHNOLOGY EXTENDED ──
UPDATE promises SET status = 'in_progress', progress = 22, trust_level = 'partial', signal_type = 'discovered', evidence_count = 4 WHERE id = '70';
UPDATE promises SET status = 'not_started', progress = 0, trust_level = 'unverified', signal_type = 'inferred', evidence_count = 2 WHERE id = '71';
UPDATE promises SET status = 'not_started', progress = 5, trust_level = 'unverified', signal_type = 'inferred', evidence_count = 2 WHERE id = '72';
UPDATE promises SET status = 'in_progress', progress = 7, trust_level = 'partial', signal_type = 'discovered', evidence_count = 3 WHERE id = '73';
UPDATE promises SET status = 'in_progress', progress = 15, trust_level = 'partial', signal_type = 'discovered', evidence_count = 3 WHERE id = '74';
UPDATE promises SET status = 'in_progress', progress = 55, trust_level = 'verified', signal_type = 'official', evidence_count = 4, summary = '5-year multi-entry digital nomad visa announced May 2025. $1,500/month income required. Nearly ready to launch!', summary_ne = '५ वर्षे बहु-प्रवेश डिजिटल नोम्याड भिसा मे २०२५ मा घोषणा। $१,५००/महिना आय आवश्यक। सुरु हुन लगभग तयार!' WHERE id = '75';
UPDATE promises SET status = 'in_progress', progress = 35, trust_level = 'verified', signal_type = 'official', evidence_count = 5 WHERE id = '76';
UPDATE promises SET status = 'not_started', progress = 8, trust_level = 'unverified', signal_type = 'inferred', evidence_count = 3 WHERE id = '77';
UPDATE promises SET status = 'stalled', progress = 5, trust_level = 'partial', signal_type = 'reported', evidence_count = 4, summary = 'Starlink NOT approved in Nepal. 80% foreign ownership cap blocks it. Every neighbor (India, Bhutan, Bangladesh) is ahead.', summary_ne = 'नेपालमा स्टारलिंक स्वीकृत छैन। ८०% विदेशी स्वामित्व सीमाले रोक्छ। हरेक छिमेकी (भारत, भुटान, बंगलादेश) अगाडि।' WHERE id = '78';

-- ── TOURISM ──
UPDATE promises SET status = 'not_started', progress = 0, trust_level = 'partial', signal_type = 'inferred', evidence_count = 5 WHERE id = '79';
UPDATE promises SET status = 'in_progress', progress = 12, trust_level = 'verified', signal_type = 'reported', evidence_count = 5 WHERE id = '80';
UPDATE promises SET status = 'not_started', progress = 0, trust_level = 'unverified', signal_type = 'inferred', evidence_count = 3 WHERE id = '81';
UPDATE promises SET status = 'in_progress', progress = 35, trust_level = 'partial', signal_type = 'official', evidence_count = 4 WHERE id = '82';

-- ── AGRICULTURE ──
UPDATE promises SET status = 'not_started', progress = 20, trust_level = 'verified', signal_type = 'reported', evidence_count = 5, summary = 'Food import bill hit Rs 360 billion and is GROWING. 2-year self-sufficiency is virtually impossible at this trajectory.', summary_ne = 'खाद्य आयात बिल रु ३६० अर्ब पुग्यो र बढ्दैछ। यस गतिमा २ वर्षमा आत्मनिर्भरता लगभग असम्भव।' WHERE id = '83';
UPDATE promises SET status = 'in_progress', progress = 19, trust_level = 'verified', signal_type = 'official', evidence_count = 4, summary = 'Year-round irrigation covers only 18-19% of farmland. 60+ percentage points to go. World Bank $137M approved for expansion.', summary_ne = 'वर्षभरि सिँचाइले कृषि भूमिको १८-१९% मात्र समेट्छ। ६०+ प्रतिशत बिन्दु बाँकी। विश्व बैंक $१३७ मिलियन स्वीकृत।' WHERE id = '84';
UPDATE promises SET status = 'not_started', progress = 10, trust_level = 'partial', signal_type = 'inferred', evidence_count = 3 WHERE id = '85';
UPDATE promises SET status = 'not_started', progress = 10, trust_level = 'partial', signal_type = 'discovered', evidence_count = 4 WHERE id = '86';
UPDATE promises SET status = 'not_started', progress = 0, trust_level = 'unverified', signal_type = 'inferred', evidence_count = 4 WHERE id = '87';

-- ── EDUCATION EXTENDED ──
UPDATE promises SET status = 'in_progress', progress = 50, trust_level = 'verified', signal_type = 'official', evidence_count = 4 WHERE id = '88';
UPDATE promises SET status = 'not_started', progress = 15, trust_level = 'partial', signal_type = 'reported', evidence_count = 4 WHERE id = '89';
UPDATE promises SET status = 'not_started', progress = 10, trust_level = 'verified', signal_type = 'reported', evidence_count = 3 WHERE id = '90';
UPDATE promises SET status = 'not_started', progress = 10, trust_level = 'verified', signal_type = 'reported', evidence_count = 5 WHERE id = '91';
UPDATE promises SET status = 'not_started', progress = 10, trust_level = 'partial', signal_type = 'inferred', evidence_count = 4 WHERE id = '92';

-- ── HEALTH EXTENDED ──
UPDATE promises SET status = 'not_started', progress = 15, trust_level = 'verified', signal_type = 'official', evidence_count = 5, summary = 'Treatment gap is 78%. Only 25% of health facilities have mental health staff. Suicide helpline 1166 is operational.', summary_ne = 'उपचार अन्तर ७८%। स्वास्थ्य सुविधाको २५% मा मात्र मानसिक स्वास्थ्य कर्मचारी। आत्महत्या रोकथाम हेल्पलाइन ११६६ सञ्चालनमा।' WHERE id = '93';
UPDATE promises SET status = 'not_started', progress = 20, trust_level = 'partial', signal_type = 'inferred', evidence_count = 3 WHERE id = '94';
UPDATE promises SET status = 'not_started', progress = 10, trust_level = 'partial', signal_type = 'reported', evidence_count = 3 WHERE id = '95';
UPDATE promises SET status = 'in_progress', progress = 30, trust_level = 'verified', signal_type = 'official', evidence_count = 5 WHERE id = '96';

-- ── JUDICIARY ──
UPDATE promises SET status = 'not_started', progress = 3, trust_level = 'partial', signal_type = 'inferred', evidence_count = 4 WHERE id = '97';
UPDATE promises SET status = 'not_started', progress = 2, trust_level = 'unverified', signal_type = 'inferred', evidence_count = 2 WHERE id = '98';
UPDATE promises SET status = 'not_started', progress = 3, trust_level = 'partial', signal_type = 'inferred', evidence_count = 4 WHERE id = '99';

-- ── FOREIGN POLICY ──
UPDATE promises SET status = 'not_started', progress = 5, trust_level = 'partial', signal_type = 'inferred', evidence_count = 8, summary = 'Modi called Balen warmly after election. EPG report on the 1950 treaty exists but was never released. Delicate diplomacy ahead.', summary_ne = 'मोदीले चुनावपछि बालेनलाई भावपूर्ण रूपमा फोन गरे। १९५० सन्धीमा EPG प्रतिवेदन छ तर कहिल्यै सार्वजनिक भएन।' WHERE id = '100';

-- ── DIASPORA ──
UPDATE promises SET status = 'not_started', progress = 0, trust_level = 'verified', signal_type = 'reported', evidence_count = 5 WHERE id = '101';
UPDATE promises SET status = 'in_progress', progress = 30, trust_level = 'verified', signal_type = 'official', evidence_count = 4, summary = 'Nepal Development Fund launched with Rs 10 billion capital. NRN investment channels already operational.', summary_ne = 'रु १० अर्ब पूँजीसहित नेपाल विकास कोष सुरु। NRN लगानी च्यानलहरू पहिल्यै सञ्चालनमा।' WHERE id = '102';
UPDATE promises SET status = 'in_progress', progress = 40, trust_level = 'verified', signal_type = 'official', evidence_count = 4, summary = 'NRN citizenship grants economic rights (property, business, bank accounts) but NO political/voting rights.', summary_ne = 'NRN नागरिकताले आर्थिक अधिकार (सम्पत्ति, व्यापार, बैंक खाता) दिन्छ तर राजनीतिक/मतदान अधिकार छैन।' WHERE id = '103';
UPDATE promises SET status = 'not_started', progress = 5, trust_level = 'unverified', signal_type = 'inferred', evidence_count = 1 WHERE id = '104';

-- ── ENVIRONMENT EXTENDED ──
UPDATE promises SET status = 'in_progress', progress = 25, trust_level = 'verified', signal_type = 'official', evidence_count = 4, summary = 'Nepal pledged net-zero by 2045 at COP26. Third NDC submitted. Climate Action Tracker rates it "Almost Sufficient."', summary_ne = 'नेपालले COP26 मा २०४५ सम्ममा शून्य उत्सर्जनको वाचा। तेस्रो NDC पेश। Climate Action Tracker ले "लगभग पर्याप्त" मूल्याङ्कन।' WHERE id = '105';
UPDATE promises SET status = 'in_progress', progress = 30, trust_level = 'verified', signal_type = 'official', evidence_count = 4, summary = 'Satellite fire detection works since 2012 with SMS alerts. But no drone capability or centralized command center yet.', summary_ne = 'उपग्रह आगो पत्ता लगाउने प्रणाली २०१२ देखि SMS अलर्टसहित काम गर्छ। तर ड्रोन क्षमता वा केन्द्रीय कमाण्ड सेन्टर छैन।' WHERE id = '106';
UPDATE promises SET status = 'not_started', progress = 10, trust_level = 'partial', signal_type = 'reported', evidence_count = 4 WHERE id = '107';
UPDATE promises SET status = 'in_progress', progress = 35, trust_level = 'verified', signal_type = 'official', evidence_count = 5, summary = 'Flood warning operational since 2002. Flash flood prediction covers 12,428 river segments. But many areas still unprotected.', summary_ne = 'बाढी चेतावनी २००२ देखि सञ्चालनमा। १२,४२८ नदी खण्डमा भेलबाढी पूर्वानुमान। तर धेरै क्षेत्र असुरक्षित।' WHERE id = '108';

-- ── SPORTS ──
UPDATE promises SET status = 'not_started', progress = 10, trust_level = 'partial', signal_type = 'reported', evidence_count = 2, summary = 'National Sports Policy 2082 (June 2025) includes welfare provisions. But no actual pension or insurance scheme exists yet.', summary_ne = 'राष्ट्रिय खेलकुद नीति २०८२ (जुन २०२५) मा कल्याणकारी प्रावधान। तर वास्तविक पेन्सन वा बीमा योजना अझै छैन।' WHERE id = '109';

-- Update the last_update timestamp for all
UPDATE promises SET last_update = '2026-03-25' WHERE id IN ('1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37','38','39','40','41','42','43','44','45','46','47','48','49','50','51','52','53','54','55','56','57','58','59','60','61','62','63','64','65','66','67','68','69','70','71','72','73','74','75','76','77','78','79','80','81','82','83','84','85','86','87','88','89','90','91','92','93','94','95','96','97','98','99','100','101','102','103','104','105','106','107','108','109');
