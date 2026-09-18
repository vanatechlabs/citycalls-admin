'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { PermissionGate } from '@/components/ui/PermissionGate';
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
  ChevronDown
} from 'lucide-react';
import { useBeautyMode } from '@/lib/hooks/useBeautyMode';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// module/action values here match citycalls-api's real RBAC vocabulary
// exactly (src/modules/*/​*.routes.ts's requirePermission(module, action)
// calls) — not a frontend-invented naming scheme. Cross-check against
// docs/openapi/citycalls.yaml before adding a new item.
interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  module?: string;
  action?: string;
  anyOf?: { module: string; action?: string }[];
  alwaysVisible?: boolean;
}

const navItems: { group: string; items: NavItem[] }[] = [
  {
    group: 'Main',
    items: [
      { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, alwaysVisible: true },
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
    group: 'Configuration',
    items: [
      { title: 'Masters', url: '/dashboard/masters', icon: Settings, module: 'config' },
      { title: 'Roles & Users', url: '/dashboard/roles', icon: Users, module: 'users' },
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Full current URL (path + query) — items like "Beauty Services" and the
  // plain "Services" both point at /dashboard/catalog/services, differing
  // only by ?vertical=BEAUTY, and usePathname() alone drops the query
  // string, so both would otherwise show as active at once.
  const currentUrl = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
  const { isBeautyMode } = useBeautyMode();

  return (
    <Sidebar
      className={
        isBeautyMode
          ? 'border-r border-pink-200 [&_[data-sidebar=sidebar]]:bg-white text-pink-950'
          : 'border-r border-white/10 [&_[data-sidebar=sidebar]]:bg-black text-white'
      }
    >
      <SidebarHeader className="h-12 flex justify-center items-center px-4 border-b bg-black border-gray-50">
        <Image src="/logo.png" alt="CityCalls Logo" width={668} height={190} className="h-10 w-auto object-contain" priority />
      </SidebarHeader>
      <SidebarContent>
        {navItems.map((group) => {
          const isMain = group.group === 'Main';
          return (
          <Collapsible key={group.group} defaultOpen={isMain} className="group/collapsible">
            <SidebarGroup className="py-0">
              <CollapsibleTrigger 
                nativeButton={false}
                render={
                  <SidebarGroupLabel 
                    className={`w-full flex items-center justify-between cursor-pointer ${isBeautyMode ? 'text-pink-400 font-semibold hover:text-pink-500' : 'text-gray-400 font-semibold hover:text-gray-300'}`} 
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
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <PermissionGate key={item.title} module={item.module} action={item.action} anyOf={item.anyOf} alwaysVisible={item.alwaysVisible}>
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            render={<Link href={item.url} />}
                            isActive={currentUrl === item.url}
                            className={
                              isBeautyMode
                                ? 'text-pink-950 hover:bg-pink-50 hover:text-pink-950 data-[active]:bg-pink-500 data-[active]:text-white transition-colors'
                                : 'text-white hover:bg-gray-800 hover:text-white data-[active]:bg-[#8cc63f] data-[active]:text-black transition-colors'
                            }
                            style={{ color: currentUrl === item.url ? (isBeautyMode ? '#fff' : '#000') : (isBeautyMode ? '#500724' : '#fff') }}
                          >
                            <item.icon />
                            <span>{item.title}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </PermissionGate>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )})}
      </SidebarContent>
    </Sidebar>
  );
}
