CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  auth_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  vault_salt TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS domains (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  registrar TEXT NOT NULL,
  registrar_url TEXT NOT NULL DEFAULT '',
  registered_at TEXT NOT NULL DEFAULT '',
  expires_at TEXT NOT NULL,
  account TEXT NOT NULL DEFAULT '',
  encrypted_secret TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_domains_expires_at ON domains(expires_at);
