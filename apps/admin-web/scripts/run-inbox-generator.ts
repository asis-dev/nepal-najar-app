import { config } from 'dotenv';
config({ path: '.env.local' });
// Map NEXT_PUBLIC_SUPABASE_URL → SUPABASE_URL for the server client
process.env.SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

import { generateInboxItems } from '../lib/inbox/generator';

generateInboxItems()
  .then((r) => {
    console.log('✓ generated', r);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
