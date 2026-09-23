'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getBrand } from '@/lib/brands';
import {
  CariAccount,
  CariTransaction,
  CariType,
  CariUser,
  currencyFmt,
  dateFmt,
  PAYMENT_METHODS,
  PAYMENT_METHOD_SHORT,
  isDebtType,
  isPaymentType,
  isOverdueDueDate,
} from '@/lib/cari-types';
import { foldedIncludes } from '@/lib/product-search';
import { MutProLogin } from '@/components/MutProLogin';
import {
  LogOut, Plus, Pencil, Trash2, Search, Settings, Bolt, X, FileDown,
  Printer, Upload, Users, ArrowLeft, TrendingUp, TrendingDown, KeyRound, UserPlus,
  Wallet, ChevronRight, Loader2, ShieldCheck, Paperclip, FileText, Loader, CalendarClock,
} from 'lucide-react';

const MUTPRO_LOGO = '/logos/mutpro-mavi-logo.jpeg';
const NAVY = '#040023';
const ORANGE = '#f97316';
const CREAM = '#F4F1EA';

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((s) => s[0]?.toUpperCase() || '').join('') || '?';
}

type Panel = 'dashboard' | 'detail';

export default function CariPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.brand as string;
  const brand = getBrand(brandId);

  // Sadece MutPro
  useEffect(() => {
    if (brandId !== 'mutpro') router.replace(`/${brandId}/dashboard`);
  }, [brandId, router]);

  // --- Auth state ---
  const [authLoading, setAuthLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [me, setMe] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/cari/auth', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setConfigError(data.error || 'Sunucu hatası');
        setAuthLoading(false);
        return;
      }
      setConfigError(null);
      setAuthed(!!data.authenticated);
      setSetupRequired(!!data.setupRequired);
      setMe(data.username || null);
    } catch {
      setConfigError('Sunucuya ulaşılamadı.');
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    if (brandId === 'mutpro') checkAuth();
  }, [brandId, checkAuth]);

  if (brandId !== 'mutpro') return null;

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-32 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Yükleniyor...
      </div>
    );
  }

  if (configError) {
    return <ConfigErrorScreen message={configError} onRetry={checkAuth} />;
  }

  if (!authed) {
    return (
      <div className="-m-4 lg:-m-6 min-h-[calc(100vh-57px)] flex items-center" style={{ background: CREAM }}>
        <MutProLogin
          setupRequired={setupRequired}
          title="Cari Takip"
          onSuccess={() => { setAuthed(true); checkAuth(); }}
        />
      </div>
    );
  }

  return <CariApp me={me} onLogout={() => { setAuthed(false); setMe(null); }} />;
}

/* ============================ CONFIG ERROR ============================ */
function ConfigErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="max-w-lg mx-auto mt-16 bg-white rounded-2xl border border-amber-200 shadow-sm p-8 text-center">
      <div className="w-14 h-14 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-4">
        <ShieldCheck className="w-7 h-7 text-amber-600" />
      </div>
      <h2 className="text-lg font-bold text-gray-800 mb-2">Cari Takip Kurulumu Gerekli</h2>
      <p className="text-sm text-gray-500 mb-4">{message}</p>
      <div className="text-left text-xs bg-gray-50 rounded-lg p-4 text-gray-600 space-y-1 mb-4">
        <p>1. Supabase’de <code className="bg-gray-200 px-1 rounded">supabase-cari-migration.sql</code> dosyasını çalıştırın.</p>
        <p>2. <code className="bg-gray-200 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> ortam değişkenini ekleyin (.env.local ve Vercel).</p>
      </div>
      <button onClick={onRetry} className="px-5 py-2.5 rounded-lg text-white text-sm font-bold" style={{ background: NAVY }}>
        Tekrar Dene
      </button>
    </div>
  );
}

/* ============================ ANA UYGULAMA ============================ */
function CariApp({ me, onLogout }: { me: string | null; onLogout: () => void }) {
  const [accounts, setAccounts] = useState<CariAccount[]>([]);
  const [transactions, setTransactions] = useState<CariTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState<Panel>('dashboard');
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const [customerModal, setCustomerModal] = useState<{ open: boolean; edit?: CariAccount }>(() => ({ open: false }));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const restoreRef = useRef<HTMLInputElement>(null);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cari/accounts', { cache: 'no-store' });
      if (res.status === 401) { onLogout(); return; }
      const data = await res.json();
      setAccounts(data.accounts || []);
      setTransactions((data.transactions || []).map((t: any) => ({ ...t, amount: Number(t.amount) })));
    } catch {
      showToast('Veriler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => { loadData(); }, [loadData]);

  const logout = async () => {
    await fetch('/api/cari/auth', { method: 'DELETE' });
    window.location.reload();
  };

  const current = accounts.find((a) => a.id === currentId) || null;

  const openDetail = (id: number) => { setCurrentId(id); setPanel('detail'); };
  const backToDash = () => { setCurrentId(null); setPanel('dashboard'); };

  const saveCustomer = async (rec: Partial<CariAccount>) => {
    const res = await fetch('/api/cari/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rec),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Kaydedilemedi.'); return; }
    await loadData();
    setCustomerModal({ open: false });
    showToast(rec.id ? 'Cari kart güncellendi.' : 'Yeni cari kart eklendi.');
    if (!rec.id && data.id) openDetail(data.id);
  };

  const deleteCustomer = async (id: number) => {
    if (!confirm('DİKKAT! Bu cari kart ve tüm hareketleri kalıcı olarak silinecek. Emin misiniz?')) return;
    const res = await fetch(`/api/cari/accounts?id=${id}`, { method: 'DELETE' });
    if (!res.ok) { showToast('Silinemedi.'); return; }
    await loadData();
    backToDash();
    showToast('Cari kart silindi.');
  };

  const saveTransaction = async (rec: Partial<CariTransaction>) => {
    const res = await fetch('/api/cari/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rec),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Kaydedilemedi.'); return false; }
    await loadData();
    showToast(rec.id ? 'İşlem güncellendi.' : 'İşlem kaydedildi.');
    return true;
  };

  const deleteTransaction = async (id: number) => {
    if (!confirm('Bu işlemi kalıcı olarak silmek istiyor musunuz?')) return;
    const res = await fetch(`/api/cari/transactions?id=${id}`, { method: 'DELETE' });
    if (!res.ok) { showToast('Silinemedi.'); return; }
    await loadData();
    showToast('İşlem silindi.');
  };

  const backup = () => {
    const customers = accounts.map((a) => ({
      id: a.id, name: a.name, phone: a.phone, taxInfo: a.tax_info, address: a.address,
    }));
    const trans = transactions.map((t) => ({
      id: t.id, customerId: t.account_id, date: t.date, desc: t.description,
      type: t.type, amount: t.amount, paymentMethod: t.payment_method, installments: t.installments,
      dueDate: t.due_date || null,
    }));
    const blob = new Blob([JSON.stringify({ customers, transactions: trans, exportDate: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CariYedek_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Yedek indirildi.');
  };

  const restore = async (file: File) => {
    if (!confirm('Yedek dosyadaki cari kart ve hareketler sisteme aktarılacak (mevcutlar korunur, aynı ID’ler güncellenir). Devam edilsin mi?')) return;
    showToast('Yedek aktarılıyor, lütfen bekleyin...');
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch('/api/cari/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Aktarım başarısız.'); return; }
      await loadData();
      showToast(`Aktarıldı: ${data.accounts} cari, ${data.transactions} hareket.`);
    } catch (e: any) {
      showToast('Dosya okunamadı: ' + (e?.message || ''));
    }
  };

  return (
    <div className="-m-4 lg:-m-6 min-h-[calc(100vh-57px)]" style={{ background: CREAM }}>
      {/* Üst araç çubuğu */}
      <div className="sticky top-[57px] z-20 px-4 lg:px-6 py-2.5 flex items-center justify-between gap-2 flex-wrap text-white" style={{ background: NAVY }}>
        <div className="flex items-center gap-3">
          <button type="button" onClick={backToDash} className="bg-white rounded-md px-2 py-1 shadow-sm">
            <img src={MUTPRO_LOGO} alt="MutPro" className="h-7 w-auto object-contain" />
          </button>
          <div className="hidden sm:block">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">MutPro</div>
            <div className="text-sm font-semibold tracking-tight">Cari Takip</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <ToolBtn dark onClick={backToDash} icon={<Users className="w-4 h-4" />} label="Panel" />
          <ToolBtn dark onClick={backup} icon={<FileDown className="w-4 h-4" />} label="Yedekle" tone="blue" />
          <ToolBtn dark onClick={() => restoreRef.current?.click()} icon={<Upload className="w-4 h-4" />} label="Yükle" tone="purple" />
          <input ref={restoreRef} type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) restore(f); e.target.value = ''; }} />
          <div className="w-px h-5 bg-white/20 mx-1" />
          <ToolBtn dark onClick={() => setSettingsOpen(true)} icon={<Settings className="w-4 h-4" />} label="Ayarlar" />
          <ToolBtn dark onClick={logout} icon={<LogOut className="w-4 h-4" />} label="Çıkış" tone="red" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cari veriler yükleniyor...
        </div>
      ) : panel === 'dashboard' ? (
        <Dashboard
          accounts={accounts}
          transactions={transactions}
          onOpen={openDetail}
          onAdd={() => setCustomerModal({ open: true })}
        />
      ) : current ? (
        <CustomerDetail
          account={current}
          transactions={transactions}
          onSaveTransaction={saveTransaction}
          onDeleteTransaction={deleteTransaction}
          onEditCustomer={() => setCustomerModal({ open: true, edit: current })}
          onDeleteCustomer={() => deleteCustomer(current.id)}
          onBack={backToDash}
          showToast={showToast}
          onReload={loadData}
        />
      ) : null}

      {customerModal.open && (
        <CustomerModal
          edit={customerModal.edit}
          onClose={() => setCustomerModal({ open: false })}
          onSave={saveCustomer}
        />
      )}

      {settingsOpen && <SettingsModal me={me} onClose={() => setSettingsOpen(false)} showToast={showToast} />}

      {toast && (
        <div className="fixed bottom-6 right-6 text-white px-5 py-3.5 rounded-xl shadow-2xl z-50 flex items-center gap-3 text-sm font-medium" style={{ background: NAVY }}>
          <span className="w-1.5 h-8 rounded-full" style={{ background: ORANGE }} />
          {toast}
        </div>
      )}
    </div>
  );
}

function ToolBtn({ onClick, icon, label, tone, dark }: { onClick: () => void; icon: React.ReactNode; label: string; tone?: 'blue' | 'purple' | 'red'; dark?: boolean }) {
  const tones: Record<string, string> = dark
    ? {
        blue: 'text-sky-200 bg-white/10 border-white/10 hover:bg-white/15',
        purple: 'text-violet-200 bg-white/10 border-white/10 hover:bg-white/15',
        red: 'text-rose-200 bg-white/10 border-white/10 hover:bg-rose-500/30',
      }
    : {
        blue: 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100',
        purple: 'text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100',
        red: 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100',
      };
  const cls = tone
    ? tones[tone]
    : dark
      ? 'text-white/90 bg-white/10 border-white/10 hover:bg-white/15'
      : 'text-gray-700 bg-white border-gray-200 hover:bg-gray-50';
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-lg transition-colors ${cls}`}>
      {icon}<span className="hidden md:inline">{label}</span>
    </button>
  );
}

/* ============================ DASHBOARD ============================ */
function Dashboard({ accounts, transactions, onOpen, onAdd }: {
  accounts: CariAccount[];
  transactions: CariTransaction[];
  onOpen: (id: number) => void;
  onAdd: () => void;
}) {
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    return accounts.map((acc) => {
      let debt = 0, credit = 0, overdue = 0;
      transactions.forEach((t) => {
        if (t.account_id !== acc.id) return;
        if (isDebtType(t.type)) debt += t.amount; else credit += t.amount;
        if (isOverdueDueDate(t.due_date)) overdue += 1;
      });
      return { ...acc, debt, credit, balance: debt - credit, overdue };
    });
  }, [accounts, transactions]);

  const filtered = useMemo(() => {
    return rows
      .filter((r) => foldedIncludes(r.name, search))
      .sort((a, b) => {
        const az = a.balance === 0 ? 0 : 1;
        const bz = b.balance === 0 ? 0 : 1;
        if (bz !== az) return bz - az;
        return Math.abs(b.balance) - Math.abs(a.balance);
      });
  }, [rows, search]);

  const totals = useMemo(() => {
    let receivable = 0, payable = 0, sumDebt = 0, sumCredit = 0, sumBalance = 0;
    rows.forEach((r) => {
      if (r.balance > 0) payable += r.balance; else receivable += Math.abs(r.balance);
      sumDebt += r.debt; sumCredit += r.credit; sumBalance += r.balance;
    });
    return { receivable, payable, sumDebt, sumCredit, sumBalance };
  }, [rows]);

  return (
    <div className="p-4 lg:p-7 space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: ORANGE }}>Finans</p>
          <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: NAVY }}>Cari bakiyeler</h2>
          <p className="text-sm text-gray-500 mt-1">En büyük alacak ve borçlar üstte</p>
        </div>
        <button onClick={onAdd} className="flex items-center gap-2 text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow-sm" style={{ background: ORANGE }}>
          <Plus className="w-4 h-4" /> Yeni Cari Kart
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-black/[0.06] shadow-[0_8px_30px_-20px_rgba(4,0,35,0.35)] relative overflow-hidden">
          <div className="absolute left-0 top-0 h-full w-1.5 bg-emerald-500" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2 pl-2">
            <span className="bg-emerald-50 text-emerald-700 p-1.5 rounded-md"><TrendingUp className="w-4 h-4" /></span> Bizim alacaklarımız
          </span>
          <h3 className="text-3xl font-extrabold mt-4 pl-2" style={{ color: NAVY }}>{currencyFmt.format(totals.receivable)}</h3>
          <p className="text-xs text-gray-400 mt-2 pl-2">Toplam tahsil edilecek tutar</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-black/[0.06] shadow-[0_8px_30px_-20px_rgba(4,0,35,0.35)] relative overflow-hidden">
          <div className="absolute left-0 top-0 h-full w-1.5 bg-rose-500" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2 pl-2">
            <span className="bg-rose-50 text-rose-700 p-1.5 rounded-md"><TrendingDown className="w-4 h-4" /></span> Bizim borçlarımız
          </span>
          <h3 className="text-3xl font-extrabold mt-4 pl-2" style={{ color: NAVY }}>{currencyFmt.format(totals.payable)}</h3>
          <p className="text-xs text-gray-400 mt-2 pl-2">Toplam ödenecek tutar</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-black/[0.06] shadow-[0_8px_30px_-20px_rgba(4,0,35,0.35)] overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-bold flex items-center gap-2" style={{ color: NAVY }}><Users className="w-4 h-4 text-gray-400" /> Tüm cari bakiyeler</h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari ara..."
              className="pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg w-56 bg-[#F4F1EA]/60 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none" />
          </div>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[10px] uppercase tracking-[0.14em] font-bold text-white/55" style={{ background: NAVY }}>
              <tr>
                <th className="p-3.5 font-bold">Cari Adı</th>
                <th className="p-3.5 text-right font-bold">Top. Borç</th>
                <th className="p-3.5 text-right font-bold">Top. Alacak/Tah.</th>
                <th className="p-3.5 text-right font-bold">Bakiye</th>
                <th className="p-3.5 text-center font-bold">Durum</th>
                <th className="p-3.5 text-center w-24 font-bold">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-10 text-center text-gray-400 text-sm">Kayıtlı cari bulunamadı.</td></tr>
              )}
              {filtered.map((r) => {
                let color = 'text-gray-400', badge = <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">Nötr</span>;
                if (r.balance > 0) { color = 'text-rose-600 font-bold'; badge = <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700">Borçluyuz</span>; }
                else if (r.balance < 0) { color = 'text-emerald-700 font-bold'; badge = <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">Alacaklıyız</span>; }
                return (
                  <tr key={r.id} className="hover:bg-[#F4F1EA]/70 cursor-pointer transition-colors" onClick={() => onOpen(r.id)}>
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white shrink-0" style={{ background: NAVY }}>{initials(r.name)}</div>
                        <div>
                          <div className="font-semibold" style={{ color: NAVY }}>{r.name}</div>
                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            <span className="text-[10px] text-gray-400">{r.phone || '-'}</span>
                            {r.overdue > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-full">
                                <CalendarClock className="w-3 h-3" /> {r.overdue} vadesi geçmiş çek
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 text-right font-mono text-rose-600">{currencyFmt.format(r.debt)}</td>
                    <td className="p-3.5 text-right font-mono text-emerald-700">{currencyFmt.format(r.credit)}</td>
                    <td className={`p-3.5 text-right font-mono ${color}`}>{currencyFmt.format(r.balance)}</td>
                    <td className="p-3.5 text-center">{badge}</td>
                    <td className="p-3.5 text-center">
                      <span className="text-white text-xs font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1" style={{ background: ORANGE }}>
                        Detay <ChevronRight className="w-3 h-3" />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="text-white font-bold text-sm" style={{ background: NAVY }}>
                <tr>
                  <td className="p-4 text-right uppercase tracking-widest text-[11px]">Genel Toplam:</td>
                  <td className="p-4 text-right font-mono">{currencyFmt.format(totals.sumDebt)}</td>
                  <td className="p-4 text-right font-mono">{currencyFmt.format(totals.sumCredit)}</td>
                  <td className="p-4 text-right font-mono">{currencyFmt.format(totals.sumBalance)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

/* ============================ MÜŞTERİ DETAY ============================ */
type DateFilter = 'all' | '7days' | '30days' | 'thisMonth' | 'lastMonth' | '2026' | '2025' | '2024';

function getFilterStartDate(f: DateFilter): Date | null {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  if (f === '7days') { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
  if (f === '30days') { const d = new Date(now); d.setDate(d.getDate() - 30); return d; }
  if (f === 'thisMonth') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (f === 'lastMonth') return new Date(now.getFullYear(), now.getMonth() - 1, 1);
  if (['2026', '2025', '2024'].includes(f)) return new Date(parseInt(f), 0, 1);
  return null;
}

function checkDateFilter(dateStr: string, f: DateFilter): boolean {
  if (f === 'all') return true;
  const t = new Date(dateStr); t.setHours(0, 0, 0, 0);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const start = getFilterStartDate(f);
  if (!start) return true;
  if (f === 'lastMonth') { const end = new Date(now.getFullYear(), now.getMonth(), 0); return t >= start && t <= end; }
  if (['2026', '2025', '2024'].includes(f)) return t.getFullYear() === parseInt(f);
  return t >= start;
}

const FILTER_LABELS: Record<DateFilter, string> = {
  all: 'Tüm Zamanlar', '7days': 'Son 7 Gün', '30days': 'Son 30 Gün', thisMonth: 'Bu Ay',
  lastMonth: 'Geçen Ay', '2026': '2026 Yılı', '2025': '2025 Yılı', '2024': '2024 Yılı',
};

function CustomerDetail({ account, transactions, onSaveTransaction, onDeleteTransaction, onEditCustomer, onDeleteCustomer, onBack, showToast, onReload }: {
  account: CariAccount;
  transactions: CariTransaction[];
  onSaveTransaction: (rec: Partial<CariTransaction>) => Promise<boolean>;
  onDeleteTransaction: (id: number) => void;
  onEditCustomer: () => void;
  onDeleteCustomer: () => void;
  onBack: () => void;
  showToast: (m: string) => void;
  onReload: () => Promise<void> | void;
}) {
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<CariTransaction | null>(null);
  const [attachFor, setAttachFor] = useState<CariTransaction | null>(null);
  const [uploading, setUploading] = useState(false);

  const uploadAttachment = async (file: File) => {
    if (!attachFor) return;
    if (file.size > 8 * 1024 * 1024) { showToast('Dosya en fazla 8 MB olabilir.'); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('transactionId', String(attachFor.id));
    try {
      const res = await fetch('/api/cari/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Belge yüklenemedi.'); return; }
      await onReload();
      setAttachFor((prev) => (prev ? { ...prev, attachments: data.attachments } : prev));
      showToast('Belge eklendi.');
    } catch {
      showToast('Yükleme hatası.');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = async (path: string) => {
    if (!attachFor || !confirm('Bu belge silinsin mi?')) return;
    const res = await fetch(`/api/cari/upload?transactionId=${attachFor.id}&path=${encodeURIComponent(path)}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Silinemedi.'); return; }
    await onReload();
    setAttachFor((prev) => (prev ? { ...prev, attachments: data.attachments } : prev));
    showToast('Belge silindi.');
  };

  // Belge modalı açıkken görseli kopyala-yapıştır (Ctrl/Cmd+V) ile yükle
  useEffect(() => {
    if (!attachFor) return;
    const onPaste = (e: ClipboardEvent) => {
      if (uploading) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const it of Array.from(items)) {
        if (it.type.startsWith('image/')) {
          const blob = it.getAsFile();
          if (blob) {
            e.preventDefault();
            const ext = (blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
            const file = blob.name && blob.name !== 'image.png' ? blob : new File([blob], `yapistirilan_${Date.now()}.${ext}`, { type: blob.type });
            uploadAttachment(file);
          }
          break;
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachFor, uploading]);

  const custTrans = useMemo(
    () => transactions.filter((t) => t.account_id === account.id).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [transactions, account.id]
  );

  // Genel bakiye (filtreden bağımsız)
  const overall = useMemo(() => {
    let debt = 0, credit = 0;
    custTrans.forEach((t) => { if (isDebtType(t.type)) debt += t.amount; else credit += t.amount; });
    return { debt, credit, net: debt - credit };
  }, [custTrans]);

  // Dönem toplamları (filtreli)
  const period = useMemo(() => {
    let debt = 0, credit = 0;
    custTrans.forEach((t) => {
      if (!checkDateFilter(t.date, dateFilter)) return;
      if (isDebtType(t.type)) debt += t.amount; else credit += t.amount;
    });
    return { debt, credit };
  }, [custTrans, dateFilter]);

  // Devir bakiyesi + görünen satırlar (running balance)
  const { rows, devir, displayedCount } = useMemo(() => {
    const start = getFilterStartDate(dateFilter);
    let devirBalance = 0;
    if (start) {
      custTrans.forEach((t) => {
        const td = new Date(t.date); td.setHours(0, 0, 0, 0);
        if (td < start) { if (isDebtType(t.type)) devirBalance += t.amount; else devirBalance -= t.amount; }
      });
    }
    let running = start ? devirBalance : 0;
    const term = search.toLowerCase();
    const out: Array<{ t: CariTransaction; balance: number }> = [];
    custTrans.forEach((t) => {
      const matchesDate = checkDateFilter(t.date, dateFilter);
      if (!start) { if (isDebtType(t.type)) running += t.amount; else running -= t.amount; }
      else if (matchesDate) { if (isDebtType(t.type)) running += t.amount; else running -= t.amount; }
      const matchesSearch = !term || foldedIncludes(`${t.description} ${t.date} ${t.due_date || ''}`, search);
      if (matchesSearch && matchesDate) out.push({ t, balance: running });
    });
    return { rows: out, devir: start ? { balance: devirBalance, start } : null, displayedCount: out.length };
  }, [custTrans, dateFilter, search]);

  const printExtract = () => generateExtractPrint(account, custTrans, period, overall);

  const exportCsv = () => {
    let csv = '﻿' + 'Tarih;Vade;Açıklama;Borç;Alacak/Tahsilat\n';
    custTrans.forEach((t) => {
      const d = new Date(t.date).toLocaleDateString('tr-TR');
      const vade = t.due_date ? new Date(t.due_date).toLocaleDateString('tr-TR') : '';
      const desc = (t.description || '').replace(/;/g, ' ');
      const borc = isDebtType(t.type) ? String(t.amount).replace('.', ',') : '0';
      const odenen = !isDebtType(t.type) ? String(t.amount).replace('.', ',') : '0';
      csv += `${d};${vade};${desc};${borc};${odenen}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Cari_Ekstre_${account.name.replace(/[^a-z0-9]/gi, '_')}.csv`;
    a.click();
    showToast('Excel (CSV) indirildi.');
  };

  return (
    <div className="p-4 lg:p-7">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4">
        <ArrowLeft className="w-4 h-4" /> Panele dön
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Sol: cari kart + işlem formu — masaüstünde scroll'da yapışık kalır */}
        <div className="space-y-4 lg:sticky lg:top-[120px] lg:self-start lg:max-h-[calc(100vh-136px)] lg:overflow-y-auto lg:pr-1">
          <div className="bg-white rounded-2xl border border-black/[0.06] shadow-[0_8px_30px_-20px_rgba(4,0,35,0.35)] overflow-hidden">
            <div className="px-5 py-4 text-white flex items-start justify-between gap-3" style={{ background: NAVY }}>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45 mb-1">Cari kart</p>
                <h3 className="font-bold text-base leading-tight">{account.name}</h3>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={onEditCustomer} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg" title="Düzenle"><Pencil className="w-4 h-4" /></button>
                <button onClick={onDeleteCustomer} className="p-2 text-white/70 hover:text-rose-200 hover:bg-white/10 rounded-lg" title="Sil"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="px-5 py-4 space-y-1.5 text-xs text-gray-600">
              {account.phone && <p>Tel: {account.phone}</p>}
              {account.tax_info && <p>VN: {account.tax_info}</p>}
              {account.address && <p className="text-gray-400 leading-relaxed">{account.address}</p>}
              {!account.phone && !account.tax_info && !account.address && <p className="text-gray-400 italic">İletişim bilgisi yok</p>}
            </div>
          </div>

          <TransactionForm
            key={editing?.id || 'new'}
            accountId={account.id}
            editing={editing}
            onCancel={() => setEditing(null)}
            onSubmit={async (rec) => { const ok = await onSaveTransaction(rec); if (ok) setEditing(null); }}
          />
        </div>

        {/* Sağ: özet + ekstre */}
        <div className="space-y-4">
          {/* Özet kartlar — sayfa kaydırılırken üstte yapışık kalır */}
          <div className="sticky top-[108px] z-10 py-2 grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ background: CREAM }}>
            <SummaryCard label={`Dönem borç (${FILTER_LABELS[dateFilter]})`} value={period.debt} accent="bg-blue-500" />
            <SummaryCard label="Dönem alacak / tah." value={period.credit} accent="bg-emerald-500" />
            <BalanceCard net={overall.net} />
          </div>

          <div className="bg-white rounded-2xl border border-black/[0.06] shadow-[0_8px_30px_-20px_rgba(4,0,35,0.35)] overflow-hidden">
            <div className="p-3 border-b border-gray-100 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                  className="text-xs border border-gray-200 rounded-lg py-2 px-3 font-bold text-gray-700 outline-none focus:border-orange-500 bg-[#F4F1EA]/50">
                  {(Object.keys(FILTER_LABELS) as DateFilter[]).map((k) => <option key={k} value={k}>{FILTER_LABELS[k]}</option>)}
                </select>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Açıklama/tarih ara..."
                    className="pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg w-44 outline-none focus:border-orange-500 bg-[#F4F1EA]/50 focus:bg-white" />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={exportCsv} className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg hover:bg-emerald-100"><FileDown className="w-4 h-4" /><span className="hidden sm:inline">Excel</span></button>
                <button onClick={printExtract} className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-white rounded-lg" style={{ background: NAVY }}><Printer className="w-4 h-4" /><span className="hidden sm:inline">Ekstre PDF</span></button>
              </div>
            </div>

            <div className="overflow-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead className="text-[10px] uppercase tracking-[0.14em] font-bold text-white/55" style={{ background: NAVY }}>
                  <tr>
                    <th className="p-3 w-28 font-bold">Tarih</th>
                    <th className="p-3 font-bold">Açıklama</th>
                    <th className="p-3 text-right w-28 font-bold">Borç</th>
                    <th className="p-3 text-right w-28 font-bold">Alacak/Tah.</th>
                    <th className="p-3 text-right w-32 font-bold">Bakiye</th>
                    <th className="p-3 text-center w-20 font-bold">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {devir && (
                    <tr className="bg-gray-50 font-bold text-gray-500">
                      <td className="p-3 text-[11px] italic text-gray-400">{dateFmt(devir.start)} ÖNCESİ</td>
                      <td className="p-3 italic text-xs">ÖNCEKİ DÖNEMDEN DEVREDEN</td>
                      <td className="p-3 text-right opacity-40">-</td>
                      <td className="p-3 text-right opacity-40">-</td>
                      <td className="p-3 text-right font-mono">{currencyFmt.format(devir.balance)}</td>
                      <td className="p-3" />
                    </tr>
                  )}
                  {rows.length === 0 && !devir && (
                    <tr><td colSpan={6} className="p-12 text-center text-gray-400">Bu carinin henüz hareketi yok. Soldaki formdan işlem ekleyin.</td></tr>
                  )}
                  {rows.map(({ t, balance }) => {
                    const isDebt = isDebtType(t.type);
                    const overdue = isOverdueDueDate(t.due_date);
                    const isCek = isPaymentType(t.type) && t.payment_method === 'cek';
                    return (
                      <tr key={t.id} className="hover:bg-[#F4F1EA]/70 group">
                        <td className="p-3 font-semibold whitespace-nowrap text-gray-500">{dateFmt(t.date)}</td>
                        <td className="p-3 text-gray-800 font-medium">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span>{t.description}</span>
                            {isPaymentType(t.type) && t.payment_method && !isCek && (
                              <span className="inline-flex items-center gap-1 text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border uppercase font-semibold">
                                <Wallet className="w-2.5 h-2.5" /> {PAYMENT_METHOD_SHORT[t.payment_method] || t.payment_method}{t.installments ? ` (${t.installments} Tak.)` : ''}
                              </span>
                            )}
                            {isCek && (
                              <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md border uppercase font-bold ${
                                overdue
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}>
                                <CalendarClock className="w-2.5 h-2.5" />
                                Çek{t.due_date ? ` · ${dateFmt(t.due_date)}` : ''}
                                {overdue ? ' · Gecikti' : ''}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`p-3 text-right font-mono ${isDebt ? 'text-rose-600 font-bold' : 'text-gray-300'}`}>{isDebt ? currencyFmt.format(t.amount) : '-'}</td>
                        <td className={`p-3 text-right font-mono ${!isDebt ? 'text-emerald-600 font-bold' : 'text-gray-300'}`}>{!isDebt ? currencyFmt.format(t.amount) : '-'}</td>
                        <td className="p-3 text-right font-mono font-bold text-gray-800 whitespace-nowrap">{currencyFmt.format(balance)}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => setAttachFor(t)} className={`relative p-1.5 rounded transition ${t.attachments?.length ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-gray-300 hover:bg-gray-100'}`} title="Dekont / belge ekle">
                              <Paperclip className="w-3.5 h-3.5" />
                              {!!t.attachments?.length && <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">{t.attachments.length}</span>}
                            </button>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setEditing(t)} className="text-blue-500 hover:bg-blue-500 hover:text-white p-1.5 rounded" title="Düzenle"><Pencil className="w-3 h-3" /></button>
                              <button onClick={() => onDeleteTransaction(t.id)} className="text-gray-400 hover:bg-rose-500 hover:text-white p-1.5 rounded" title="Sil"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-50 p-3 border-t border-gray-100 text-[11px] text-gray-500 flex justify-between px-4">
              <span>Tüm tutarlar ₺ (TL) cinsindendir</span>
              <span className="bg-gray-200 px-2 py-0.5 rounded-full">{displayedCount} Kayıt</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dekont / Belge modalı */}
      {attachFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setAttachFor(null)} />
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50 shrink-0">
              <div className="min-w-0">
                <h3 className="font-extrabold text-gray-800 flex items-center gap-2"><Paperclip className="w-4 h-4 text-blue-600" /> Dekont / Belgeler</h3>
                <p className="text-[11px] text-gray-400 mt-0.5 truncate">{attachFor.description} · {dateFmt(attachFor.date)}</p>
              </div>
              <button onClick={() => setAttachFor(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 shrink-0"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-5 py-4 overflow-auto space-y-2">
              {(!attachFor.attachments || attachFor.attachments.length === 0) && (
                <p className="text-sm text-gray-400 italic py-2">Henüz belge yok. Aşağıdan PDF/JPG/PNG ekleyebilirsin.</p>
              )}
              {attachFor.attachments?.map((a) => {
                const isImg = (a.type || '').startsWith('image/');
                const url = `/api/cari/file?path=${encodeURIComponent(a.path)}`;
                return (
                  <div key={a.path} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-2">
                    <a href={url} target="_blank" rel="noreferrer" className="shrink-0">
                      {isImg
                        ? <img src={url} alt={a.name} className="w-12 h-12 object-cover rounded border" />
                        : <div className="w-12 h-12 rounded border bg-white flex items-center justify-center text-rose-500"><FileText className="w-6 h-6" /></div>}
                    </a>
                    <a href={url} target="_blank" rel="noreferrer" className="flex-1 min-w-0 text-sm text-gray-700 hover:text-blue-600 truncate">{a.name}</a>
                    <button onClick={() => removeAttachment(a.path)} className="text-gray-300 hover:text-red-500 shrink-0 p-1" title="Belgeyi sil"><Trash2 className="w-4 h-4" /></button>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
              <label className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-bold cursor-pointer transition ${uploading ? 'bg-gray-200 text-gray-400 cursor-wait' : 'text-white'}`} style={uploading ? undefined : { background: NAVY }}>
                {uploading ? <><Loader className="w-4 h-4 animate-spin" /> Yükleniyor…</> : <><Upload className="w-4 h-4" /> Belge Ekle (PDF / JPG / PNG)</>}
                <input type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" disabled={uploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAttachment(f); e.target.value = ''; }} />
              </label>
              <p className="text-[10px] text-gray-400 mt-1.5 text-center">En fazla 8 MB · PDF, JPG, PNG · veya bir görseli kopyalayıp <b>Ctrl/Cmd+V</b> ile yapıştır</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-black/[0.06] shadow-sm relative overflow-hidden h-24 flex flex-col justify-between">
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-tight pl-2">{label}</p>
      <h3 className="text-xl font-extrabold pl-2" style={{ color: NAVY }}>{currencyFmt.format(value)}</h3>
      <div className={`absolute left-0 top-0 h-full w-1.5 ${accent}`} />
    </div>
  );
}

function BalanceCard({ net }: { net: number }) {
  let label = 'Bakiye Yok', color = 'text-gray-500', bar = 'bg-gray-300', badge = 'bg-gray-100 text-gray-500';
  if (net > 0) { label = 'Borçluyuz'; color = 'text-rose-600'; bar = 'bg-rose-500'; badge = 'bg-rose-50 text-rose-700'; }
  else if (net < 0) { label = 'Alacaklıyız'; color = 'text-emerald-700'; bar = 'bg-emerald-500'; badge = 'bg-emerald-50 text-emerald-700'; }
  return (
    <div className="bg-white p-4 rounded-xl border border-black/[0.06] shadow-sm relative overflow-hidden h-24 flex flex-col justify-between">
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-2">Genel bakiye</p>
      <h3 className={`text-xl font-extrabold pl-2 ${color}`}>{currencyFmt.format(net)}</h3>
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-block w-fit uppercase ml-2 ${badge}`}>{label}</span>
      <div className={`absolute left-0 top-0 h-full w-1.5 ${bar}`} />
    </div>
  );
}

/* ============================ İŞLEM FORMU ============================ */
function TransactionForm({ accountId, editing, onCancel, onSubmit }: {
  accountId: number;
  editing: CariTransaction | null;
  onCancel: () => void;
  onSubmit: (rec: Partial<CariTransaction>) => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(editing?.date || today);
  const [dueDate, setDueDate] = useState(editing?.due_date || '');
  const [type, setType] = useState<CariType>(editing?.type || 'borc');
  const [desc, setDesc] = useState(editing?.description || '');
  const [amount, setAmount] = useState<string>(editing ? String(editing.amount) : '');
  const [method, setMethod] = useState(editing?.payment_method || 'havale');
  const [installments, setInstallments] = useState(editing?.installments || '2');
  const isCek = isPaymentType(type) && method === 'cek';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!(amt > 0)) return;
    const rec: Partial<CariTransaction> = {
      id: editing?.id,
      account_id: accountId,
      date, type, description: desc, amount: amt,
      payment_method: isPaymentType(type) ? method : null,
      installments: isPaymentType(type) && method === 'kart-taksit' ? installments : null,
    };
    if (isCek && dueDate) rec.due_date = dueDate;
    onSubmit(rec);
    if (!editing) { setDesc(''); setAmount(''); setType('borc'); setDueDate(''); }
  };

  const typeBtns: Array<{ v: CariType; label: string; sub: string; active: string }> = [
    { v: 'borc', label: 'ALIŞ FAT.', sub: '(+Borç)', active: 'bg-blue-600 border-blue-600 text-white' },
    { v: 'satis', label: 'SATIŞ FAT.', sub: '(+Alacak)', active: 'bg-amber-500 border-amber-500 text-white' },
    { v: 'alacak', label: 'ÖDEME YAP', sub: '(-Düş)', active: 'bg-rose-500 border-rose-500 text-white' },
    { v: 'odeme_al', label: 'ÖDEME AL', sub: '(+Tahsilat)', active: 'bg-emerald-500 border-emerald-500 text-white' },
  ];

  const payTone = isCek
    ? { box: 'bg-amber-50 border-amber-200', label: 'text-amber-900', input: 'border-amber-200' }
    : { box: 'bg-emerald-50 border-emerald-100', label: 'text-emerald-800', input: 'border-emerald-200' };

  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] shadow-[0_8px_30px_-20px_rgba(4,0,35,0.35)] overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center">
        <h2 className="font-bold text-sm flex items-center gap-2" style={{ color: NAVY }}>
          <span className={`p-1.5 rounded-md ${editing ? 'bg-orange-100 text-orange-600' : 'bg-[#F4F1EA] text-[#040023]'}`}><Bolt className="w-3.5 h-3.5" /></span>
          {editing ? 'İşlemi düzenle' : 'Hızlı işlem'}
        </h2>
        {editing && <button onClick={onCancel} className="text-[11px] text-gray-400 hover:text-orange-600 font-medium px-2 py-1 rounded bg-gray-100">İptal Et</button>}
      </div>
      <form onSubmit={submit} className="p-5 space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">İşlem Tarihi</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-orange-500" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">İşlem Tipi</label>
          <div className="grid grid-cols-2 gap-2">
            {typeBtns.map((b) => (
              <button type="button" key={b.v} onClick={() => setType(b.v)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border text-[10px] font-bold leading-tight transition-all ${type === b.v ? b.active : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {b.label}<span className="font-normal text-[9px] opacity-80 mt-0.5">{b.sub}</span>
              </button>
            ))}
          </div>
        </div>
        {isPaymentType(type) && (
          <div className={`space-y-3 p-4 rounded-xl border ${payTone.box}`}>
            <div>
              <label className={`block text-[10px] font-bold mb-1.5 uppercase tracking-wider ${payTone.label}`}>Ödeme Yöntemi</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className={`w-full border rounded-lg text-xs p-2.5 bg-white outline-none ${payTone.input}`}>
                {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {method === 'kart-taksit' && (
              <div>
                <label className={`block text-[10px] font-bold mb-1.5 uppercase tracking-wider ${payTone.label}`}>Taksit Sayısı</label>
                <select value={installments} onChange={(e) => setInstallments(e.target.value)} className={`w-full border rounded-lg text-xs p-2.5 bg-white outline-none ${payTone.input}`}>
                  {[2, 3, 4, 5, 6, 7, 8, 9].map((n) => <option key={n} value={String(n)}>{n} Taksit</option>)}
                  {installments && !['2', '3', '4', '5', '6', '7', '8', '9'].includes(installments) && (
                    <option value={installments}>{installments} Taksit</option>
                  )}
                </select>
              </div>
            )}
            {method === 'cek' && (
              <div className="rounded-lg bg-white border border-amber-200 p-3">
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1.5">
                  <CalendarClock className="w-3.5 h-3.5" /> Çek / Senet Vadesi
                </label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full border border-amber-200 rounded-lg text-sm p-2.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15" />
                <p className="text-[10px] text-amber-800/70 mt-1.5 leading-snug">Vadesi geçen çekler ekstrede kırmızı etiketle görünür.</p>
              </div>
            )}
          </div>
        )}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Açıklama</label>
          <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} required placeholder="Örn: Fatura No: 00123" className="w-full border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-orange-500" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Tutar</label>
          <div className="relative">
            <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="0.00" className="w-full border border-gray-200 rounded-lg p-3 pl-4 text-xl font-bold font-mono text-gray-800 outline-none focus:border-orange-500" />
            <span className="absolute right-4 top-3.5 text-gray-400 font-bold">₺</span>
          </div>
        </div>
        <button type="submit" className="w-full text-white font-bold py-3.5 rounded-lg text-sm flex items-center justify-center gap-2" style={{ background: editing ? ORANGE : NAVY }}>
          {editing ? 'Güncelle' : 'İşlemi Kaydet'}
        </button>
      </form>
    </div>
  );
}

/* ============================ CARİ KART MODALI ============================ */
function CustomerModal({ edit, onClose, onSave }: {
  edit?: CariAccount;
  onClose: () => void;
  onSave: (rec: Partial<CariAccount>) => void;
}) {
  const [name, setName] = useState(edit?.name || '');
  const [phone, setPhone] = useState(edit?.phone || '');
  const [tax, setTax] = useState(edit?.tax_info || '');
  const [address, setAddress] = useState(edit?.address || '');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ id: edit?.id, name, phone, tax_info: tax, address });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-extrabold text-gray-800 flex items-center gap-2">
            <span className="text-white p-1.5 rounded-lg text-sm" style={{ background: NAVY }}><Users className="w-4 h-4" /></span>
            {edit ? 'Cari Kartı Düzenle' : 'Cari Kart Oluştur'}
          </h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="px-6 py-6 space-y-4">
          <Field label="Müşteri / Firma Ünvanı *"><input value={name} onChange={(e) => setName(e.target.value)} required autoFocus className="modal-input" placeholder="Örn: Yılmazlar Yapı Ltd. Şti." /></Field>
          <Field label="Telefon"><input value={phone} onChange={(e) => setPhone(e.target.value)} className="modal-input" placeholder="05xx xxx xx xx" /></Field>
          <Field label="Vergi Dairesi / No"><input value={tax} onChange={(e) => setTax(e.target.value)} className="modal-input" placeholder="Beyoğlu VD / 1234567890" /></Field>
          <Field label="Adres"><textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} className="modal-input resize-none" placeholder="Açık adres..." /></Field>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-200">İptal</button>
            <button type="submit" className="px-5 py-2.5 text-white rounded-lg text-sm font-bold" style={{ background: NAVY }}>Kaydet</button>
          </div>
        </form>
      </div>
      <style jsx>{`
        .modal-input { width: 100%; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 0.625rem 0.75rem; font-size: 0.875rem; color: #374151; outline: none; }
        .modal-input:focus { border-color: ${ORANGE}; box-shadow: 0 0 0 2px rgba(249,115,22,0.15); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-gray-500 text-[10px] font-bold mb-1.5 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

/* ============================ AYARLAR MODALI ============================ */
function SettingsModal({ me, onClose, showToast }: { me: string | null; onClose: () => void; showToast: (m: string) => void }) {
  const [tab, setTab] = useState<'password' | 'users'>('password');
  const [users, setUsers] = useState<CariUser[]>([]);

  // Şifre değiştir
  const [cur, setCur] = useState(''); const [nw, setNw] = useState(''); const [nw2, setNw2] = useState('');
  const [pwErr, setPwErr] = useState(''); const [pwBusy, setPwBusy] = useState(false);

  // Yeni kullanıcı
  const [nu, setNu] = useState(''); const [np, setNp] = useState('');
  const [uErr, setUErr] = useState(''); const [uBusy, setUBusy] = useState(false);

  const loadUsers = useCallback(async () => {
    const res = await fetch('/api/cari/users', { cache: 'no-store' });
    if (res.ok) { const d = await res.json(); setUsers(d.users || []); }
  }, []);
  useEffect(() => { if (tab === 'users') loadUsers(); }, [tab, loadUsers]);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault(); setPwErr('');
    if (nw !== nw2) { setPwErr('Yeni şifreler eşleşmiyor.'); return; }
    setPwBusy(true);
    const res = await fetch('/api/cari/users', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: cur, newPassword: nw }),
    });
    const d = await res.json(); setPwBusy(false);
    if (!res.ok) { setPwErr(d.error || 'Değiştirilemedi.'); return; }
    setCur(''); setNw(''); setNw2(''); showToast('Şifreniz değiştirildi.');
  };

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault(); setUErr(''); setUBusy(true);
    const res = await fetch('/api/cari/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: nu, password: np }),
    });
    const d = await res.json(); setUBusy(false);
    if (!res.ok) { setUErr(d.error || 'Oluşturulamadı.'); return; }
    setNu(''); setNp(''); showToast('Kullanıcı oluşturuldu.'); loadUsers();
  };

  const delUser = async (username: string) => {
    if (!confirm(`"${username}" kullanıcısı silinsin mi?`)) return;
    const res = await fetch(`/api/cari/users?username=${encodeURIComponent(username)}`, { method: 'DELETE' });
    const d = await res.json();
    if (!res.ok) { showToast(d.error || 'Silinemedi.'); return; }
    showToast('Kullanıcı silindi.'); loadUsers();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-extrabold text-gray-800 flex items-center gap-2">
            <span className="text-white p-1.5 rounded-lg text-sm" style={{ background: NAVY }}><Settings className="w-4 h-4" /></span>
            Ayarlar
          </h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex border-b border-gray-100">
          <button onClick={() => setTab('password')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${tab === 'password' ? 'text-orange-600 border-b-2 border-orange-500' : 'text-gray-400'}`}><KeyRound className="w-4 h-4" /> Şifre Değiştir</button>
          <button onClick={() => setTab('users')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${tab === 'users' ? 'text-orange-600 border-b-2 border-orange-500' : 'text-gray-400'}`}><UserPlus className="w-4 h-4" /> Kullanıcılar</button>
        </div>

        <div className="px-6 py-6">
          {tab === 'password' ? (
            <form onSubmit={changePassword} className="space-y-4">
              <p className="text-xs text-gray-400">Giriş yapan: <b className="text-gray-600">{me}</b></p>
              <Field label="Mevcut Şifre"><input type="password" value={cur} onChange={(e) => setCur(e.target.value)} required className="modal-input2" /></Field>
              <Field label="Yeni Şifre (en az 6)"><input type="password" value={nw} onChange={(e) => setNw(e.target.value)} required className="modal-input2" /></Field>
              <Field label="Yeni Şifre (Tekrar)"><input type="password" value={nw2} onChange={(e) => setNw2(e.target.value)} required className="modal-input2" /></Field>
              {pwErr && <div className="text-xs text-red-600 bg-red-50 rounded-lg p-2.5">{pwErr}</div>}
              <button type="submit" disabled={pwBusy} className="w-full text-white font-bold py-3 rounded-lg text-sm disabled:opacity-60" style={{ background: NAVY }}>{pwBusy ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}</button>
            </form>
          ) : (
            <div className="space-y-5">
              <form onSubmit={addUser} className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Yeni Kullanıcı</p>
                <input value={nu} onChange={(e) => setNu(e.target.value)} required placeholder="Kullanıcı adı" className="modal-input2" />
                <input type="password" value={np} onChange={(e) => setNp(e.target.value)} required placeholder="Şifre (en az 6)" className="modal-input2" />
                {uErr && <div className="text-xs text-red-600 bg-red-50 rounded-lg p-2.5">{uErr}</div>}
                <button type="submit" disabled={uBusy} className="w-full text-white font-bold py-2.5 rounded-lg text-sm disabled:opacity-60" style={{ background: ORANGE }}>{uBusy ? 'Ekleniyor...' : 'Kullanıcı Oluştur'}</button>
              </form>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Mevcut Kullanıcılar</p>
                <div className="space-y-2">
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                      <span className="text-sm font-medium text-gray-700">{u.username} {u.username === me && <span className="text-[10px] text-orange-600">(siz)</span>}</span>
                      {u.username !== me && <button onClick={() => delUser(u.username)} className="text-gray-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        :global(.modal-input2) { width: 100%; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 0.625rem 0.75rem; font-size: 0.875rem; color: #374151; outline: none; }
        :global(.modal-input2:focus) { border-color: ${ORANGE}; box-shadow: 0 0 0 2px rgba(249,115,22,0.15); }
      `}</style>
    </div>
  );
}

/* ============================ EKSTRE PDF (yazdır) ============================ */
function generateExtractPrint(
  account: CariAccount,
  custTrans: CariTransaction[],
  period: { debt: number; credit: number },
  overall: { debt: number; credit: number; net: number }
) {
  const todayStr = new Date().toLocaleDateString('tr-TR');
  let running = 0;
  const rowsHtml = custTrans.map((t) => {
    const isDebt = isDebtType(t.type);
    if (isDebt) running += t.amount; else running -= t.amount;
    const overdue = isOverdueDueDate(t.due_date);
    const isCek = isPaymentType(t.type) && t.payment_method === 'cek';
    let extra = '';
    if (isCek) {
      extra = ` <span class="tag ${overdue ? 'tag-late' : 'tag-cek'}">Çek${t.due_date ? ` · ${dateFmt(t.due_date)}` : ''}${overdue ? ' · Gecikti' : ''}</span>`;
    } else if (isPaymentType(t.type) && t.payment_method) {
      extra = ` <span class="tag">${PAYMENT_METHOD_SHORT[t.payment_method] || t.payment_method}${t.installments ? ` ${t.installments} Tak.` : ''}</span>`;
    }
    return `<tr>
      <td class="mono" style="white-space:nowrap;">${dateFmt(t.date)}</td>
      <td>${escapeHtml(t.description)}${extra}</td>
      <td class="mono r ${isDebt ? 'red' : 'muted'}">${isDebt ? currencyFmt.format(t.amount) : '-'}</td>
      <td class="mono r ${!isDebt ? 'green' : 'muted'}">${!isDebt ? currencyFmt.format(t.amount) : '-'}</td>
      <td class="mono r" style="font-weight:700;">${currencyFmt.format(running)}</td>
    </tr>`;
  }).join('');

  const status = overall.net > 0 ? 'BORÇ BAKİYESİ' : overall.net < 0 ? 'ALACAK BAKİYESİ' : 'BAKİYE YOK';
  const statusColor = overall.net > 0 ? '#dc2626' : overall.net < 0 ? '#059669' : '#6b7280';

  let details = '';
  if (account.address) details += `<div>${escapeHtml(account.address)}</div>`;
  if (account.phone) details += `<div>Tel: ${escapeHtml(account.phone)}</div>`;
  if (account.tax_info) details += `<div>VN: ${escapeHtml(account.tax_info)}</div>`;

  const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Cari Ekstre - ${escapeHtml(account.name)}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" />
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { color: #1f2937; font-size: 12px; }
    .mono { font-family: 'JetBrains Mono', monospace; }
    .wrap { max-width: 800px; margin: auto; }
    .no-print { text-align: center; padding: 14px; }
    .btn { padding: 10px 30px; background: ${NAVY}; color: #fff; border: none; border-radius: 6px; font-weight: 700; font-size: 14px; cursor: pointer; }
    header { border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 20px; }
    .kicker { font-size: 9px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: #9ca3af; margin-bottom: 6px; }
    .party h1 { font-size: 22px; letter-spacing: -0.02em; color: #111; text-transform: none; }
    .party .sub { font-size: 11px; color: #4b5563; line-height: 1.65; margin-top: 6px; }
    .meta { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 14px; gap: 16px; padding-top: 10px; border-top: 1px solid #e5e7eb; }
    .meta .title { font-size: 12px; font-weight: 700; color: #111; }
    .balbox { text-align: right; }
    .balbox .amt { font-size: 22px; font-weight: 800; }
    .balbox .st { font-size: 10px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: ${statusColor}; }
    .tag { display: inline-block; margin-left: 6px; font-size: 8px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; border: 1px solid #e5e7eb; color: #6b7280; background: #f9fafb; vertical-align: middle; }
    .tag-cek { color: #92400e; background: #fffbeb; border-color: #fde68a; }
    .tag-late { color: #b91c1c; background: #fff1f2; border-color: #fecdd3; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { text-align: left; padding: 8px 6px; font-size: 9px; text-transform: uppercase; border-bottom: 2px solid #000; font-weight: 700; }
    td { padding: 6px; border-bottom: 1px solid #eee; vertical-align: top; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    .r { text-align: right; } .red { color: #dc2626; } .green { color: #059669; } .muted { color: #cbd5e1; }
    .totals { margin-top: 14px; display: flex; justify-content: flex-end; }
    .totals table { width: 300px; }
    .totals td { border: none; padding: 3px 6px; }
    footer { margin-top: 24px; text-align: center; font-size: 8px; color: #9ca3af; border-top: 1px solid #eee; padding-top: 6px; }
    @media print { .no-print { display: none; } }
  </style></head><body>
  <div class="no-print"><button class="btn" onclick="window.print()">Yazdır / PDF İndir</button></div>
  <div class="wrap">
    <header>
      <div class="party">
        <div class="kicker">Alıcı</div>
        <h1>${escapeHtml(account.name)}</h1>
        <div class="sub">${details}</div>
      </div>
      <div class="meta">
        <div class="title">Cari Hesap Ekstresi • ${todayStr}</div>
        <div class="balbox">
          <div class="amt mono" style="color:${statusColor};">${currencyFmt.format(overall.net)}</div>
          <div class="st">${status}</div>
        </div>
      </div>
    </header>
    <table>
      <thead><tr><th>Tarih</th><th>Açıklama</th><th class="r">Borç</th><th class="r">Alacak/Tah.</th><th class="r">Bakiye</th></tr></thead>
      <tbody>${rowsHtml || '<tr><td colspan="5" style="text-align:center;padding:20px;color:#9ca3af;">Hareket bulunmuyor.</td></tr>'}</tbody>
    </table>
    <div class="totals">
      <table>
        <tr><td>Toplam Borç:</td><td class="r mono red">${currencyFmt.format(overall.debt)}</td></tr>
        <tr><td>Toplam Alacak/Tahsilat:</td><td class="r mono green">${currencyFmt.format(overall.credit)}</td></tr>
        <tr style="border-top:1px solid #000;font-weight:800;"><td style="padding-top:6px;">Genel Bakiye:</td><td class="r mono" style="padding-top:6px;color:${statusColor};">${currencyFmt.format(overall.net)}</td></tr>
      </table>
    </div>
    <footer>${todayStr}</footer>
  </div>
  </body></html>`;

  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
}

function escapeHtml(s: string): string {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
