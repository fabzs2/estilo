import React, { useState } from 'react';
import { useProduction } from '../context/ProductionContext';
import { 
  saveSupabaseCredentials, 
  clearSupabaseCredentials, 
  isSupabaseConfigured 
} from '../lib/supabase';
import { 
  Database, 
  X, 
  Check, 
  Copy, 
  ExternalLink, 
  Save, 
  RotateCcw,
  ShieldCheck,
  Server
} from 'lucide-react';

export function SupabaseModal({ isOpen, onClose }) {
  const { isSupabaseActive } = useProduction();
  const [url, setUrl] = useState(() => localStorage.getItem('designflow_supabase_url') || import.meta.env.VITE_SUPABASE_URL || '');
  const [key, setKey] = useState(() => localStorage.getItem('designflow_supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    if (!url.trim() || !key.trim()) {
      alert('Preencha a URL do projeto e a Chave Anon do Supabase.');
      return;
    }
    saveSupabaseCredentials(url, key);
  };

  const handleDisconnect = () => {
    if (window.confirm('Deseja desconectar o Supabase e voltar para o armazenamento local?')) {
      clearSupabaseCredentials();
    }
  };

  const handleCopySQL = () => {
    const sql = `-- Execute este script no SQL Editor do seu projeto Supabase:
CREATE TABLE IF NOT EXISTS designers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  nickname TEXT,
  role TEXT DEFAULT 'Designer Criação',
  avatar_color TEXT DEFAULT '#3b82f6',
  daily_goal_orders INTEGER DEFAULT 8,
  daily_goal_meters NUMERIC DEFAULT 0,
  daily_goal_pieces INTEGER DEFAULT 50,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_entries (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL,
  client_name TEXT NOT NULL,
  designer_id TEXT REFERENCES designers(id) ON DELETE SET NULL,
  designer_name TEXT,
  stage TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  pieces_count INTEGER DEFAULT 0,
  meters NUMERIC DEFAULT 0,
  order_type TEXT DEFAULT 'sublimacao_total',
  complexity TEXT DEFAULT 'media',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE designers ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de designers" ON designers FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de designers" ON designers FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de designers" ON designers FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de designers" ON designers FOR DELETE USING (true);

CREATE POLICY "Permitir leitura de pedidos" ON production_entries FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de pedidos" ON production_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de pedidos" ON production_entries FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de pedidos" ON production_entries FOR DELETE USING (true);
`;
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
        <div className="modal-header">
          <div className="modal-title">
            <Database size={17} />
            Conectar ao Supabase (PostgreSQL Nuvem)
          </div>
          <button className="btn btn-secondary btn-icon-only btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            {/* Status Atual */}
            <div 
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem' }}>
                <span 
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: isSupabaseActive ? 'var(--accent-emerald)' : 'var(--text-muted)'
                  }} 
                />
                <span style={{ fontWeight: 600 }}>
                  {isSupabaseActive ? 'Conectado ao Supabase' : 'Modo Offline / Armazenamento Local'}
                </span>
              </div>

              {isSupabaseActive && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleDisconnect}
                  title="Desconectar e voltar a usar dados locais"
                >
                  <RotateCcw size={12} />
                  Desconectar
                </button>
              )}
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Para sincronizar os dados na nuvem (e permitir acesso simultâneo de múltiplos dispositivos ou pela Vercel), informe a URL e a Anon Key do seu projeto Supabase:
            </p>

            <div className="form-group">
              <label className="form-label" htmlFor="supa-url">Project URL (Supabase):</label>
              <input
                id="supa-url"
                type="url"
                className="form-input"
                placeholder="https://xyzcompany.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="supa-key">Project API Anon Key:</label>
              <input
                id="supa-key"
                type="password"
                className="form-input"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                required
              />
            </div>

            {/* Script SQL para copiar */}
            <div 
              style={{
                borderTop: '1px solid var(--border-subtle)',
                marginTop: '16px',
                paddingTop: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px'
              }}
            >
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Script das Tabelas SQL
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Cole no SQL Editor do Supabase para criar as tabelas
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleCopySQL}
              >
                {copied ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
                {copied ? 'Copiado!' : 'Copiar SQL'}
              </button>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={14} />
              Salvar e Conectar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
