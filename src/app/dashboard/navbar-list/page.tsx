'use client';

import { useMemo, useState } from 'react';
import {
  Edit,
  Image as ImageIcon,
  Info,
  Link as LinkIcon,
  Menu,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import Swal from 'sweetalert2';
import {
  useNavbarMenus,
  useCreateNavbarMenu,
  useUpdateNavbarMenu,
  useDeleteNavbarMenu,
  useNavbarServices,
  useCreateNavbarService,
  useUpdateNavbarService,
  useDeleteNavbarService,
  NavbarMenu,
  NavbarService,
  NavbarStatus,
} from '@/lib/hooks/useNavbar';
import { useUploadFile } from '@/lib/hooks/useFiles';

const emptyMenu = {
  name: '',
  slug: '',
  sortOrder: 0,
  status: 'ACTIVE' as NavbarStatus,
};

const emptyService = {
  name: '',
  image: '',
  path: '',
  sortOrder: 0,
  status: 'ACTIVE' as NavbarStatus,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function showToast(icon: 'success' | 'error' | 'warning', title: string) {
  void Swal.fire({ toast: true, position: 'top-end', icon, title, timer: 2200, showConfirmButton: false });
}

export default function NavbarListPage() {
  const { data: menus, isLoading: menusLoading } = useNavbarMenus();
  const createMenu = useCreateNavbarMenu();
  const updateMenu = useUpdateNavbarMenu();
  const deleteMenuMutation = useDeleteNavbarMenu();

  // No selection yet (or the selected menu got deleted) falls back to the
  // first menu in the list, computed at render time — avoids an effect just
  // to seed the initial selection once menus load.
  const [selectedMenuIdOverride, setSelectedMenuId] = useState<string | null>(null);
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [menuForm, setMenuForm] = useState(emptyMenu);
  const [serviceForm, setServiceForm] = useState(emptyService);
  const [serviceImageFile, setServiceImageFile] = useState<File | null>(null);
  const [serviceImagePreview, setServiceImagePreview] = useState<string | null>(null);

  const selectedMenuId =
    selectedMenuIdOverride && menus?.some((m) => m._id === selectedMenuIdOverride)
      ? selectedMenuIdOverride
      : menus?.[0]?._id ?? '';

  const selectedMenu = useMemo(() => menus?.find((m) => m._id === selectedMenuId), [menus, selectedMenuId]);

  const { data: selectedMenuServices, isLoading: servicesLoading } = useNavbarServices(selectedMenu?._id);
  const createService = useCreateNavbarService();
  const updateService = useUpdateNavbarService();
  const deleteServiceMutation = useDeleteNavbarService();
  const imageUpload = useUploadFile('NAVBAR_SERVICE_IMAGE', 'new', { skipGlobalToast: true });

  async function saveMenu() {
    if (!menuForm.name.trim()) {
      showToast('warning', 'Please enter menu name');
      return;
    }

    try {
      if (editingMenuId) {
        await updateMenu.mutateAsync({ id: editingMenuId, ...menuForm });
        showToast('success', 'Navbar menu updated');
      } else {
        const created = await createMenu.mutateAsync(menuForm);
        setSelectedMenuId(created._id);
        showToast('success', 'Navbar menu created');
      }
      setEditingMenuId(null);
      setMenuForm(emptyMenu);
    } catch {
      showToast('error', 'Failed to save navbar menu');
    }
  }

  function startEditMenu(menu: NavbarMenu) {
    setEditingMenuId(menu._id);
    setMenuForm({ name: menu.name, slug: menu.slug, sortOrder: menu.sortOrder, status: menu.status });
    setSelectedMenuId(menu._id);
  }

  function changeMenuStatus(menu: NavbarMenu, newStatus: NavbarStatus) {
    if (menu.status === newStatus) return;
    updateMenu.mutate(
      { id: menu._id, status: newStatus },
      {
        onSuccess: () => showToast('success', `"${menu.name}" status changed to ${newStatus}`),
        onError: () => showToast('error', 'Failed to update status'),
      }
    );
  }

  async function deleteMenu(menu: NavbarMenu) {
    const result = await Swal.fire({
      title: `Delete "${menu.name}"?`,
      text: 'This will also delete every navlink under this menu. This cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it',
    });
    if (!result.isConfirmed) return;

    try {
      await deleteMenuMutation.mutateAsync(menu._id);
      if (selectedMenuId === menu._id) setSelectedMenuId(menus?.find((m) => m._id !== menu._id)?._id ?? '');
      showToast('success', 'Navbar menu deleted');
    } catch {
      showToast('error', 'Failed to delete navbar menu');
    }
  }

  function handleServiceImageFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setServiceImageFile(file);
    setServiceImagePreview(URL.createObjectURL(file));
  }

  async function saveService() {
    if (!selectedMenu) return;
    if (!serviceForm.name.trim() || !serviceForm.path.trim()) {
      showToast('warning', 'Please enter service name and path');
      return;
    }

    try {
      let serviceId = editingServiceId;
      let image = serviceForm.image;

      if (serviceId) {
        await updateService.mutateAsync({ id: serviceId, menuId: selectedMenu._id, ...serviceForm });
      } else {
        const created = await createService.mutateAsync({ ...serviceForm, menuId: selectedMenu._id });
        serviceId = created._id;
      }

      if (serviceImageFile && serviceId) {
        const uploaded = await imageUpload.upload(serviceImageFile, 'NAVBAR_SERVICE_IMAGE', serviceId);
        image = uploaded.url;
        await updateService.mutateAsync({ id: serviceId, menuId: selectedMenu._id, image });
      }

      resetServiceForm();
      showToast('success', editingServiceId ? 'Navlink updated' : 'Navlink added');
    } catch {
      showToast('error', 'Failed to save navlink');
    }
  }

  function startEditService(service: NavbarService) {
    setEditingServiceId(service._id);
    setServiceForm({
      name: service.name,
      image: service.image ?? '',
      path: service.path,
      sortOrder: service.sortOrder,
      status: service.status,
    });
    setServiceImageFile(null);
    setServiceImagePreview(service.image ?? null);
  }

  function resetServiceForm() {
    setEditingServiceId(null);
    setServiceForm(emptyService);
    setServiceImageFile(null);
    setServiceImagePreview(null);
  }

  async function deleteService(service: NavbarService) {
    const result = await Swal.fire({
      title: `Delete "${service.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it',
    });
    if (!result.isConfirmed) return;

    try {
      await deleteServiceMutation.mutateAsync({ id: service._id, menuId: service.menuId });
      if (editingServiceId === service._id) resetServiceForm();
      showToast('success', 'Navlink deleted');
    } catch {
      showToast('error', 'Failed to delete navlink');
    }
  }

  return (
    <div className="min-h-[calc(100vh-100px)] w-[calc(100%+12px)] -mt-3 -ml-3 bg-white">
      <div className="bg-white p-6 shadow-md min-h-screen">
        <div className="mb-[20px] border-b-[2px] border-[#293681] pb-[8px]">
          <h1 className="text-[19px] font-bold leading-[1.15] tracking-[-0.018em] text-[#23471d]">Navbar List Management</h1>
          <p className="mt-0.5 text-[12px] font-medium text-[#6c7587]">Create navbar dropdown menus and add service navlinks with image and website path.</p>
        </div>

        <div style={{ zoom: 0.75 }}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            <div className="border-2 border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#DE802B]">
                {editingMenuId ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                {editingMenuId ? 'Edit Navbar Menu' : 'Add Navbar Menu'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Menu Name *</label>
                  <input
                    value={menuForm.name}
                    onChange={(event) => setMenuForm((prev) => ({ ...prev, name: event.target.value, slug: slugify(event.target.value) }))}
                    placeholder="e.g. Home Appliance"
                    className="w-full border-2 border-gray-300 px-3 py-2 text-sm font-semibold outline-none focus:border-[#134698]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Slug</label>
                  <input
                    value={menuForm.slug}
                    onChange={(event) => setMenuForm((prev) => ({ ...prev, slug: slugify(event.target.value) }))}
                    placeholder="home-appliance"
                    className="w-full border-2 border-gray-300 px-3 py-2 text-sm font-semibold outline-none focus:border-[#134698]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Sort Order</label>
                    <input
                      type="number"
                      value={menuForm.sortOrder}
                      onChange={(event) => setMenuForm((prev) => ({ ...prev, sortOrder: Number(event.target.value) }))}
                      className="w-full border-2 border-gray-300 px-3 py-2 text-sm font-semibold outline-none focus:border-[#134698]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Status</label>
                    <select
                      value={menuForm.status}
                      onChange={(event) => setMenuForm((prev) => ({ ...prev, status: event.target.value as NavbarStatus }))}
                      className="w-full border-2 border-gray-300 px-3 py-2 text-sm font-semibold outline-none focus:border-[#134698]"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={saveMenu}
                    disabled={createMenu.isPending || updateMenu.isPending}
                    className="flex flex-1 items-center justify-center gap-2 bg-[#4B1426] py-2 font-bold text-white transition-colors hover:bg-[#3a0f1d] disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    {editingMenuId ? 'Update Menu' : 'Create Menu'}
                  </button>
                  {editingMenuId && (
                    <button
                      type="button"
                      onClick={() => { setEditingMenuId(null); setMenuForm(emptyMenu); }}
                      className="bg-gray-500 px-4 py-2 font-bold text-white transition-colors hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-6 flex gap-3 border border-blue-100 bg-blue-50 p-4">
                <Info className="h-5 w-5 shrink-0 text-blue-600" />
                <p className="text-[10px] font-bold uppercase leading-relaxed text-blue-700">
                  Menus defined here can be used to create website dropdowns like Home Appliance, Home Cleaning, Sofa Cleaning and Pest Control.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="overflow-hidden border-2 border-gray-200 bg-white shadow-sm">
              <div className="border-b bg-[#233D4D] px-6 py-4">
                <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                  <ShieldCheck className="h-5 w-5 text-[#DE802B]" /> Navbar Menu List
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-[#233D4D] text-center text-xs font-bold uppercase tracking-wider text-white">
                      <th className="px-6 py-3 text-left">No.</th>
                      <th className="px-6 py-3 text-left">Menu Name</th>
                      <th className="px-6 py-3">Services</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {menusLoading ? (
                      <tr><td colSpan={5} className="py-10 text-center text-sm text-[#6c7587]">Loading navbar menus...</td></tr>
                    ) : !menus || menus.length === 0 ? (
                      <tr><td colSpan={5} className="py-10 text-center text-sm text-[#6c7587]">No navbar menus yet.</td></tr>
                    ) : (
                      menus.map((menu, index) => (
                        <tr
                          key={menu._id}
                          onClick={() => setSelectedMenuId(menu._id)}
                          className={`cursor-pointer transition-colors hover:bg-gray-50 ${selectedMenuId === menu._id ? 'bg-blue-50/70' : ''}`}
                        >
                          <td className="px-6 py-4 text-[12px] font-bold text-[#3e8914]">{(index + 1).toString().padStart(2, '0')}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Menu className="h-3.5 w-3.5 text-gray-400" />
                              <span className="text-[12px] font-bold uppercase tracking-tighter text-[#4B1426]">{menu.name}</span>
                            </div>
                            <span className="mt-1 block text-[11px] font-bold uppercase text-[#6c7587]">/{menu.slug}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-[11px] font-bold uppercase text-[#6c7587]">
                              {selectedMenu?._id === menu._id ? selectedMenuServices?.length ?? 0 : '—'} Links
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <select
                              key={`${menu._id}-${menu.status}`}
                              value={menu.status}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) => { event.stopPropagation(); changeMenuStatus(menu, event.target.value as NavbarStatus); }}
                              className={`h-[24px] cursor-pointer appearance-none rounded-[4px] px-[8px] pr-[22px] text-[11px] font-bold outline-none bg-no-repeat bg-[right_6px_center] shadow-xs transition ${
                                menu.status === 'ACTIVE'
                                  ? 'bg-[#e8f5e9] text-[#23714a] border border-[#a5d6a7]'
                                  : 'bg-[#fee2e2] text-[#dc2626] border border-[#fca5a5]'
                              }`}
                              style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                              }}
                            >
                              <option value="ACTIVE" className="bg-white text-[#23714a] font-bold">Active</option>
                              <option value="INACTIVE" className="bg-white text-[#dc2626] font-bold">Inactive</option>
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={(event) => { event.stopPropagation(); startEditMenu(menu); }}
                                title="Edit"
                                className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-blue-500/10 text-blue-600 backdrop-blur-md border border-blue-400/30 shadow-[0_2px_6px_rgba(37,99,235,0.12)] transition-all hover:bg-blue-500/20 hover:border-blue-400/50 hover:shadow-[0_3px_10px_rgba(37,99,235,0.25)] hover:scale-105 active:scale-95"
                              >
                                <Edit className="h-4 w-4 text-blue-600" />
                              </button>
                              <button
                                type="button"
                                onClick={(event) => { event.stopPropagation(); deleteMenu(menu); }}
                                title="Delete"
                                className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-red-500/10 text-red-600 backdrop-blur-md border border-red-400/30 shadow-[0_2px_6px_rgba(220,38,38,0.12)] transition-all hover:bg-red-500/20 hover:border-red-400/50 hover:shadow-[0_3px_10px_rgba(220,38,38,0.25)] hover:scale-105 active:scale-95"
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

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="border-2 border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#DE802B]">
              {editingServiceId ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {editingServiceId ? 'Edit Navlink' : 'Add Navlinks'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Selected Menu</label>
                <select
                  value={selectedMenuId}
                  onChange={(event) => { setSelectedMenuId(event.target.value); resetServiceForm(); }}
                  className="w-full border-2 border-gray-300 px-3 py-2 text-sm font-semibold outline-none focus:border-[#134698]"
                >
                  {(menus ?? []).map((menu) => <option key={menu._id} value={menu._id}>{menu.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Service Name *</label>
                <input
                  value={serviceForm.name}
                  onChange={(event) => setServiceForm((prev) => ({ ...prev, name: event.target.value, path: `/services/${slugify(event.target.value)}` }))}
                  placeholder="e.g. Refrigerator Service"
                  className="w-full border-2 border-gray-300 px-3 py-2 text-sm font-semibold outline-none focus:border-[#134698]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Preview Image</label>
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50">
                    {serviceImagePreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={serviceImagePreview} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleServiceImageFile}
                    className="flex-1 border-2 border-gray-300 px-3 py-2 text-xs font-semibold outline-none focus:border-[#134698]"
                  />
                </div>
                <p className="mt-1 text-[10px] text-gray-400">Uploads to Cloudinary — JPG, PNG, or WebP, up to 5 MB.</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Website Path *</label>
                <input
                  value={serviceForm.path}
                  onChange={(event) => setServiceForm((prev) => ({ ...prev, path: event.target.value }))}
                  placeholder="/services/refrigerator-service"
                  className="w-full border-2 border-gray-300 px-3 py-2 text-sm font-semibold outline-none focus:border-[#134698]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Sort Order</label>
                  <input
                    type="number"
                    value={serviceForm.sortOrder}
                    onChange={(event) => setServiceForm((prev) => ({ ...prev, sortOrder: Number(event.target.value) }))}
                    className="w-full border-2 border-gray-300 px-3 py-2 text-sm font-semibold outline-none focus:border-[#134698]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Status</label>
                  <select
                    value={serviceForm.status}
                    onChange={(event) => setServiceForm((prev) => ({ ...prev, status: event.target.value as NavbarStatus }))}
                    className="w-full border-2 border-gray-300 px-3 py-2 text-sm font-semibold outline-none focus:border-[#134698]"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveService}
                  disabled={!selectedMenu || createService.isPending || updateService.isPending || imageUpload.isPending}
                  className="flex flex-1 items-center justify-center gap-2 bg-[#4B1426] py-2 font-bold text-white transition-colors hover:bg-[#3a0f1d] disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {editingServiceId ? 'Update Navlink' : 'Add Navlink'}
                </button>
                {editingServiceId && (
                  <button
                    type="button"
                    onClick={resetServiceForm}
                    className="bg-gray-500 px-4 py-2 font-bold text-white transition-colors hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="overflow-hidden border-2 border-gray-200 bg-white shadow-sm">
              <div className="border-b bg-[#233D4D] px-6 py-4">
                <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                  <LinkIcon className="h-5 w-5 text-[#DE802B]" /> {selectedMenu?.name ?? 'Navbar'} Services List
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-[#233D4D] text-center text-xs font-bold uppercase tracking-wider text-white">
                      <th className="px-6 py-3 text-left">No.</th>
                      <th className="px-6 py-3 text-left">Image</th>
                      <th className="px-6 py-3 text-left">Service Name</th>
                      <th className="px-6 py-3 text-left">Path</th>
                      <th className="px-6 py-3">Order</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {servicesLoading ? (
                      <tr><td colSpan={7} className="py-10 text-center text-sm text-[#6c7587]">Loading navlinks...</td></tr>
                    ) : !selectedMenuServices || selectedMenuServices.length === 0 ? (
                      <tr><td colSpan={7} className="py-10 text-center text-sm text-[#6c7587]">No navlinks under this menu yet.</td></tr>
                    ) : (
                      selectedMenuServices.map((service, index) => (
                        <tr key={service._id} className="transition-colors hover:bg-gray-50">
                          <td className="px-6 py-4 text-[12px] font-bold text-[#3e8914]">{(index + 1).toString().padStart(2, '0')}</td>
                          <td className="px-6 py-4">
                            <div className="flex h-10 w-14 items-center justify-center overflow-hidden border-2 border-gray-200 bg-gray-50">
                              {service.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={service.image} alt={service.name} className="h-full w-full object-cover" />
                              ) : (
                                <ImageIcon className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[12px] font-bold uppercase tracking-tighter text-[#4B1426]">{service.name}</span>
                          </td>
                          <td className="px-6 py-4 text-[11px] font-medium text-[#334155]">{service.path}</td>
                          <td className="px-6 py-4 text-center text-[11px] font-bold uppercase text-[#6c7587]">#{service.sortOrder}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex border px-3 py-1 text-[11px] font-bold uppercase ${
                              service.status === 'ACTIVE' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'
                            }`}>
                              {service.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => startEditService(service)}
                                title="Edit"
                                className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-blue-500/10 text-blue-600 backdrop-blur-md border border-blue-400/30 shadow-[0_2px_6px_rgba(37,99,235,0.12)] transition-all hover:bg-blue-500/20 hover:border-blue-400/50 hover:shadow-[0_3px_10px_rgba(37,99,235,0.25)] hover:scale-105 active:scale-95"
                              >
                                <Edit className="h-4 w-4 text-blue-600" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteService(service)}
                                title="Delete"
                                className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-red-500/10 text-red-600 backdrop-blur-md border border-red-400/30 shadow-[0_2px_6px_rgba(220,38,38,0.12)] transition-all hover:bg-red-500/20 hover:border-red-400/50 hover:shadow-[0_3px_10px_rgba(220,38,38,0.25)] hover:scale-105 active:scale-95"
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
        </div>
      </div>
    </div>
  );
}
