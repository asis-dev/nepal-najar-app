'use client';

import Link from 'next/link';

const EMERGENCY_NUMBERS = [
  { name: 'Police', name_ne: 'प्रहरी', number: '100', icon: '🚔', color: 'bg-blue-500/10 border-blue-500/20' },
  { name: 'Ambulance', name_ne: 'एम्बुलेन्स', number: '102', icon: '🚑', color: 'bg-red-500/10 border-red-500/20' },
  { name: 'Fire Brigade', name_ne: 'दमकल', number: '101', icon: '🚒', color: 'bg-orange-500/10 border-orange-500/20' },
  { name: 'Traffic Police', name_ne: 'ट्राफिक प्रहरी', number: '103', icon: '🚦', color: 'bg-yellow-500/10 border-yellow-500/20' },
  { name: 'Women Helpline', name_ne: 'महिला हेल्पलाइन', number: '1145', icon: '🛡️', color: 'bg-purple-500/10 border-purple-500/20' },
  { name: 'Child Helpline', name_ne: 'बाल हेल्पलाइन', number: '1098', icon: '👶', color: 'bg-pink-500/10 border-pink-500/20' },
  { name: 'NEA (Electricity)', name_ne: 'विद्युत (NEA)', number: '1152', icon: '⚡', color: 'bg-amber-500/10 border-amber-500/20' },
  { name: 'NTC Customer Care', name_ne: 'नेपाल टेलिकम', number: '1498', icon: '📞', color: 'bg-cyan-500/10 border-cyan-500/20' },
  { name: 'Ncell Customer Care', name_ne: 'एनसेल', number: '9005', icon: '📱', color: 'bg-indigo-500/10 border-indigo-500/20' },
  { name: 'Blood Bank (Red Cross)', name_ne: 'रक्त बैंक (रेडक्रस)', number: '01-4270650', icon: '🩸', color: 'bg-rose-500/10 border-rose-500/20' },
];

const HOSPITALS = [
  { name: 'Bir Hospital', name_ne: 'बीर अस्पताल', phone: '01-4221988', address: 'Mahaboudha, Kathmandu', emergency: true },
  { name: 'Teaching Hospital (TUTH)', name_ne: 'शिक्षण अस्पताल', phone: '01-4412303', address: 'Maharajgunj, Kathmandu', emergency: true },
  { name: 'Patan Hospital', name_ne: 'पाटन अस्पताल', phone: '01-5522266', address: 'Lagankhel, Lalitpur', emergency: true },
  { name: 'Grande Hospital', name_ne: 'ग्रान्डी अस्पताल', phone: '01-5159266', address: 'Tokha, Kathmandu', emergency: true },
  { name: 'Norvic Hospital', name_ne: 'नर्भिक अस्पताल', phone: '01-4258554', address: 'Thapathali, Kathmandu', emergency: true },
  { name: 'Nepal Medical College', name_ne: 'नेपाल मेडिकल कलेज', phone: '01-4911008', address: 'Jorpati, Kathmandu', emergency: true },
  { name: 'B&B Hospital', name_ne: 'बी एन्ड बी अस्पताल', phone: '01-5531933', address: 'Gwarko, Lalitpur', emergency: true },
  { name: 'Civil Service Hospital', name_ne: 'निजामती कर्मचारी अस्पताल', phone: '01-4107000', address: 'Minbhawan, Kathmandu', emergency: true },
];

const GOV_CONTACTS = [
  { name: 'CDO Office Kathmandu', name_ne: 'जिल्ला प्रशासन कार्यालय', phone: '01-4416034' },
  { name: 'Passport Department', name_ne: 'राहदानी विभाग', phone: '01-4410842' },
  { name: 'DoTM (Transport)', name_ne: 'यातायात विभाग', phone: '01-4474920' },
  { name: 'IRD (Tax)', name_ne: 'आन्तरिक राजस्व', phone: '01-4415802' },
  { name: 'Election Commission', name_ne: 'निर्वाचन आयोग', phone: '01-4228802' },
  { name: 'Corruption Report (CIAA)', name_ne: 'अख्तियार (CIAA)', phone: '01-4200016' },
  { name: 'Consumer Rights', name_ne: 'उपभोक्ता हित', phone: '01-4211641' },
  { name: 'Hello Sarkar', name_ne: 'हेलो सरकार', phone: '1111' },
];

export default function EmergencyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold mb-3">
        🆘 EMERGENCY
      </div>
      <h1 className="text-3xl font-black mb-1">Emergency & Helplines</h1>
      <p className="text-zinc-400 text-sm mb-6">All essential Nepal emergency numbers, hospitals, and government contacts in one place.</p>

      {/* Emergency numbers */}
      <section className="mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-3">Emergency Numbers</h2>
        <div className="grid grid-cols-2 gap-2">
          {EMERGENCY_NUMBERS.map((e) => (
            <a
              key={e.number}
              href={`tel:${e.number}`}
              className={`rounded-xl border p-3 flex items-center gap-3 transition-colors hover:bg-white/5 ${e.color}`}
            >
              <span className="text-2xl">{e.icon}</span>
              <div className="min-w-0">
                <div className="text-sm font-bold text-zinc-100">{e.name}</div>
                <div className="text-[10px] text-zinc-500">{e.name_ne}</div>
                <div className="text-lg font-black text-white mt-0.5">{e.number}</div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Hospitals */}
      <section className="mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-3">Major Hospitals (Kathmandu Valley)</h2>
        <div className="space-y-2">
          {HOSPITALS.map((h) => (
            <div key={h.phone} className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-zinc-100">{h.name}</div>
                <div className="text-[10px] text-zinc-500">{h.name_ne} · {h.address}</div>
              </div>
              <a
                href={`tel:${h.phone}`}
                className="shrink-0 rounded-lg bg-red-600/20 border border-red-500/30 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-600/30"
              >
                📞 {h.phone}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Government contacts */}
      <section className="mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-3">Government Helplines</h2>
        <div className="space-y-2">
          {GOV_CONTACTS.map((g) => (
            <div key={g.phone} className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-zinc-100">{g.name}</div>
                <div className="text-[10px] text-zinc-500">{g.name_ne}</div>
              </div>
              <a
                href={`tel:${g.phone}`}
                className="shrink-0 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
              >
                {g.phone}
              </a>
            </div>
          ))}
        </div>
      </section>

      <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-center text-xs text-amber-300">
        In an emergency, call <a href="tel:100" className="font-bold text-white underline">100</a> (Police) or <a href="tel:102" className="font-bold text-white underline">102</a> (Ambulance) immediately.
      </div>

      <div className="mt-6 text-center">
        <Link href="/me" className="text-sm text-zinc-400 hover:text-zinc-200">← Back to My Profile</Link>
      </div>
    </div>
  );
}
