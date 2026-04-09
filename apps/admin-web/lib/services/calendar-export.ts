/**
 * Generate .ics calendar file for appointment reminders.
 * Used when user_application has reminder_on or expected_on date.
 */

export function generateICS(event: {
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate?: Date;
}): string {
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const end = event.endDate || new Date(event.startDate.getTime() + 60 * 60 * 1000);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nepal Republic//Services//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(event.startDate)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${escapeICS(event.title)}`,
    event.description ? `DESCRIPTION:${escapeICS(event.description)}` : '',
    event.location ? `LOCATION:${escapeICS(event.location)}` : '',
    `UID:${crypto.randomUUID()}@nepalrepublic.org`,
    'STATUS:CONFIRMED',
    // Reminder 1 day before
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: ${escapeICS(event.title)}`,
    'END:VALARM',
    // Reminder 3 hours before
    'BEGIN:VALARM',
    'TRIGGER:-PT3H',
    'ACTION:DISPLAY',
    `DESCRIPTION:Coming up: ${escapeICS(event.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

function escapeICS(s: string): string {
  return s.replace(/[\\;,\n]/g, (c) =>
    c === '\n' ? '\\n' : `\\${c}`
  );
}

/**
 * Trigger download of .ics file in the browser.
 */
export function downloadICS(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
