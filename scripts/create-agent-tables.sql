-- Uburn Cockpit — Agent tables
-- Run via Supabase SQL Editor or psql

CREATE TABLE IF NOT EXISTS agent_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  status TEXT CHECK (status IN ('success', 'error', 'warning')) NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT true,
  interval_hours INT NOT NULL,
  thresholds JSONB DEFAULT '{}',
  last_run TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default configs
INSERT INTO agent_config (agent_name, enabled, interval_hours, thresholds) VALUES
  ('meta-ads', true, 4, '{"roas_pause": 0.8, "roas_scale": 2.0, "budget_alert_pct": 0.8, "scale_pct": 0.2}'),
  ('shopify', true, 6, '{"low_stock": 10, "aov_drop_pct": 0.15}'),
  ('sendcloud', true, 2, '{"stuck_hours": 48, "min_delivery_rate": 0.9}')
ON CONFLICT (agent_name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_agent_logs_timestamp ON agent_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_name ON agent_logs (agent_name);
