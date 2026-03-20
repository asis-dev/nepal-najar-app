'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';

interface ExportButtonProps {
  onExportCSV: () => void;
  onExportPDF: () => void;
}

export function ExportButton({ onExportCSV, onExportPDF }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-3 py-2 text-sm text-gray-300 hover:text-white transition-colors duration-200"
      >
        <Download className="w-4 h-4" />
        <span>Export</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 min-w-[160px] glass-card border border-white/10 rounded-xl overflow-hidden shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <button
            onClick={() => {
              onExportCSV();
              setOpen(false);
            }}
            className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Export CSV
          </button>
          <button
            onClick={() => {
              onExportPDF();
              setOpen(false);
            }}
            className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <FileText className="w-4 h-4 text-blue-400" />
            Export PDF
          </button>
        </div>
      )}
    </div>
  );
}
