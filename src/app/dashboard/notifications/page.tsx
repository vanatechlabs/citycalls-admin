'use client';

import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Bell, AlertTriangle, Inbox, Check } from 'lucide-react';

import { useNotifications, useUnreadCount, useMarkNotificationRead, Notification } from '@/lib/hooks/useNotifications';

export default function NotificationsPage() {
  const { data: notifications, isLoading, isError } = useNotifications();
  const { data: unreadCount } = useUnreadCount();
  const markRead = useMarkNotificationRead();

  const items = notifications || [];
  const failedCount = items.filter((n) => n.status === 'FAILED').length;
  const sentCount = items.filter((n) => n.status === 'SENT' || n.status === 'DELIVERED' || n.status === 'READ').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-border/50">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">My Notifications</h1>
          <p className="text-[13px] text-muted-foreground">In-app, SMS, WhatsApp, and email notifications addressed to your account.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
        <Card className="border-border/60 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute inset-y-0 left-0 w-1 bg-indigo-500"></div>
          <CardContent className="py-1.5 px-4 flex items-center gap-3.5">
            <div className="p-2 bg-indigo-50 rounded-lg"><Bell className="w-5 h-5 text-indigo-600" /></div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Unread</p>
              <h3 className="text-2xl font-bold text-foreground leading-none">{unreadCount ?? '—'}</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border/60 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute inset-y-0 left-0 w-1 bg-green-500"></div>
          <CardContent className="py-1.5 px-4 flex items-center gap-3.5">
            <div className="p-2 bg-green-50 rounded-lg"><Inbox className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Sent / Delivered</p>
              <h3 className="text-2xl font-bold text-foreground leading-none">{sentCount}</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border/60 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute inset-y-0 left-0 w-1 bg-red-500"></div>
          <CardContent className="py-1.5 px-4 flex items-center gap-3.5">
            <div className="p-2 bg-red-50 rounded-lg"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
            <div>
              <p className="text-[11px] font-bold text-red-500/80 uppercase tracking-wider mb-0.5">Failed</p>
              <h3 className="text-2xl font-bold text-red-600 leading-none">{failedCount}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Showing your most recent notifications.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8 text-muted-foreground">Loading notifications...</div>
          ) : isError ? (
            <div className="flex justify-center p-8 text-destructive">Failed to load notifications.</div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-2">{items.length} notifications</p>
              <DataTable<Notification>
                data={items}
                pageSize={10}
                columns={[
                  {
                    key: 'channel',
                    header: 'Channel',
                    render: (item) => (
                      <span className={`px-2 py-1 text-xs font-bold rounded-md ${item.channel === 'SMS' ? 'bg-indigo-100 text-indigo-700' :
                          item.channel === 'WHATSAPP' ? 'bg-green-100 text-green-700' :
                            item.channel === 'IN_APP' ? 'bg-slate-200 text-slate-700' :
                              'bg-blue-100 text-blue-700'
                        }`}>
                        {item.channel}
                      </span>
                    ),
                  },
                  { key: 'triggerKey', header: 'Trigger' },
                  { key: 'body', header: 'Message Content', render: (item) => <span className="line-clamp-2 max-w-md">{item.subject ? `${item.subject} — ` : ''}{item.body}</span> },
                  { key: 'createdAt', header: 'Timestamp', render: (item) => new Date(item.createdAt).toLocaleString() },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (item) => (
                      <StatusBadge label={item.status} category={item.status === 'FAILED' ? 'error' : item.status === 'READ' ? 'default' : 'success'} />
                    ),
                  },
                  {
                    key: 'action',
                    header: '',
                    render: (item) =>
                      !item.readAt ? (
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => markRead.mutate(item._id)} disabled={markRead.isPending}>
                          <Check className="w-3 h-3" /> Mark Read
                        </Button>
                      ) : null,
                  },
                ]}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
