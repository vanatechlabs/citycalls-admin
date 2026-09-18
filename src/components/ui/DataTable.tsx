import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (item: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  // Opt-in client-side pagination — slices the already-fetched `data` array.
  // Omit for existing callers to keep today's "render everything" behavior.
  pageSize?: number;
}

// `T extends object` (not `Record<string, unknown>`) deliberately — a plain
// interface like `{ _id: string; name: string }` does not structurally
// satisfy a `Record<string, unknown>` generic constraint (TS requires an
// explicit index signature for that), even though every property is
// unknown-compatible. Property access below goes through an internal cast
// instead, so callers keep their real, precise types.
function asRecord(item: object): Record<string, unknown> {
  return item as Record<string, unknown>;
}

function rowKey(item: object, index: number): string {
  const record = asRecord(item);
  const id = record._id ?? record.id;
  return typeof id === 'string' ? id : String(index);
}

function cellValue(item: object, key: string): React.ReactNode {
  const value = asRecord(item)[key];
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number') return value;
  return String(value);
}

export function DataTable<T extends object>({
  data,
  columns,
  emptyMessage = "No results found.",
  onRowClick,
  pageSize,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);

  // Reset to page 1 whenever the underlying data set changes (e.g. a filter
  // or type switch) so the user doesn't land on a now out-of-range page.
  // Adjusting state during render (not in an effect) per React's guidance on
  // resetting state when a prop changes — avoids an extra render pass.
  const [prevData, setPrevData] = useState(data);
  if (data !== prevData) {
    setPrevData(data);
    setPage(1);
  }

  const totalPages = pageSize ? Math.max(1, Math.ceil(data.length / pageSize)) : 1;
  const currentPage = Math.min(page, totalPages);
  const pageData = pageSize ? data.slice((currentPage - 1) * pageSize, currentPage * pageSize) : data;

  return (
    <div className="rounded-md border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key}>{col.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            pageData.map((item, i) => (
              <TableRow
                key={rowKey(item, i)}
                onClick={() => onRowClick && onRowClick(item)}
                className={onRowClick ? "cursor-pointer hover:bg-gray-50" : ""}
              >
                {columns.map((col) => (
                  <TableCell key={`${rowKey(item, i)}-${col.key}`}>
                    {col.render ? col.render(item) : cellValue(item, col.key)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {pageSize && data.length > 0 && (
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
          <span>
            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, data.length)} of {data.length}
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
              Previous
            </Button>
            <span>Page {currentPage} of {totalPages}</span>
            <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
