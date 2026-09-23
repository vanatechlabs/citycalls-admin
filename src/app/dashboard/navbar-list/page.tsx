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

type MenuStatus = 'Active' | 'Inactive';

interface NavbarService {
  id: string;
  menuId: string;
  name: string;
  image: string;
  path: string;
  sortOrder: number;
  status: MenuStatus;
}

interface NavbarMenu {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  status: MenuStatus;
  addedOn: string;
}

const defaultMenus: NavbarMenu[] = [
  {
    id: 'home-appliance',
    name: 'Home Appliance',
    slug: 'home-appliance',
    sortOrder: 1,
    status: 'Active',
    addedOn: '23 Sept 2026',
  },
  {
    id: 'home-cleaning',
    name: 'Home Cleaning',
    slug: 'home-cleaning',
    sortOrder: 2,
    status: 'Active',
    addedOn: '23 Sept 2026',
  },
  {
    id: 'sofa-cleaning',
    name: 'Sofa Cleaning',
    slug: 'sofa-cleaning',
    sortOrder: 3,
    status: 'Active',
    addedOn: '23 Sept 2026',
  },
  {
    id: 'pest-control',
    name: 'Pest Control',
    slug: 'pest-control',
    sortOrder: 4,
    status: 'Active',
    addedOn: '23 Sept 2026',
  },
];

const defaultServices: NavbarService[] = [
  { id: 'refrigerator-service', menuId: 'home-appliance', name: 'Refrigerator Service', image: '/assets/Services/s1.png', path: '/services/refrigerator-service', sortOrder: 1, status: 'Active' },
  { id: 'ac-service', menuId: 'home-appliance', name: 'AC Service', image: '/assets/Services/s2.png', path: '/services/ac-service', sortOrder: 2, status: 'Active' },
  { id: 'washing-machine-services', menuId: 'home-appliance', name: 'Washing Machine Services', image: '/assets/Services/s3.png', path: '/services/washing-machine-services', sortOrder: 3, status: 'Active' },
  { id: 'television-repair-services', menuId: 'home-appliance', name: 'Television Repair Services', image: '/assets/Services/s4.png', path: '/services/television-repair-services', sortOrder: 4, status: 'Active' },
  { id: 'microwave-oven-services', menuId: 'home-appliance', name: 'Microwave & Oven Services', image: '/assets/Services/s5.png', path: '/services/microwave-oven-services', sortOrder: 5, status: 'Active' },
  { id: 'geyser-repair-services', menuId: 'home-appliance', name: 'Geyser Repair Services', image: '/assets/Services/s6.png', path: '/services/geyser-repair-services', sortOrder: 6, status: 'Active' },
  { id: 'chimney-repair-services', menuId: 'home-appliance', name: 'Chimney Repair Services', image: '/assets/Services/s7.png', path: '/services/chimney-repair-services', sortOrder: 7, status: 'Active' },
  { id: 'bathroom-cleaning', menuId: 'home-cleaning', name: 'Bathroom Cleaning', image: '/assets/Services/s10.png', path: '/services/bathroom-cleaning', sortOrder: 1, status: 'Active' },
  { id: 'kitchen-cleaning', menuId: 'home-cleaning', name: 'Kitchen Cleaning', image: '/assets/Services/s11.png', path: '/services/kitchen-cleaning', sortOrder: 2, status: 'Active' },
  { id: 'full-home-cleaning', menuId: 'home-cleaning', name: 'Full Home Cleaning', image: '/assets/Services/s12.png', path: '/services/full-home-cleaning', sortOrder: 3, status: 'Active' },
  { id: 'fabric-sofa-cleaning', menuId: 'sofa-cleaning', name: 'Fabric Sofa Cleaning', image: '/assets/Services/s10.png', path: '/services/fabric-sofa-cleaning', sortOrder: 1, status: 'Active' },
  { id: 'leather-sofa-cleaning', menuId: 'sofa-cleaning', name: 'Leather Sofa Cleaning', image: '/assets/Services/s11.png', path: '/services/leather-sofa-cleaning', sortOrder: 2, status: 'Active' },
  { id: 'general-pest-control', menuId: 'pest-control', name: 'General Pest Control', image: '/assets/Services/s8.png', path: '/services/general-pest-control', sortOrder: 1, status: 'Active' },
  { id: 'termite-control', menuId: 'pest-control', name: 'Termite Control', image: '/assets/Services/s8.png', path: '/services/termite-control', sortOrder: 2, status: 'Active' },
  { id: 'cockroach-control', menuId: 'pest-control', name: 'Cockroach Control', image: '/assets/Services/s8.png', path: '/services/cockroach-control', sortOrder: 3, status: 'Active' },
];

const emptyMenu = {
  name: '',
  slug: '',
  sortOrder: 0,
  status: 'Active' as MenuStatus,
};

const emptyService = {
  name: '',
  image: '',
  path: '',
  sortOrder: 0,
  status: 'Active' as MenuStatus,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function NavbarListPage() {
  const [menus, setMenus] = useState<NavbarMenu[]>(defaultMenus);
  const [services, setServices] = useState<NavbarService[]>(defaultServices);
  const [selectedMenuId, setSelectedMenuId] = useState(defaultMenus[0]?.id ?? '');
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [menuForm, setMenuForm] = useState(emptyMenu);
  const [serviceForm, setServiceForm] = useState(emptyService);

  const selectedMenu = menus.find((menu) => menu.id === selectedMenuId) ?? menus[0];
  const selectedMenuServices = useMemo(
    () => services.filter((service) => service.menuId === selectedMenu?.id).sort((a, b) => a.sortOrder - b.sortOrder),
    [selectedMenu, services]
  );

  function saveMenu() {
    if (!menuForm.name.trim()) {
      void Swal.fire({ icon: 'warning', title: 'Missing Field', text: 'Please enter menu name', confirmButtonColor: '#134698' });
      return;
    }

    const id = slugify(menuForm.slug || menuForm.name);
    const payload: NavbarMenu = {
      id,
      name: menuForm.name.trim(),
      slug: id,
      sortOrder: menuForm.sortOrder,
      status: menuForm.status,
      addedOn: '23 Sept 2026',
    };

    setMenus((prev) => {
      if (editingMenuId) {
        return prev.map((menu) => (menu.id === editingMenuId ? payload : menu));
      }
      return [...prev, payload];
    });
    setSelectedMenuId(id);
    setEditingMenuId(null);
    setMenuForm(emptyMenu);
    void Swal.fire({ icon: 'success', title: editingMenuId ? 'Navbar menu updated' : 'Navbar menu created', timer: 1300, showConfirmButton: false });
  }

  function startEditMenu(menu: NavbarMenu) {
    setEditingMenuId(menu.id);
    setMenuForm({
      name: menu.name,
      slug: menu.slug,
      sortOrder: menu.sortOrder,
      status: menu.status,
    });
    setSelectedMenuId(menu.id);
  }

  function changeMenuStatus(menu: NavbarMenu, newStatus: MenuStatus) {
    if (menu.status === newStatus) return;
    setMenus((prev) => prev.map((item) => (item.id === menu.id ? { ...item, status: newStatus } : item)));
    void Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `"${menu.name}" status changed to ${newStatus}`,
      timer: 2000,
      showConfirmButton: false,
    });
  }

  function deleteMenu(menu: NavbarMenu) {
    setMenus((prev) => prev.filter((item) => item.id !== menu.id));
    setServices((prev) => prev.filter((item) => item.menuId !== menu.id));
    setSelectedMenuId((current) => (current === menu.id ? menus.find((item) => item.id !== menu.id)?.id ?? '' : current));
    void Swal.fire({ icon: 'success', title: 'Navbar menu deleted', timer: 1200, showConfirmButton: false });
  }

  function saveService() {
    if (!selectedMenu) return;
    if (!serviceForm.name.trim() || !serviceForm.path.trim()) {
      void Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Please enter service name and path', confirmButtonColor: '#134698' });
      return;
    }

    const id = editingServiceId ?? `${selectedMenu.id}-${slugify(serviceForm.name)}`;
    const payload: NavbarService = {
      id,
      menuId: selectedMenu.id,
      name: serviceForm.name.trim(),
      image: serviceForm.image.trim() || '/assets/Services/s1.png',
      path: serviceForm.path.trim(),
      sortOrder: serviceForm.sortOrder,
      status: serviceForm.status,
    };

    setServices((prev) => {
      if (editingServiceId) {
        return prev.map((service) => (service.id === editingServiceId ? payload : service));
      }
      return [...prev, payload];
    });
    setEditingServiceId(null);
    setServiceForm(emptyService);
    void Swal.fire({ icon: 'success', title: editingServiceId ? 'Navlink updated' : 'Navlink added', timer: 1300, showConfirmButton: false });
  }

  function startEditService(service: NavbarService) {
    setEditingServiceId(service.id);
    setSelectedMenuId(service.menuId);
    setServiceForm({
      name: service.name,
      image: service.image,
      path: service.path,
      sortOrder: service.sortOrder,
      status: service.status,
    });
  }

  function handleServiceImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setServiceForm((prev) => ({ ...prev, image: previewUrl }));
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
                      onChange={(event) => setMenuForm((prev) => ({ ...prev, status: event.target.value as MenuStatus }))}
                      className="w-full border-2 border-gray-300 px-3 py-2 text-sm font-semibold outline-none focus:border-[#134698]"
                    >
                      <option>Active</option>
                      <option>Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={saveMenu}
                    className="flex flex-1 items-center justify-center gap-2 bg-[#4B1426] py-2 font-bold text-white transition-colors hover:bg-[#3a0f1d]"
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
                    {menus.map((menu, index) => (
                      <tr
                        key={menu.id}
                        onClick={() => setSelectedMenuId(menu.id)}
                        className={`cursor-pointer transition-colors hover:bg-gray-50 ${selectedMenuId === menu.id ? 'bg-blue-50/70' : ''}`}
                      >
                        <td className="px-6 py-4 font-bold text-[#3e8914]">{(index + 1).toString().padStart(2, '0')}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Menu className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-sm font-bold uppercase tracking-tighter text-[#4B1426]">{menu.name}</span>
                          </div>
                          <span className="mt-1 block text-[10px] font-bold uppercase text-[#6c7587]">/{menu.slug}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-[10px] font-bold uppercase text-[#6c7587]">
                            {services.filter((service) => service.menuId === menu.id).length} Links
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <select
                            key={`${menu.id}-${menu.status}`}
                            value={menu.status}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => { event.stopPropagation(); changeMenuStatus(menu, event.target.value as MenuStatus); }}
                            className={`h-[24px] cursor-pointer appearance-none rounded-[4px] px-[8px] pr-[22px] text-[10px] font-bold outline-none bg-no-repeat bg-[right_6px_center] shadow-xs transition ${
                              menu.status === 'Active'
                                ? 'bg-[#e8f5e9] text-[#23714a] border border-[#a5d6a7]'
                                : 'bg-[#fee2e2] text-[#dc2626] border border-[#fca5a5]'
                            }`}
                            style={{
                              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                            }}
                          >
                            <option value="Active" className="bg-white text-[#23714a] font-bold">Active</option>
                            <option value="Inactive" className="bg-white text-[#dc2626] font-bold">Inactive</option>
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
                    ))}
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
                  onChange={(event) => setSelectedMenuId(event.target.value)}
                  className="w-full border-2 border-gray-300 px-3 py-2 text-sm font-semibold outline-none focus:border-[#134698]"
                >
                  {menus.map((menu) => <option key={menu.id} value={menu.id}>{menu.name}</option>)}
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
                <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Image Path / Uploaded URL</label>
                <input
                  value={serviceForm.image}
                  onChange={(event) => setServiceForm((prev) => ({ ...prev, image: event.target.value }))}
                  placeholder="/assets/Services/s1.png"
                  className="w-full border-2 border-gray-300 px-3 py-2 text-sm font-semibold outline-none focus:border-[#134698]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Upload Image</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleServiceImageUpload}
                  className="w-full border-2 border-gray-300 px-3 py-2 text-sm font-semibold outline-none focus:border-[#134698]"
                />
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
                    onChange={(event) => setServiceForm((prev) => ({ ...prev, status: event.target.value as MenuStatus }))}
                    className="w-full border-2 border-gray-300 px-3 py-2 text-sm font-semibold outline-none focus:border-[#134698]"
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>
              </div>
              <button
                type="button"
                onClick={saveService}
                className="flex w-full items-center justify-center gap-2 bg-[#4B1426] py-2 font-bold text-white transition-colors hover:bg-[#3a0f1d]"
              >
                <Save className="h-4 w-4" />
                {editingServiceId ? 'Update Navlink' : 'Add Navlink'}
              </button>
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
                    {selectedMenuServices.map((service, index) => (
                      <tr key={service.id} className="transition-colors hover:bg-gray-50">
                        <td className="px-6 py-4 font-bold text-[#3e8914]">{(index + 1).toString().padStart(2, '0')}</td>
                        <td className="px-6 py-4">
                          <div className="flex h-10 w-14 items-center justify-center overflow-hidden border-2 border-gray-200 bg-gray-50">
                            {service.image.startsWith('blob:') || service.image.startsWith('http') ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={service.image} alt={service.name} className="h-full w-full object-cover" />
                            ) : (
                              <ImageIcon className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold uppercase tracking-tighter text-[#4B1426]">{service.name}</span>
                          <span className="mt-1 block text-[10px] font-bold text-[#6c7587]">{service.image}</span>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-[#334155]">{service.path}</td>
                        <td className="px-6 py-4 text-center text-[10px] font-bold uppercase text-[#6c7587]">#{service.sortOrder}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex border px-3 py-1 text-[10px] font-bold uppercase ${
                            service.status === 'Active' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'
                          }`}>
                            {service.status}
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
                              onClick={() => setServices((prev) => prev.filter((item) => item.id !== service.id))}
                              title="Delete"
                              className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-red-500/10 text-red-600 backdrop-blur-md border border-red-400/30 shadow-[0_2px_6px_rgba(220,38,38,0.12)] transition-all hover:bg-red-500/20 hover:border-red-400/50 hover:shadow-[0_3px_10px_rgba(220,38,38,0.25)] hover:scale-105 active:scale-95"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
