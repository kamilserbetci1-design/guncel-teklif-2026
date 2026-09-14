-- ============================================
-- CARİ TAKİP SİSTEMİ TABLOLARI (Sadece MutPro)
-- Bu dosyayı Supabase Dashboard > SQL Editor'de çalıştırın.
-- ============================================

-- Kullanıcılar (şifreli giriş için)
CREATE TABLE IF NOT EXISTS cari_users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cari kartlar (müşteri / tedarikçi)
CREATE TABLE IF NOT EXISTS cari_accounts (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  tax_info TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cari hareketler (borç / satış / tahsilat)
CREATE TABLE IF NOT EXISTS cari_transactions (
  id BIGINT PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES cari_accounts(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('borc', 'satis', 'alacak')),
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT,
  installments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cari_transactions_account ON cari_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_cari_transactions_date ON cari_transactions(date);

-- GÜVENLİK: RLS aktif, hiçbir policy YOK.
-- Böylece herkese açık anon anahtar bu tablolara ASLA erişemez.
-- Sadece sunucu tarafındaki service_role anahtarı (şifre kontrolünden geçen API) erişebilir.
ALTER TABLE cari_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cari_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cari_transactions ENABLE ROW LEVEL SECURITY;
