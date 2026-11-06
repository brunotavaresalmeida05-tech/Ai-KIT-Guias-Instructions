-- db/init.sql
-- Database initialization script for AI Development System

-- ═══════════════════════════════════════════════════════════
-- Enable Extensions
-- ═══════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ═══════════════════════════════════════════════════════════
-- Sessions Table (Claude-Mem)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ttl INTEGER NOT NULL DEFAULT 604800,
  metadata JSONB DEFAULT '{}',
  created_by VARCHAR(255),
  updated_by VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_created_at ON sessions(created_at);
CREATE INDEX idx_sessions_last_activity ON sessions(last_activity);

-- ═══════════════════════════════════════════════════════════
-- Memory Documents Table (Claude-Mem)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS memory_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL DEFAULT 'context',
  content TEXT NOT NULL,
  embedding vector(384),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  access_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ttl INTEGER,
  search_text TEXT GENERATED ALWAYS AS (content) STORED
);

CREATE INDEX idx_memory_type ON memory_documents(type);
CREATE INDEX idx_memory_session ON memory_documents(session_id);
CREATE INDEX idx_memory_created ON memory_documents(created_at DESC);
CREATE INDEX idx_memory_embedding ON memory_documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_memory_text ON memory_documents USING gin(search_text gin_trgm_ops);

-- ═══════════════════════════════════════════════════════════
-- Workflows Table (Strix)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  strategy VARCHAR(50) NOT NULL DEFAULT 'sequential',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  result JSONB,
  metadata JSONB DEFAULT '{}',
  created_by VARCHAR(255)
);

CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_created ON workflows(created_at DESC);
CREATE INDEX idx_workflows_name ON workflows(name);

-- ═══════════════════════════════════════════════════════════
-- Tasks Table (Strix)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  agent_id UUID,
  type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 5,
  retries INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  payload JSONB NOT NULL,
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_tasks_workflow ON tasks(workflow_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_agent ON tasks(agent_id);
CREATE INDEX idx_tasks_type ON tasks(type);

-- ═══════════════════════════════════════════════════════════
-- Agents Table (Strix)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'idle',
  skills TEXT[] DEFAULT '{}',
  capabilities JSONB DEFAULT '{}',
  max_concurrent INTEGER DEFAULT 5,
  current_tasks INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_agents_name ON agents(name);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_type ON agents(type);

-- ═══════════════════════════════════════════════════════════
-- Skills Table (Taste-Skill)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  version VARCHAR(20) DEFAULT '1.0.0',
  tags TEXT[] DEFAULT '{}',
  required_capabilities TEXT[] DEFAULT '{}',
  provided_capabilities TEXT[] DEFAULT '{}',
  timeout INTEGER DEFAULT 30000,
  max_retries INTEGER DEFAULT 3,
  cacheable BOOLEAN DEFAULT false,
  input_schema JSONB,
  output_schema JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_skills_name ON skills(name);
CREATE INDEX idx_skills_tags ON skills USING gin(tags);

-- ═══════════════════════════════════════════════════════════
-- Skill Compositions Table (Taste-Skill)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS skill_compositions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  skill_ids UUID[] NOT NULL,
  steps JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255)
);

CREATE INDEX idx_compositions_name ON skill_compositions(name);

-- ═══════════════════════════════════════════════════════════
-- Notifications Table (Laya)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source VARCHAR(50) NOT NULL,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 5,
  payload JSONB NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_notifications_source ON notifications(source);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ═══════════════════════════════════════════════════════════
-- Notification Deliveries Table (Laya)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  attempt_count INTEGER DEFAULT 0,
  last_attempt TIMESTAMP,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_deliveries_notification ON notification_deliveries(notification_id);
CREATE INDEX idx_deliveries_channel ON notification_deliveries(channel);
CREATE INDEX idx_deliveries_status ON notification_deliveries(status);

-- ═══════════════════════════════════════════════════════════
-- Action Cards Table (Laya)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS action_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  actions JSONB NOT NULL,
  priority INTEGER DEFAULT 5,
  category VARCHAR(50),
  suggested_action_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cards_notification ON action_cards(notification_id);
CREATE INDEX idx_cards_category ON action_cards(category);

-- ═══════════════════════════════════════════════════════════
-- Audit Log Table
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- ═══════════════════════════════════════════════════════════
-- Statistics Table
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS system_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_name VARCHAR(255) NOT NULL,
  metric_value NUMERIC,
  metric_type VARCHAR(50),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_stats_metric ON system_stats(metric_name);
CREATE INDEX idx_stats_recorded ON system_stats(recorded_at DESC);
CREATE INDEX idx_stats_metric_recorded ON system_stats(metric_name, recorded_at DESC);

-- ═══════════════════════════════════════════════════════════
-- Views
-- ═══════════════════════════════════════════════════════════

-- Active sessions
CREATE OR REPLACE VIEW v_active_sessions AS
SELECT s.id, s.user_id, s.created_at, s.last_activity,
       COUNT(d.id) as document_count
FROM sessions s
LEFT JOIN memory_documents d ON s.id = d.session_id
WHERE s.last_activity > CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY s.id, s.user_id, s.created_at, s.last_activity;

-- Recent workflows
CREATE OR REPLACE VIEW v_recent_workflows AS
SELECT id, name, strategy, status, created_at, completed_at,
       EXTRACT(EPOCH FROM (completed_at - created_at)) as duration_seconds
FROM workflows
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
ORDER BY created_at DESC;

-- Agent performance
CREATE OR REPLACE VIEW v_agent_performance AS
SELECT a.id, a.name, a.type, a.status,
       COUNT(t.id) as total_tasks,
       COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
       COUNT(CASE WHEN t.status = 'failed' THEN 1 END) as failed_tasks,
       AVG(EXTRACT(EPOCH FROM (t.completed_at - t.started_at))) as avg_duration_seconds
FROM agents a
LEFT JOIN tasks t ON a.id = t.agent_id
GROUP BY a.id, a.name, a.type, a.status;

-- ═══════════════════════════════════════════════════════════
-- Functions
-- ═══════════════════════════════════════════════════════════

-- Update session last_activity
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sessions SET last_activity = CURRENT_TIMESTAMP
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for session activity
CREATE TRIGGER trigger_update_session_activity
AFTER INSERT ON memory_documents
FOR EACH ROW
EXECUTE FUNCTION update_session_activity();

-- Auto-cleanup expired documents
CREATE OR REPLACE FUNCTION cleanup_expired_documents()
RETURNS void AS $$
BEGIN
  DELETE FROM memory_documents
  WHERE ttl IS NOT NULL
  AND created_at + INTERVAL '1 second' * ttl < CURRENT_TIMESTAMP;

  DELETE FROM notifications
  WHERE expires_at IS NOT NULL
  AND expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════
-- Initial Data
-- ═══════════════════════════════════════════════════════════

-- Insert default skills
INSERT INTO skills (name, description, version, tags, provided_capabilities, timeout, cacheable)
VALUES
  ('TextProcessing', 'Process and analyze text', '1.0.0', ARRAY['text', 'nlp'], ARRAY['text-processing'], 30000, true),
  ('DataValidation', 'Validate and sanitize data', '1.0.0', ARRAY['validation', 'data'], ARRAY['data-validation'], 30000, true),
  ('DataTransformation', 'Transform data between formats', '1.0.0', ARRAY['transformation', 'data'], ARRAY['data-transformation'], 30000, true)
ON CONFLICT (name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- Cleanup and Maintenance
-- ═══════════════════════════════════════════════════════════

-- Run cleanup on startup
SELECT cleanup_expired_documents();

-- Grant permissions (if using restricted user)
GRANT CONNECT ON DATABASE ai_dev TO ai_user;
GRANT USAGE ON SCHEMA public TO ai_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO ai_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO ai_user;
