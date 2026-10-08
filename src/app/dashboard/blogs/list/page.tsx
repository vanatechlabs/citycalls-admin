'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Newspaper, Pencil, Plus, Search, Star, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';

import { PageShell } from '@/components/registrations/shared/PageShell';
import { BlogListItem, BlogStatus, useBlogList, useDeleteBlog, useSaveBlog } from '@/lib/hooks/useBlogs';
import { usePermission } from '@/lib/hooks/useAuth';
import { WEBSITE_ORIGIN } from '@/lib/hooks/useSeoMeta';
import { formatDate, formatTime, resolveMediaUrl } from '@/lib/registrations/format';

const PAGE_SIZE = 10;
const STATUS_STYLE: Record<BlogStatus, string> = {
  PUBLISHED: 'border border-[#a5d6a7] bg-[#e8f5e9] text-[#23714a]',
  DRAFT: 'border border-[#ffe082] bg-[#fff8e1] text-[#b78103]',
  ARCHIVED: 'border border-[#fca5a5] bg-[#fee2e2] text-[#dc2626]',
};
const SELECT_ARROW = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;
const ICON_BUTTON = 'flex h-[25px] w-[25px] items-center justify-center rounded-[6px] border backdrop-blur-md transition-all hover:scale-105 active:scale-95';

// Blog Section → Blog List.
export default function BlogListPage() {
  const router = useRouter();
  const canEdit = usePermission('marketing', 'edit');
  const { data: blogs = [], isLoading } = useBlogList();
  const saveBlog = useSaveBlog();
  const deleteBlog = useDeleteBlog();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | BlogStatus>('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);

  const categories = useMemo(() => [...new Set(blogs.map((b) => b.category))].sort(), [blogs]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return blogs.filter(
      (b) =>
        (!statusFilter || b.status === statusFilter) &&
        (!categoryFilter || b.category === categoryFilter) &&
        (!q || [b.title, b.slug, b.category, b.author].some((v) => v.toLowerCase().includes(q)))
    );
  }, [blogs, search, statusFilter, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);

  const changeStatus = async (blog: BlogListItem, status: BlogStatus) => {
    try {
      await saveBlog.mutateAsync({ id: blog._id, status });
      void Swal.fire({ icon: 'success', title: status === 'PUBLISHED' ? 'Published' : status === 'DRAFT' ? 'Moved to Draft' : 'Archived', timer: 1300, showConfirmButton: false });
    } catch {
      void Swal.fire({ icon: 'error', title: 'Could not change status', confirmButtonColor: '#3e8914' });
    }
  };

  const toggleFeatured = async (blog: BlogListItem) => {
    try {
      await saveBlog.mutateAsync({ id: blog._id, featured: !blog.featured });
    } catch {
      void Swal.fire({ icon: 'error', title: 'Could not update', confirmButtonColor: '#3e8914' });
    }
  };

  const remove = async (blog: BlogListItem) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      html: `Delete the blog <strong>${blog.title.replace(/</g, '&lt;')}</strong>?<br><span class="text-red-600">It will be removed from the website too.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, delete it!',
    });
    if (!result.isConfirmed) return;
    try {
      await deleteBlog.mutateAsync(blog._id);
      void Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1300, showConfirmButton: false });
    } catch {
      void Swal.fire({ icon: 'error', title: 'Could not delete blog', confirmButtonColor: '#3e8914' });
    }
  };

  return (
    <PageShell
      title="Blogs List"
      description="Articles on citycalls.in/blogs — publish, feature, edit or remove them."
      actions={
        canEdit && (
          <button
            type="button"
            onClick={() => router.push('/dashboard/blogs/add')}
            className="flex items-center gap-1.5 rounded-[6px] bg-[#4B1426] px-4 py-2 text-xs font-bold text-white shadow-[0_5px_12px_rgba(75,20,38,0.25)] hover:bg-[#3a0f1d]"
          >
            <Plus className="h-3.5 w-3.5" /> Add Blog
          </button>
        )
      }
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border border-[#e8e5df] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-[#233D4D] px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Newspaper className="h-5 w-5 text-[#88be1e]" /> Blog Posts
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-200">Showing {filtered.length} of {blogs.length} blogs</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as '' | BlogStatus); setPage(1); }} className="h-9 border-2 border-gray-300 bg-white px-2 text-xs font-bold text-gray-800 outline-none">
              <option value="">All Status</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="h-9 max-w-[180px] border-2 border-gray-300 bg-white px-2 text-xs font-bold text-gray-800 outline-none">
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search title, slug, author..."
                className="h-9 w-full border-2 border-gray-300 pl-10 pr-3 text-sm outline-none focus:border-white"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse text-left">
            <thead>
              <tr className="bg-[#233D4D] text-xs font-bold uppercase tracking-wider text-white">
                {['S.No', 'Image', 'Title', 'Category', 'Author', 'Status', 'Featured', 'Published', 'Last Updated By'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-[12px] py-[8px]">{h}</th>
                ))}
                <th className="px-[12px] py-[8px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr><td colSpan={10} className="py-12 text-center text-[12px] text-[#6c7587]">{isLoading ? 'Loading blogs...' : 'No blogs found.'}</td></tr>
              ) : (
                rows.map((blog, i) => (
                  <tr key={blog._id} className="align-top transition hover:bg-slate-50/80">
                    <td className="px-[12px] py-[8px] font-bold text-[#3e8914]">{start + i + 1}</td>
                    <td className="px-[12px] py-[8px]">
                      {blog.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={resolveMediaUrl(blog.image)} alt={blog.imageAlt || blog.title} className="h-10 w-16 border border-gray-200 object-cover" />
                      ) : (
                        <div className="flex h-10 w-16 items-center justify-center border border-dashed border-gray-300 text-[8px] font-bold text-gray-400">No image</div>
                      )}
                    </td>
                    <td className="max-w-[300px] px-[12px] py-[8px]">
                      <span className="line-clamp-2 text-[12px] font-bold text-[#4B1426]" title={blog.title}>{blog.title}</span>
                      <span className="mt-0.5 block truncate font-mono text-[10px] text-blue-600" title={blog.slug}>/{blog.slug}</span>
                    </td>
                    <td className="px-[12px] py-[8px]"><span className="whitespace-nowrap rounded-[4px] border border-[#3e8914]/25 bg-[#3e8914]/10 px-1.5 py-0.5 text-[11px] font-semibold text-[#2f6b0f]">{blog.category}</span></td>
                    <td className="whitespace-nowrap px-[12px] py-[8px] text-[12px] font-medium text-gray-700">{blog.author}</td>
                    <td className="px-[12px] py-[8px]">
                      <select
                        key={`${blog._id}-${blog.status}`}
                        value={blog.status}
                        disabled={!canEdit}
                        onChange={(e) => void changeStatus(blog, e.target.value as BlogStatus)}
                        className={`h-[24px] cursor-pointer appearance-none rounded-[4px] bg-[right_6px_center] bg-no-repeat px-[8px] pr-[22px] text-[11px] font-bold outline-none disabled:cursor-not-allowed ${STATUS_STYLE[blog.status]}`}
                        style={{ backgroundImage: SELECT_ARROW }}
                        aria-label={`Status of ${blog.title}`}
                      >
                        <option value="PUBLISHED" className="bg-white text-[#23714a]">PUBLISHED</option>
                        <option value="DRAFT" className="bg-white text-[#b78103]">DRAFT</option>
                        <option value="ARCHIVED" className="bg-white text-[#dc2626]">ARCHIVED</option>
                      </select>
                    </td>
                    <td className="px-[12px] py-[8px]">
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => void toggleFeatured(blog)}
                        title={blog.featured ? 'Featured — click to remove' : 'Mark as featured'}
                        className="disabled:cursor-not-allowed"
                      >
                        <Star className={`h-4 w-4 ${blog.featured ? 'fill-amber-400 text-amber-400' : 'text-gray-300 hover:text-amber-400'}`} />
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-[12px] py-[8px] text-[11px] font-semibold text-gray-700">{blog.publishedAt ? formatDate(blog.publishedAt) : '—'}</td>
                    <td className="px-[12px] py-[8px]">
                      <span className="block text-[11px] font-bold text-[#4B1426]">{blog.updatedBy?.name ?? 'Website default'}</span>
                      <span className="block whitespace-nowrap text-[10px] font-semibold text-gray-700">
                        {formatDate(blog.updatedAt)}, <span className="font-medium text-blue-500">{formatTime(blog.updatedAt)}</span>
                      </span>
                    </td>
                    <td className="px-[12px] py-[8px]">
                      <div className="flex items-center justify-end gap-1.5">
                        {blog.status === 'PUBLISHED' && (
                          <a href={`${WEBSITE_ORIGIN}/blogs/${blog.slug}`} target="_blank" rel="noopener noreferrer" title="View on website" className={`${ICON_BUTTON} border-orange-400/30 bg-orange-500/10 text-orange-600 hover:bg-orange-500/20`}>
                            <ExternalLink className="h-[12px] w-[12px]" />
                          </a>
                        )}
                        {canEdit && (
                          <>
                            <button type="button" title="Edit Blog" onClick={() => router.push(`/dashboard/blogs/add?editId=${blog._id}`)} className={`${ICON_BUTTON} border-blue-400/30 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20`}>
                              <Pencil className="h-[12px] w-[12px]" />
                            </button>
                            <button type="button" title="Delete Blog" onClick={() => void remove(blog)} className={`${ICON_BUTTON} border-red-400/30 bg-red-500/10 text-red-600 hover:bg-red-500/20`}>
                              <Trash2 className="h-[12px] w-[12px]" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e8e5df] bg-[#fafafa] px-[12px] py-[6px] text-[11px]">
            <span className="font-semibold text-[#2563eb]">Total Blogs: <strong className="font-bold text-[#1d4ed8]">{filtered.length}</strong></span>
            <div className="flex items-center gap-[4px]">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`flex h-[22px] min-w-[22px] items-center justify-center rounded-[4px] border px-1.5 text-[11px] font-bold ${p === safePage ? 'border-[#233D4D] bg-[#233D4D] text-white' : 'border-[#d8dce2] bg-white text-[#334155] hover:bg-slate-50'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
