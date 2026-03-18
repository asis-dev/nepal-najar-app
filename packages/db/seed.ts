import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';

dotenv.config({ path: '../../.env' });

const uuid = () => crypto.randomUUID();

async function seed() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://nepal_progress:nepal_progress@localhost:5432/nepal_progress',
  });

  await client.connect();
  console.log('Connected to database. Seeding...');

  try {
    await client.query('BEGIN');

    // ==========================================
    // 1. REGIONS — Nepal administrative hierarchy
    // ==========================================
    const nepalId = uuid();
    const provinces: Record<string, string> = {};
    const districts: Record<string, string> = {};

    await client.query(`INSERT INTO regions (id, name, type, parent_id, created_at) VALUES ($1, $2, $3, $4, NOW())`, [nepalId, 'Nepal', 'country', null]);

    const provinceData = [
      { name: 'Koshi Province', districts: ['Morang', 'Jhapa', 'Sunsari', 'Ilam'] },
      { name: 'Madhesh Province', districts: ['Dhanusha', 'Mahottari', 'Sarlahi', 'Parsa'] },
      { name: 'Bagmati Province', districts: ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Kavrepalanchok'] },
      { name: 'Gandaki Province', districts: ['Kaski', 'Tanahun', 'Gorkha', 'Lamjung'] },
      { name: 'Lumbini Province', districts: ['Rupandehi', 'Kapilvastu', 'Palpa', 'Gulmi'] },
      { name: 'Karnali Province', districts: ['Surkhet', 'Dailekh', 'Jumla', 'Dolpa'] },
      { name: 'Sudurpashchim Province', districts: ['Kailali', 'Kanchanpur', 'Doti', 'Dadeldhura'] },
    ];

    for (const prov of provinceData) {
      const provId = uuid();
      provinces[prov.name] = provId;
      await client.query(`INSERT INTO regions (id, name, type, parent_id, created_at) VALUES ($1, $2, $3, $4, NOW())`, [provId, prov.name, 'province', nepalId]);
      for (const dist of prov.districts) {
        const distId = uuid();
        districts[dist] = distId;
        await client.query(`INSERT INTO regions (id, name, type, parent_id, created_at) VALUES ($1, $2, $3, $4, NOW())`, [distId, dist, 'district', provId]);
      }
    }
    console.log('  Regions seeded: 1 country, 7 provinces, 28 districts');

    // ==========================================
    // 2. ROLES & PERMISSIONS
    // ==========================================
    const roleNames = [
      'citizen', 'verified_citizen', 'project_officer', 'branch_manager',
      'department_admin', 'ministry_admin', 'national_oversight_admin',
      'independent_verifier', 'super_admin',
    ];
    const roleIds: Record<string, string> = {};

    for (const roleName of roleNames) {
      const id = uuid();
      roleIds[roleName] = id;
      await client.query(`INSERT INTO roles (id, name, description, created_at) VALUES ($1, $2, $3, NOW())`, [
        id, roleName, roleName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      ]);
    }

    const permissionData = [
      'project.view', 'project.create', 'project.update', 'project.delete', 'project.manage.department', 'project.manage.ministry',
      'milestone.view', 'milestone.create', 'milestone.update', 'milestone.complete',
      'task.view', 'task.create', 'task.assign', 'task.manage',
      'blocker.view', 'blocker.create', 'blocker.manage', 'blocker.escalate',
      'evidence.view', 'evidence.upload', 'evidence.review',
      'budget.view', 'budget.manage',
      'report.create', 'report.create.verified',
      'user.view', 'user.manage.department', 'user.manage.ministry',
      'dashboard.national', 'dashboard.ministry', 'dashboard.district',
      'anomaly.review', 'verification.manage', 'verification.submit',
      'audit.view', 'system.admin',
    ];
    const permIds: Record<string, string> = {};

    for (const perm of permissionData) {
      const id = uuid();
      permIds[perm] = id;
      await client.query(`INSERT INTO permissions (id, key, description, created_at) VALUES ($1, $2, $3, NOW())`, [id, perm, perm]);
    }

    // Role -> Permission mappings
    const rolePerms: Record<string, string[]> = {
      citizen: ['project.view', 'milestone.view', 'task.view', 'blocker.view', 'evidence.view', 'budget.view', 'report.create'],
      verified_citizen: ['project.view', 'milestone.view', 'task.view', 'blocker.view', 'evidence.view', 'budget.view', 'report.create', 'report.create.verified'],
      project_officer: ['project.view', 'project.update', 'milestone.view', 'milestone.create', 'milestone.update', 'milestone.complete', 'task.view', 'task.create', 'task.manage', 'blocker.view', 'blocker.create', 'blocker.manage', 'evidence.view', 'evidence.upload', 'budget.view'],
      branch_manager: ['project.view', 'project.create', 'project.update', 'milestone.view', 'milestone.create', 'milestone.update', 'milestone.complete', 'task.view', 'task.create', 'task.assign', 'task.manage', 'blocker.view', 'blocker.create', 'blocker.manage', 'blocker.escalate', 'evidence.view', 'evidence.upload', 'budget.view'],
      department_admin: ['project.view', 'project.create', 'project.update', 'project.manage.department', 'milestone.view', 'milestone.create', 'milestone.update', 'milestone.complete', 'task.view', 'task.create', 'task.assign', 'task.manage', 'blocker.view', 'blocker.create', 'blocker.manage', 'blocker.escalate', 'evidence.view', 'evidence.upload', 'evidence.review', 'budget.view', 'budget.manage', 'user.view', 'user.manage.department', 'dashboard.district'],
      ministry_admin: ['project.view', 'project.create', 'project.update', 'project.manage.department', 'project.manage.ministry', 'milestone.view', 'milestone.create', 'milestone.update', 'milestone.complete', 'task.view', 'task.create', 'task.assign', 'task.manage', 'blocker.view', 'blocker.create', 'blocker.manage', 'blocker.escalate', 'evidence.view', 'evidence.upload', 'evidence.review', 'budget.view', 'budget.manage', 'user.view', 'user.manage.department', 'user.manage.ministry', 'dashboard.ministry', 'dashboard.district'],
      national_oversight_admin: ['project.view', 'dashboard.national', 'dashboard.ministry', 'dashboard.district', 'anomaly.review', 'verification.manage', 'audit.view', 'user.view', 'evidence.view', 'budget.view', 'blocker.view'],
      independent_verifier: ['project.view', 'evidence.view', 'evidence.upload', 'evidence.review', 'verification.submit', 'report.create.verified'],
      super_admin: permissionData,
    };

    for (const [role, perms] of Object.entries(rolePerms)) {
      for (const perm of perms) {
        if (roleIds[role] && permIds[perm]) {
          await client.query(`INSERT INTO role_permissions (id, role_id, permission_id, created_at) VALUES ($1, $2, $3, NOW())`, [uuid(), roleIds[role], permIds[perm]]);
        }
      }
    }
    console.log('  Roles & permissions seeded: 9 roles, 36 permissions');

    // ==========================================
    // 3. GOVERNMENT UNITS
    // ==========================================
    const units: Record<string, string> = {};

    const unitTree = [
      { name: 'Ministry of Physical Infrastructure and Transport', type: 'ministry', region: 'Bagmati Province', children: [
        { name: 'Department of Roads', type: 'department', children: [
          { name: 'Division Road Office Kathmandu', type: 'branch', region: 'Kathmandu' },
          { name: 'Division Road Office Pokhara', type: 'branch', region: 'Kaski' },
        ]},
        { name: 'Department of Railways', type: 'department', children: [] },
      ]},
      { name: 'Ministry of Education, Science and Technology', type: 'ministry', region: 'Bagmati Province', children: [
        { name: 'Department of Education', type: 'department', children: [
          { name: 'District Education Office Kathmandu', type: 'branch', region: 'Kathmandu' },
          { name: 'District Education Office Morang', type: 'branch', region: 'Morang' },
        ]},
        { name: 'Department of Science and Technology', type: 'department', children: [] },
      ]},
      { name: 'Ministry of Health and Population', type: 'ministry', region: 'Bagmati Province', children: [
        { name: 'Department of Health Services', type: 'department', children: [
          { name: 'Provincial Health Directorate Bagmati', type: 'branch', region: 'Kathmandu' },
          { name: 'Provincial Health Directorate Gandaki', type: 'branch', region: 'Kaski' },
        ]},
        { name: 'Department of Drug Administration', type: 'department', children: [] },
      ]},
    ];

    async function insertUnit(unit: any, parentId: string | null) {
      const id = uuid();
      units[unit.name] = id;
      const regionId = unit.region ? (districts[unit.region] || provinces[unit.region] || null) : null;
      await client.query(
        `INSERT INTO government_units (id, name, type, parent_id, region_id, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [id, unit.name, unit.type, parentId, regionId, 'active']
      );
      for (const child of unit.children || []) {
        await insertUnit(child, id);
      }
    }

    for (const ministry of unitTree) {
      await insertUnit(ministry, null);
    }
    console.log('  Government units seeded: 3 ministries, 6 departments, 6 branches');

    // ==========================================
    // 4. USERS
    // ==========================================
    const userIds: Record<string, string> = {};
    const users = [
      { key: 'super_admin', name: 'System Administrator', email: 'admin@nepalp.gov.np', phone: '+9779800000001', role: 'super_admin', unit: null },
      { key: 'oversight', name: 'Ram Bahadur Thapa', email: 'oversight@nepalp.gov.np', phone: '+9779800000002', role: 'national_oversight_admin', unit: null },
      { key: 'min_infra', name: 'Sita Sharma', email: 'sita.sharma@mopit.gov.np', phone: '+9779800000003', role: 'ministry_admin', unit: 'Ministry of Physical Infrastructure and Transport' },
      { key: 'min_edu', name: 'Prakash Adhikari', email: 'prakash.adhikari@moest.gov.np', phone: '+9779800000004', role: 'ministry_admin', unit: 'Ministry of Education, Science and Technology' },
      { key: 'min_health', name: 'Kamala Poudel', email: 'kamala.poudel@mohp.gov.np', phone: '+9779800000005', role: 'ministry_admin', unit: 'Ministry of Health and Population' },
      { key: 'dept_roads', name: 'Bikash Rai', email: 'bikash.rai@dor.gov.np', phone: '+9779800000006', role: 'department_admin', unit: 'Department of Roads' },
      { key: 'dept_edu', name: 'Meena Gurung', email: 'meena.gurung@doe.gov.np', phone: '+9779800000007', role: 'department_admin', unit: 'Department of Education' },
      { key: 'dept_health', name: 'Suresh Basnet', email: 'suresh.basnet@dohs.gov.np', phone: '+9779800000008', role: 'department_admin', unit: 'Department of Health Services' },
      { key: 'dept_railway', name: 'Anjali Shrestha', email: 'anjali@dorail.gov.np', phone: '+9779800000009', role: 'department_admin', unit: 'Department of Railways' },
      { key: 'dept_sci', name: 'Dipak Tamang', email: 'dipak@dost.gov.np', phone: '+9779800000010', role: 'department_admin', unit: 'Department of Science and Technology' },
      { key: 'dept_drug', name: 'Nirmala KC', email: 'nirmala@dda.gov.np', phone: '+9779800000011', role: 'department_admin', unit: 'Department of Drug Administration' },
      { key: 'officer1', name: 'Hari Prasad Pant', email: 'hari.pant@dor.gov.np', phone: '+9779800000012', role: 'project_officer', unit: 'Division Road Office Kathmandu' },
      { key: 'officer2', name: 'Gita Dhakal', email: 'gita.dhakal@doe.gov.np', phone: '+9779800000013', role: 'project_officer', unit: 'District Education Office Kathmandu' },
      { key: 'officer3', name: 'Raju Maharjan', email: 'raju.maharjan@dohs.gov.np', phone: '+9779800000014', role: 'project_officer', unit: 'Provincial Health Directorate Bagmati' },
      { key: 'officer4', name: 'Sunita Limbu', email: 'sunita.limbu@dor.gov.np', phone: '+9779800000015', role: 'project_officer', unit: 'Division Road Office Pokhara' },
      { key: 'officer5', name: 'Binod Tharu', email: 'binod.tharu@doe.gov.np', phone: '+9779800000016', role: 'project_officer', unit: 'District Education Office Morang' },
      { key: 'verifier1', name: 'Dr. Arjun Karki', email: 'arjun.karki@verify.np', phone: '+9779800000017', role: 'independent_verifier', unit: null },
      { key: 'vcitizen1', name: 'Sarita Tamang', email: 'sarita.tamang@gmail.com', phone: '+9779841000001', role: 'verified_citizen', unit: null },
      { key: 'vcitizen2', name: 'Deepak Magar', email: 'deepak.magar@gmail.com', phone: '+9779841000002', role: 'verified_citizen', unit: null },
      { key: 'citizen1', name: 'Anish Chhetri', email: 'anish.chhetri@gmail.com', phone: '+9779841000003', role: 'citizen', unit: null },
      { key: 'citizen2', name: 'Pooja Bhandari', email: 'pooja.bhandari@gmail.com', phone: '+9779841000004', role: 'citizen', unit: null },
    ];

    for (const u of users) {
      const id = uuid();
      userIds[u.key] = id;
      const vLevel = u.role === 'citizen' ? 'basic' : u.role === 'verified_citizen' ? 'verified' : 'official';
      await client.query(
        `INSERT INTO users (id, phone_number, email, display_name, verification_level, language_preference, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [id, u.phone, u.email, u.name, vLevel, 'en', 'active']
      );
      await client.query(
        `INSERT INTO user_roles (id, user_id, role_id, government_unit_id, assigned_at) VALUES ($1, $2, $3, $4, NOW())`,
        [uuid(), id, roleIds[u.role], u.unit ? units[u.unit] : null]
      );
    }
    console.log('  Users seeded: 21 users with roles');

    // ==========================================
    // 5. PROJECTS (20 projects)
    // ==========================================
    const projectIds: Record<string, string> = {};

    const projects = [
      { key: 'fast_track', title: 'Kathmandu-Terai Fast Track Road', slug: 'ktm-terai-fast-track', unit: 'Department of Roads', region: 'Bagmati Province', status: 'active', priority: 'critical', start: '2023-01-15', end: '2027-06-30', progress: 35, budget: 96_000_000_000, officer: 'officer1' },
      { key: 'ring_road', title: 'Pokhara Ring Road Extension', slug: 'pokhara-ring-road', unit: 'Division Road Office Pokhara', region: 'Gandaki Province', status: 'active', priority: 'high', start: '2023-06-01', end: '2026-12-31', progress: 52, budget: 12_500_000_000, officer: 'officer4' },
      { key: 'mugling_road', title: 'Mugling-Narayanghat Road Widening', slug: 'mugling-narayanghat', unit: 'Department of Roads', region: 'Gandaki Province', status: 'active', priority: 'high', start: '2023-03-01', end: '2026-03-31', progress: 68, budget: 8_200_000_000, officer: 'officer1' },
      { key: 'ew_highway', title: 'East-West Highway Bridge Repairs', slug: 'ew-highway-bridges', unit: 'Department of Roads', region: 'Koshi Province', status: 'active', priority: 'medium', start: '2024-01-15', end: '2025-12-31', progress: 42, budget: 3_500_000_000, officer: 'officer1' },
      { key: 'banepa_road', title: 'Banepa-Sindhuli Road Upgrade', slug: 'banepa-sindhuli', unit: 'Division Road Office Kathmandu', region: 'Bagmati Province', status: 'suspended', priority: 'medium', start: '2023-09-01', end: '2026-09-30', progress: 18, budget: 5_800_000_000, officer: 'officer1' },
      { key: 'melamchi', title: 'Melamchi Water Supply Phase 2', slug: 'melamchi-water-phase2', unit: 'Ministry of Physical Infrastructure and Transport', region: 'Bagmati Province', status: 'active', priority: 'critical', start: '2023-04-01', end: '2026-12-31', progress: 45, budget: 35_000_000_000, officer: 'officer1' },
      { key: 'bheri_babai', title: 'Bheri-Babai Diversion Multi-Purpose Project', slug: 'bheri-babai', unit: 'Ministry of Physical Infrastructure and Transport', region: 'Lumbini Province', status: 'active', priority: 'high', start: '2022-07-01', end: '2027-07-31', progress: 28, budget: 42_000_000_000, officer: 'officer4' },
      { key: 'ktm_water', title: 'Kathmandu Valley Water Treatment Plant', slug: 'ktm-water-treatment', unit: 'Ministry of Physical Infrastructure and Transport', region: 'Bagmati Province', status: 'draft', priority: 'high', start: '2025-01-01', end: '2028-12-31', progress: 0, budget: 18_000_000_000, officer: 'officer1' },
      { key: 'karnali_water', title: 'Provincial Water Supply Karnali', slug: 'karnali-water-supply', unit: 'Ministry of Physical Infrastructure and Transport', region: 'Karnali Province', status: 'active', priority: 'medium', start: '2024-04-01', end: '2027-03-31', progress: 15, budget: 7_600_000_000, officer: 'officer4' },
      { key: 'smart_class', title: 'Smart Classroom Initiative Bagmati', slug: 'smart-classroom-bagmati', unit: 'Department of Education', region: 'Bagmati Province', status: 'active', priority: 'medium', start: '2024-01-01', end: '2025-12-31', progress: 60, budget: 2_800_000_000, officer: 'officer2' },
      { key: 'school_rebuild', title: 'School Building Reconstruction Earthquake Zone', slug: 'school-rebuild-eq', unit: 'Department of Education', region: 'Bagmati Province', status: 'completed', priority: 'critical', start: '2022-01-01', end: '2025-06-30', progress: 100, budget: 15_000_000_000, officer: 'officer2' },
      { key: 'tech_edu', title: 'Technical Education Expansion Lumbini', slug: 'tech-edu-lumbini', unit: 'Department of Education', region: 'Lumbini Province', status: 'active', priority: 'medium', start: '2024-06-01', end: '2027-05-31', progress: 22, budget: 4_200_000_000, officer: 'officer5' },
      { key: 'bir_hospital', title: 'Bir Hospital Modernization', slug: 'bir-hospital-modernization', unit: 'Department of Health Services', region: 'Bagmati Province', status: 'active', priority: 'high', start: '2023-07-01', end: '2026-06-30', progress: 55, budget: 8_500_000_000, officer: 'officer3' },
      { key: 'surkhet_hosp', title: 'Provincial Hospital Surkhet Construction', slug: 'surkhet-hospital', unit: 'Department of Health Services', region: 'Karnali Province', status: 'suspended', priority: 'high', start: '2023-01-01', end: '2026-12-31', progress: 30, budget: 6_200_000_000, officer: 'officer3' },
      { key: 'telemedicine', title: 'Telemedicine Network Rural Districts', slug: 'telemedicine-rural', unit: 'Department of Health Services', region: 'Karnali Province', status: 'completed', priority: 'medium', start: '2022-06-01', end: '2024-12-31', progress: 100, budget: 1_800_000_000, officer: 'officer3' },
      { key: 'phc_upgrade', title: 'Primary Health Center Upgrade Program', slug: 'phc-upgrade', unit: 'Department of Health Services', region: 'Sudurpashchim Province', status: 'active', priority: 'medium', start: '2024-01-01', end: '2026-06-30', progress: 38, budget: 3_200_000_000, officer: 'officer3' },
      { key: 'tamakoshi', title: 'Upper Tamakoshi Transmission Line', slug: 'tamakoshi-transmission', unit: 'Ministry of Physical Infrastructure and Transport', region: 'Bagmati Province', status: 'completed', priority: 'critical', start: '2021-01-01', end: '2024-12-31', progress: 100, budget: 22_000_000_000, officer: 'officer1' },
      { key: 'solar_karnali', title: 'Solar Mini-Grid Karnali Province', slug: 'solar-minigrid-karnali', unit: 'Ministry of Physical Infrastructure and Transport', region: 'Karnali Province', status: 'draft', priority: 'medium', start: '2025-06-01', end: '2028-05-31', progress: 0, budget: 4_500_000_000, officer: 'officer4' },
      { key: 'digital_nepal', title: 'Digital Nepal Framework Phase 1', slug: 'digital-nepal-phase1', unit: 'Department of Science and Technology', region: 'Bagmati Province', status: 'cancelled', priority: 'high', start: '2023-01-01', end: '2025-12-31', progress: 12, budget: 5_000_000_000, officer: 'officer2' },
      { key: 'digital_id', title: 'Nepal Digital ID System', slug: 'digital-id-system', unit: 'Ministry of Education, Science and Technology', region: 'Bagmati Province', status: 'cancelled', priority: 'critical', start: '2022-06-01', end: '2025-06-30', progress: 8, budget: 9_500_000_000, officer: 'officer5' },
    ];

    for (const p of projects) {
      const id = uuid();
      projectIds[p.key] = id;
      const regionId = provinces[p.region] || districts[p.region] || null;
      await client.query(
        `INSERT INTO projects (id, title, slug, description, government_unit_id, region_id, status, priority, start_date, target_end_date, public_visibility, validation_state, current_progress_percent_cached, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())`,
        [id, p.title, p.slug, `${p.title} — a major development initiative for Nepal.`, units[p.unit], regionId, p.status, p.priority, p.start, p.end, 'public', 'pending', p.progress, userIds[p.officer]]
      );
    }
    console.log('  Projects seeded: 20 projects');

    // ==========================================
    // 6. MILESTONES (4-6 per project)
    // ==========================================
    let milestoneCount = 0;
    const milestoneTemplates: Record<string, Array<{ title: string; weight: number; status: string }>> = {
      road: [
        { title: 'Environmental Impact Assessment', weight: 10, status: 'completed' },
        { title: 'Land Acquisition & Clearance', weight: 15, status: 'completed' },
        { title: 'Foundation & Grading', weight: 25, status: 'in_progress' },
        { title: 'Pavement & Surfacing Work', weight: 30, status: 'not_started' },
        { title: 'Bridge Construction', weight: 15, status: 'not_started' },
        { title: 'Final Inspection & Handover', weight: 5, status: 'not_started' },
      ],
      water: [
        { title: 'Feasibility Study & Design', weight: 10, status: 'completed' },
        { title: 'Tunnel & Pipeline Construction', weight: 30, status: 'in_progress' },
        { title: 'Treatment Plant Construction', weight: 25, status: 'not_started' },
        { title: 'Distribution Network', weight: 25, status: 'not_started' },
        { title: 'Testing & Commissioning', weight: 10, status: 'not_started' },
      ],
      school: [
        { title: 'Needs Assessment & Planning', weight: 10, status: 'completed' },
        { title: 'Procurement & Contracting', weight: 15, status: 'completed' },
        { title: 'Construction / Renovation', weight: 35, status: 'in_progress' },
        { title: 'Equipment & Technology Setup', weight: 25, status: 'not_started' },
        { title: 'Teacher Training & Launch', weight: 15, status: 'not_started' },
      ],
      hospital: [
        { title: 'Architectural Design & Approval', weight: 10, status: 'completed' },
        { title: 'Foundation & Structure', weight: 20, status: 'completed' },
        { title: 'Building Construction', weight: 25, status: 'in_progress' },
        { title: 'Interior & Medical Equipment', weight: 30, status: 'not_started' },
        { title: 'Staff Recruitment & Training', weight: 10, status: 'not_started' },
        { title: 'Commissioning & Opening', weight: 5, status: 'not_started' },
      ],
      tech: [
        { title: 'Requirements & Architecture', weight: 15, status: 'completed' },
        { title: 'Core Platform Development', weight: 30, status: 'in_progress' },
        { title: 'Integration & Data Migration', weight: 25, status: 'not_started' },
        { title: 'User Acceptance Testing', weight: 15, status: 'not_started' },
        { title: 'Rollout & Training', weight: 15, status: 'not_started' },
      ],
    };

    const projectMilestoneMap: Record<string, string> = {
      fast_track: 'road', ring_road: 'road', mugling_road: 'road', ew_highway: 'road', banepa_road: 'road',
      melamchi: 'water', bheri_babai: 'water', ktm_water: 'water', karnali_water: 'water',
      smart_class: 'school', school_rebuild: 'school', tech_edu: 'school',
      bir_hospital: 'hospital', surkhet_hosp: 'hospital', telemedicine: 'hospital', phc_upgrade: 'hospital',
      tamakoshi: 'tech', solar_karnali: 'tech', digital_nepal: 'tech', digital_id: 'tech',
    };

    for (const [projKey, templateKey] of Object.entries(projectMilestoneMap)) {
      const projId = projectIds[projKey];
      const template = milestoneTemplates[templateKey];
      if (!projId || !template) continue;

      const proj = projects.find(p => p.key === projKey)!;
      for (let i = 0; i < template.length; i++) {
        const ms = template[i];
        let status = ms.status;
        // Adjust statuses for completed/cancelled/draft projects
        if (proj.status === 'completed') status = 'completed';
        if (proj.status === 'cancelled') status = i === 0 ? 'completed' : 'cancelled';
        if (proj.status === 'draft') status = 'not_started';

        const dueDate = new Date(proj.start);
        dueDate.setMonth(dueDate.getMonth() + Math.floor((i + 1) * (new Date(proj.end).getTime() - new Date(proj.start).getTime()) / (template.length * 30 * 24 * 60 * 60 * 1000)));

        await client.query(
          `INSERT INTO project_milestones (id, project_id, title, description, sequence_number, weight_percent, status, due_date, requires_evidence, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
          [uuid(), projId, ms.title, `${ms.title} for ${proj.title}`, i + 1, ms.weight, status, dueDate.toISOString().slice(0, 10), status === 'completed' || ms.weight >= 25]
        );
        milestoneCount++;
      }
    }
    console.log(`  Milestones seeded: ${milestoneCount} milestones`);

    // ==========================================
    // 7. BLOCKERS (15 blockers)
    // ==========================================
    const blockers = [
      { project: 'fast_track', type: 'legal', severity: 'high', title: 'Land acquisition dispute in Ward 7, Makwanpur', status: 'open', level: 2 },
      { project: 'fast_track', type: 'funding', severity: 'critical', title: 'Budget release delayed by Finance Ministry for FY 2081/82', status: 'escalated', level: 3 },
      { project: 'ring_road', type: 'community', severity: 'high', title: 'Local community opposition to alignment near Seti River', status: 'open', level: 1 },
      { project: 'mugling_road', type: 'weather', severity: 'medium', title: 'Monsoon-induced landslide blocking construction access', status: 'in_progress', level: 1 },
      { project: 'banepa_road', type: 'regulatory', severity: 'high', title: 'Environmental clearance pending from Department of Environment', status: 'open', level: 2 },
      { project: 'banepa_road', type: 'contractor', severity: 'medium', title: 'Contractor mobilization delayed — equipment shortage', status: 'open', level: 1 },
      { project: 'melamchi', type: 'technical', severity: 'high', title: 'Tunnel collapse in section 3 requiring redesign', status: 'in_progress', level: 2 },
      { project: 'bheri_babai', type: 'funding', severity: 'high', title: 'Donor funding tranche delayed pending audit report', status: 'escalated', level: 3 },
      { project: 'bir_hospital', type: 'procurement', severity: 'medium', title: 'Medical equipment tender under legal challenge', status: 'open', level: 1 },
      { project: 'surkhet_hosp', type: 'contractor', severity: 'critical', title: 'Main contractor declared bankruptcy', status: 'escalated', level: 3 },
      { project: 'phc_upgrade', type: 'staffing', severity: 'medium', title: 'Insufficient qualified engineers in Sudurpashchim Province', status: 'open', level: 1 },
      { project: 'smart_class', type: 'technical', severity: 'low', title: 'Internet connectivity issues in 12 rural schools', status: 'in_progress', level: 1 },
      { project: 'tech_edu', type: 'regulatory', severity: 'medium', title: 'Curriculum approval pending from education board', status: 'open', level: 1 },
      { project: 'karnali_water', type: 'weather', severity: 'medium', title: 'Access road washed out — construction site unreachable', status: 'in_progress', level: 1 },
      { project: 'ew_highway', type: 'technical', severity: 'high', title: 'Bridge foundation soil test reveals weak subgrade', status: 'open', level: 2 },
    ];

    for (const b of blockers) {
      const projId = projectIds[b.project];
      const unitId = units['Department of Roads']; // simplified
      await client.query(
        `INSERT INTO project_blockers (id, project_id, type, severity, status, title, description, owner_government_unit_id, opened_at, escalation_level, created_by, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10, NOW())`,
        [uuid(), projId, b.type, b.severity, b.status, b.title, `${b.title}. Requires immediate attention and coordination with relevant authorities.`, unitId, b.level, userIds['officer1']]
      );
    }
    console.log('  Blockers seeded: 15 blockers');

    // ==========================================
    // 8. BUDGET RECORDS
    // ==========================================
    let budgetCount = 0;
    for (const p of projects) {
      if (!projectIds[p.key]) continue;
      const allocated = p.budget;
      const released = Math.floor(allocated * (0.3 + Math.random() * 0.5));
      const spent = Math.floor(released * (0.4 + Math.random() * 0.5));

      for (const [type, amount] of [['allocation', allocated], ['release', released], ['expenditure', spent]] as const) {
        await client.query(
          `INSERT INTO project_budget_records (id, project_id, record_type, amount, currency, record_date, created_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [uuid(), projectIds[p.key], type, amount, 'NPR', new Date().toISOString().slice(0, 10), userIds['officer1']]
        );
        budgetCount++;
      }
    }
    console.log(`  Budget records seeded: ${budgetCount} records`);

    // ==========================================
    // 9. CITIZEN REPORTS
    // ==========================================
    const reports = [
      { project: 'fast_track', type: 'observation', title: 'Road grading appears stalled near Hetauda', user: 'vcitizen1', region: 'Bagmati Province' },
      { project: 'ring_road', type: 'complaint', title: 'Dust pollution affecting local residents during construction', user: 'citizen1', region: 'Gandaki Province' },
      { project: 'melamchi', type: 'observation', title: 'Water pipeline visible progress in Sundarijal area', user: 'vcitizen2', region: 'Bagmati Province' },
      { project: 'bir_hospital', type: 'praise', title: 'New emergency wing construction progressing well', user: 'vcitizen1', region: 'Bagmati Province' },
      { project: 'smart_class', type: 'complaint', title: 'Installed smart boards not functioning in Bhaktapur schools', user: 'citizen2', region: 'Bagmati Province' },
      { project: 'fast_track', type: 'observation', title: 'Heavy machinery parked idle for 3 weeks at tunnel site', user: 'vcitizen2', region: 'Bagmati Province' },
      { project: 'phc_upgrade', type: 'observation', title: 'Health center in Kailali still has no running water', user: 'citizen1', region: 'Sudurpashchim Province' },
      { project: 'mugling_road', type: 'praise', title: 'Road widening completed ahead of schedule near Abukhaireni', user: 'vcitizen1', region: 'Gandaki Province' },
      { project: 'bheri_babai', type: 'complaint', title: 'Agricultural land damaged without compensation payment', user: 'citizen2', region: 'Lumbini Province' },
      { project: 'ew_highway', type: 'observation', title: 'Bridge repairs ongoing at Koshi crossing — single lane open', user: 'vcitizen2', region: 'Koshi Province' },
    ];

    for (const r of reports) {
      const regionId = provinces[r.region] || null;
      await client.query(
        `INSERT INTO citizen_reports (id, project_id, region_id, user_id, report_type, title, description, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [uuid(), projectIds[r.project], regionId, userIds[r.user], r.type, r.title, `${r.title}. Observed on site visit.`, 'pending']
      );
    }
    console.log('  Citizen reports seeded: 10 reports');

    // ==========================================
    // 10. EXTERNAL FINDINGS
    // ==========================================
    const findings = [
      { project: 'fast_track', source: 'Kathmandu Post', url: 'https://kathmandupost.com/fast-track-update', type: 'news', headline: 'Fast Track road project faces another delay', classification: 'contradicts', confidence: 0.85 },
      { project: 'melamchi', source: 'Republica Daily', url: 'https://myrepublica.nagariknetwork.com/melamchi', type: 'news', headline: 'Melamchi tunnel repair work on track says KUKL', classification: 'confirms', confidence: 0.78 },
      { project: 'bir_hospital', source: 'Nepal Health Research Council', url: 'https://nhrc.gov.np/bir-hospital-report', type: 'report', headline: 'Bir Hospital modernization meets Phase 2 targets', classification: 'confirms', confidence: 0.92 },
      { project: 'school_rebuild', source: 'World Bank Nepal', url: 'https://worldbank.org/nepal/school-reconstruction', type: 'report', headline: 'Post-earthquake school reconstruction achieves 95% target', classification: 'confirms', confidence: 0.95 },
      { project: 'surkhet_hosp', source: 'Nagarik News', url: 'https://nagariknews.nagariknetwork.com/surkhet', type: 'news', headline: 'Surkhet hospital contractor under investigation', classification: 'contradicts', confidence: 0.88 },
    ];

    for (const f of findings) {
      await client.query(
        `INSERT INTO external_findings (id, project_id, source_name, source_url, source_type, headline, content_excerpt, language, confidence, classification, found_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
        [uuid(), projectIds[f.project], f.source, f.url, f.type, f.headline, `${f.headline}. Full article available at source.`, 'en', f.confidence, f.classification]
      );
    }
    console.log('  External findings seeded: 5 findings');

    // ==========================================
    // 11. PROJECT UPDATES
    // ==========================================
    let updateCount = 0;
    const activeProjects = projects.filter(p => ['active', 'completed'].includes(p.status));
    for (const p of activeProjects) {
      const projId = projectIds[p.key];
      if (!projId) continue;
      for (let i = 0; i < 3; i++) {
        const daysAgo = i * 30 + Math.floor(Math.random() * 15);
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);

        await client.query(
          `INSERT INTO project_updates (id, project_id, title, body, update_type, visibility, official_source, posted_by, posted_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [uuid(), projId, `Progress Update ${3 - i} — ${p.title}`, `Work continues on ${p.title}. Current progress at ${p.progress}%. Key activities this period include ongoing construction and coordination with stakeholders.`, 'progress', 'public', true, userIds[p.officer], date.toISOString()]
        );
        updateCount++;
      }
    }
    console.log(`  Project updates seeded: ${updateCount} updates`);

    // ==========================================
    // 12. AUDIT LOGS (sample)
    // ==========================================
    const auditActions = ['project.created', 'milestone.completed', 'blocker.opened', 'blocker.escalated', 'budget.record_added'];
    for (let i = 0; i < 20; i++) {
      const action = auditActions[i % auditActions.length];
      const daysAgo = Math.floor(Math.random() * 90);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);

      await client.query(
        `INSERT INTO audit_logs (id, actor_user_id, entity_type, entity_id, action, source, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [uuid(), userIds['officer1'], 'project', Object.values(projectIds)[i % 20], action, 'api', date.toISOString()]
      );
    }
    console.log('  Audit logs seeded: 20 sample entries');

    await client.query('COMMIT');
    console.log('\nSeed completed successfully!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    throw err;
  } finally {
    await client.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
