'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

import {
  useNotificationTemplates,
  useUpdateNotificationTemplate,
  NotificationTemplate,
} from '@/lib/hooks/useNotificationTemplates';

interface EditTemplateFormValues {
  subjectTemplate?: string;
  bodyTemplate: string;
  active: boolean;
}

function EditTemplateForm({ template, onDone }: { template: NotificationTemplate; onDone: () => void }) {
  const updateTemplate = useUpdateNotificationTemplate();
  const { register, handleSubmit } = useForm<EditTemplateFormValues>({
    defaultValues: {
      subjectTemplate: template.subjectTemplate ?? '',
      bodyTemplate: template.bodyTemplate,
      active: template.active,
    },
  });

  const onSubmit = (values: EditTemplateFormValues) => {
    updateTemplate.mutate(
      { id: template._id, ...values },
      { onSuccess: () => onDone() }
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Variables available: {template.variables.length ? template.variables.map((v) => `{{${v}}}`).join(', ') : 'none'}
      </div>

      {template.channel === 'EMAIL' && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Subject</label>
          <input className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...register('subjectTemplate')} />
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Message Body</label>
        <textarea
          className="flex min-h-[140px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          {...register('bodyTemplate', { required: true })}
        />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" className="w-4 h-4" {...register('active')} />
        Active
      </label>

      {updateTemplate.isError && <p className="text-sm text-destructive">Failed to update template.</p>}

      <Button type="submit" className="w-full" disabled={updateTemplate.isPending}>
        {updateTemplate.isPending ? 'Saving...' : 'Save Template'}
      </Button>
    </form>
  );
}

export default function TemplatesPage() {
  const { data: templates, isLoading, isError } = useNotificationTemplates();
  const data = templates || [];
  const [editing, setEditing] = useState<NotificationTemplate | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-border/50">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">Notification Templates</h1>
          <p className="text-[13px] text-muted-foreground">Manage messaging templates for SMS, WhatsApp, and Email. Registered per trigger event, seeded at setup.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <CardDescription>Use curly braces like {'{{Variable}}'} to insert dynamic data into messages.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8 text-muted-foreground">Loading templates...</div>
          ) : isError ? (
            <div className="flex justify-center p-8 text-destructive">Failed to load templates.</div>
          ) : (
            <>
            <p className="text-sm text-muted-foreground mb-2">{data.length} templates</p>
            <DataTable<NotificationTemplate>
              data={data}
              pageSize={10}
              columns={[
                { key: 'triggerKey', header: 'Trigger' },
                {
                  key: 'channel',
                  header: 'Channel',
                  render: (item) => (
                    <span className={`px-2 py-1 text-xs font-bold rounded-md ${
                      item.channel === 'SMS' ? 'bg-indigo-100 text-indigo-700' :
                      item.channel === 'WHATSAPP' ? 'bg-green-100 text-green-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {item.channel}
                    </span>
                  ),
                },
                { key: 'bodyTemplate', header: 'Message Structure', render: (item) => <span className="line-clamp-2 max-w-md">{item.bodyTemplate}</span> },
                {
                  key: 'active',
                  header: 'Status',
                  render: (item) => <StatusBadge label={item.active ? 'Active' : 'Inactive'} category={item.active ? 'success' : 'default'} />,
                },
                {
                  key: 'action',
                  header: 'Action',
                  render: (item) => <Button size="sm" variant="outline" onClick={() => setEditing(item)}>Edit</Button>,
                },
              ]}
            />
            </>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Template</SheetTitle>
            <SheetDescription>{editing?.triggerKey} — {editing?.channel}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 px-4 pb-4">
            {editing && <EditTemplateForm template={editing} onDone={() => setEditing(null)} />}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
