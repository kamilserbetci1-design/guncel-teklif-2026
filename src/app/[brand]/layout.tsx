'use client';

import { useParams, useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { getBrand, VALID_BRAND_IDS } from '@/lib/brands';
import { useAppStore } from '@/lib/store';
import { LayoutDashboard, FileText, Package, Users, Upload, ArrowLeft, Menu, X, Tag, ClipboardList, Wallet, Boxes, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { MutProLogin } from '@/components/MutProLogin';

export default function BrandLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const brandId = params.brand as string;
  const brand = getBrand(brandId);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const hasHydrated = useAppStore((s) => s._hasHydrated);
  const [mutproAuth, setMutproAuth] = useState<'loading' | 'ok' | 'login' | 'setup' | 'error'>(
    brandId === 'mutpro' ? 'loading' : 'ok'
  );
  const [mutproAuthError, setMutproAuthError] = useState('');

  const checkMutproAuth = useCallback(async () => {
    if (brandId !== 'mutpro') { setMutproAuth('ok'); return; }
    try {
      const res = await fetch('/api/cari/auth', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setMutproAuthError(data.error || 'Sunucu hatası');
        setMutproAuth('error');
        return;
      }
      if (data.authenticated) setMutproAuth('ok');
      else setMutproAuth(data.setupRequired ? 'setup' : 'login');
    } catch {
      setMutproAuthError('Sunucuya ulaşılamadı.');
      setMutproAuth('error');
    }
  }, [brandId]);

  useEffect(() => {
    checkMutproAuth();
  }, [checkMutproAuth, pathname]);

  useEffect(() => {
    if (!(VALID_BRAND_IDS as readonly string[]).includes(brandId)) {
      router.push('/');
    }
  }, [brandId, router]);

  const navItems = [
    { href: `/${brandId}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
    { href: `/${brandId}/teklif/yeni`, label: 'Yeni Teklif', icon: FileText },
    { href: `/${brandId}/teklifler`, label: 'Teklif Geçmişi', icon: Package },
    { href: `/${brandId}/musteriler`, label: 'Müşteriler', icon: Users },
    { href: `/${brandId}/urunler`, label: 'Ürün Yönetimi', icon: Upload },
    { href: `/${brandId}/siparisler`, label: 'Sipariş Takip', icon: ClipboardList },
    { href: `/${brandId}/kargo-etiket`, label: 'Kargo Etiketi', icon: Tag },
    // Cari Takip ve Stok Yönetimi yalnızca MutPro markasında görünür
    ...(brandId === 'mutpro'
      ? [
          { href: `/${brandId}/cari`, label: 'Cari Takip', icon: Wallet },
          { href: `/${brandId}/stok`, label: 'Stok Yönetimi', icon: Boxes },
        ]
      : []),
  ];

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  if (!brand) return null;

  if (brandId === 'mutpro' && mutproAuth !== 'ok') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F4F1EA' }}>
        {mutproAuth === 'loading' && (
          <div className="flex items-center text-gray-400 text-sm">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Kontrol ediliyor...
          </div>
        )}
        {mutproAuth === 'error' && (
          <div className="max-w-sm mx-auto bg-white rounded-2xl border border-amber-200 p-8 text-center">
            <p className="text-sm text-gray-600 mb-4">{mutproAuthError}</p>
            <button onClick={checkMutproAuth} className="px-5 py-2.5 rounded-lg text-white text-sm font-bold" style={{ background: '#040023' }}>
              Tekrar Dene
            </button>
          </div>
        )}
        {(mutproAuth === 'login' || mutproAuth === 'setup') && (
          <MutProLogin
            setupRequired={mutproAuth === 'setup'}
            title="MutPro Paneli"
            onSuccess={() => setMutproAuth('ok')}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col`}>
        <div className={`p-4 border-b border-gray-200 ${brand.sidebarBg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {brand.logo ? (
                brandId === 'inoks' || brandId === 'mutpro' ? (
                  <div className="bg-white rounded-md px-2 py-1.5 shadow-sm">
                    <img
                      src={brand.logo}
                      alt={brand.name}
                      className="h-9 w-auto max-w-[188px] object-contain object-left"
                      onError={(e) => {
                        const t = e.target as HTMLImageElement;
                        t.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <img
                    src={brand.logo}
                    alt={brand.name}
                    className="h-10 object-contain brightness-0 invert"
                    onError={(e) => {
                      const t = e.target as HTMLImageElement;
                      t.style.display = 'none';
                    }}
                  />
                )
              ) : (
                <span className="text-white text-sm font-extrabold tracking-wide">{brand.fullName}</span>
              )}
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? `${brand.bgColor} ${brand.textColor}`
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-200">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Marka Değiştir
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between lg:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="text-sm text-gray-500 font-medium">
            {brand.fullName} • Teklif Yönetim Paneli
          </div>
          <div className="w-8 lg:w-0" />
        </header>
        <div className="p-4 lg:p-6">
          {hasHydrated ? children : (
            <div className="flex items-center justify-center py-20">
              <div className="text-gray-400 text-sm animate-pulse">Veriler yükleniyor...</div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
