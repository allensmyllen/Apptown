CREATE TABLE orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id),
  product_id            UUID NOT NULL REFERENCES products(id),
  amount_cents          INTEGER NOT NULL,
  currency              TEXT NOT NULL DEFAULT 'usd',
  status                TEXT NOT NULL DEFAULT 'pending',
  stripe_session_id     TEXT UNIQUE,
  stripe_payment_intent TEXT,
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON orders(user_id);
CREATE INDEX ON orders(stripe_session_id);
