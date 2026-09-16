-- Teklif kaydının reddedilmemesi için eksik kolonlar
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT '';
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS discount_type TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS discount_percent NUMERIC;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS custom_header_name TEXT DEFAULT '';
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS custom_header_logo TEXT DEFAULT '';
