-- Brain cache table — stores read-only copies of nudge-brain content.
-- Run via `npx drizzle-kit push` after pulling these changes, OR paste into Turso shell.
CREATE TABLE IF NOT EXISTS brain_cache (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  kind text NOT NULL,
  key text NOT NULL,
  payload_json text NOT NULL,
  fetched_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS brain_cache_kind_key_idx ON brain_cache (kind, key);
