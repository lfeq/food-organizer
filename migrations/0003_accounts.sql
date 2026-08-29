-- §7.7 per-account login throttling columns
ALTER TABLE member
  ADD COLUMN login_failures     integer     NOT NULL DEFAULT 0,
  ADD COLUMN login_locked_until timestamptz;
