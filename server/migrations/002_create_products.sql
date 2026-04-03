CREATE TABLE products (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  description  TEXT NOT NULL,
  price_cents  INTEGER NOT NULL,
  category     TEXT NOT NULL,
  preview_link TEXT,
  file_key     TEXT NOT NULL,
  file_format  TEXT NOT NULL,
  published    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON products(published);
CREATE INDEX ON products(category);
