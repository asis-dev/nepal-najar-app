'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PORTAL_REGISTRY } from '@/lib/portals/registry';

const STATUS_SERVICES = [
  {
    id: 'passport',
    name: 'Passport Application',
    name_ne: 'राहदानी आवेदन',
    icon: '🛂',
    portal: 'https://nepalpassport.gov.np',
    checkUrl: 'https://emrtds.nepalpassport.gov.np/',
    refLabel: 'Application ID / File No.',
    refPlaceholder: 'e.g., NP-2082-001234',
    instructions: 'Visit the e-Passport portal and click "Track Application" to check your passport status.',
  },
  {
    id: 'license',
    name: 'Driving License',
    name_ne: 'सवारी चालक अनुमतिपत्र',
    icon: '🚗',
    portal: 'https://dotm.gov.np',
    checkUrl: 'https://www.dotm.gov.np/DrivingLicense/SearchLicense',
    refLabel: 'License Number / Application ID',
    refPlaceholder: 'e.g., 01-01-0012345',
    instructions: 'Search your license on DoTM portal to check status, exam date, or smart card readiness.',
  },
  {
    id: 'pan',
    name: 'PAN / Tax Filing',
    name_ne: 'प्यान / कर दाखिला',
    icon: '🧾',
    portal: 'https://ird.gov.np',
    checkUrl: 'https://taxpayerportal.ird.gov.np/taxpayer/app.html',
    refLabel: 'PAN Number',
    refPlaceholder: 'e.g., 123456789',
    instructions: 'Log into the Taxpayer Portal to view your PAN details, filing status, and dues.',
  },
  {
    id: 'citizenship',
    name: 'Citizenship / National ID',
    name_ne: 'नागरिकता / राष्ट्रिय परिचयपत्र',
    icon: '🪪',
    portal: 'https://donidcr.gov.np',
    checkUrl: 'https://citizenportal.donidcr.gov.np/en',
    refLabel: 'Application Reference',
    refPlaceholder: 'Your application reference no.',
    instructions: 'Check NID application status on the DONIDCR citizen portal.',
  },
  {
    id: 'company',
    name: 'Company Registration',
    name_ne: 'कम्पनी दर्ता',
    icon: '🏢',
    portal: 'https://ocr.gov.np',
    checkUrl: 'https://application.ocr.gov.np/faces/CompanyDetails.jsp',
    refLabel: 'Registration No. / Company Name',
    refPlaceholder: 'e.g., 12345 or ABC Pvt Ltd',
    instructions: 'Search your company on OCR portal to verify registration status.',
  },
  {
    id: 'foreign-employment',
    name: 'Labor Permit',
    name_ne: 'श्रम स्वीकृति',
    icon: '✈️',
    portal: 'https://dofe.gov.np',
    checkUrl: 'https://ferms.dofe.gov.np/',
    refLabel: 'Permit Number / Passport No.',
    refPlaceholder: 'Your labor permit reference',
    instructions: 'Check labor permit status on the Foreign Employment Management System (FERMS).',
  },
  {
    id: 'court-case',
    name: 'Court Case Status',
    name_ne: 'मुद्दाको अवस्था',
    icon: '⚖️',
    portal: 'https://supremecourt.gov.np',
    checkUrl: 'https://supremecourt.gov.np',
    refLabel: 'Case Number',
    refPlaceholder: 'e.g., 082-CR-0001',
    instructions: 'Check cause list and case status on the Supreme Court portal.',
  },
  {
    id: 'land',
    name: 'Land Records',
    name_ne: 'जग्गा अभिलेख',
    icon: '📜',
    portal: 'https://molcpa.gov.np',
    checkUrl: 'https://public.dolma.gov.np/',
    refLabel: 'Kitta No. / Plot Reference',
    refPlaceholder: 'e.g., Ward 5, Kitta 123',
    instructions: 'Search land ownership records on the DOLMA public portal.',
  },
];

export default function StatusCheckerPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [refNo, setRefNo] = useState('');

  const svc = STATUS_SERVICES.find((s) => s.id === selected);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-3">
        🔍 STATUS CHECKER
      </div>
      <h1 className="text-3xl font-black mb-1">Check Application Status</h1>
      <p className="text-zinc-400 text-sm mb-6">
        Check the status of your passport, license, PAN, company registration, court case, or land records — linked directly to official government portals.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {STATUS_SERVICES.map((s) => (
          <button
            key={s.id}
            onClick={() => { setSelected(s.id); setRefNo(''); }}
            className={`rounded-xl border p-3 text-center transition-all ${
              selected === s.id
                ? 'bg-red-600/20 border-red-500/40 text-white'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600'
            }`}
          >
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-xs font-semibold leading-tight">{s.name}</div>
            <div className="text-[10px] text-zinc-500">{s.name_ne}</div>
          </button>
        ))}
      </div>

      {svc && (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{svc.icon}</span>
            <div>
              <h2 className="font-bold text-zinc-100">{svc.name}</h2>
              <div className="text-xs text-zinc-500">{svc.name_ne}</div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-400 block mb-1">{svc.refLabel}</label>
            <input
              type="text"
              value={refNo}
              onChange={(e) => setRefNo(e.target.value)}
              placeholder={svc.refPlaceholder}
              className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-red-500 outline-none"
            />
          </div>

          <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-xs text-blue-300">
            {svc.instructions}
          </div>

          <a
            href={svc.checkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-xl bg-red-600 py-3 text-center text-sm font-bold text-white hover:bg-red-500 transition-colors"
          >
            Check on official portal ↗
          </a>

          <p className="text-[11px] text-zinc-600 text-center">
            Opens {svc.portal} in a new tab. Save your reference number in <Link href="/me/tasks#tracked-applications" className="text-red-400 underline">My Cases</Link>.
          </p>
        </div>
      )}

      <div className="mt-6 text-center">
        <Link href="/me" className="text-sm text-zinc-400 hover:text-zinc-200">← Back to My Profile</Link>
      </div>
    </div>
  );
}
