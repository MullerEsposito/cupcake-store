CREATE SCHEMA IF NOT EXISTS app_runtime;
CREATE TABLE IF NOT EXISTS app_runtime.session (
  token_hash char(64) PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES public.usuario(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS session_expiry ON app_runtime.session (expires_at);
CREATE TABLE IF NOT EXISTS app_runtime.rate_limit (
  identity_hash char(64) PRIMARY KEY,
  count integer NOT NULL CHECK (count > 0),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_limit_expiry ON app_runtime.rate_limit (expires_at);
CREATE TABLE IF NOT EXISTS app_runtime.order_revision (
  user_id bigint PRIMARY KEY REFERENCES public.usuario(id) ON DELETE CASCADE,
  version bigint NOT NULL CHECK (version > 0)
);
CREATE TABLE IF NOT EXISTS app_runtime.order_stream (
  id uuid PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES public.usuario(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS order_stream_expiry ON app_runtime.order_stream (expires_at);
