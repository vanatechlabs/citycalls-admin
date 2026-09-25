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
} from '@/components/ui/sidebar';
import { PermissionGate } from '@/components/ui/PermissionGate';
import { clearSession } from '@/lib/hooks/useAuth';
import {
  LayoutDashboard,
  Settings,
  Users,
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
  Database,
  Sparkles,
  MessageSquareWarning,
  ChevronDown,
  GalleryHorizontal,
  UserPlus,
  Menu,
  Search,
  Share2,
  Cog,
  HelpCircle
} from 'lucide-react';
import { useBeautyMode } from '@/lib/hooks/useBeautyMode';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// module/action values here match citycalls-api's real RBAC vocabulary
// exactly (src/modules/*/​*.routes.ts's requirePermission(module, action)
// calls) — not a frontend-invented naming scheme. Cross-check against
// docs/openapi/citycalls.yaml before adding a new item.
interface NavItem {
  title: string;
  url?: string;
  icon: React.ComponentType<{ className?: string }>;
  module?: string;
  action?: string;
  anyOf?: { module: string; action?: string }[];
  alwaysVisible?: boolean;
  // A parent item that expands into its own sub-links (e.g. "SEO Manager")
  // instead of navigating anywhere itself — url is unused when this is set.
  children?: { title: string; url: string }[];
}

const navItems: { group: string; items: NavItem[] }[] = [
  {
    group: 'Main',
    items: [
      { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, alwaysVisible: true },
    ],
  },
  {
    group: 'Website Section',
    items: [
      { title: 'Hero Carousel', url: '/dashboard/website/hero-slides', icon: GalleryHorizontal, module: 'marketing' },
      { title: 'FAQ', url: '/dashboard/website/faq', icon: HelpCircle, module: 'marketing' },
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
      { title: 'Masters', url: '/dashboard/masters', icon: Settings, module: 'config' },
      { title: 'Roles & Permissions', url: '/dashboard/roles', icon: Users, module: 'users' },
      { title: 'Staff & Team Members', url: '/dashboard/staff', icon: UserPlus, module: 'users' },
      { title: 'Navbar List', url: '/dashboard/navbar-list', icon: Menu, module: 'config' },
      { title: 'Settings', url: '/dashboard/settings', icon: Cog, module: 'config' },
    ],
  },
];

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
      className={
        isBeautyMode
          ? 'border-r border-pink-200 [&_[data-sidebar=sidebar]]:bg-white text-pink-950'
          : 'border-r-4 border-[#8cc63f] [&_[data-sidebar=sidebar]]:bg-white text-gray-800'
      }
    >
      <SidebarHeader
        className={
          isBeautyMode
            ? 'h-14 flex justify-center items-center px-4 border-b border-pink-200 bg-white'
            : 'h-14 flex justify-center items-center px-4 border-b border-[#3e8914]/30 bg-gradient-to-r from-white to-[#3e8914]/5'
        }
      >
        <h1 className="text-3xl font-bold">
          {isBeautyMode ? (
            <span className="text-pink-500">CityCalls</span>
          ) : (
            <>
              <span className="text-[#3e8914]">City</span>
              <span className="text-gray-900">Calls</span>
            </>
          )}
        </h1>
      </SidebarHeader>
      <SidebarContent
        className={
          isBeautyMode
            ? 'bg-white [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#500724] [&::-webkit-scrollbar-thumb]:rounded-full'
            : 'bg-white [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#3e8914] [&::-webkit-scrollbar-thumb]:rounded-full'
        }
        style={{ scrollbarWidth: 'thin', scrollbarColor: isBeautyMode ? '#500724 transparent' : '#3e8914 transparent' }}
      >
        {navItems.map((group) => {
          return (
          <Collapsible key={group.group} defaultOpen className="group/collapsible">
            <SidebarGroup className="py-0 pb-1 mb-1 border-b border-black/15">
              <CollapsibleTrigger
                nativeButton={false}
                render={
                  <SidebarGroupLabel
                    className={`h-6 w-full flex items-center justify-between cursor-pointer text-[9.5px] uppercase font-bold tracking-[0.035em] ${isBeautyMode ? 'text-pink-400 hover:text-pink-500' : 'text-[#0F2854] hover:text-[#0a1c3a]'}`}
                  />
                }
              >
                {group.group}
                {group.group !== 'Main' && (
                  <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                )}
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
                                render={
                                  <SidebarMenuButton
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
                                <ChevronDown className={`ml-auto h-3.5 w-3.5 shrink-0 transition-transform ${isSubmenuOpen(item) ? 'rotate-180' : ''}`} />
                              </CollapsibleTrigger>
                            </SidebarMenuItem>
                            <CollapsibleContent>
                              <SidebarMenu className="border-l border-black/10 pl-4 text-[12px] font-medium">
                                {item.children.map((child) => (
                                  <SidebarMenuItem key={child.title}>
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
                                    </SidebarMenuButton>
                                  </SidebarMenuItem>
                                ))}
                              </SidebarMenu>
                            </CollapsibleContent>
                          </Collapsible>
                        </PermissionGate>
                      ) : (
                        <PermissionGate key={item.title} module={item.module} action={item.action} anyOf={item.anyOf} alwaysVisible={item.alwaysVisible}>
                          <SidebarMenuItem>
                            <SidebarMenuButton
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
          className="w-full px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors"
        >
          Logout
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
