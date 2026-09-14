-- ============================================
-- CARİ: İşlemlere belge (dekont/slip) ekleme
-- Bu dosyayı Supabase Dashboard > SQL Editor'de çalıştırın.
-- ============================================

-- Her işleme bağlı belge listesi: [{ path, name, type }]
ALTER TABLE cari_transactions
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]';

-- Belgeler için özel storage bucket (sadece sunucu/service_role erişir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('cari-belgeler', 'cari-belgeler', false)
ON CONFLICT (id) DO NOTHING;
