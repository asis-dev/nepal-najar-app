/* eslint-disable no-console */
// Check RLS policies on profiles and test whether a user-scoped SELECT
// using the authenticated user's JWT returns the row middleware expects.
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
loadEnv({ path: path.resolve(__dirname, '..', '.env.local') });
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';

const DATABASE_URL = process.env.DATABASE_URL!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const TARGET_EMAIL = 'asis.xvi@gmail.com';
const TARGET_ID = '115c23e5-0811-4795-ab51-d795369d8ef3';

async function main() {
  // 1) Query pg_policies directly for profiles table
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  console.log('=== pg_policies on profiles ===');
  const policies = await client.query(
    `SELECT policyname, cmd, permissive, roles, qual, with_check
       FROM pg_policies
      WHERE tablename = 'profiles'
      ORDER BY cmd, policyname`,
  );
  for (const row of policies.rows) {
    console.log(JSON.stringify(row, null, 2));
  }
  console.log(`\nTotal: ${policies.rowCount} policies\n`);

  // 2) Check RLS enabled
  const rls = await client.query(
    `SELECT relname, relrowsecurity, relforcerowsecurity
       FROM pg_class WHERE relname='profiles'`,
  );
  console.log('=== RLS flags ===');
  console.log(rls.rows);

  // 3) Look up profile via service role
  console.log('\n=== Service role SELECT on profiles ===');
  const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: prof, error: profErr } = await svc
    .from('profiles')
    .select('id, email, role, created_at, updated_at')
    .eq('id', TARGET_ID)
    .maybeSingle();
  console.log({ prof, profErr });

  // 4) Check auth.users for this account and generate a one-time sign-in
  //    so we can try the same SELECT with their JWT (simulating middleware).
  console.log('\n=== auth.users row ===');
  const u = await client.query(
    `SELECT id, email, last_sign_in_at, confirmed_at FROM auth.users WHERE id = $1`,
    [TARGET_ID],
  );
  console.log(u.rows);

  // 5) Try authenticated SELECT by generating a magic-link token and exchanging.
  //    Simpler: use admin generateLink which returns an access token? It returns an action_link only.
  //    Instead, we set the session manually using admin API: create a session JWT via signInWithPassword is not possible
  //    without password. Use supabase.auth.admin.generateLink then leverage exchangeCodeForSession is not possible here either.
  //    BEST OPTION: use admin createUser for a brand-new test user then reproduce? That wouldn't match this user.
  //    Alternative: use admin API to directly issue a session via `admin.createSession`? Not exposed.
  //    So: use `admin.generateLink` + extract hashed_token then call verifyOtp with type: 'magiclink'.
  try {
    const { data: link, error: linkErr } = await svc.auth.admin.generateLink({
      type: 'magiclink',
      email: TARGET_EMAIL,
    });
    if (linkErr) throw linkErr;
    const hashed = (link.properties as any)?.hashed_token;
    if (!hashed) {
      console.log('No hashed_token in generateLink response');
    } else {
      const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: verify, error: vErr } = await anon.auth.verifyOtp({
        type: 'magiclink',
        token_hash: hashed,
      });
      if (vErr) throw vErr;
      const accessToken = verify.session?.access_token;
      if (!accessToken) {
        console.log('No access token after verify');
      } else {
        console.log('\n=== Authenticated SELECT (simulating middleware) ===');
        const asUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: `Bearer ${accessToken}` } },
        });
        const { data, error } = await asUser
          .from('profiles')
          .select('id, email, role')
          .eq('id', TARGET_ID)
          .maybeSingle();
        console.log({ data, error });
      }
    }
  } catch (e: any) {
    console.log('Auth simulation failed:', e?.message || e);
  }

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
