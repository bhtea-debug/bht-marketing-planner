CREATE TABLE IF NOT EXISTS marketing_trends (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  platform text NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  example text,
  source_urls text,
  relevance_score integer DEFAULT 50,
  active integer DEFAULT 1,
  scanned_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at text
);
CREATE INDEX IF NOT EXISTS marketing_trends_platform_active_idx ON marketing_trends (platform, active);
CREATE INDEX IF NOT EXISTS marketing_trends_kind_idx ON marketing_trends (kind);
