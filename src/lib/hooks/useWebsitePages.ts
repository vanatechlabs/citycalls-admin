import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient, ApiErrorEnvelope, ApiSuccessEnvelope } from '../api/client';

const PAGES_PATH = '/websites/city-calls/pages';

export type ServicePageStatus = 'ACTIVE' | 'INACTIVE';

export interface ServicePageFeature {
  title: string;
  subtitle: string;
}

export interface ServicePageStep {
  badge: string;
  title: string;
  description: string;
}

export interface ServicePageStat {
  value: string;
  label: string;
}

export interface ServicePageInput {
  slug: string;
  heroImage?: string;
  heroEyebrow: string;
  heroTitle: string;
  heroHighlight: string;
  heroDescription: string;
  heroFeatures: ServicePageFeature[];
  walkthroughEyebrow: string;
  walkthroughTitle: string;
  walkthroughHighlight: string;
  walkthroughDescription: string;
  steps: ServicePageStep[];
  statsTitle: string;
  statsHighlight: string;
  stats: ServicePageStat[];
  bannerEyebrow: string;
  bannerTitle: string;
  bannerHighlight: string;
  bannerDescription: string;
  bannerImage?: string;
  areasTitle: string;
  areasHighlight: string;
  areasDescription: string;
  areas: string[];
  status: ServicePageStatus;
}

export interface ServicePage extends ServicePageInput {
  _id: string;
  navServiceId: string;
  menuId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServicePageOptionService {
  id: string;
  name: string;
  path: string;
  defaultSlug: string;
  status: 'ACTIVE' | 'INACTIVE';
  page: { id: string; slug: string; status: ServicePageStatus } | null;
}

export interface ServicePageOptionMenu {
  id: string;
  name: string;
  slug: string;
  services: ServicePageOptionService[];
}

export const DEFAULT_PAGE_CONTENT: Omit<ServicePageInput, 'slug'> = {
  heroImage: '',
  heroEyebrow: 'Professional & Reliable',
  heroTitle: 'Refrigerator Service in Ghaziabad',
  heroHighlight: 'Ghaziabad',
  heroDescription: 'Cooling issues, gas refill, ice buildup — sorted at your doorstep.',
  heroFeatures: [
    { title: 'Expert', subtitle: 'Technicians' },
    { title: 'Same Day', subtitle: 'Service' },
    { title: 'Transparent', subtitle: 'Pricing' },
    { title: '30-Day', subtitle: 'Warranty' },
  ],
  walkthroughEyebrow: 'Interactive Walkthrough',
  walkthroughTitle: 'How It Works',
  walkthroughHighlight: 'Works',
  walkthroughDescription: 'Your appliance repair is just a few clicks away. We make it simple, transparent, and absolutely hassle-free.',
  steps: [
    { badge: 'Step 01', title: 'Book a Service', description: 'Select your preferred date & time, and instantly book our service online.' },
    { badge: 'Step 02', title: 'Expert Assigned', description: 'A background-verified and highly trained technician is assigned to your booking.' },
    { badge: 'Step 03', title: 'Doorstep Repair', description: 'Our expert visits your home, diagnoses the issue, and fixes it using genuine parts.' },
    { badge: 'Step 04', title: 'Relax & Enjoy', description: 'Experience a hassle-free repair with our 30-day post-service warranty.' },
  ],
  statsTitle: 'TRUSTED BY THOUSANDS',
  statsHighlight: 'THOUSANDS',
  stats: [
    { value: '10K+', label: 'Happy Customers' },
    { value: '150+', label: 'Expert Technicians' },
    { value: '50K+', label: 'Services Completed' },
    { value: '4.8', label: 'Average Rating' },
  ],
  bannerEyebrow: 'Appliance Repair',
  bannerTitle: 'Expert Repair at Your Doorstep',
  bannerHighlight: 'Your Doorstep',
  bannerDescription: 'Experience world-class appliance service. We bring your appliances back to life with 100% genuine parts, verified professionals, and guaranteed satisfaction.',
  bannerImage: '',
  areasTitle: 'Service Areas in Ghaziabad',
  areasHighlight: 'Ghaziabad',
  areasDescription: 'We cover all major locations across Ghaziabad to provide you with fast and reliable doorstep service.',
  areas: ['Indirapuram', 'Vaishali', 'Kaushambi', 'Raj Nagar', 'Crossing Republik', 'Sahibabad', 'Nehru Nagar', 'Rajnagar Extension'],
  status: 'ACTIVE',
};

export function createDefaultPageContent(serviceName: string, slug: string): ServicePageInput {
  return {
    ...DEFAULT_PAGE_CONTENT,
    slug,
    heroTitle: `${serviceName} in Ghaziabad`,
    heroFeatures: DEFAULT_PAGE_CONTENT.heroFeatures.map((item) => ({ ...item })),
    steps: DEFAULT_PAGE_CONTENT.steps.map((item) => ({ ...item })),
    stats: DEFAULT_PAGE_CONTENT.stats.map((item) => ({ ...item })),
    areas: [...DEFAULT_PAGE_CONTENT.areas],
  };
}

export function useServicePageOptions() {
  return useQuery({
    queryKey: ['service-page-options'],
    queryFn: async () => {
      const response = await apiClient.get<ApiSuccessEnvelope<ServicePageOptionMenu[]>>(`${PAGES_PATH}/options`, { skipGlobalToast: true });
      return response.data.data;
    },
  });
}

export function useServicePage(serviceId?: string) {
  return useQuery({
    queryKey: ['service-page', serviceId],
    queryFn: async () => {
      const response = await apiClient.get<ApiSuccessEnvelope<ServicePage | null>>(`${PAGES_PATH}/${serviceId}`, { skipGlobalToast: true });
      return response.data.data;
    },
    enabled: !!serviceId,
  });
}

export function useSaveServicePage() {
  const queryClient = useQueryClient();
  return useMutation<ServicePage, AxiosError<ApiErrorEnvelope>, { serviceId: string; input: ServicePageInput }>({
    mutationFn: async ({ serviceId, input }) => {
      const response = await apiClient.put<ApiSuccessEnvelope<ServicePage>>(`${PAGES_PATH}/${serviceId}`, input, { skipGlobalToast: true });
      return response.data.data;
    },
    onSuccess: (page, variables) => {
      queryClient.setQueryData(['service-page', variables.serviceId], page);
      queryClient.invalidateQueries({ queryKey: ['service-page-options'] });
      queryClient.invalidateQueries({ queryKey: ['navbar-services'] });
    },
  });
}
