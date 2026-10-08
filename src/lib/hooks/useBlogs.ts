import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';

const BASE_PATH = '/websites/city-calls/blogs';

// Admin → Blog Section: articles for citycalls.in/blogs.
export const BLOG_STATUSES = ['PUBLISHED', 'DRAFT', 'ARCHIVED'] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

export interface BlogInput {
  title: string;
  h1Title: string;
  slug: string;
  excerpt: string;
  // Rich text HTML.
  content: string;
  author: string;
  category: string;
  metaKeywords: string;
  image: string;
  imageAlt: string;
  status: BlogStatus;
  featured: boolean;
  metaTitle: string;
  metaDescription: string;
  canonicalTag: string;
  ogTitle: string;
  ogImage: string;
  openGraphTags: string;
  schemaMarkup: string;
}

export interface Blog extends BlogInput {
  _id: string;
  publishedAt?: string;
  createdBy?: { name: string };
  updatedBy?: { name: string };
  createdAt: string;
  updatedAt: string;
}

// The list doesn't carry the article body or SEO fields.
export type BlogListItem = Pick<
  Blog,
  '_id' | 'title' | 'h1Title' | 'slug' | 'excerpt' | 'author' | 'category' | 'image' | 'imageAlt' | 'status' | 'featured' | 'publishedAt' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
>;

const LIST_KEY = ['blogs'];

export function useBlogList() {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: async () => {
      // First open copies the website's original blogs in, so the list starts filled.
      const res = await apiClient.get<ApiSuccessEnvelope<BlogListItem[]>>(BASE_PATH, { skipGlobalToast: true });
      return res.data.data;
    },
  });
}

export function useBlog(id: string | null) {
  return useQuery({
    queryKey: ['blogs', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<Blog>>(`${BASE_PATH}/${id}`, { skipGlobalToast: true });
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useSaveBlog() {
  const queryClient = useQueryClient();
  return useMutation<Blog, AxiosError<ApiErrorEnvelope>, { id?: string } & Partial<BlogInput>>({
    mutationFn: async ({ id, ...input }) => {
      const res = id
        ? await apiClient.patch<ApiSuccessEnvelope<Blog>>(`${BASE_PATH}/${id}`, input, { skipGlobalToast: true })
        : await apiClient.post<ApiSuccessEnvelope<Blog>>(BASE_PATH, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: (blog) => {
      void queryClient.invalidateQueries({ queryKey: LIST_KEY });
      queryClient.setQueryData(['blogs', blog._id], blog);
    },
  });
}

export function useDeleteBlog() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`${BASE_PATH}/${id}`, { skipGlobalToast: true });
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

// "5 Signs Your AC Needs Servicing!" → "5-signs-your-ac-needs-servicing"
export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 160);
}
