import { LoadingSpinner } from '@/components/ui/loading-spinner';

export function PageLoadingSkeleton({ title = 'Loading TourLedger' }: { title?: string }) {
  return (
    <main className="min-h-screen bg-[#f5f7fa] px-4 py-8" aria-busy="true" aria-label={title}>
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-3">
          <LoadingSpinner size={22} />
          <p className="text-sm font-semibold text-[#10243a]">{title}</p>
        </div>
        <div className="mt-7 h-28 rounded-2xl tourledger-skeleton" />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-32 rounded-2xl tourledger-skeleton" />)}
        </div>
      </div>
    </main>
  );
}
