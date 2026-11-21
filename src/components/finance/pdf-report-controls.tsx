'use client';

import { useState } from 'react';
import { Loader2, FileDown } from 'lucide-react';

export function PdfReportControls({ groupId }: { groupId: string }) {
  const [rangeMode, setRangeMode] = useState<'whole' | 'custom'>('whole');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const invalidRange = rangeMode === 'custom' && (!from || !to || from > to);

  async function generate() {
    if (invalidRange || loading) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (rangeMode === 'custom') {
        params.set('from', from);
        params.set('to', to);
      }
      const response = await fetch(`/api/groups/${groupId}/reports/pdf-data?${params.toString()}`, {
        method: 'GET', credentials: 'same-origin', cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not retrieve report data.');

      // The PDF module is loaded only when the manager requests an export.
      const { buildCompleteTourPdf } = await import('@/lib/finance/pdf');
      const blob = buildCompleteTourPdf(payload);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      const safeName = String(payload.group?.name || 'tour').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      anchor.download = `tourledger-${safeName || 'tour'}-complete-financial-report.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'PDF generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-[#F5F7FA] p-2.5 text-[#10243A]"><FileDown size={21} /></div>
        <div>
          <h2 className="text-base font-bold text-slate-900">Download Complete Tour Financial Report</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">One consolidated PDF containing the overview, contribution report, complete expense report, member statements and final reconciliation. Available to managers and assistant managers.</p>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold text-slate-600">Report Period</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setRangeMode('whole')} aria-pressed={rangeMode === 'whole'} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold ${rangeMode === 'whole' ? 'border-[#10243A] bg-[#10243A] text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
            Whole Tour Timeline
          </button>
          <button type="button" onClick={() => setRangeMode('custom')} aria-pressed={rangeMode === 'custom'} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold ${rangeMode === 'custom' ? 'border-[#10243A] bg-[#10243A] text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
            Custom Dates
          </button>
        </div>
        {rangeMode === 'whole' ? (
          <p className="mt-2 rounded-lg bg-[#F5F7FA] p-3 text-xs leading-5 text-slate-600">Includes all posted financial activity recorded for this group, including pre-tour contributions and bookings. No transaction date is omitted because it occurred before the scheduled tour start.</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-600">From Date<input type="date" value={from} onChange={e => setFrom(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm" /></label>
            <label className="text-xs font-medium text-slate-600">To Date<input type="date" min={from || undefined} value={to} onChange={e => setTo(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm" /></label>
          </div>
        )}
      </div>

      {invalidRange && <p className="mt-3 text-xs text-amber-700">Choose a valid start date and end date. The end date cannot be earlier than the start date.</p>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}

      <button type="button" onClick={generate} disabled={loading || invalidRange} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#10243A] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1B3856] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
        {loading ? <><Loader2 size={16} className="animate-spin" /> Preparing Report…</> : <><FileDown size={16} /> Generate & Download PDF</>}
      </button>
      <p className="mt-2 text-[11px] leading-5 text-slate-400">Financial data is securely retrieved after permission checks. PDF layout, calculations and file generation run in this browser.</p>
    </section>
  );
}
