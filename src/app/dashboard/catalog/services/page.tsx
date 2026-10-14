'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Swal from 'sweetalert2';
import {
  Search,
  X,
  RotateCcw,
  Filter,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';

import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  useCatalogServicesPaged,
  CatalogService,
  useDeleteCatalogService,
  useBulkChangeServiceCategory,
  useClearUnusedDiagnosticLinks,
} from '@/lib/hooks/useCatalogServices';
import { useMasters } from '@/lib/hooks/useMasters';

export default function ServicesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading services...
        </div>
      }
    >
      <ServicesPageContent />
    </Suspense>
  );
}

function ServicesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vertical = searchParams.get('vertical') ?? undefined;

  // Filter & Search states (all query parameters handled by backend API)
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'' | 'active' | 'inactive'>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Debounce search query so backend isn't spammed on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Backend query params
  const queryParams = useMemo(
    () => ({
      page,
      limit: pageSize,
      q: debouncedSearch || undefined,
      categoryId: selectedCategory || undefined,
      active:
        selectedStatus === 'active'
          ? true
          : selectedStatus === 'inactive'
          ? false
          : undefined,
      vertical,
    }),
    [page, pageSize, debouncedSearch, selectedCategory, selectedStatus, vertical]
  );

  const { data, isLoading, isFetching, isError, refetch } =
    useCatalogServicesPaged(queryParams);

  const services = data?.services ?? [];
  const meta = data?.meta;
  const total = meta?.total ?? 0;
  const totalPages = meta?.totalPages ?? 1;

  const { data: allCategories } = useMasters(['SERVICE_CATEGORY']);
  // If vertical is specified (e.g. BEAUTY), filter categories belonging to that vertical
  const categories = useMemo(() => {
    if (!allCategories) return [];
    if (!vertical) return allCategories;
    return allCategories.filter((c) => c.meta?.vertical === vertical);
  }, [allCategories, vertical]);

  const deleteService = useDeleteCatalogService();
  const bulkChangeCategory = useBulkChangeServiceCategory();
  const clearLinks = useClearUnusedDiagnosticLinks();

  const handleClearLinks = async () => {
    const result = await Swal.fire({
      title: 'Clean up Beauty & Help Now links?',
      text: 'Removes complaint / symptom / defect / solution links from every Beauty & Salon and Help Now service. Other categories are not touched.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, clean up',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#3e8914',
      cancelButtonColor: '#64748b',
    });
    if (!result.isConfirmed) return;
    clearLinks.mutate(undefined, {
      onSuccess: (r) =>
        void Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: r.cleared > 0 ? `Cleaned ${r.cleared} service(s)` : 'Nothing to clean - already tidy',
          timer: 2200,
          showConfirmButton: false,
        }),
      onError: (err) =>
        void Swal.fire({
          icon: 'error',
          title: 'Could not clean up links',
          text: err.response?.data?.message ?? 'An error occurred.',
        }),
    });
  };

  // Selection survives page changes and filters so a batch can be built up
  // across several pages before being moved.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState('');
  const pageIds = services.map((s) => s._id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const someOnPageSelected = pageIds.some((id) => selectedIds.has(id));

  const toggleOne = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const togglePage = () =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });

  const clearSelection = () => {
    setSelectedIds(new Set());
    setBulkCategory('');
  };

  const handleBulkMove = async () => {
    const target = allCategories?.find((c) => c._id === bulkCategory);
    if (!target || selectedIds.size === 0) return;
    const result = await Swal.fire({
      title: 'Change category?',
      text: `Move ${selectedIds.size} selected service(s) to "${target.label}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, move',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#3e8914',
      cancelButtonColor: '#64748b',
    });
    if (!result.isConfirmed) return;
    bulkChangeCategory.mutate(
      { ids: [...selectedIds], categoryId: bulkCategory },
      {
        onSuccess: (r) => {
          clearSelection();
          void Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: `${r.modified} service(s) moved to ${target.label}`,
            timer: 2200,
            showConfirmButton: false,
          });
        },
        onError: (err) => {
          void Swal.fire({
            icon: 'error',
            title: 'Could not change category',
            text: err.response?.data?.message ?? 'An error occurred while moving the services.',
          });
        },
      },
    );
  };

  const categoryLabel = (id?: string) =>
    allCategories?.find((c) => c._id === id)?.label ?? 'N/A';

  const hasActiveFilters = Boolean(
    searchInput.trim() || selectedCategory || selectedStatus
  );

  const handleClearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setSelectedCategory('');
    setSelectedStatus('');
    setPage(1);
  };

  const handleDelete = async (
    e: React.MouseEvent,
    id: string,
    name: string
  ) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: 'Delete Service?',
      text: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      background: '#ffffff',
    });

    if (result.isConfirmed) {
      deleteService.mutate(id, {
        onSuccess: () => {
          void Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Service deleted successfully',
            timer: 2000,
            showConfirmButton: false,
          });
        },
        onError: (err) => {
          void Swal.fire({
            icon: 'error',
            title: 'Could not delete service',
            text:
              err.response?.data?.message ??
              'An error occurred while deleting the service.',
          });
        },
      });
    }
  };

  const handleEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    router.push(`/dashboard/catalog/services/${id}`);
  };

  // Calculate pagination visible page numbers
  const visiblePages = useMemo(() => {
    const current = Math.min(page, totalPages);
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
  }, [page, totalPages]);

  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/50">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            {vertical === 'BEAUTY'
              ? 'Beauty & Salon Services'
              : 'Services Catalog'}
            {isFetching && !isLoading && (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </h1>
          <p className="text-xs sm:text-[13px] text-muted-foreground mt-0.5">
            Manage services catalog with server-side search, filtering, and pagination.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleClearLinks}
            disabled={clearLinks.isPending}
            title="Remove unused complaint/symptom/defect/solution links from Beauty & Help Now services"
          >
            {clearLinks.isPending ? 'Cleaning...' : 'Clean Beauty & Help Now links'}
          </Button>
          <Button
            size="sm"
            render={<Link href="/dashboard/catalog/services/create" />}
            className="bg-[#3e8914] hover:bg-[#347510] text-white shadow-xs"
          >
            + Add Service
          </Button>
        </div>
      </div>

      {/* Backend Filter & Search Toolbar */}
      <div className="bg-white rounded-lg border border-border/70 p-3 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search services by name or description..."
              className="h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-8 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="min-w-[170px]">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring text-foreground"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="min-w-[130px]">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as '' | 'active' | 'inactive');
                setPage(1);
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring text-foreground"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Page Size Selector */}
          <div className="min-w-[110px]">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring text-foreground"
            >
              <option value="10">10 / page</option>
              <option value="20">20 / page</option>
              <option value="50">50 / page</option>
            </select>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          )}
        </div>

        {/* Results summary bar */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
          <div className="flex items-center gap-2">
            <span>
              Total Services: <strong className="text-foreground">{total}</strong>
            </span>
            {hasActiveFilters && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-secondary/80 text-secondary-foreground px-2 py-0.5 rounded-full font-medium">
                <Filter className="w-3 h-3" /> Filters active
              </span>
            )}
          </div>
          <div>
            Showing <strong className="text-foreground">{startIndex}</strong>–
            <strong className="text-foreground">{endIndex}</strong> of{' '}
            <strong className="text-foreground">{total}</strong>
          </div>
        </div>
      </div>

      {/* Bulk action bar � appears once at least one row is ticked */}
      {selectedIds.size > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-3 rounded-lg border border-[#3e8914]/30 bg-[#f1f8ec] px-4 py-2.5 shadow-sm">
          <span className="text-sm font-semibold text-foreground">
            {selectedIds.size} selected
          </span>
          <select
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value)}
            className="h-9 min-w-[200px] rounded-md border border-input bg-white px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          >
            <option value="">Move to category...</option>
            {(allCategories ?? [])
              .filter((c) => c.active)
              .map((c) => (
                <option key={c._id} value={c._id}>
                  {c.label}
                </option>
              ))}
          </select>
          <Button
            size="sm"
            onClick={handleBulkMove}
            disabled={!bulkCategory || bulkChangeCategory.isPending}
            className="bg-[#3e8914] text-white hover:bg-[#347510]"
          >
            {bulkChangeCategory.isPending ? 'Moving...' : 'Apply'}
          </Button>
          <Button size="sm" variant="ghost" onClick={clearSelection} className="ml-auto text-muted-foreground">
            Clear selection
          </Button>
        </div>
      )}

      {/* Services Table View */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg border text-muted-foreground gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#3e8914]" />
          <span>Fetching services from backend...</span>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg border text-destructive gap-3">
          <p>Failed to load services from backend.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <DataTable<CatalogService>
            data={services}
            emptyMessage={
              hasActiveFilters
                ? 'No services match your search or filter criteria.'
                : 'No services found in catalog.'
            }
            onRowClick={(item) =>
              router.push(`/dashboard/catalog/services/${item._id}`)
            }
            columns={[
              {
                key: 'select',
                header: (
                  <input
                    type="checkbox"
                    aria-label="Select all services on this page"
                    className="h-4 w-4 cursor-pointer accent-[#3e8914]"
                    checked={allOnPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = !allOnPageSelected && someOnPageSelected;
                    }}
                    onChange={togglePage}
                  />
                ),
                render: (item) => (
                  <div onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Select ${item.name}`}
                      className="h-4 w-4 cursor-pointer accent-[#3e8914]"
                      checked={selectedIds.has(item._id)}
                      onChange={() => toggleOne(item._id)}
                    />
                  </div>
                ),
              },
              {
                key: 'name',
                header: 'Service Name',
                render: (item) => (
                  <div>
                    <div className="font-medium text-foreground hover:underline">
                      {item.name}
                    </div>
                    {item.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1 max-w-md">
                        {item.description}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'categoryId',
                header: 'Category',
                render: (item) => (
                  <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded">
                    {categoryLabel(item.categoryId)}
                  </span>
                ),
              },
              {
                key: 'pricing',
                header: 'Base Price (₹)',
                render: (item) => (
                  <span className="font-semibold text-slate-900">
                    ₹{(item.pricing?.basePrice ?? 0).toLocaleString('en-IN')}
                  </span>
                ),
              },
              {
                key: 'active',
                header: 'Status',
                render: (item) => (
                  <StatusBadge
                    label={item.active ? 'Active' : 'Inactive'}
                    category={item.active ? 'success' : 'default'}
                  />
                ),
              },
              {
                key: 'actions',
                header: 'Action',
                render: (item) => (
                  <div
                    className="flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      onClick={(e) => handleEdit(e, item._id)}
                      title="Edit Service"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => handleDelete(e, item._id, item.name)}
                      disabled={deleteService.isPending}
                      title="Delete Service"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ),
              },
            ]}
          />

          {/* Server-Side Pagination Bar */}
          {total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-md border border-border/70 text-xs text-muted-foreground">
              <div>
                Showing <span className="font-semibold text-foreground">{startIndex}</span>–
                <span className="font-semibold text-foreground">{endIndex}</span> of{' '}
                <span className="font-semibold text-foreground">{total}</span> services
              </div>

              <div className="flex items-center gap-1">
                {/* Previous Page */}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 transition"
                  aria-label="Previous Page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {/* Page numbers */}
                {visiblePages.map((p, idx) =>
                  p === '...' ? (
                    <span
                      key={`dots-${idx}`}
                      className="px-2 text-gray-400 select-none"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      className={`h-8 min-w-8 px-2 rounded border text-xs font-semibold transition ${
                        p === page
                          ? 'border-[#3e8914] bg-[#3e8914] text-white'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

                {/* Next Page */}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 transition"
                  aria-label="Next Page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
