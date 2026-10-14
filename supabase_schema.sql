-- ==========================================================
-- DESIGNFLOW UNIFORMES - SCRIPT SQL PARA SUPABASE
-- Execute este script no SQL Editor do seu projeto Supabase
-- ==========================================================

-- 1. Tabela de Designers da Equipe
CREATE TABLE IF NOT EXISTS designers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  nickname TEXT,
  role TEXT DEFAULT 'Designer Criação',
  avatar_color TEXT DEFAULT '#3b82f6',
  -- Metas Personalizadas por Categoria
  goal_criacao_artes INTEGER DEFAULT 8,       -- Criação: meta de artes diárias
  goal_exportacao INTEGER DEFAULT 10,         -- Exportação: meta de exportações diárias
  goal_impressao_pecas INTEGER DEFAULT 120,   -- Impressão: meta de peças impressas diárias
  daily_goal_orders INTEGER DEFAULT 8,        -- Compatibilidade
  daily_goal_meters NUMERIC DEFAULT 0,
  daily_goal_pieces INTEGER DEFAULT 50,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Lançamentos de Produção
CREATE TABLE IF NOT EXISTS production_entries (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL,
  client_name TEXT NOT NULL,
  designer_id TEXT REFERENCES designers(id) ON DELETE SET NULL,
  designer_name TEXT,
  stage TEXT NOT NULL, -- 'criacao' | 'exportacao' | 'impressao'
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  pieces_count INTEGER DEFAULT 0,
  meters NUMERIC DEFAULT 0,
  order_type TEXT DEFAULT 'sublimacao_total',
  work_type TEXT DEFAULT 'arte_nova', -- 'arte_nova' | 'ajuste_refacao' | 'reposicao'
  complexity TEXT DEFAULT 'media',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Caso as tabelas já tenham sido criadas anteriormente, garante as colunas novas:
ALTER TABLE designers ADD COLUMN IF NOT EXISTS goal_criacao_artes INTEGER DEFAULT 8;
ALTER TABLE designers ADD COLUMN IF NOT EXISTS goal_exportacao INTEGER DEFAULT 10;
ALTER TABLE designers ADD COLUMN IF NOT EXISTS goal_impressao_pecas INTEGER DEFAULT 120;
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS work_type TEXT DEFAULT 'arte_nova';

-- 3. Índices para Alto Desempenho em Consultas e Filtros
CREATE INDEX IF NOT EXISTS idx_entries_date ON production_entries(date);
CREATE INDEX IF NOT EXISTS idx_entries_designer ON production_entries(designer_id);
CREATE INDEX IF NOT EXISTS idx_entries_stage ON production_entries(stage);

-- 4. Habilitar Row Level Security (RLS) e Políticas de Acesso Público Anon
ALTER TABLE designers ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_entries ENABLE ROW LEVEL SECURITY;

-- Políticas para tabela designers (Leitura, Inserção, Atualização e Exclusão)
DROP POLICY IF EXISTS "Permitir leitura pública de designers" ON designers;
CREATE POLICY "Permitir leitura pública de designers" ON designers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção pública de designers" ON designers;
CREATE POLICY "Permitir inserção pública de designers" ON designers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização pública de designers" ON designers;
CREATE POLICY "Permitir atualização pública de designers" ON designers FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir exclusão pública de designers" ON designers;
CREATE POLICY "Permitir exclusão pública de designers" ON designers FOR DELETE USING (true);

-- Políticas para tabela production_entries (Leitura, Inserção, Atualização e Exclusão)
DROP POLICY IF EXISTS "Permitir leitura pública de pedidos" ON production_entries;
CREATE POLICY "Permitir leitura pública de pedidos" ON production_entries FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção pública de pedidos" ON production_entries;
CREATE POLICY "Permitir inserção pública de pedidos" ON production_entries FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização pública de pedidos" ON production_entries;
CREATE POLICY "Permitir atualização pública de pedidos" ON production_entries FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir exclusão pública de pedidos" ON production_entries;
CREATE POLICY "Permitir exclusão pública de pedidos" ON production_entries FOR DELETE USING (true);
