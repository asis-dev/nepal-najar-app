import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

async function reset() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://nepal_progress:nepal_progress@localhost:5432/nepal_progress',
  });

  await client.connect();
  console.log('Connected. Resetting database...');

  const tables = [
    'audit_logs', 'entity_versions', 'access_logs',
    'watchlists', 'notifications',
    'confidence_assessments', 'anomaly_flags',
    'verification_responses', 'verification_requests',
    'research_findings', 'research_jobs',
    'external_findings', 'citizen_reports',
    'potential_projects',
    'project_updates',
    'evidence_reviews', 'evidence_attachments',
    'project_budget_records', 'project_contractors', 'contractors', 'funding_sources',
    'escalation_records',
    'task_dependencies', 'project_tasks',
    'project_blockers',
    'milestone_versions', 'project_milestones',
    'project_versions', 'projects',
    'government_unit_members', 'government_units',
    'regions',
    'user_roles', 'role_permissions', 'permissions', 'roles', 'users',
  ];

  try {
    for (const table of tables) {
      try {
        await client.query(`DELETE FROM ${table}`);
        console.log(`  Cleared: ${table}`);
      } catch (err: any) {
        console.log(`  Skipped: ${table} (${err.message?.slice(0, 60)})`);
      }
    }
    console.log('\nDatabase reset complete. Run `npm run db:seed` to repopulate.');
  } finally {
    await client.end();
  }
}

reset().catch((err) => {
  console.error(err);
  process.exit(1);
});
