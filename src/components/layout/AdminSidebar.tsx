'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { PermissionGate } from '@/components/ui/PermissionGate';
import { clearSession, useMe, usePermission } from '@/lib/hooks/useAuth';
import {
  LayoutDashboard,
  Settings,
  Building2,
  Network,
  Users2,
  UserSquare2,
  Wrench,
  Tags,
  Phone,
  PhoneCall,
  Target,
  Upload,
  Ticket,
  MapPin,
  Clock,
  Briefcase,
  CalendarDays,
  Store,
  Receipt,
  IndianRupee,
  SmilePlus,
  RefreshCcw,
  Bell,
  MessageSquare,
  Megaphone,
  BrainCircuit,
  BarChart4,
  FileKey,
  FileStack,
  FilePlus2,
  Database,
  Sparkles,
  MessageSquareWarning,
  ChevronDown,
  ChevronLeft,
  LogOut,
  GalleryHorizontal,
  Search,
  Share2,
  Cog,
  HelpCircle,
  Server,
  House,
  UserCog,
  Info,
  ClipboardPlus,
  Refrigerator,
  Bug,
  Sofa,
  SprayCan,
  LayoutGrid,
  Layers,
  ImagePlus,
  Images,
  Smartphone,
  Zap,
  Mail,
  MessageSquareQuote,
  FilePenLine,
  Newspaper
} from 'lucide-react';
import { useRegistrationServices, useUnreadRegistrations } from '@/lib/hooks/useRegistrations';
import { useEnquiryPendingCounts, type EnquiryType } from '@/lib/hooks/useEnquiries';
import { ALL_CATEGORIES, registrationListPath, SIDEBAR_STAGE_SLUGS, STAGE_TITLE } from '@/lib/registrations/constants';
import { useBeautyMode } from '@/lib/hooks/useBeautyMode';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// module/action values here match citycalls-api's real RBAC vocabulary
// exactly (src/modules/*/​*.routes.ts's requirePermission(module, action)
// calls) — not a frontend-invented naming scheme. Cross-check against
// docs/openapi/citycalls.yaml before adding a new item.
export interface NavItem {
  title: string;
  url?: string;
  icon: React.ComponentType<{ className?: string }>;
  module?: string;
  action?: string;
  anyOf?: { module: string; action?: string }[];
  alwaysVisible?: boolean;
  // A parent item that expands into its own sub-links (e.g. "SEO Manager")
  // instead of navigating anywhere itself — url is unused when this is set.
  children?: { title: string; url: string; badge?: number; module?: string; action?: string }[];
  // Children are separate entries in Menu Access ("<Section>::<Child>")
  // instead of the parent counting as one menu.
  childAccess?: boolean;
  // Red count pill on the item (e.g. unread registrations).
  badge?: number;
}

// Key a menu is saved under in a user's Menu Access list.
export function menuKey(group: string, title: string) {
  return `${group}::${title}`;
}

export const navItems: { group: string; items: NavItem[] }[] = [
  {
    group: 'Main',
    items: [
      { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, alwaysVisible: true },
    ],
  },
  {
    group: 'Website Section',
    items: [
      {
        title: 'Home Page',
        icon: House,
        module: 'marketing',
        childAccess: true,
        children: [
          { title: 'Hero Carousel', url: '/dashboard/website/hero-slides', module: 'marketing' },
          { title: 'Offers & Promotions', url: '/dashboard/website/offers', module: 'marketing' },
          { title: 'Features', url: '/dashboard/website/features', module: 'marketing' },
          { title: 'About', url: '/dashboard/website/about', module: 'marketing' },
          { title: 'Popular Packages', url: '/dashboard/website/popular-packages', module: 'marketing' },
          { title: 'Our Services', url: '/dashboard/website/our-services', module: 'marketing' },
          { title: 'Counters', url: '/dashboard/website/counters', module: 'marketing' },
          { title: 'How It Works', url: '/dashboard/website/how-it-works', module: 'marketing' },
          { title: 'Why Choose Us', url: '/dashboard/website/key-features', module: 'marketing' },
          { title: 'FAQ', url: '/dashboard/website/faq', module: 'marketing' },
        ],
      },
      {
        title: 'About Page',
        icon: Info,
        module: 'marketing',
        childAccess: true,
        children: [
          { title: 'About Hero', url: '/dashboard/website/about-page/hero', module: 'marketing' },
          { title: 'Our Story', url: '/dashboard/website/about-page/story', module: 'marketing' },
          { title: 'Our Values', url: '/dashboard/website/about-page/values', module: 'marketing' },
          { title: 'Parallax Image', url: '/dashboard/website/about-page/parallax', module: 'marketing' },
          { title: 'Our Journey', url: '/dashboard/website/about-page/journey', module: 'marketing' },
        ],
      },
    ],
  },
  {
    group: 'Customer App',
    items: [
      { title: 'Home Banner', url: '/dashboard/customer-app/home-banner', icon: Smartphone, module: 'marketing' },
      { title: 'Salon Banner', url: '/dashboard/customer-app/salon-banner', icon: Sparkles, module: 'marketing' },
      { title: 'HelpNow Banner', url: '/dashboard/customer-app/helpnow-banner', icon: HelpCircle, module: 'marketing' },
    ],
  },
  {
    group: 'Blog Section',
    items: [
      { title: 'Add Blog', url: '/dashboard/blogs/add', icon: FilePenLine, module: 'marketing' },
      { title: 'Blog List', url: '/dashboard/blogs/list', icon: Newspaper, module: 'marketing' },
    ],
  },
  {
    group: 'Background Section',
    items: [
      { title: 'Add BG Image', url: '/dashboard/backgrounds/add', icon: ImagePlus, module: 'marketing' },
      { title: 'BG List', url: '/dashboard/backgrounds/list', icon: Images, module: 'marketing' },
    ],
  },
  {
    group: 'SEO Section',
    items: [
      {
        title: 'SEO Manager',
        icon: Search,
        module: 'marketing',
        children: [
          { title: 'Add Meta', url: '/dashboard/seo/add-meta' },
          { title: 'Meta List', url: '/dashboard/seo/meta-list' },
          { title: 'Advanced SEO', url: '/dashboard/seo/advanced-seo' },
        ],
      },
      { title: 'Social Media', url: '/dashboard/seo/social-media', icon: Share2, module: 'marketing' },
    ],
  },
  {
    group: 'Pages Section',
    items: [
      { title: 'Add Page', url: '/dashboard/pages/add', icon: FilePlus2, module: 'marketing' },
      { title: 'Page List', url: '/dashboard/pages/list', icon: FileStack, module: 'marketing' },
      { title: 'Launch Spotlight', url: '/dashboard/pages/launch-spotlight', icon: GalleryHorizontal, module: 'marketing' },
      { title: 'Testimonials', url: '/dashboard/pages/testimonials', icon: MessageSquareQuote, module: 'marketing' },
    ],
  },
  {
    group: 'Registration Section',
    items: [
      { title: 'New Call', url: '/dashboard/registrations/new', icon: ClipboardPlus, module: 'customers', action: 'create' },
      // + "All Categories" and one dropdown per Navbar List menu, added at
      // render time by useRegistrationCategoryItems().
    ],
  },
  {
    group: 'Enquiry Section',
    items: [
      // Red badges (Pending count) added at render time from useEnquiryPendingCounts().
      { title: 'Quick Booking', url: '/dashboard/enquiries/quick-booking', icon: Zap, module: 'leads' },
      { title: 'Contact Enquiry', url: '/dashboard/enquiries/contact', icon: Mail, module: 'leads' },
    ],
  },
  {
    group: 'Beauty & Salon',
    items: [
      { title: 'Beauty Services', url: '/dashboard/catalog/services?vertical=BEAUTY', icon: Sparkles, module: 'catalog' },
      { title: 'Beauty Customers', url: '/dashboard/customers?vertical=BEAUTY', icon: Sparkles, module: 'customers' },
      { title: 'Beauty Requests', url: '/dashboard/service-requests?vertical=BEAUTY', icon: Sparkles, module: 'serviceRequests' },
    ],
  },
  {
    group: 'Customers',
    items: [
      { title: 'Customer List', url: '/dashboard/customers', icon: UserSquare2, module: 'customers' },
      { title: 'Duplicate Review', url: '/dashboard/customers/duplicate-review', icon: Users2, module: 'customers' },
    ],
  },
  {
    group: 'Catalog',
    items: [
      { title: 'Services', url: '/dashboard/catalog/services', icon: Wrench, module: 'catalog' },
      { title: 'Brands & Models', url: '/dashboard/catalog/brands', icon: Tags, module: 'catalog' },
      { title: 'Service Area Waitlist', url: '/dashboard/customers/waitlist', icon: Clock, module: 'customers' },
    ],
  },
  {
    group: 'Calls',
    items: [
      { title: 'Call Logs', url: '/dashboard/calls', icon: Phone, module: 'calls' },
      { title: 'New Call', url: '/dashboard/calls/entry', icon: PhoneCall, module: 'calls', action: 'create' },
    ],
  },
  {
    group: 'Leads',
    items: [
      { title: 'Pipeline', url: '/dashboard/leads', icon: Target, module: 'leads' },
      { title: 'Bulk Import', url: '/dashboard/leads/import', icon: Upload, module: 'leads', action: 'import' },
    ],
  },
  {
    group: 'Workforce',
    items: [
      { title: 'Employees', url: '/dashboard/employees', icon: Briefcase, module: 'employees' },
      { title: 'Availability', url: '/dashboard/employees/availability', icon: CalendarDays, module: 'employees' },
      { title: 'Vendors', url: '/dashboard/vendors', icon: Store, module: 'vendors' },
    ],
  },
  {
    group: 'Finance',
    items: [
      { title: 'Estimates', url: '/dashboard/finance/estimates', icon: Receipt, module: 'finance' },
      { title: 'Proforma Invoices', url: '/dashboard/finance/proforma', icon: FileStack, module: 'finance' },
      { title: 'Invoices', url: '/dashboard/finance/invoices', icon: IndianRupee, module: 'finance' },
    ],
  },
  {
    group: 'Operations',
    items: [
      { title: 'Service Requests', url: '/dashboard/service-requests', icon: Ticket, module: 'serviceRequests' },
      { title: 'Dispatch Board', url: '/dashboard/dispatch', icon: MapPin, module: 'serviceRequests', action: 'assign' },
    ],
  },
  {
    group: 'Quality Assurance',
    items: [
      { title: 'Happy Calls', url: '/dashboard/happy-calls', icon: SmilePlus, module: 'happyCalls' },
      { title: 'Reopen Requests', url: '/dashboard/reopen-requests', icon: RefreshCcw, module: 'happyCalls' },
      { title: 'Complaints', url: '/dashboard/complaints', icon: MessageSquareWarning, module: 'complaints' },
    ],
  },
  {
    group: 'Communications',
    items: [
      { title: 'Notifications', url: '/dashboard/notifications', icon: Bell, alwaysVisible: true },
      { title: 'Templates', url: '/dashboard/notifications/templates', icon: MessageSquare, module: 'config', action: 'manageSettings' },
      { title: 'Campaigns', url: '/dashboard/marketing/campaigns', icon: Megaphone, module: 'marketing' },
    ],
  },
  {
    group: 'Analytics & Intelligence',
    items: [
      { title: 'Reports', url: '/dashboard/reports', icon: BarChart4, module: 'reports' },
      { title: 'AI Settings', url: '/dashboard/ai-settings', icon: BrainCircuit, module: 'ai', action: 'manageSettings' },
    ],
  },
  {
    group: 'System & Data',
    items: [
      { title: 'Audit Logs', url: '/dashboard/audit-logs', icon: FileKey, module: 'config', action: 'manageSettings' },
      {
        title: 'Import/Export',
        url: '/dashboard/import-export',
        icon: Database,
        anyOf: [
          { module: 'customers', action: 'export' },
          { module: 'leads', action: 'export' },
          { module: 'serviceRequests', action: 'export' },
          { module: 'calls', action: 'export' },
          { module: 'finance', action: 'export' },
        ],
      },
    ],
  },
  {
    group: 'Organization',
    items: [
      { title: 'Branches', url: '/dashboard/organization/branches', icon: Building2, module: 'organization' },
      { title: 'Sub-Branches', url: '/dashboard/organization/sub-branches', icon: Network, module: 'organization' },
      { title: 'Teams', url: '/dashboard/organization/teams', icon: Users2, module: 'organization' },
    ],
  },
  {
    group: 'Admin Section',
    items: [
      {
        title: 'Manage Admin User',
        icon: UserCog,
        anyOf: [{ module: 'users' }, { module: 'config' }],
        childAccess: true,
        children: [
          { title: 'Roles & Permissions', url: '/dashboard/roles', module: 'users' },
          { title: 'Staff & Team Members', url: '/dashboard/staff', module: 'users' },
          { title: 'Navbar List', url: '/dashboard/navbar-list', module: 'config' },
          { title: 'Menu Access', url: '/dashboard/menu-access', module: 'users', action: 'manageSettings' },
        ],
      },
      { title: 'Masters', url: '/dashboard/masters', icon: Settings, module: 'config' },
      { title: 'Server Management', url: '/dashboard/server-management', icon: Server, module: 'config' },
      { title: 'Settings', url: '/dashboard/settings', icon: Cog, module: 'config' },
    ],
  },
];

// Registration Section's list menus: "All Categories" plus one per Navbar List
// menu, each expanding into All / Pending / Active / Completed. Built from
// Navbar List so a new menu there gets its own entry here automatically.
function categoryIcon(slug: string): React.ComponentType<{ className?: string }> {
  if (/appliance/.test(slug)) return Refrigerator;
  if (/pest/.test(slug)) return Bug;
  if (/sofa/.test(slug)) return Sofa;
  if (/clean/.test(slug)) return SprayCan;
  return Layers;
}

export function useRegistrationCategoryItems(): NavItem[] {
  const { data: menus = [] } = useRegistrationServices();
  // Red badges: registrations nobody has opened yet, per category.
  const { data: unread } = useUnreadRegistrations();
  // Each category from Navbar List, then "All Categories" last.
  const categories = [
    ...menus.map((m) => ({
      slug: m.slug,
      name: m.name,
      icon: categoryIcon(m.slug),
      badge: unread?.byCategory[m.name],
      newBadge: unread?.newByCategory?.[m.name],
    })),
    { slug: ALL_CATEGORIES, name: 'All Categories', icon: LayoutGrid, badge: unread?.total, newBadge: unread?.newTotal },
  ];
  return categories.map((category) => ({
    title: category.name,
    icon: category.icon,
    module: 'customers',
    badge: category.badge,
    children: SIDEBAR_STAGE_SLUGS.map((stage) => ({
      title: STAGE_TITLE[stage],
      url: registrationListPath(category.slug, stage),
      // Unopened calls still waiting in New.
      badge: stage === 'new' ? category.newBadge : undefined,
    })),
  }));
}

// Enquiry Section menu → which pending count its badge shows.
const ENQUIRY_BADGE: Record<string, EnquiryType> = { 'Quick Booking': 'QUICK_BOOKING', 'Contact Enquiry': 'CONTACT' };

// Red pill with white count, e.g. unread registrations in a category.
function CountBadge({ count, className = '' }: { count?: number; className?: string }) {
  if (!count) return null;
  return (
    <span className={`flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold leading-none text-white shadow-sm ${className}`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function AdminSidebar() {
  return (
    <Suspense>
      <AdminSidebarContent />
    </Suspense>
  );
}

function AdminSidebarContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Full current URL (path + query) — items like "Beauty Services" and the
  // plain "Services" both point at /dashboard/catalog/services, differing
  // only by ?vertical=BEAUTY, and usePathname() alone drops the query
  // string, so both would otherwise show as active at once.
  const currentUrl = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
  const { isBeautyMode } = useBeautyMode();
  // Desktop collapse (icons only), toggled from the button next to the logo.
  const { state: sidebarState, toggleSidebar, setOpen: setSidebarOpen } = useSidebar();
  const collapsed = sidebarState === 'collapsed';
  const registrationCategoryItems = useRegistrationCategoryItems();
  const { data: pendingEnquiries } = useEnquiryPendingCounts({ enabled: usePermission('leads', 'view') });
  // Menu Access (set by Super Admin per user): only the chosen menus show.
  // Super Admin and users without a saved list see everything.
  const { data: me } = useMe();
  const allowedMenus = me && me.role !== 'SUPER_ADMIN' && Array.isArray(me.menuAccess) ? new Set(me.menuAccess) : null;
  const groups = navItems
    .map((group) =>
      group.group === 'Registration Section' ? { ...group, items: [...group.items, ...registrationCategoryItems] } : group
    )
    .map((group) =>
      group.group === 'Enquiry Section'
        ? { ...group, items: group.items.map((item) => ({ ...item, badge: pendingEnquiries?.[ENQUIRY_BADGE[item.title]] })) }
        : group
    )
    .map((group) => ({
      ...group,
      items: group.items
        .map((item) =>
          item.childAccess && allowedMenus
            ? { ...item, children: item.children?.filter((child) => allowedMenus.has(menuKey(group.group, child.title))) }
            : item
        )
        .filter((item) =>
          item.alwaysVisible || !allowedMenus || (item.childAccess ? !!item.children?.length : allowedMenus.has(menuKey(group.group, item.title)))
        ),
    }))
    .filter((group) => group.items.length > 0);

  // Manual open/close overrides from clicking a trigger — a submenu with no
  // override yet falls back to auto-opening when the current route is one
  // of its children (computed at render time, no effect needed).
  const [submenuOverrides, setSubmenuOverrides] = React.useState<Record<string, boolean>>({});
  const isSubmenuOpen = (item: NavItem) =>
    submenuOverrides[item.title] ?? !!item.children?.some((c) => currentUrl === c.url);

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Logout?',
      text: 'You will be logged out from the admin panel.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Logout',
      cancelButtonText: 'Cancel',
      background: '#1e2433',
      color: '#e2e8f0',
    });
    if (!result.isConfirmed) return;
    clearSession();
    router.push('/login');
  };

  return (
    <Sidebar
      collapsible="icon"
      className={
        isBeautyMode
          ? 'border-r border-pink-200 [&_[data-sidebar=sidebar]]:bg-white text-pink-950'
          : 'border-r-4 border-[#8cc63f] [&_[data-sidebar=sidebar]]:bg-white text-gray-800'
      }
    >
      <SidebarHeader
        className={
          isBeautyMode
            ? 'h-14 flex flex-row justify-between items-center px-3 border-b border-pink-200 bg-white group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0'
            : 'h-14 flex flex-row justify-between items-center px-3 border-b border-[#3e8914]/30 bg-gradient-to-r from-white to-[#3e8914]/5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0'
        }
      >
        <Link href="/dashboard" className="flex min-w-0 items-center pl-3.5 group-data-[collapsible=icon]:hidden" aria-label="CityCalls dashboard">
          {isBeautyMode ? (
            <span className="text-3xl font-bold text-pink-500">CityCalls</span>
          ) : (
            // The brand wordmark (green "City", dark "Calls") — logo-dark.png is
            // logo.png with the white "Calls" darkened for the white sidebar.
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/logo-dark.png" alt="CityCalls" className="h-8 w-auto max-w-[150px] object-contain" />
          )}
        </Link>
        {/* Collapse / expand (desktop) — on mobile the navbar button opens the drawer */}
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-md text-white shadow-sm transition-colors md:flex ${
            isBeautyMode ? 'bg-pink-500 hover:bg-pink-600' : 'bg-[#3e8914] hover:bg-[#347311]'
          }`}
        >
          <ChevronLeft className={`h-4 w-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </SidebarHeader>
      <SidebarContent
        className={
          isBeautyMode
            ? 'bg-white [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#500724] [&::-webkit-scrollbar-thumb]:rounded-full'
            : 'bg-white [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#3e8914] [&::-webkit-scrollbar-thumb]:rounded-full'
        }
        style={{ scrollbarWidth: 'thin', scrollbarColor: isBeautyMode ? '#500724 transparent' : '#3e8914 transparent' }}
      >
        {groups.map((group) => {
          return (
          <Collapsible key={group.group} defaultOpen className="group/collapsible">
            <SidebarGroup className="py-0 pb-1 mb-1 border-b border-black/15 group-data-[collapsible=icon]:py-1">
              <CollapsibleTrigger
                nativeButton={false}
                render={
                  <SidebarGroupLabel
                    className={`h-6 w-full flex items-center justify-between cursor-pointer text-[9.5px] uppercase font-bold tracking-[0.035em] group-data-[collapsible=icon]:hidden ${isBeautyMode ? 'text-pink-400 hover:text-pink-500' : 'text-[#233D4D] hover:text-[#16283a]'}`}
                  />
                }
              >
                {group.group}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu className="text-[12px] font-medium">
                    {group.items.map((item) =>
                      item.children ? (
                        <PermissionGate key={item.title} module={item.module} action={item.action} anyOf={item.anyOf} alwaysVisible={item.alwaysVisible}>
                          <Collapsible
                            open={isSubmenuOpen(item)}
                            onOpenChange={(open) => setSubmenuOverrides((prev) => ({ ...prev, [item.title]: open }))}
                          >
                            <SidebarMenuItem>
                              <CollapsibleTrigger
                                onClick={() => collapsed && setSidebarOpen(true)}
                                render={
                                  <SidebarMenuButton
                                    tooltip={item.title}
                                    className={
                                      isBeautyMode
                                        ? 'text-[12px] font-medium text-pink-950 border border-transparent hover:bg-pink-50 hover:text-pink-950 hover:border-pink-300 transition-colors'
                                        : 'text-[12px] font-medium text-gray-800 border border-transparent hover:bg-[#3e8914]/5 hover:text-gray-800 hover:border-[#3e8914]/40 transition-colors'
                                    }
                                    style={{ color: isBeautyMode ? '#500724' : '#1f2937' }}
                                  />
                                }
                              >
                                <item.icon className={isBeautyMode ? undefined : 'text-[#3e8914]'} />
                                <span>{item.title}</span>
                                <CountBadge count={item.badge} className="ml-auto" />
                                <ChevronDown className={`${item.badge ? 'ml-1' : 'ml-auto'} h-3.5 w-3.5 shrink-0 transition-transform ${isSubmenuOpen(item) ? 'rotate-180' : ''}`} />
                              </CollapsibleTrigger>
                            </SidebarMenuItem>
                            <CollapsibleContent>
                              {/* Left rail under the parent's icon marks how far the open submenu goes */}
                              <SidebarMenu
                                className={`my-1 ml-4 w-auto border-l pl-3 text-[12px] font-medium group-data-[collapsible=icon]:hidden ${
                                  isBeautyMode ? 'border-pink-300' : 'border-[#3e8914]/35'
                                }`}
                              >
                                {item.children.map((child) => (
                                  <PermissionGate key={child.title} module={child.module} action={child.action} alwaysVisible={!child.module}>
                                  <SidebarMenuItem>
                                    <SidebarMenuButton
                                      render={<Link href={child.url} />}
                                      isActive={currentUrl === child.url}
                                      className={
                                        isBeautyMode
                                          ? 'text-[12px] font-medium text-pink-950 border border-transparent hover:bg-pink-50 hover:text-pink-950 hover:border-pink-300 data-[active]:bg-pink-500 data-[active]:text-white data-[active]:border-pink-500 transition-colors'
                                          : 'text-[12px] font-medium text-gray-800 border border-transparent hover:bg-[#3e8914]/5 hover:text-gray-800 hover:border-[#3e8914]/40 data-[active]:bg-[#3e8914]/15 data-[active]:text-gray-900 data-[active]:border-[#3e8914] transition-colors'
                                      }
                                      style={{ color: isBeautyMode ? (currentUrl === child.url ? '#fff' : '#500724') : '#1f2937' }}
                                    >
                                      <span>{child.title}</span>
                                      <CountBadge count={child.badge} className="ml-auto" />
                                    </SidebarMenuButton>
                                  </SidebarMenuItem>
                                  </PermissionGate>
                                ))}
                              </SidebarMenu>
                            </CollapsibleContent>
                          </Collapsible>
                        </PermissionGate>
                      ) : (
                        <PermissionGate key={item.title} module={item.module} action={item.action} anyOf={item.anyOf} alwaysVisible={item.alwaysVisible}>
                          <SidebarMenuItem>
                            <SidebarMenuButton
                              tooltip={item.title}
                              render={<Link href={item.url ?? '#'} />}
                              isActive={currentUrl === item.url}
                              className={
                                isBeautyMode
                                  ? 'text-[12px] font-medium text-pink-950 border border-transparent hover:bg-pink-50 hover:text-pink-950 hover:border-pink-300 data-[active]:bg-pink-500 data-[active]:text-white data-[active]:border-pink-500 transition-colors'
                                  : 'text-[12px] font-medium text-gray-800 border border-transparent hover:bg-[#3e8914]/5 hover:text-gray-800 hover:border-[#3e8914]/40 data-[active]:bg-[#3e8914]/15 data-[active]:text-gray-900 data-[active]:border-[#3e8914] transition-colors'
                              }
                              style={{ color: isBeautyMode ? (currentUrl === item.url ? '#fff' : '#500724') : '#1f2937' }}
                            >
                              <item.icon className={isBeautyMode ? undefined : 'text-[#3e8914]'} />
                              <span>{item.title}</span>
                              <CountBadge count={item.badge} className="ml-auto" />
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        </PermissionGate>
                      )
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )})}
      </SidebarContent>
      <SidebarFooter className={isBeautyMode ? 'p-2 border-t border-pink-200' : 'p-2 border-t border-black/10'}>
        <button
          type="button"
          onClick={handleLogout}
          title="Logout"
          className="flex w-full items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors group-data-[collapsible=icon]:px-0"
        >
          <LogOut className="hidden h-4 w-4 group-data-[collapsible=icon]:block" />
          <span className="group-data-[collapsible=icon]:hidden">Logout</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
