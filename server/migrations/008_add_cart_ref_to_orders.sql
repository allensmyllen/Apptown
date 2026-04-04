ALTER TABLE orders ADD COLUMN IF NOT EXISTS cart_ref TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_cart_ref ON orders(cart_ref);
