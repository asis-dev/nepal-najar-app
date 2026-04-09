'use client';

import Link from 'next/link';
import { todayBS, formatBSNepali, BS_MONTHS_EN } from '@/lib/nepali/date-converter';

/**
 * Nepal Government Holiday Calendar 2082/83 BS (2025/26 AD).
 * Helps users plan office visits — don't waste a trip on a holiday!
 */
const HOLIDAYS_2082: Array<{
  bs_date: string;
  ad_date: string;
  name_en: string;
  name_ne: string;
  type: 'public' | 'restricted' | 'saturday';
}> = [
  { bs_date: '2082-01-01', ad_date: '2025-04-14', name_en: 'New Year (Naya Barsha)', name_ne: 'नयाँ वर्ष', type: 'public' },
  { bs_date: '2082-01-11', ad_date: '2025-04-24', name_en: 'Lok Tantra Diwas', name_ne: 'लोकतन्त्र दिवस', type: 'public' },
  { bs_date: '2082-02-01', ad_date: '2025-05-15', name_en: "Buddha Jayanti (Vesak)", name_ne: 'बुद्ध जयन्ती', type: 'public' },
  { bs_date: '2082-02-15', ad_date: '2025-05-29', name_en: 'Republic Day', name_ne: 'गणतन्त्र दिवस', type: 'public' },
  { bs_date: '2082-03-15', ad_date: '2025-06-29', name_en: 'Eid ul-Fitr (estimated)', name_ne: 'इद उल-फित्र', type: 'public' },
  { bs_date: '2082-04-02', ad_date: '2025-07-17', name_en: 'Guru Purnima', name_ne: 'गुरु पूर्णिमा', type: 'restricted' },
  { bs_date: '2082-04-27', ad_date: '2025-08-11', name_en: 'Janai Purnima / Raksha Bandhan', name_ne: 'जनै पूर्णिमा', type: 'public' },
  { bs_date: '2082-04-29', ad_date: '2025-08-13', name_en: 'Gai Jatra', name_ne: 'गाईजात्रा', type: 'public' },
  { bs_date: '2082-05-03', ad_date: '2025-08-19', name_en: 'Krishna Janmashtami', name_ne: 'कृष्ण जन्माष्टमी', type: 'public' },
  { bs_date: '2082-05-20', ad_date: '2025-09-05', name_en: 'Teej', name_ne: 'तीज', type: 'public' },
  { bs_date: '2082-05-27', ad_date: '2025-09-12', name_en: "Father's Day (Buba ko Mukh Herne Din)", name_ne: 'बुबाको मुख हेर्ने दिन', type: 'restricted' },
  { bs_date: '2082-06-03', ad_date: '2025-09-19', name_en: 'Indra Jatra', name_ne: 'इन्द्र जात्रा', type: 'restricted' },
  { bs_date: '2082-06-17', ad_date: '2025-10-02', name_en: 'Dashain: Ghatasthapana', name_ne: 'दशैं: घटस्थापना', type: 'public' },
  { bs_date: '2082-06-22', ad_date: '2025-10-07', name_en: 'Dashain: Fulpati', name_ne: 'दशैं: फूलपाती', type: 'public' },
  { bs_date: '2082-06-23', ad_date: '2025-10-08', name_en: 'Dashain: Maha Ashtami', name_ne: 'दशैं: महा अष्टमी', type: 'public' },
  { bs_date: '2082-06-24', ad_date: '2025-10-09', name_en: 'Dashain: Maha Nawami', name_ne: 'दशैं: महा नवमी', type: 'public' },
  { bs_date: '2082-06-25', ad_date: '2025-10-10', name_en: 'Dashain: Vijaya Dashami', name_ne: 'दशैं: विजया दशमी', type: 'public' },
  { bs_date: '2082-06-26', ad_date: '2025-10-11', name_en: 'Dashain: Ekadashi', name_ne: 'दशैं: एकादशी', type: 'public' },
  { bs_date: '2082-06-27', ad_date: '2025-10-12', name_en: 'Dashain: Dwadashi', name_ne: 'दशैं: द्वादशी', type: 'public' },
  { bs_date: '2082-07-13', ad_date: '2025-10-29', name_en: 'Tihar: Kaag Tihar', name_ne: 'तिहार: काग तिहार', type: 'public' },
  { bs_date: '2082-07-14', ad_date: '2025-10-30', name_en: 'Tihar: Kukur Tihar', name_ne: 'तिहार: कुकुर तिहार', type: 'public' },
  { bs_date: '2082-07-15', ad_date: '2025-10-31', name_en: 'Tihar: Laxmi Puja', name_ne: 'तिहार: लक्ष्मी पूजा', type: 'public' },
  { bs_date: '2082-07-16', ad_date: '2025-11-01', name_en: 'Tihar: Govardhan Puja', name_ne: 'तिहार: गोवर्धन पूजा', type: 'public' },
  { bs_date: '2082-07-17', ad_date: '2025-11-02', name_en: 'Tihar: Bhai Tika', name_ne: 'तिहार: भाइ टिका', type: 'public' },
  { bs_date: '2082-07-19', ad_date: '2025-11-04', name_en: 'Chhath Parva', name_ne: 'छठ पर्व', type: 'public' },
  { bs_date: '2082-09-01', ad_date: '2025-12-16', name_en: 'Constitution Day', name_ne: 'संविधान दिवस', type: 'public' },
  { bs_date: '2082-09-11', ad_date: '2025-12-26', name_en: 'Christmas (Baada Din)', name_ne: 'बडा दिन', type: 'restricted' },
  { bs_date: '2082-10-01', ad_date: '2026-01-15', name_en: 'Maghe Sankranti', name_ne: 'माघे सक्रान्ति', type: 'public' },
  { bs_date: '2082-10-16', ad_date: '2026-01-30', name_en: "Martyr's Day (Shahid Diwas)", name_ne: 'शहीद दिवस', type: 'public' },
  { bs_date: '2082-10-22', ad_date: '2026-02-05', name_en: 'Sonam Lhosar', name_ne: 'सोनाम ल्होसार', type: 'restricted' },
  { bs_date: '2082-11-07', ad_date: '2026-02-19', name_en: 'Maha Shivaratri', name_ne: 'महा शिवरात्री', type: 'public' },
  { bs_date: '2082-11-08', ad_date: '2026-02-20', name_en: 'Democracy Day', name_ne: 'प्रजातन्त्र दिवस', type: 'public' },
  { bs_date: '2082-11-24', ad_date: '2026-03-08', name_en: "Int'l Women's Day", name_ne: 'अन्तर्राष्ट्रिय महिला दिवस', type: 'public' },
  { bs_date: '2082-11-28', ad_date: '2026-03-12', name_en: 'Fagu Purnima (Holi)', name_ne: 'फागु पूर्णिमा (होली)', type: 'public' },
  { bs_date: '2082-12-18', ad_date: '2026-03-31', name_en: 'Ram Navami', name_ne: 'राम नवमी', type: 'restricted' },
];

export default function HolidaysPage() {
  const today = todayBS();
  const todayStr = `${today.year}-${String(today.month).padStart(2, '0')}-${String(today.day).padStart(2, '0')}`;

  // Find next upcoming holiday
  const upcoming = HOLIDAYS_2082.filter((h) => h.bs_date >= todayStr);
  const nextHoliday = upcoming[0];

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-3">
        📅 HOLIDAYS
      </div>
      <h1 className="text-3xl font-black mb-1">Government Holidays 2082 BS</h1>
      <p className="text-zinc-400 text-sm mb-2">
        Plan your office visits — government offices are closed on these days + every Saturday.
      </p>
      <p className="text-xs text-zinc-500 mb-6">
        Today: {formatBSNepali(today)} · {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      {nextHoliday && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-600/20 to-amber-500/10 border border-amber-500/30 p-5 mb-6">
          <div className="text-[10px] uppercase text-amber-400/60 tracking-wider">Next holiday</div>
          <div className="text-xl font-black text-white mt-1">{nextHoliday.name_en}</div>
          <div className="text-sm text-zinc-300">{nextHoliday.name_ne}</div>
          <div className="text-xs text-amber-300 mt-2">
            {nextHoliday.ad_date} · BS {nextHoliday.bs_date}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {HOLIDAYS_2082.map((h) => {
          const isPast = h.bs_date < todayStr;
          const isToday = h.bs_date === todayStr;
          return (
            <div
              key={h.bs_date + h.name_en}
              className={`rounded-xl border p-3 flex items-center justify-between transition-colors ${
                isToday
                  ? 'bg-red-600/20 border-red-500/40'
                  : isPast
                    ? 'bg-zinc-900/50 border-zinc-800/50 opacity-50'
                    : 'bg-zinc-900 border-zinc-800'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${isToday ? 'text-red-300' : isPast ? 'text-zinc-500' : 'text-zinc-100'}`}>
                    {h.name_en}
                  </span>
                  {h.type === 'restricted' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700">
                      Restricted
                    </span>
                  )}
                  {isToday && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-bold">
                      TODAY
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-500">{h.name_ne}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs text-zinc-400">{h.ad_date}</div>
                <div className="text-[10px] text-zinc-600">{h.bs_date}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl bg-zinc-900 border border-zinc-800 p-4 text-center text-xs text-zinc-500">
        Saturday is the weekly government holiday in Nepal. Most offices are open Sun–Fri, 10am–5pm (winter) / 10am–4pm (summer).
      </div>

      <div className="mt-4 text-center">
        <Link href="/me" className="text-sm text-zinc-400 hover:text-zinc-200">← Back to My Profile</Link>
      </div>
    </div>
  );
}
