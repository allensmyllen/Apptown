CREATE TABLE IF NOT EXISTS page_views (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  path       TEXT        NOT NULL,
  viewed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip         TEXT,
  user_agent TEXT
);

CREATE INDEX idx_page_views_viewed_at ON page_views (viewed_at);
