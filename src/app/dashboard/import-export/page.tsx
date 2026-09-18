'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { UploadCloud, DownloadCloud, FileSpreadsheet, CheckCircle2, XCircle } from 'lucide-react';

import { useImportEntity, downloadExport, EXPORT_ENTITIES, ImportEntityInput } from '@/lib/hooks/useImportExport';

const IMPORT_ENTITIES: { value: ImportEntityInput['entity']; label: string }[] = [
  { value: 'customers', label: 'Customers Directory' },
  { value: 'leads', label: 'Leads Data' },
];

const EXPORT_ENTITY_LABELS: Record<(typeof EXPORT_ENTITIES)[number], string> = {
  customers: 'All Customers',
  leads: 'All Leads',
  serviceRequests: 'Service Requests',
  calls: 'Calls',
  invoices: 'Invoices',
};

function ImportSection() {
  const importEntity = useImportEntity();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [entity, setEntity] = useState<ImportEntityInput['entity']>('customers');
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'partial' | 'strict'>('partial');

  const handleImport = (dryRun: boolean) => {
    if (!file) return;
    importEntity.mutate({ entity, file, dryRun, mode });
  };

  return (
    <Card className="animate-in slide-in-from-right-4 fade-in duration-500 mt-2">
      <CardContent className="space-y-6 pt-5">
        <div className="space-y-3">
          <div className="space-y-1 border-b border-border/50 pb-1 mb-2">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-indigo-600" /> Bulk Import
            </h2>
            <p className="text-[13px] text-muted-foreground">Upload a CSV file to bulk-create customers or leads.</p>
          </div>
          
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Entity Type</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={entity}
                  onChange={(e) => setEntity(e.target.value as ImportEntityInput['entity'])}
                >
                  {IMPORT_ENTITIES.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Row Handling</label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={mode} onChange={(e) => setMode(e.target.value as 'partial' | 'strict')}>
                  <option value="partial">Partial (skip invalid)</option>
                  <option value="strict">Strict (abort on invalid)</option>
                </select>
              </div>
            </div>

            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center text-center bg-slate-50 hover:bg-slate-100 hover:border-indigo-300 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-8 h-8 text-indigo-400 mb-3" />
              <p className="text-sm font-medium text-slate-700">{file ? file.name : 'Click to select a CSV file'}</p>
              <p className="text-[12px] text-muted-foreground mt-1">CSV only, maximum file size 20MB</p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="w-full" onClick={() => handleImport(true)} disabled={!file || importEntity.isPending}>
                {importEntity.isPending ? 'Checking...' : 'Dry Run (Validate)'}
              </Button>
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => handleImport(false)} disabled={!file || importEntity.isPending}>
                {importEntity.isPending ? 'Importing...' : 'Import Now'}
              </Button>
            </div>

            {importEntity.isError && (
              <p className="text-sm text-destructive">{importEntity.error.response?.data?.message ?? 'Import failed.'}</p>
            )}

            {importEntity.data && (
              <div className="border border-slate-200 rounded-md p-4 space-y-2 bg-slate-50">
                <div className="flex gap-4 text-sm font-medium">
                  <span className="flex items-center gap-1 text-green-700"><CheckCircle2 className="w-4 h-4" /> {importEntity.data.successCount} succeeded</span>
                  <span className="flex items-center gap-1 text-red-700"><XCircle className="w-4 h-4" /> {importEntity.data.failureCount} failed</span>
                  {importEntity.data.dryRun && <span className="text-xs text-slate-500 ml-auto">(dry run)</span>}
                </div>
                {importEntity.data.failures.length > 0 && (
                  <div className="text-[12px] text-slate-600 space-y-1 max-h-32 overflow-y-auto mt-2 pt-2 border-t border-slate-200">
                    {importEntity.data.failures.map((f, i) => (
                      <div key={i}><span className="font-semibold text-slate-700">Row {f.row}:</span> [{f.field}] {f.message}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ExportSection() {
  const [entity, setEntity] = useState<(typeof EXPORT_ENTITIES)[number]>('customers');
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv');
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsDownloading(true);
    setError(null);
    try {
      await downloadExport(entity, format);
    } catch {
      setError('Failed to generate export.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card className="animate-in slide-in-from-right-4 fade-in duration-500 mt-2">
      <CardContent className="space-y-6 pt-5">
        <div className="space-y-3">
          <div className="space-y-1 border-b border-border/50 pb-1 mb-2">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <DownloadCloud className="w-4 h-4 text-green-600" /> Master Export
            </h2>
            <p className="text-[13px] text-muted-foreground">Extract complete datasets from the system.</p>
          </div>

          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Entity Type</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={entity}
                  onChange={(e) => setEntity(e.target.value as (typeof EXPORT_ENTITIES)[number])}
                >
                  {EXPORT_ENTITIES.map((e) => <option key={e} value={e}>{EXPORT_ENTITY_LABELS[e]}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Format</label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={format} onChange={(e) => setFormat(e.target.value as 'csv' | 'xlsx')}>
                  <option value="csv">CSV</option>
                  <option value="xlsx">Excel (.xlsx)</option>
                </select>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="pt-2">
              <Button variant="outline" className="w-full border-green-600 text-green-700 hover:bg-green-50 hover:text-green-800" onClick={handleExport} disabled={isDownloading}>
                {isDownloading ? 'Generating...' : 'Download Export'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ImportExportPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-border/50">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">Import / Export Wizard</h1>
          <p className="text-[13px] text-muted-foreground">Bulk upload data into the system or extract data for external use.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <ImportSection />
        <ExportSection />
      </div>
    </div>
  );
}
