/**
 * Seed Nepal government officials for intelligence tracking
 *
 * Run with: npx tsx scripts/seed-officials.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

const officials = [
  {
    name: 'Sushila Karki',
    name_ne: 'सुशीला कार्की',
    title: 'Prime Minister',
    title_ne: 'प्रधानमन्त्री',
    ministry: 'Office of the Prime Minister',
    party: 'Independent',
    promise_ids: [1, 2, 3, 6, 33],
    social_twitter: 'PM_Nepal',
  },
  {
    name: 'Finance Minister',
    name_ne: 'अर्थमन्त्री',
    title: 'Minister of Finance',
    title_ne: 'अर्थ मन्त्री',
    ministry: 'Ministry of Finance',
    promise_ids: [8, 10, 11, 21],
  },
  {
    name: 'Energy Minister',
    name_ne: 'ऊर्जा मन्त्री',
    title: 'Minister of Energy, Water Resources and Irrigation',
    title_ne: 'ऊर्जा, जलस्रोत तथा सिंचाई मन्त्री',
    ministry: 'Ministry of Energy',
    promise_ids: [12, 13],
  },
  {
    name: 'Education Minister',
    name_ne: 'शिक्षा मन्त्री',
    title: 'Minister of Education, Science and Technology',
    title_ne: 'शिक्षा, विज्ञान तथा प्रविधि मन्त्री',
    ministry: 'Ministry of Education',
    promise_ids: [24, 25, 26],
  },
  {
    name: 'Health Minister',
    name_ne: 'स्वास्थ्य मन्त्री',
    title: 'Minister of Health and Population',
    title_ne: 'स्वास्थ्य तथा जनसंख्या मन्त्री',
    ministry: 'Ministry of Health and Population',
    promise_ids: [22, 23],
  },
  {
    name: 'Law Minister',
    name_ne: 'कानून मन्त्री',
    title: 'Minister of Law, Justice and Parliamentary Affairs',
    title_ne: 'कानून, न्याय तथा संसदीय मामिला मन्त्री',
    ministry: 'Ministry of Law & Justice',
    promise_ids: [1, 2, 4, 5, 30],
  },
  {
    name: 'Transport Minister',
    name_ne: 'यातायात मन्त्री',
    title: 'Minister of Physical Infrastructure and Transport',
    title_ne: 'भौतिक पूर्वाधार तथा यातायात मन्त्री',
    ministry: 'Ministry of Physical Infrastructure',
    promise_ids: [15, 17],
  },
  {
    name: 'ICT Minister',
    name_ne: 'सूचना प्रविधि मन्त्री',
    title: 'Minister of Communications and Information Technology',
    title_ne: 'संचार तथा सूचना प्रविधि मन्त्री',
    ministry: 'MOCIT',
    promise_ids: [18, 19, 20],
  },
  {
    name: 'Labour Minister',
    name_ne: 'श्रम मन्त्री',
    title: 'Minister of Labour, Employment and Social Security',
    title_ne: 'श्रम, रोजगारी तथा सामाजिक सुरक्षा मन्त्री',
    ministry: 'Ministry of Labour',
    promise_ids: [9, 34],
  },
  {
    name: 'Home Minister',
    name_ne: 'गृह मन्त्री',
    title: 'Minister of Home Affairs',
    title_ne: 'गृह मन्त्री',
    ministry: 'Ministry of Home Affairs',
    promise_ids: [35],
  },
];

async function seed() {
  console.log('Seeding officials...');

  for (const official of officials) {
    const { error } = await supabase
      .from('officials')
      .upsert(official, { onConflict: 'name' });

    if (error) {
      console.error(`Error seeding ${official.name}:`, error.message);
    } else {
      console.log(`  ${official.name} (${official.title})`);
    }
  }

  console.log('Done!');
}

seed().catch(console.error);
