'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText, List } from 'lucide-react';

import { BlogForm } from '@/components/blogs/BlogForm';
import { PageShell } from '@/components/registrations/shared/PageShell';
import { useBlog } from '@/lib/hooks/useBlogs';

// Blog Section → Add Blog (or ?editId=… to edit one from Blog List).
function AddBlogPageInner() {
  const router = useRouter();
  const editId = useSearchParams().get('editId');
  const { data: existing, isLoading, isError } = useBlog(editId);

  let body;
  if (editId && isLoading) {
    body = <div className="flex min-h-[40vh] items-center justify-center"><FileText className="h-6 w-6 animate-pulse text-gray-300" /></div>;
  } else if (editId && (isError || !existing)) {
    body = <div className="flex min-h-[40vh] items-center justify-center text-sm font-bold text-red-600">Blog not found.</div>;
  } else {
    body = <BlogForm key={existing?._id ?? 'new'} existing={existing} />;
  }

  return (
    <PageShell
      title={editId ? 'Update Blog Post' : 'Create New Blog'}
      description="Manage your blog story and SEO details"
      actions={
        <button
          type="button"
          onClick={() => router.push('/dashboard/blogs/list')}
          className="flex items-center gap-1.5 rounded-[6px] bg-[#4B1426] px-4 py-2 text-xs font-bold text-white shadow-[0_5px_12px_rgba(75,20,38,0.25)] hover:bg-[#3a0f1d]"
        >
          <List className="h-3.5 w-3.5" /> Back to List
        </button>
      }
    >
      {body}
    </PageShell>
  );
}

export default function AddBlogPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-white"><FileText className="h-6 w-6 animate-pulse text-gray-300" /></div>}>
      <AddBlogPageInner />
    </Suspense>
  );
}
