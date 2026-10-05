'use client';

import { useState } from 'react';
import type { AxiosError } from 'axios';
import { Clock, Edit, Heading, Image as ImageIcon, Info, Package, Plus, Save, Star, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';

import type { ApiErrorEnvelope } from '@/lib/api/client';
import { useUploadFile } from '@/lib/hooks/useFiles';
import {
  PackageStatus, PackagesSection, PackagesSectionInput, PopularPackage, PopularPackageInput,
  useCreatePackage, useDeletePackage, usePopularPackages, useSavePackagesSection, useUpdatePackage,
} from '@/lib/hooks/usePopularPackages';
import { formatDate, formatTime, resolveMediaUrl } from '@/lib/registrations/format';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
// Default package images are the website's own files (/assets/...).
const WEBSITE_ORIGIN = (process.env.NEXT_PUBLIC_CITYCALLS_WEBSITE_URL ?? 'http://localhost:3001').replace(/\/$/, '');

const LABEL = 'mb-1 block text-xs font-bold uppercase text-gray-500';
const INPUT = 'w-full border-2 border-gray-300 px-3 py-2 text-sm font-semibold outline-none focus:border-[#134698]';
const CARD_TITLE = 'mb-4 flex items-center gap-2 text-lg font-bold text-[#DE802B]';
const ICON_BUTTON = 'flex h-8 w-8 items-center justify-center rounded-[6px] backdrop-blur-md border transition-all hover:scale-105 active:scale-95';

const emptyPackage: PopularPackageInput = {
  name: '', duration: '', price: 0, image: '', imageAlt: '', featured: true, sortOrder: 0, status: 'ACTIVE',
};

function previewUrl(image: string) {
  if (!image) return '';
  if (image.startsWith('/assets/')) return `${WEBSITE_ORIGIN}${image}`;
  return resolveMediaUrl(image);
}

function errorMessage(error: unknown) {
  const envelope = (error as AxiosError<ApiErrorEnvelope>)?.response?.data;
  return envelope?.errors?.[0]?.message || envelope?.message || undefined;
}

function showToast(icon: 'success' | 'error' | 'warning', title: string) {
  void Swal.fire({ toast: true, position: 'top-end', icon, title, timer: 2200, showConfirmButton: false });
}

function sectionForm(section: PackagesSection): PackagesSectionInput {
  return {
    eyebrow: section.eyebrow ?? '',
    heading: section.heading ?? '',
    highlight: section.highlight ?? '',
    description: section.description ?? '',
    buttonText: section.buttonText ?? '',
    buttonLink: section.buttonLink ?? '',
    status: section.status ?? 'ACTIVE',
  };
}

// Section heading form; keyed by updatedAt so a save reloads it.
function SectionHeadingCard({ section }: { section: PackagesSection }) {
  const [form, setForm] = useState<PackagesSectionInput>(sectionForm(section));
  const saveSection = useSavePackagesSection();
  const update = <K extends keyof PackagesSectionInput>(key: K, value: PackagesSectionInput[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const highlightMissing = !!form.highlight && !form.heading.includes(form.highlight);
  const index = form.highlight ? form.heading.indexOf(form.highlight) : -1;

  async function save() {
    if (!form.heading.trim()) return showToast('warning', 'Heading is required');
    if (highlightMissing) return showToast('warning', 'Highlight text must be part of the heading');
    try {
      await saveSection.mutateAsync(form);
      showToast('success', 'Section heading saved');
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Could not save heading', text: errorMessage(error) });
    }
  }

  return (
    <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="border-2 border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
        <h2 className={CARD_TITLE}><Heading className="h-5 w-5" /> Section Heading</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={LABEL}>Eyebrow</label>
            <input value={form.eyebrow} maxLength={60} onChange={(e) => update('eyebrow', e.target.value)} placeholder="Top Choices" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Status</label>
            <select value={form.status} onChange={(e) => update('status', e.target.value as PackageStatus)} className={INPUT}>
              <option value="ACTIVE">Active — show the section</option>
              <option value="INACTIVE">Inactive — hide the section</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Heading *</label>
            <input value={form.heading} maxLength={120} onChange={(e) => update('heading', e.target.value)} placeholder="EXPLORE OUR POPULAR PACKAGES" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Highlight Text <span className="normal-case text-gray-400">(green)</span></label>
            <input
              value={form.highlight}
              maxLength={80}
              onChange={(e) => update('highlight', e.target.value)}
              placeholder="POPULAR PACKAGES"
              className={`${INPUT} ${highlightMissing ? 'border-red-400' : ''}`}
            />
            {highlightMissing && <p className="mt-1 text-[10px] font-bold text-red-500">Must be part of the heading</p>}
          </div>
          <div className="md:col-span-2">
            <label className={LABEL}>Description</label>
            <textarea rows={2} value={form.description} maxLength={400} onChange={(e) => update('description', e.target.value)} className={`${INPUT} resize-none`} />
          </div>
          <div>
            <label className={LABEL}>Button Text</label>
            <input value={form.buttonText} maxLength={40} onChange={(e) => update('buttonText', e.target.value)} placeholder="Explore All Services" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Button Link</label>
            <input value={form.buttonLink} maxLength={500} onChange={(e) => update('buttonLink', e.target.value)} placeholder="/services" className={INPUT} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saveSection.isPending}
          className="mt-5 flex w-full items-center justify-center gap-2 bg-[#4B1426] py-2 font-bold text-white transition-colors hover:bg-[#3a0f1d] disabled:opacity-60"
        >
          <Save className="h-4 w-4" /> {saveSection.isPending ? 'Saving...' : 'Save Heading'}
        </button>
      </div>

      <div className="border-2 border-gray-200 bg-gray-50 p-6 shadow-sm">
        <h2 className={CARD_TITLE}><Info className="h-5 w-5" /> Heading Preview</h2>
        <div className={form.status === 'INACTIVE' ? 'opacity-50' : ''}>
          {form.eyebrow && (
            <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#3e8914]">
              <span className="h-px w-6 bg-[#3e8914]" /> {form.eyebrow}
            </p>
          )}
          <p className="text-lg font-extrabold leading-tight text-slate-900">
            {index < 0 ? form.heading || 'Heading' : (
              <>{form.heading.slice(0, index)}<span className="text-[#3e8914]">{form.highlight}</span>{form.heading.slice(index + form.highlight.length)}</>
            )}
          </p>
          {form.description && <p className="mt-2 text-[11px] leading-relaxed text-gray-500">{form.description}</p>}
          {form.buttonText && (
            <span className="mt-3 inline-flex rounded-full border-2 border-[#3e8914] px-3 py-1 text-[10px] font-bold uppercase text-[#3e8914]">{form.buttonText}</span>
          )}
        </div>
        {section.updatedBy && (
          <p className="mt-4 text-[10px] font-medium text-gray-400">
            Last saved by <strong className="text-[#4B1426]">{section.updatedBy.name}</strong>, {formatDate(section.updatedAt)}, {formatTime(section.updatedAt)}
          </p>
        )}
      </div>
    </div>
  );
}

export default function PopularPackagesPage() {
  const { data, isLoading } = usePopularPackages();
  const createPackage = useCreatePackage();
  const updatePackage = useUpdatePackage();
  const deletePackageMutation = useDeletePackage();
  const imageUpload = useUploadFile('POPULAR_PACKAGE', 'new', { skipGlobalToast: true });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PopularPackageInput>(emptyPackage);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const packages = data?.packages ?? [];
  const isSaving = createPackage.isPending || updatePackage.isPending || imageUpload.isPending;

  const update = <K extends keyof PopularPackageInput>(key: K, value: PopularPackageInput[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  function resetForm() {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setEditingId(null);
    setForm({ ...emptyPackage, sortOrder: packages.length });
    setImageFile(null);
    setImagePreview(null);
  }

  function startEdit(pkg: PopularPackage) {
    setEditingId(pkg._id);
    setForm({
      name: pkg.name, duration: pkg.duration ?? '', price: pkg.price, image: pkg.image ?? '', imageAlt: pkg.imageAlt ?? '',
      featured: !!pkg.featured, sortOrder: pkg.sortOrder ?? 0, status: pkg.status,
    });
    setImageFile(null);
    setImagePreview(pkg.image ? previewUrl(pkg.image) : null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      showToast('warning', 'Use a JPG, PNG or WebP image up to 10 MB');
      return;
    }
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function savePackage() {
    if (!form.name.trim()) return showToast('warning', 'Package name is required');
    if (!Number.isInteger(form.price) || form.price < 0) return showToast('warning', 'Enter a valid price in rupees');

    try {
      // The image needs the package's id, so a new package is saved first.
      const saved = editingId
        ? await updatePackage.mutateAsync({ id: editingId, ...form })
        : await createPackage.mutateAsync(form);
      if (imageFile) {
        const uploaded = await imageUpload.upload(imageFile, 'WEBSITE_PACKAGE_IMAGE', saved._id);
        await updatePackage.mutateAsync({ id: saved._id, image: uploaded.url });
      }
      showToast('success', editingId ? 'Package updated' : 'Package added');
      resetForm();
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Could not save package', text: errorMessage(error) });
    }
  }

  async function changeStatus(pkg: PopularPackage, status: PackageStatus) {
    try {
      await updatePackage.mutateAsync({ id: pkg._id, status });
      showToast('success', `Package ${status === 'ACTIVE' ? 'activated' : 'deactivated'}`);
    } catch {
      showToast('error', 'Failed to change status');
    }
  }

  async function deletePackage(pkg: PopularPackage) {
    const result = await Swal.fire({
      title: `Delete "${pkg.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it',
    });
    if (!result.isConfirmed) return;
    try {
      await deletePackageMutation.mutateAsync(pkg._id);
      if (editingId === pkg._id) resetForm();
      showToast('success', 'Package deleted');
    } catch {
      showToast('error', 'Failed to delete package');
    }
  }

  return (
    <div className="min-h-[calc(100vh-100px)] w-[calc(100%+12px)] -mt-3 -ml-3 bg-white">
      <div className="min-h-screen bg-white p-6 shadow-md">
        <div className="mb-[20px] border-b-[2px] border-[#293681] pb-[8px]">
          <h1 className="text-[19px] font-bold leading-[1.15] tracking-[-0.018em] text-[#23471d]">Popular Packages</h1>
          <p className="mt-0.5 text-[12px] font-medium text-[#6c7587]">Add, edit and order the package cards on the home page, and set the heading above them.</p>
        </div>

        <div style={{ zoom: 0.75 }}>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Add / edit package */}
            <div className="space-y-6 lg:col-span-1">
              <div className="border-2 border-gray-200 bg-white p-6 shadow-sm">
                <h2 className={CARD_TITLE}>
                  {editingId ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                  {editingId ? 'Edit Package' : 'Add Package'}
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className={LABEL}>Package Name *</label>
                    <input value={form.name} maxLength={80} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Split AC Servicing" className={INPUT} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Price (₹) *</label>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={form.price}
                        onChange={(e) => update('price', Number(e.target.value))}
                        className={INPUT}
                      />
                    </div>
                    <div>
                      <label className={LABEL}>Duration</label>
                      <input value={form.duration} maxLength={40} onChange={(e) => update('duration', e.target.value)} placeholder="e.g. 1 hr" className={INPUT} />
                    </div>
                  </div>
                  <div>
                    <label className={LABEL}>Package Image</label>
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50">
                        {imagePreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imagePreview} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <input
                        type="file"
                        accept={IMAGE_TYPES.join(',')}
                        onChange={handleImageFile}
                        className="min-w-0 flex-1 border-2 border-gray-300 px-3 py-2 text-xs font-semibold outline-none focus:border-[#134698]"
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-gray-400">Uploads to Cloudinary — JPG, PNG, or WebP, up to 10 MB. A landscape photo works best.</p>
                  </div>
                  <div>
                    <label className={LABEL}>Image Alt Text</label>
                    <input value={form.imageAlt} maxLength={200} onChange={(e) => update('imageAlt', e.target.value)} placeholder="e.g. Technician servicing a split AC" className={INPUT} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Sort Order</label>
                      <input type="number" min={0} value={form.sortOrder} onChange={(e) => update('sortOrder', Number(e.target.value))} className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>Status</label>
                      <select value={form.status} onChange={(e) => update('status', e.target.value as PackageStatus)} className={INPUT}>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    </div>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-700">
                    <input type="checkbox" checked={form.featured} onChange={(e) => update('featured', e.target.checked)} className="h-4 w-4 accent-[#3e8914]" />
                    Show &quot;Popular&quot; badge
                  </label>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => void savePackage()}
                      disabled={isSaving}
                      className="flex flex-1 items-center justify-center gap-2 bg-[#4B1426] py-2 font-bold text-white transition-colors hover:bg-[#3a0f1d] disabled:opacity-60"
                    >
                      <Save className="h-4 w-4" />
                      {isSaving ? 'Saving...' : editingId ? 'Update Package' : 'Add Package'}
                    </button>
                    {editingId && (
                      <button type="button" onClick={resetForm} className="bg-gray-500 px-4 py-2 font-bold text-white transition-colors hover:bg-gray-600">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex gap-3 border border-blue-100 bg-blue-50 p-4">
                  <Info className="h-5 w-5 shrink-0 text-blue-600" />
                  <p className="text-[10px] font-bold uppercase leading-relaxed text-blue-700">
                    Active packages show on the home page in sort order. Customers can add them straight to their booking cart.
                  </p>
                </div>
              </div>
            </div>

            {/* Packages list */}
            <div className="lg:col-span-2">
              <div className="overflow-hidden border-2 border-gray-200 bg-white shadow-sm">
                <div className="border-b bg-[#233D4D] px-6 py-4">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                    <Package className="h-5 w-5 text-[#DE802B]" /> Packages List
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-[#233D4D] text-center text-xs font-bold uppercase tracking-wider text-white">
                        <th className="px-5 py-3 text-left">No.</th>
                        <th className="px-5 py-3 text-left">Image</th>
                        <th className="px-5 py-3 text-left">Package</th>
                        <th className="px-5 py-3">Price</th>
                        <th className="px-5 py-3">Order</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {isLoading ? (
                        <tr><td colSpan={7} className="py-10 text-center text-sm text-[#6c7587]">Loading packages...</td></tr>
                      ) : packages.length === 0 ? (
                        <tr><td colSpan={7} className="py-10 text-center text-sm text-[#6c7587]">No packages yet — add one from the form.</td></tr>
                      ) : (
                        packages.map((pkg, index) => (
                          <tr key={pkg._id} className={`transition-colors hover:bg-gray-50 ${editingId === pkg._id ? 'bg-blue-50/70' : ''}`}>
                            <td className="px-5 py-4 text-[12px] font-bold text-[#3e8914]">{(index + 1).toString().padStart(2, '0')}</td>
                            <td className="px-5 py-4">
                              <div className="flex h-12 w-16 items-center justify-center overflow-hidden border-2 border-gray-200 bg-gray-50">
                                {pkg.image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={previewUrl(pkg.image)} alt={pkg.imageAlt || pkg.name} className="h-full w-full object-cover" />
                                ) : (
                                  <ImageIcon className="h-5 w-5 text-gray-400" />
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <span className="text-[12px] font-bold uppercase tracking-tighter text-[#4B1426]">{pkg.name}</span>
                                {pkg.featured && (
                                  <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-700">
                                    <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" /> Popular
                                  </span>
                                )}
                              </div>
                              {pkg.duration && (
                                <span className="mt-1 flex items-center gap-1 text-[11px] font-bold uppercase text-[#6c7587]">
                                  <Clock className="h-3 w-3" /> {pkg.duration}
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-center text-[13px] font-bold text-[#3e8914]">₹{pkg.price.toLocaleString('en-IN')}</td>
                            <td className="px-5 py-4 text-center text-[11px] font-bold uppercase text-[#6c7587]">#{pkg.sortOrder}</td>
                            <td className="px-5 py-4 text-center">
                              <select
                                key={`${pkg._id}-${pkg.status}`}
                                value={pkg.status}
                                onChange={(e) => void changeStatus(pkg, e.target.value as PackageStatus)}
                                className={`h-[24px] cursor-pointer appearance-none rounded-[4px] px-[8px] pr-[22px] text-[11px] font-bold outline-none bg-no-repeat bg-[right_6px_center] shadow-xs transition ${
                                  pkg.status === 'ACTIVE'
                                    ? 'bg-[#e8f5e9] text-[#23714a] border border-[#a5d6a7]'
                                    : 'bg-[#fee2e2] text-[#dc2626] border border-[#fca5a5]'
                                }`}
                                style={{
                                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                                }}
                              >
                                <option value="ACTIVE" className="bg-white font-bold text-[#23714a]">Active</option>
                                <option value="INACTIVE" className="bg-white font-bold text-[#dc2626]">Inactive</option>
                              </select>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => startEdit(pkg)}
                                  title="Edit"
                                  className={`${ICON_BUTTON} bg-blue-500/10 text-blue-600 border-blue-400/30 shadow-[0_2px_6px_rgba(37,99,235,0.12)] hover:bg-blue-500/20 hover:border-blue-400/50`}
                                >
                                  <Edit className="h-4 w-4 text-blue-600" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void deletePackage(pkg)}
                                  title="Delete"
                                  className={`${ICON_BUTTON} bg-red-500/10 text-red-600 border-red-400/30 shadow-[0_2px_6px_rgba(220,38,38,0.12)] hover:bg-red-500/20 hover:border-red-400/50`}
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {data?.section && <SectionHeadingCard key={data.section.updatedAt} section={data.section} />}
        </div>
      </div>
    </div>
  );
}
