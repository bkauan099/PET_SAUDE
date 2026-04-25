-- ══════════════════════════════════════════════════════════════
-- schema.sql  —  PET-Saúde Digital
-- Execute: psql -U postgres -d pet_saude -f db/schema.sql
-- Ou use: npm run db:init
-- ══════════════════════════════════════════════════════════════

-- Extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ──────────────────────────────────────────
-- USUÁRIOS  (login no painel de edição)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  password   TEXT NOT NULL,             -- bcrypt hash
  role       TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('admin','editor')),
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at') THEN
    CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- ──────────────────────────────────────────
-- PROJETO  (sempre 1 linha, id = 'default')
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project (
  id          TEXT PRIMARY KEY DEFAULT 'default',
  theme       TEXT NOT NULL DEFAULT 'Gestão e Governança dos Sistemas de Informação em Saúde para Integração e Qualidade de Dados',
  institution TEXT NOT NULL DEFAULT '',
  supervisor  TEXT NOT NULL DEFAULT '',
  period      TEXT NOT NULL DEFAULT '',
  funding     TEXT NOT NULL DEFAULT 'Ministério da Saúde / SGTES — Edital PET-Saúde',
  email       TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garante a linha padrão
INSERT INTO project (id) VALUES ('default') ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────
-- PARTICIPANTES
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS participants (
  id         TEXT PRIMARY KEY,          -- slug, ex: "breno"
  name       TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'Estudante',
  course     TEXT NOT NULL DEFAULT '',
  avatar     TEXT NOT NULL DEFAULT '',  -- iniciais, ex: "BR"
  color      TEXT NOT NULL DEFAULT 'blue' CHECK (color IN ('blue','orange')),
  sort_order INT  NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- ATIVIDADES
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activities (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  icon        TEXT NOT NULL DEFAULT '📋',
  icon_color  TEXT NOT NULL DEFAULT 'blue' CHECK (icon_color IN ('blue','orange')),
  tag         TEXT NOT NULL DEFAULT 'Outro',
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'plan' CHECK (status IN ('done','prog','plan')),
  sort_order  INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- MEMBROS DE ATIVIDADES  (N-N)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_members (
  activity_id    TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  PRIMARY KEY (activity_id, participant_id)
);

-- ──────────────────────────────────────────
-- FOTOS
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS photos (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  filename    TEXT NOT NULL,        -- nome no disco / bucket
  original_name TEXT NOT NULL,      -- nome original do arquivo
  caption     TEXT NOT NULL DEFAULT '',
  mime_type   TEXT NOT NULL DEFAULT 'image/jpeg',
  size_bytes  BIGINT NOT NULL DEFAULT 0,
  url         TEXT NOT NULL,        -- URL pública (path ou CDN)
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- DOCUMENTOS
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  activity_id   TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,
  original_name TEXT NOT NULL,
  ext           TEXT NOT NULL,      -- pdf, docx, pptx…
  mime_type     TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes    BIGINT NOT NULL DEFAULT 0,
  url           TEXT NOT NULL,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- KPIs
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kpis (
  id         TEXT PRIMARY KEY,
  icon       TEXT NOT NULL DEFAULT '📊',
  label      TEXT NOT NULL,
  value      TEXT NOT NULL DEFAULT '0',
  trend      TEXT NOT NULL DEFAULT 'info' CHECK (trend IN ('info','up')),
  sub        TEXT NOT NULL DEFAULT '',
  sort_order INT  NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- TRIGGERS: updated_at automático
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  -- project
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_project_updated_at') THEN
    CREATE TRIGGER trg_project_updated_at
    BEFORE UPDATE ON project
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  -- participants
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_participants_updated_at') THEN
    CREATE TRIGGER trg_participants_updated_at
    BEFORE UPDATE ON participants
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  -- activities
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_activities_updated_at') THEN
    CREATE TRIGGER trg_activities_updated_at
    BEFORE UPDATE ON activities
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  -- kpis
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_kpis_updated_at') THEN
    CREATE TRIGGER trg_kpis_updated_at
    BEFORE UPDATE ON kpis
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- ──────────────────────────────────────────
-- ÍNDICES
-- ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_activity_members_activity   ON activity_members(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_members_participant ON activity_members(participant_id);
CREATE INDEX IF NOT EXISTS idx_photos_activity             ON photos(activity_id);
CREATE INDEX IF NOT EXISTS idx_documents_activity          ON documents(activity_id);
CREATE INDEX IF NOT EXISTS idx_activities_status           ON activities(status);

-- ──────────────────────────────────────────
-- SEED: participantes iniciais
-- ──────────────────────────────────────────
INSERT INTO participants (id, name, role, course, avatar, color, sort_order) VALUES
  ('breno',       'Breno',        'Estudante', 'Enfermagem',  'BR', 'blue',   1),
  ('bruno',       'Bruno',        'Estudante', 'BICT',        'BU', 'orange', 2),
  ('gabriel',     'Gabriel',      'Estudante', 'Farmácia',    'GA', 'blue',   3),
  ('joaogabriel', 'João Gabriel', 'Estudante', 'BICT',        'JG', 'orange', 4),
  ('joaovitor',   'João Victor',  'Estudante', 'Nutrição',    'JV', 'blue',   5),
  ('karina',      'Karina',       'Estudante', 'Psicologia',  'KA', 'orange', 6),
  ('matheus',     'Matheus',      'Estudante', 'Biomedicina', 'MA', 'blue',   7),
  ('mylenne',     'Mylenne',      'Estudante', 'Farmácia',    'MY', 'orange', 8),
  ('nelson',      'Nelson',       'Estudante', 'BICT',        'NE', 'blue',   9),
  ('paulo',       'Paulo',        'Estudante', 'Medicina',    'PA', 'orange', 10),
  ('renan',       'Renan',        'Estudante', 'Odontologia', 'RE', 'blue',   11)
ON CONFLICT (id) DO NOTHING;

-- SEED: KPIs iniciais
INSERT INTO kpis (id, icon, label, value, trend, sub, sort_order) VALUES
  ('kpi_atividades', '🏥', 'Atividades realizadas',          '0',  'info', 'Atualize pelo painel',              1),
  ('kpi_membros',    '👥', 'Participantes',                   '11', 'up',   '6 cursos · equipe multiprofissional', 2),
  ('kpi_producoes',  '📄', 'Produções geradas',               '0',  'info', 'Artigos, relatórios, resumos',       3),
  ('kpi_horas',      '🎓', 'Horas de capacitação',            '0',  'info', 'Atualize pelo painel',              4),
  ('kpi_sistemas',   '🔗', 'Sistemas de informação mapeados', '0',  'info', 'RNDS, e-SUS, SISAB…',               5),
  ('kpi_completude', '📊', 'Taxa de completude de dados',     '0%', 'info', 'Indicador de qualidade dos registros',6)
ON CONFLICT (id) DO NOTHING;
