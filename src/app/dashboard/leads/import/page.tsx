'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { UploadCloud } from 'lucide-react';
import { useImportEntity } from '@/lib/hooks/useImportExport';

export default function LeadImportPage() {
  const router = useRouter();
  const importEntity = useImportEntity();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ successCount: number; failureCount: number } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleImport = () => {
    if (!file) return;
    importEntity.mutate(
      { entity: 'leads', file, mode: 'partial' },
      {
        onSuccess: (data) => {
          setResult({ successCount: data.successCount, failureCount: data.failureCount });
        },
      }
    );
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = () => setIsDragOver(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-border/50">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">Bulk Import Leads</h1>
          <p className="text-[13px] text-muted-foreground">Upload a CSV file to import multiple leads at once.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => router.back()}>Back to Leads</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Upload CSV File</CardTitle>
              <CardDescription>
                Select or drag and drop your CSV file below. The file should match the required format.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                  isDragOver ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-slate-300 hover:border-primary/50 hover:bg-slate-50'
                }`}
              >
                <div className={`p-4 rounded-full mb-4 ${file ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'}`}>
                  <UploadCloud className="h-8 w-8" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-1">
                  {file ? file.name : 'Click or drag and drop to select'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {file ? `${(file.size / 1024).toFixed(2)} KB CSV File` : 'Support for a single CSV upload (.csv only)'}
                </p>
                {file && (
                  <Button variant="ghost" size="sm" className="mt-4 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                    Remove file
                  </Button>
                )}
              </div>

              {importEntity.isError && (
                <div className="mt-6 p-4 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20 flex items-center gap-2">
                  <span className="font-semibold">Import failed:</span> {importEntity.error.response?.data?.message ?? 'An unknown error occurred.'}
                </div>
              )}

              {result && (
                <div className={`mt-6 p-4 rounded-lg text-sm border flex flex-col gap-1 ${result.failureCount === 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  <span className="font-semibold">Import complete!</span>
                  <span>Imported <strong>{result.successCount}</strong> lead(s) successfully.</span>
                  {result.failureCount > 0 && <span><strong>{result.failureCount}</strong> row(s) failed validation.</span>}
                </div>
              )}
            </CardContent>
            
            <Separator />
            <CardFooter className="flex justify-between p-6 bg-slate-50/50">
              <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
              <Button onClick={handleImport} disabled={!file || importEntity.isPending} className="min-w-[140px]">
                {importEntity.isPending ? 'Importing...' : 'Start Import'}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="md:col-span-1 space-y-6">
          <Card className="border shadow-sm bg-slate-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">CSV Format Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-muted-foreground leading-relaxed">
                Your CSV file must include specific columns to be processed successfully.
              </p>
              
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-foreground mb-2 text-xs uppercase tracking-wider">Required Columns</h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium font-mono">source</span>
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium font-mono">ownerId</span>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-foreground mb-2 text-xs uppercase tracking-wider mt-4">Optional Columns</h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-xs font-medium font-mono">contactName</span>
                    <span className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-xs font-medium font-mono">contactMobile</span>
                  </div>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="text-xs text-muted-foreground bg-blue-50/50 p-3 rounded-md border border-blue-100/50">
                <strong>Pro tip:</strong> Make sure the ownerId exactly matches an existing Employee ID in the system.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
