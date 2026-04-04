CREATE TABLE support_licenses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id),
  product_id       UUID NOT NULL REFERENCES products(id),
  license_key      TEXT NOT NULL UNIQUE,
  requests_used    INTEGER NOT NULL DEFAULT 0,
  requests_total   INTEGER NOT NULL DEFAULT 3,
  paystack_ref     TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON support_licenses(user_id);
CREATE INDEX ON support_licenses(product_id);
