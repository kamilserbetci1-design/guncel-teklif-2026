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
} from '@/lib/cari-types';
import {
  Lock, LogOut, Plus, Pencil, Trash2, Search, Settings, Bolt, X, FileDown,
  Printer, Upload, Users, ArrowLeft, TrendingUp, TrendingDown, KeyRound, UserPlus,
  Wallet, ChevronRight, Loader2, ShieldCheck, Paperclip, FileText, Loader,
} from 'lucide-react';

const MUTPRO_LOGO = '/logos/mutpro-mavi-logo.jpeg';
const NAVY = '#040023';
const ORANGE = '#f97316';

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
      <LoginScreen
        setupRequired={setupRequired}
        onSuccess={() => { setAuthed(true); checkAuth(); }}
      />
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

/* ============================ LOGIN / SETUP ============================ */
function LoginScreen({ setupRequired, onSuccess }: { setupRequired: boolean; onSuccess: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/cari/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, remember }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Giriş başarısız.'); return; }
      onSuccess();
    } catch {
      setError('Bağlantı hatası.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 shadow-lg" style={{ background: NAVY }}>
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-extrabold text-gray-800">Cari Takip Sistemi</h1>
          <p className="text-sm text-gray-500 mt-1">
            {setupRequired ? 'İlk kurulum — yönetici hesabı oluşturun' : 'Devam etmek için giriş yapın'}
          </p>
        </div>

        <form onSubmit={submit} autoComplete="on" className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          {setupRequired && (
            <div className="text-xs bg-blue-50 text-blue-700 rounded-lg p-3 border border-blue-100">
              Bu sistemde henüz kullanıcı yok. Belirleyeceğiniz kullanıcı adı ve şifre <b>ilk yönetici hesabı</b> olacak.
            </div>
          )}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Kullanıcı Adı</label>
            <input
              type="text" name="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus
              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
              placeholder="kullanici"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Şifre</label>
            <input
              type="password" name="password" autoComplete={setupRequired ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
              placeholder="••••••••"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500/30" />
            <span className="text-xs font-medium text-gray-600">Beni hatırla <span className="text-gray-400">(30 gün şifre sormaz)</span></span>
          </label>
          {error && <div className="text-xs text-red-600 bg-red-50 rounded-lg p-2.5 border border-red-100">{error}</div>}
          <button
            type="submit" disabled={loading}
            className="w-full text-white font-bold py-3 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: NAVY }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {setupRequired ? 'Hesabı Oluştur ve Gir' : 'Giriş Yap'}
          </button>
        </form>
      </div>
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
    onLogout();
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
    <div className="-m-4 lg:-m-6">
      {/* Üst araç çubuğu */}
      <div className="sticky top-[57px] z-20 bg-white/90 backdrop-blur border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <img src={MUTPRO_LOGO} alt="MutPro" className="h-8 w-auto object-contain cursor-pointer" onClick={backToDash} />
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider hidden sm:inline">Cari Takip</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ToolBtn onClick={backToDash} icon={<Users className="w-4 h-4" />} label="Panel" />
          <ToolBtn onClick={backup} icon={<FileDown className="w-4 h-4" />} label="Yedekle" tone="blue" />
          <ToolBtn onClick={() => restoreRef.current?.click()} icon={<Upload className="w-4 h-4" />} label="Yükle" tone="purple" />
          <input ref={restoreRef} type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) restore(f); e.target.value = ''; }} />
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <ToolBtn onClick={() => setSettingsOpen(true)} icon={<Settings className="w-4 h-4" />} label="Ayarlar" />
          <ToolBtn onClick={logout} icon={<LogOut className="w-4 h-4" />} label="Çıkış" tone="red" />
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
        <div className="fixed bottom-6 right-6 bg-gray-800 text-white px-5 py-3.5 rounded-xl shadow-2xl z-50 flex items-center gap-3 border-l-4 border-emerald-500 text-sm font-medium">
          {toast}
        </div>
      )}
    </div>
  );
}

function ToolBtn({ onClick, icon, label, tone }: { onClick: () => void; icon: React.ReactNode; label: string; tone?: 'blue' | 'purple' | 'red' }) {
  const tones: Record<string, string> = {
    blue: 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100',
    purple: 'text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100',
    red: 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100',
  };
  const cls = tone ? tones[tone] : 'text-gray-700 bg-white border-gray-200 hover:bg-gray-50';
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium border rounded-lg transition-colors ${cls}`}>
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
      let debt = 0, credit = 0;
      transactions.forEach((t) => {
        if (t.account_id !== acc.id) return;
        if (isDebtType(t.type)) debt += t.amount; else credit += t.amount;
      });
      return { ...acc, debt, credit, balance: debt - credit };
    });
  }, [accounts, transactions]);

  const filtered = rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  const totals = useMemo(() => {
    let receivable = 0, payable = 0, sumDebt = 0, sumCredit = 0, sumBalance = 0;
    rows.forEach((r) => {
      if (r.balance > 0) payable += r.balance; else receivable += Math.abs(r.balance);
      sumDebt += r.debt; sumCredit += r.credit; sumBalance += r.balance;
    });
    return { receivable, payable, sumDebt, sumCredit, sumBalance };
  }, [rows]);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-800 tracking-tight">Finansal Özet</h2>
          <p className="text-sm text-gray-500 mt-1">Tüm cari hesap bakiyelerinizin güncel durumu</p>
        </div>
        <button onClick={onAdd} className="flex items-center gap-2 text-white font-bold px-4 py-2.5 rounded-lg text-sm shadow" style={{ background: ORANGE }}>
          <Plus className="w-4 h-4" /> Yeni Cari Kart
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-700 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
          <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider flex items-center gap-2">
            <span className="bg-white/20 p-1.5 rounded-md"><TrendingUp className="w-4 h-4" /></span> Bizim Alacaklarımız
          </span>
          <h3 className="text-4xl font-extrabold mt-5">{currencyFmt.format(totals.receivable)}</h3>
          <p className="text-xs text-emerald-100/80 mt-3">Toplam tahsil edilecek tutar</p>
        </div>
        <div className="bg-gradient-to-br from-rose-500 to-red-700 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
          <span className="text-xs font-bold text-rose-100 uppercase tracking-wider flex items-center gap-2">
            <span className="bg-white/20 p-1.5 rounded-md"><TrendingDown className="w-4 h-4" /></span> Bizim Borçlarımız
          </span>
          <h3 className="text-4xl font-extrabold mt-5">{currencyFmt.format(totals.payable)}</h3>
          <p className="text-xs text-rose-100/80 mt-3">Toplam ödenecek tutar</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-bold text-gray-700 flex items-center gap-2"><Users className="w-4 h-4 text-gray-400" /> Tüm Cari Bakiyeler</h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari ara..."
              className="pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg w-56 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none" />
          </div>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-bold">
              <tr>
                <th className="p-4">Cari Adı</th>
                <th className="p-4 text-right">Top. Borç</th>
                <th className="p-4 text-right">Top. Alacak/Tah.</th>
                <th className="p-4 text-right">Bakiye</th>
                <th className="p-4 text-center">Durum</th>
                <th className="p-4 text-center w-24">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-10 text-center text-gray-400 text-sm">Kayıtlı cari bulunamadı.</td></tr>
              )}
              {filtered.map((r) => {
                let color = 'text-gray-400', badge = <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-gray-100 text-gray-500">Nötr</span>;
                if (r.balance > 0) { color = 'text-rose-600 font-bold'; badge = <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100">Borçluyuz</span>; }
                else if (r.balance < 0) { color = 'text-emerald-600 font-bold'; badge = <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">Alacaklıyız</span>; }
                return (
                  <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onOpen(r.id)}>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs"><Users className="w-4 h-4" /></div>
                        <div>
                          <div className="font-semibold text-gray-700">{r.name}</div>
                          <div className="text-[10px] text-gray-400">{r.phone || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right font-mono text-rose-600">{currencyFmt.format(r.debt)}</td>
                    <td className="p-4 text-right font-mono text-emerald-600">{currencyFmt.format(r.credit)}</td>
                    <td className={`p-4 text-right font-mono ${color}`}>{currencyFmt.format(r.balance)}</td>
                    <td className="p-4 text-center">{badge}</td>
                    <td className="p-4 text-center">
                      <span className="text-orange-600 text-xs font-bold bg-orange-50 px-3 py-1.5 rounded-lg inline-flex items-center gap-1">
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
      const matchesSearch = t.description.toLowerCase().includes(term) || t.date.includes(term);
      if (matchesSearch && matchesDate) out.push({ t, balance: running });
    });
    return { rows: out, devir: start ? { balance: devirBalance, start } : null, displayedCount: out.length };
  }, [custTrans, dateFilter, search]);

  const printExtract = () => generateExtractPrint(account, custTrans, period, overall);

  const exportCsv = () => {
    let csv = '﻿' + 'Tarih;Açıklama;Borç;Alacak/Tahsilat\n';
    custTrans.forEach((t) => {
      const d = new Date(t.date).toLocaleDateString('tr-TR');
      const desc = (t.description || '').replace(/;/g, ' ');
      const borc = isDebtType(t.type) ? String(t.amount).replace('.', ',') : '0';
      const odenen = !isDebtType(t.type) ? String(t.amount).replace('.', ',') : '0';
      csv += `${d};${desc};${borc};${odenen}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Cari_Ekstre_${account.name.replace(/[^a-z0-9]/gi, '_')}.csv`;
    a.click();
    showToast('Excel (CSV) indirildi.');
  };

  return (
    <div className="p-4 lg:p-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4">
        <ArrowLeft className="w-4 h-4" /> Panele Dön
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Sol: cari kart + işlem formu — masaüstünde scroll'da yapışık kalır */}
        <div className="space-y-4 lg:sticky lg:top-[120px] lg:self-start lg:max-h-[calc(100vh-136px)] lg:overflow-y-auto lg:pr-1">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-800 text-lg leading-tight">{account.name}</h3>
                {account.phone && <p className="text-xs text-gray-500 mt-1">Tel: {account.phone}</p>}
                {account.tax_info && <p className="text-xs text-gray-500">VN: {account.tax_info}</p>}
                {account.address && <p className="text-xs text-gray-400 mt-1">{account.address}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={onEditCustomer} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Düzenle"><Pencil className="w-4 h-4" /></button>
                <button onClick={onDeleteCustomer} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Sil"><Trash2 className="w-4 h-4" /></button>
              </div>
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
          <div className="sticky top-[112px] z-10 bg-gray-50 py-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SummaryCard label={`Dönem Borç (${FILTER_LABELS[dateFilter]})`} value={period.debt} accent="from-blue-400 to-blue-600" />
            <SummaryCard label={`Dönem Alacak/Tah.`} value={period.credit} accent="from-emerald-400 to-emerald-600" />
            <BalanceCard net={overall.net} />
          </div>

          {/* Araç çubuğu */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-3 border-b border-gray-100 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                  className="text-xs border border-gray-200 rounded-lg py-2 px-3 font-bold text-gray-700 outline-none focus:border-orange-500">
                  {(Object.keys(FILTER_LABELS) as DateFilter[]).map((k) => <option key={k} value={k}>{FILTER_LABELS[k]}</option>)}
                </select>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Açıklama/tarih ara..."
                    className="pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg w-44 outline-none focus:border-orange-500" />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={exportCsv} className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"><FileDown className="w-4 h-4" /><span className="hidden sm:inline">Excel</span></button>
                <button onClick={printExtract} className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"><Printer className="w-4 h-4" /><span className="hidden sm:inline">Ekstre PDF</span></button>
              </div>
            </div>

            <div className="overflow-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead className="bg-gray-50 text-[10px] uppercase text-gray-400 font-extrabold tracking-widest">
                  <tr>
                    <th className="p-3 w-28">Tarih</th>
                    <th className="p-3">Açıklama</th>
                    <th className="p-3 text-right w-28">Borç</th>
                    <th className="p-3 text-right w-28">Alacak/Tah.</th>
                    <th className="p-3 text-right w-32">Bakiye</th>
                    <th className="p-3 text-center w-20">İşlem</th>
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
                    return (
                      <tr key={t.id} className="hover:bg-gray-50 group">
                        <td className="p-3 font-semibold whitespace-nowrap text-gray-500">{dateFmt(t.date)}</td>
                        <td className="p-3 text-gray-800 font-medium">
                          {t.description}
                          {isPaymentType(t.type) && t.payment_method && (
                            <span className="inline-flex items-center gap-1 ml-2 text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border uppercase font-semibold">
                              <Wallet className="w-2.5 h-2.5" /> {PAYMENT_METHOD_SHORT[t.payment_method] || t.payment_method}{t.installments ? ` (${t.installments} Tak.)` : ''}
                            </span>
                          )}
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
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden h-24 flex flex-col justify-between">
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-tight">{label}</p>
      <h3 className="text-xl font-extrabold text-gray-800">{currencyFmt.format(value)}</h3>
      <div className={`h-1.5 w-full bg-gradient-to-r ${accent} absolute bottom-0 left-0`} />
    </div>
  );
}

function BalanceCard({ net }: { net: number }) {
  let label = 'Bakiye Yok', color = 'text-gray-500', bar = 'bg-gray-300', badge = 'bg-gray-100 text-gray-500';
  if (net > 0) { label = 'Borçluyuz'; color = 'text-rose-600'; bar = 'bg-gradient-to-b from-rose-400 to-rose-600'; badge = 'bg-rose-100 text-rose-700'; }
  else if (net < 0) { label = 'Alacaklıyız'; color = 'text-emerald-600'; bar = 'bg-gradient-to-b from-emerald-400 to-emerald-600'; badge = 'bg-emerald-100 text-emerald-700'; }
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden h-24 flex flex-col justify-between">
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Genel Bakiye</p>
      <h3 className={`text-xl font-extrabold ${color}`}>{currencyFmt.format(net)}</h3>
      <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold inline-block w-fit uppercase ${badge}`}>{label}</span>
      <div className={`absolute right-0 top-0 h-full w-1.5 ${bar}`} />
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
  const [type, setType] = useState<CariType>(editing?.type || 'borc');
  const [desc, setDesc] = useState(editing?.description || '');
  const [amount, setAmount] = useState<string>(editing ? String(editing.amount) : '');
  const [method, setMethod] = useState(editing?.payment_method || 'havale');
  const [installments, setInstallments] = useState(editing?.installments || '2');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!(amt > 0)) return;
    onSubmit({
      id: editing?.id,
      account_id: accountId,
      date, type, description: desc, amount: amt,
      payment_method: isPaymentType(type) ? method : null,
      installments: isPaymentType(type) && method === 'kart-taksit' ? installments : null,
    });
    if (!editing) { setDesc(''); setAmount(''); setType('borc'); }
  };

  const typeBtns: Array<{ v: CariType; label: string; sub: string; active: string }> = [
    { v: 'borc', label: 'ALIŞ FAT.', sub: '(+Borç)', active: 'bg-blue-600 border-blue-600 text-white' },
    { v: 'satis', label: 'SATIŞ FAT.', sub: '(+Alacak)', active: 'bg-amber-500 border-amber-500 text-white' },
    { v: 'alacak', label: 'ÖDEME YAP', sub: '(-Düş)', active: 'bg-rose-500 border-rose-500 text-white' },
    { v: 'odeme_al', label: 'ÖDEME AL', sub: '(+Tahsilat)', active: 'bg-emerald-500 border-emerald-500 text-white' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center">
        <h2 className="font-bold text-gray-700 text-sm flex items-center gap-2">
          <span className={`p-1.5 rounded-md ${editing ? 'bg-orange-100 text-orange-600' : 'bg-blue-50 text-blue-600'}`}><Bolt className="w-3.5 h-3.5" /></span>
          {editing ? 'İşlemi Düzenle' : 'Hızlı İşlem'}
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
          <div className="space-y-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <div>
              <label className="block text-[10px] font-bold text-emerald-800 mb-1.5 uppercase tracking-wider">Ödeme Yöntemi</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full border border-emerald-200 rounded-lg text-xs p-2.5 bg-white outline-none">
                {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {method === 'kart-taksit' && (
              <div>
                <label className="block text-[10px] font-bold text-emerald-800 mb-1.5 uppercase tracking-wider">Taksit Sayısı</label>
                <select value={installments} onChange={(e) => setInstallments(e.target.value)} className="w-full border border-emerald-200 rounded-lg text-xs p-2.5 bg-white outline-none">
                  {['2', '3', '6', '9', '12'].map((n) => <option key={n} value={n}>{n} Taksit</option>)}
                </select>
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
    const method = isPaymentType(t.type) && t.payment_method
      ? ` <span style="font-size:9px;color:#666;">(${PAYMENT_METHOD_SHORT[t.payment_method] || t.payment_method}${t.installments ? ` ${t.installments} Tak.` : ''})</span>` : '';
    return `<tr>
      <td class="mono" style="white-space:nowrap;">${dateFmt(t.date)}</td>
      <td>${escapeHtml(t.description)}${method}</td>
      <td class="mono r ${isDebt ? 'red' : 'muted'}">${isDebt ? currencyFmt.format(t.amount) : '-'}</td>
      <td class="mono r ${!isDebt ? 'green' : 'muted'}">${!isDebt ? currencyFmt.format(t.amount) : '-'}</td>
      <td class="mono r" style="font-weight:700;">${currencyFmt.format(running)}</td>
    </tr>`;
  }).join('');

  const status = overall.net > 0 ? 'MUTPRO OLARAK BORÇLUYUZ' : overall.net < 0 ? 'MUTPRO OLARAK ALACAKLIYIZ' : 'BAKİYE YOK';
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
    header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid ${NAVY}; padding-bottom: 14px; margin-bottom: 18px; }
    header img { max-height: 46px; }
    .slogan { font-size: 10px; font-weight: 600; color: #6b7280; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 6px; }
    .right { text-align: right; }
    .right h1 { font-size: 18px; text-transform: uppercase; color: #111; }
    .right .sub { font-size: 10px; color: #6b7280; line-height: 1.6; margin-top: 4px; }
    .balbox { margin-top: 8px; padding-top: 6px; border-top: 1px solid #d1d5db; }
    .balbox .amt { font-size: 22px; font-weight: 800; }
    .balbox .st { font-size: 11px; font-weight: 700; text-transform: uppercase; color: ${statusColor}; }
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
      <div>
        <img src="${MUTPRO_LOGO}" alt="MutPro" />
        <div class="slogan">Endüstriyel Mutfak Ekipmanları</div>
      </div>
      <div class="right">
        <h1>${escapeHtml(account.name)}</h1>
        <div class="sub">${details}</div>
        <div class="sub">Cari Hesap Ekstresi • ${todayStr}</div>
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
    <footer>MutPro Cari Hesap Takip Sistemi tarafından oluşturulmuştur • ${todayStr}</footer>
  </div>
  </body></html>`;

  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
}

function escapeHtml(s: string): string {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
