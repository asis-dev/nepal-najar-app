'use client';

import Link from 'next/link';
import { useState } from 'react';

const BILL_CATEGORIES = [
  {
    id: 'electricity',
    icon: '⚡',
    name: 'Electricity',
    name_ne: 'बिजुली',
    provider: 'Nepal Electricity Authority',
    portal: 'https://nea.org.np/onlinepayment',
    deepLinks: {
      esewa: 'https://esewa.com.np/#/home',
      khalti: 'https://khalti.com',
    },
    fields: [{ key: 'customer_id', label: 'Customer ID / SC No.', placeholder: 'e.g., 034-01-001' }],
  },
  {
    id: 'water',
    icon: '💧',
    name: 'Water Supply',
    name_ne: 'खानेपानी',
    provider: 'KUKL / Local Water Board',
    portal: 'https://www.kathmanduwater.org',
    deepLinks: {
      esewa: 'https://esewa.com.np/#/home',
      khalti: 'https://khalti.com',
    },
    fields: [{ key: 'customer_id', label: 'Customer ID', placeholder: 'Your water account no.' }],
  },
  {
    id: 'internet',
    icon: '🌐',
    name: 'Internet / FTTH',
    name_ne: 'इन्टरनेट',
    provider: 'NTC / WorldLink / Vianet / Subisu',
    portal: 'https://www.ntc.net.np',
    deepLinks: {
      esewa: 'https://esewa.com.np/#/home',
      khalti: 'https://khalti.com',
    },
    fields: [
      { key: 'username', label: 'Username / Account', placeholder: 'Your ISP account' },
      { key: 'provider', label: 'ISP', placeholder: 'e.g., WorldLink, NTC FTTH' },
    ],
  },
  {
    id: 'mobile',
    icon: '📱',
    name: 'Mobile Recharge',
    name_ne: 'मोबाइल रिचार्ज',
    provider: 'NTC / Ncell / Smart',
    portal: null,
    deepLinks: {
      esewa: 'https://esewa.com.np/#/home',
      khalti: 'https://khalti.com',
    },
    fields: [
      { key: 'phone', label: 'Mobile Number', placeholder: '98XXXXXXXX' },
      { key: 'amount', label: 'Amount (NPR)', placeholder: '100' },
    ],
  },
  {
    id: 'tv',
    icon: '📺',
    name: 'Cable TV / DTH',
    name_ne: 'केबल / DTH',
    provider: 'DishHome / SimTV / Prabhu TV',
    portal: null,
    deepLinks: {
      esewa: 'https://esewa.com.np/#/home',
      khalti: 'https://khalti.com',
    },
    fields: [{ key: 'smartcard', label: 'Smartcard No.', placeholder: 'e.g., DH12345678' }],
  },
  {
    id: 'insurance',
    icon: '🛡️',
    name: 'Insurance Premium',
    name_ne: 'बीमा प्रिमियम',
    provider: 'Various',
    portal: null,
    deepLinks: {
      esewa: 'https://esewa.com.np/#/home',
    },
    fields: [{ key: 'policy_no', label: 'Policy Number', placeholder: 'Your insurance policy no.' }],
  },
  {
    id: 'govt-fee',
    icon: '🏛️',
    name: 'Government Fee',
    name_ne: 'सरकारी दस्तुर',
    provider: 'ConnectIPS / Bank',
    portal: 'https://www.connectips.com',
    deepLinks: {
      connectips: 'https://www.connectips.com',
    },
    fields: [
      { key: 'service_type', label: 'Service Type', placeholder: 'e.g., Passport fee, License fee' },
      { key: 'amount', label: 'Amount (NPR)', placeholder: '5000' },
    ],
  },
];

export default function BillsPage() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
        💡 PAY BILLS
      </div>
      <h1 className="text-3xl font-black mb-1">Pay Bills</h1>
      <p className="text-zinc-400 text-sm mb-6">
        Pay electricity, water, internet, mobile, and government fees — all from one place via eSewa, Khalti, or ConnectIPS.
      </p>

      <div className="space-y-3">
        {BILL_CATEGORIES.map((cat) => (
          <div key={cat.id} className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
            <button
              onClick={() => setSelected(selected === cat.id ? null : cat.id)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{cat.icon}</span>
                <div>
                  <div className="font-semibold text-zinc-100">{cat.name}</div>
                  <div className="text-xs text-zinc-500">{cat.name_ne} · {cat.provider}</div>
                </div>
              </div>
              <span className="text-zinc-500 text-lg">{selected === cat.id ? '−' : '+'}</span>
            </button>

            {selected === cat.id && (
              <div className="border-t border-zinc-800 p-4 space-y-3">
                {cat.fields.map((f) => (
                  <div key={f.key}>
                    <label className="text-xs font-semibold text-zinc-400 block mb-1">{f.label}</label>
                    <input
                      type="text"
                      placeholder={f.placeholder}
                      className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-red-500 outline-none"
                    />
                  </div>
                ))}

                <div className="pt-2 flex flex-wrap gap-2">
                  {Object.entries(cat.deepLinks).map(([method, url]) => (
                    <a
                      key={method}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors ${
                        method === 'esewa'
                          ? 'bg-green-600 hover:bg-green-500'
                          : method === 'khalti'
                            ? 'bg-purple-600 hover:bg-purple-500'
                            : 'bg-blue-600 hover:bg-blue-500'
                      }`}
                    >
                      {method === 'esewa' ? '💚 Pay with eSewa' : method === 'khalti' ? '💜 Pay with Khalti' : '🔵 Pay with ConnectIPS'}
                    </a>
                  ))}
                </div>

                {cat.portal && (
                  <a
                    href={cat.portal}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-red-400 hover:underline block"
                  >
                    Official payment portal ↗
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl bg-zinc-900 border border-zinc-800 p-4 text-center">
        <p className="text-xs text-zinc-500">
          Nepal Republic redirects you to official payment apps. We never handle your money or bank details.
        </p>
      </div>

      <div className="mt-4 text-center">
        <Link href="/me" className="text-sm text-zinc-400 hover:text-zinc-200">← Back to My Profile</Link>
      </div>
    </div>
  );
}
