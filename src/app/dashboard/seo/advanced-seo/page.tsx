'use client';

import { useState } from 'react';
import { FileCode, FileText, Globe, Save, Trash2, Upload } from 'lucide-react';
import Swal from 'sweetalert2';

interface SeoFile {
  id: string;
  name: string;
}

export default function AdvancedSeoPage() {
  const [scripts, setScripts] = useState({ headerScripts: '', footerScripts: '' });
  const [seoFiles, setSeoFiles] = useState<SeoFile[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSaveScripts = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      void Swal.fire({ icon: 'success', title: 'Saved!', text: 'Global scripts updated successfully', confirmButtonColor: '#3e8914', timer: 1500, showConfirmButton: false });
    }, 400);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['xml', 'html', 'txt'].includes(ext)) {
      void Swal.fire({ icon: 'error', title: 'Invalid File', text: 'Only .xml, .html, and .txt files are allowed', confirmButtonColor: '#3e8914' });
      return;
    }

    setUploading(true);
    setTimeout(() => {
      setSeoFiles((prev) => [...prev, { id: `${Date.now()}`, name: file.name }]);
      setUploading(false);
      void Swal.fire({ icon: 'success', title: 'Uploaded!', text: 'File uploaded successfully', confirmButtonColor: '#3e8914', timer: 1500, showConfirmButton: false });
    }, 400);
  };

  const handleDeleteFile = async (file: SeoFile) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This file will be permanently deleted.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, delete it!',
    });
    if (!result.isConfirmed) return;
    setSeoFiles((prev) => prev.filter((f) => f.id !== file.id));
    void Swal.fire({ icon: 'success', title: 'Deleted!', text: 'File has been deleted.', confirmButtonColor: '#3e8914', timer: 1200, showConfirmButton: false });
  };

  return (
    <div className="bg-white p-6 shadow-md min-h-screen">
      <div className="mb-[20px] border-b-[2px] border-[#293681] pb-[8px]">
        <h1 className="text-[19px] font-bold leading-[1.15] tracking-[-0.018em] text-[#23471d]">Advanced SEO Settings</h1>
        <p className="mt-0.5 text-[12px] font-medium text-[#6c7587]">Manage global scripts and static SEO files (Sitemap, Robots, etc.)</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* LEFT: SCRIPT EDITORS */}
        <div className="space-y-5 lg:col-span-2">
          <div className="border-2 border-gray-200 bg-white p-5 shadow-lg">
            <div className="mb-3 flex items-center gap-2">
              <div className="bg-[#3e8914]/10 p-1.5">
                <FileCode className="h-3.5 w-3.5 text-[#3e8914]" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900">Global Script Configuration</h2>
            </div>

            <div className="mb-4 space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-tight text-gray-700">Header Scripts (Inside &lt;head&gt;)</label>
              <p className="mb-1.5 text-[10px] italic text-gray-400">Paste Google Analytics, GTM, or Pixel codes here</p>
              <textarea
                value={scripts.headerScripts}
                onChange={(e) => setScripts((prev) => ({ ...prev, headerScripts: e.target.value }))}
                placeholder="<!-- Paste <script> tags here -->"
                spellCheck={false}
                className="min-h-[140px] w-full overflow-auto rounded border-2 border-gray-200 bg-[#1e1e1e] p-3 font-mono text-[10px] text-[#d4d4d4] shadow-inner outline-none focus:ring-2 focus:ring-[#3e8914]"
              />
            </div>

            <div className="mb-4 space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-tight text-gray-700">Footer Scripts (Before &lt;/body&gt;)</label>
              <p className="mb-1.5 text-[10px] italic text-gray-400">Scripts that should load after page content</p>
              <textarea
                value={scripts.footerScripts}
                onChange={(e) => setScripts((prev) => ({ ...prev, footerScripts: e.target.value }))}
                placeholder="<!-- Paste <script> tags here -->"
                spellCheck={false}
                className="min-h-[140px] w-full overflow-auto rounded border-2 border-gray-200 bg-[#1e1e1e] p-3 font-mono text-[10px] text-[#d4d4d4] shadow-inner outline-none focus:ring-2 focus:ring-[#3e8914]"
              />
            </div>

            <div className="flex justify-end border-t border-gray-100 pt-3">
              <button
                onClick={handleSaveScripts}
                disabled={isSaving}
                className="flex items-center gap-1.5 bg-[#4B1426] px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:bg-[#3a0f1d] hover:shadow-xl disabled:opacity-50"
              >
                {isSaving ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save className="h-3.5 w-3.5" />}
                <span>Save Scripts</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: FILE UPLOADS */}
        <div className="space-y-5">
          <div className="border-2 border-gray-200 bg-white p-5 shadow-lg">
            <div className="mb-4 flex items-center gap-2">
              <div className="bg-[#3e8914]/10 p-1.5">
                <Upload className="h-3.5 w-3.5 text-[#3e8914]" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900">SEO Files</h2>
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-tighter text-gray-700">Upload Static Files (.xml, .html, .txt)</label>
              <div className="group relative rounded-xl border-2 border-dashed border-gray-300 p-4 text-center transition-all hover:bg-gray-50">
                <input type="file" onChange={handleFileUpload} accept=".xml,.html,.txt" className="absolute inset-0 z-10 cursor-pointer opacity-0" />
                <div className="space-y-1.5">
                  <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#3e8914]/10 transition-transform group-hover:scale-110">
                    <Upload className="h-4 w-4 text-[#3e8914]" />
                  </div>
                  <div className="text-[11px] font-bold text-gray-600">Click to upload</div>
                  <p className="text-[9px] font-medium uppercase tracking-widest text-gray-400">Sitemap, Robots, Verification</p>
                </div>
                {uploading && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-white/80">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#3e8914] border-t-transparent" />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <h3 className="border-b pb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#293681]">Uploaded Files</h3>
              {seoFiles.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 py-6 text-center">
                  <Globe className="mx-auto mb-1.5 h-6 w-6 text-gray-200" />
                  <p className="text-[9px] font-bold uppercase text-gray-400">No files uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {seoFiles.map((file) => (
                    <div key={file.id} className="group flex items-center justify-between rounded-lg border-2 border-gray-100 bg-white p-2.5 shadow-sm transition-colors hover:border-[#3e8914]/30">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="rounded-lg bg-gray-50 p-1.5 group-hover:bg-[#3e8914]/10">
                          <FileText className="h-3.5 w-3.5 text-[#293681]" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="truncate text-[10px] font-bold text-gray-800">{file.name}</p>
                          <p className="text-[8px] font-bold uppercase tracking-tighter text-[#DE802B]">Serving at root</p>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteFile(file)} className="rounded-md p-1 text-gray-300 transition-all hover:bg-red-50 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 rounded-r-lg border-l-4 border-[#3e8914] bg-[#3e8914]/5 p-3">
              <p className="mb-1 text-[9px] font-bold uppercase text-[#23471d]">Notice</p>
              <p className="text-[9px] font-medium leading-relaxed text-[#23471d]/80">
                Files are served directly from the root of your domain. (e.g., citycalls.in/sitemap.xml)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
