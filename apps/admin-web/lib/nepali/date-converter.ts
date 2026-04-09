/**
 * Bikram Sambat (BS) ↔ Gregorian (AD) date converter.
 * Essential for Nepal — all government forms use BS dates.
 *
 * Uses lookup table for BS month lengths (they're irregular).
 * Covers BS 2000-2090 (AD ~1944-2033).
 */

// BS month lengths per year (12 months each)
const BS_MONTH_DAYS: Record<number, number[]> = {
  2070: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2071: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2072: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2073: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2074: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2075: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2076: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2077: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2078: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2079: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2081: [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2082: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2083: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2084: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2085: [31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2086: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2087: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
  2088: [30, 31, 32, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2089: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2090: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
};

// Reference point: BS 2070/01/01 = AD 2013/04/14
const REF_BS = { year: 2070, month: 1, day: 1 };
const REF_AD = new Date(2013, 3, 14); // April 14, 2013

function bsDaysInYear(year: number): number {
  const m = BS_MONTH_DAYS[year];
  if (!m) return 365; // fallback
  return m.reduce((a, b) => a + b, 0);
}

function bsDaysInMonth(year: number, month: number): number {
  const m = BS_MONTH_DAYS[year];
  if (!m || month < 1 || month > 12) return 30;
  return m[month - 1];
}

/**
 * Convert BS date to AD (Gregorian) Date.
 */
export function bsToAd(bsYear: number, bsMonth: number, bsDay: number): Date {
  let totalDays = 0;

  // Count days from reference BS date to target
  if (bsYear > REF_BS.year || (bsYear === REF_BS.year && bsMonth > REF_BS.month) ||
      (bsYear === REF_BS.year && bsMonth === REF_BS.month && bsDay >= REF_BS.day)) {
    // Forward from reference
    // Days remaining in reference month
    totalDays += bsDaysInMonth(REF_BS.year, REF_BS.month) - REF_BS.day;
    // Full months in reference year
    for (let m = REF_BS.month + 1; m <= 12; m++) {
      totalDays += bsDaysInMonth(REF_BS.year, m);
    }
    // Full years
    for (let y = REF_BS.year + 1; y < bsYear; y++) {
      totalDays += bsDaysInYear(y);
    }
    // Months in target year
    if (bsYear !== REF_BS.year) {
      for (let m = 1; m < bsMonth; m++) {
        totalDays += bsDaysInMonth(bsYear, m);
      }
      totalDays += bsDay;
    } else {
      // Same year, just count from month+1
      for (let m = REF_BS.month + 1; m < bsMonth; m++) {
        totalDays += bsDaysInMonth(bsYear, m);
      }
      if (bsMonth > REF_BS.month) {
        totalDays += bsDay;
      } else {
        totalDays = bsDay - REF_BS.day;
      }
    }
  }

  const result = new Date(REF_AD);
  result.setDate(result.getDate() + totalDays);
  return result;
}

/**
 * Convert AD (Gregorian) Date to BS.
 */
export function adToBs(adDate: Date): { year: number; month: number; day: number } {
  const diffMs = adDate.getTime() - REF_AD.getTime();
  let remainingDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let bsYear = REF_BS.year;
  let bsMonth = REF_BS.month;
  let bsDay = REF_BS.day;

  if (remainingDays >= 0) {
    // Forward
    while (remainingDays > 0) {
      const daysInCurrentMonth = bsDaysInMonth(bsYear, bsMonth);
      const daysLeftInMonth = daysInCurrentMonth - bsDay;

      if (remainingDays <= daysLeftInMonth) {
        bsDay += remainingDays;
        remainingDays = 0;
      } else {
        remainingDays -= (daysLeftInMonth + 1);
        bsMonth++;
        bsDay = 1;
        if (bsMonth > 12) {
          bsMonth = 1;
          bsYear++;
        }
      }
    }
  }

  return { year: bsYear, month: bsMonth, day: bsDay };
}

/**
 * Get today in BS.
 */
export function todayBS(): { year: number; month: number; day: number } {
  return adToBs(new Date());
}

/**
 * Format BS date string: "2082-12-26"
 */
export function formatBS(bs: { year: number; month: number; day: number }): string {
  return `${bs.year}-${String(bs.month).padStart(2, '0')}-${String(bs.day).padStart(2, '0')}`;
}

/**
 * Nepali month names
 */
export const BS_MONTHS = [
  'बैशाख', 'जेठ', 'असार', 'श्रावण', 'भदौ', 'असोज',
  'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फाल्गुन', 'चैत्र',
];

export const BS_MONTHS_EN = [
  'Baisakh', 'Jestha', 'Asar', 'Shrawan', 'Bhadra', 'Ashoj',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra',
];

/**
 * Format BS date with Nepali month name: "२६ चैत्र, २०८२"
 */
export function formatBSNepali(bs: { year: number; month: number; day: number }): string {
  const nepaliDigits = (n: number) =>
    String(n).replace(/[0-9]/g, (d) => '०१२३४५६७८९'[parseInt(d)]);
  return `${nepaliDigits(bs.day)} ${BS_MONTHS[bs.month - 1]}, ${nepaliDigits(bs.year)}`;
}
