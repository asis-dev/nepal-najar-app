import type { GovernmentPromise } from '@/lib/data/promises';

/**
 * Export promises as a downloadable CSV file.
 */
export function exportPromisesCSV(promises: GovernmentPromise[]) {
  const headers = [
    'Title',
    'Title (NE)',
    'Category',
    'Status',
    'Progress (%)',
    'Budget Estimated (Lakhs NPR)',
    'Budget Spent (Lakhs NPR)',
    'Evidence Count',
    'Trust Level',
    'Deadline',
  ];

  const escapeCSV = (value: string | number | undefined): string => {
    if (value === undefined || value === null) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = promises.map((p) =>
    [
      escapeCSV(p.title),
      escapeCSV(p.title_ne),
      escapeCSV(p.category),
      escapeCSV(p.status),
      escapeCSV(p.progress),
      escapeCSV(p.estimatedBudgetNPR),
      escapeCSV(p.spentNPR),
      escapeCSV(p.evidenceCount),
      escapeCSV(p.trustLevel),
      escapeCSV(p.deadline),
    ].join(',')
  );

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const today = new Date().toISOString().split('T')[0];
  const link = document.createElement('a');
  link.href = url;
  link.download = `nepal-najar-promises-${today}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export promises as a print-optimized PDF via the browser print dialog.
 */
export function exportPromisesPDF(promises: GovernmentPromise[]) {
  const today = new Date().toISOString().split('T')[0];

  const statusLabel: Record<string, string> = {
    not_started: 'Not Started',
    in_progress: 'In Progress',
    delivered: 'Delivered',
    stalled: 'Stalled',
  };

  const tableRows = promises
    .map(
      (p) => `
      <tr>
        <td>${p.title}</td>
        <td>${p.title_ne}</td>
        <td>${p.category}</td>
        <td>${statusLabel[p.status] || p.status}</td>
        <td style="text-align:center">${p.progress}%</td>
        <td style="text-align:right">${p.estimatedBudgetNPR ?? '-'}</td>
        <td style="text-align:right">${p.spentNPR ?? '-'}</td>
        <td style="text-align:center">${p.evidenceCount}</td>
      </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Nepal Najar — Government Promises Report (${today})</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #1a1a1a; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .subtitle { color: #666; font-size: 13px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #f0f0f0; text-align: left; padding: 6px 8px; border-bottom: 2px solid #ccc; font-weight: 600; }
    td { padding: 5px 8px; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
    tr:nth-child(even) td { background: #fafafa; }
    @media print {
      body { padding: 0; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>Nepal Najar — Government Promises Report</h1>
  <div class="subtitle">Generated on ${today} — ${promises.length} promises tracked</div>
  <table>
    <thead>
      <tr>
        <th>Title</th>
        <th>Title (NE)</th>
        <th>Category</th>
        <th>Status</th>
        <th>Progress</th>
        <th>Est. Budget (L)</th>
        <th>Spent (L)</th>
        <th>Evidence</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    // Small delay to ensure content renders before print dialog
    setTimeout(() => printWindow.print(), 300);
  }
}
