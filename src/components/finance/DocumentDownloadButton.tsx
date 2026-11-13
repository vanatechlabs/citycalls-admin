'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';

export function DocumentDownloadButton({ type, id }: { type: string; id: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <div><Button variant="outline" disabled={busy} onClick={async () => {
    setBusy(true); setError('');
    try {
      const result = await apiClient.get(`/financial-documents/${type}/${id}/download`);
      const target = new URL(result.data.data.url, apiClient.defaults.baseURL ?? window.location.origin).toString();
      const file = await apiClient.get<Blob>(target, { responseType: 'blob' });
      const url = URL.createObjectURL(file.data);
      const link = document.createElement('a'); link.href = url; link.download = `${type}-${id}.pdf`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError('Could not download the PDF. Please try again.'); }
    finally { setBusy(false); }
  }}>{busy ? 'Preparing PDF…' : 'Download PDF'}</Button>{error && <p className="text-sm text-destructive">{error}</p>}</div>;
}
