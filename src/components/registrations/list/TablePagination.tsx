import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

interface TablePaginationProps {
  page: number;
  limit: number;
  total: number;
  label: string;
  onPageChange: (page: number) => void;
}

// Up to 5 page numbers around the current one, with first/last and gaps.
function visiblePages(current: number, totalPages: number): (number | '...')[] {
  const start = Math.max(1, Math.min(current - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const pages: (number | '...')[] = [];
  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push('...');
  }
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages) {
    if (end < totalPages - 1) pages.push('...');
    pages.push(totalPages);
  }
  return pages;
}

export function TablePagination({ page, limit, total, label, onPageChange }: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const first = total === 0 ? 0 : (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);

  return (
    <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
      <div className="text-xs font-medium text-[#293681]">
        Showing <span className="font-bold">{first}</span>–<span className="font-bold">{last}</span> of <span className="font-bold">{total}</span> {label}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex h-8 w-8 items-center justify-center border-2 border-gray-200 bg-white text-[#3e8914] disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {visiblePages(page, totalPages).map((p, i) =>
          p === '...' ? (
            <MoreHorizontal key={`gap-${i}`} className="h-4 w-4 text-gray-400" />
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`h-8 min-w-8 border-2 px-2 text-xs font-bold ${
                p === page ? 'border-[#3e8914] bg-[#3e8914] text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-[#3e8914]'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex h-8 w-8 items-center justify-center border-2 border-gray-200 bg-white text-[#3e8914] disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
