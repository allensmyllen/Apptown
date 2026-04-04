CREATE TABLE otp_verifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  otp_hash   TEXT        NOT NULL,
  purpose    TEXT        NOT NULL CHECK (purpose IN ('register', 'reset_password')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_otp_user_id ON otp_verifications (user_id);
