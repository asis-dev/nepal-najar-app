/**
 * Seed initial admin accounts.
 *
 * Usage:
 *   npx tsx scripts/seed-admins.ts
 *
 * Requires env vars:
 *   SUPABASE_URL — project URL
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (has admin API access)
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ─── Admin accounts to create ───────────────────────
// Update these with real admin emails/phones before running.
const ADMINS = [
  { email: 'admin@nepalrepublic.org', display_name: 'Admin' },
  { email: 'operator1@nepalrepublic.org', display_name: 'Operator 1' },
  { email: 'operator2@nepalrepublic.org', display_name: 'Operator 2' },
  { email: 'operator3@nepalrepublic.org', display_name: 'Operator 3' },
  { email: 'operator4@nepalrepublic.org', display_name: 'Operator 4' },
];

async function seedAdmins() {
  console.log(`\n🏔️  Nepal Republic — Seeding ${ADMINS.length} admin accounts\n`);

  for (const admin of ADMINS) {
    try {
      // Create user via Supabase Admin API
      const { data, error } = await supabase.auth.admin.createUser({
        email: admin.email,
        email_confirm: true, // auto-verify email
        user_metadata: { display_name: admin.display_name },
      });

      if (error) {
        if (error.message?.includes('already been registered')) {
          console.log(`⚠️  ${admin.email} — already exists, updating role...`);
          // Find existing user and update profile
          const { data: users } = await supabase.auth.admin.listUsers();
          const existing = users?.users?.find((u) => u.email === admin.email);
          if (existing) {
            await supabase
              .from('profiles')
              .update({ role: 'admin', display_name: admin.display_name })
              .eq('id', existing.id);
            console.log(`   ✅ ${admin.email} → role set to admin`);
          }
        } else {
          console.error(`❌ ${admin.email} — ${error.message}`);
        }
        continue;
      }

      // Set admin role in profiles table
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ role: 'admin', display_name: admin.display_name })
          .eq('id', data.user.id);

        if (profileError) {
          console.error(`⚠️  ${admin.email} created but profile update failed: ${profileError.message}`);
        } else {
          console.log(`✅ ${admin.email} → admin account created`);
        }
      }
    } catch (err) {
      console.error(`❌ ${admin.email} — unexpected error:`, err);
    }
  }

  console.log('\n✨ Done! Admin accounts are ready.\n');
  console.log('Admins can now log in at /admin-login using their email OTP.\n');
}

seedAdmins();
