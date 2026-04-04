ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;

-- Mark existing users as verified so they aren't locked out
UPDATE users SET email_verified = true WHERE email_verified = false;
