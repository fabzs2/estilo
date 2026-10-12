import React, { useState } from 'react';
import { useProduction } from '../context/ProductionContext';
import { 
  Palette, 
  BarChart3, 
  ListFilter, 
  Users, 
  PlusCircle, 
  Layers, 
  Printer, 
  Download, 
  RotateCcw,
  Database,
  Trash2
} from 'lucide-react';

export function Header({ activeTab, setActiveTab, onOpenBackup, onOpenSupabase }) {
  const { 
    setIsQuickEntryOpen, 
    setIsBatchEntryOpen, 
    setIsReportOpen,
    isSupabaseActive,
    clearAllData
  } = useProduction();

  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);

  return (
    <header className="app-header">
      <div className="header-inner">
        {/* Brand / Logo */}
        <div className="brand-section">
          <div className="brand-logo-badge">
            <Palette size={18} />
          </div>
          <div className="brand-info">
            <h1>
              DesignFlow <span className="brand-tag">Uniformes</span>
            </h1>
            <p className="brand-subtitle">
              Gestão de Produção, Fechamento, Impressão & Médias
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="nav-tabs">
          <button
            id="tab-dashboard"
            className={`nav-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <BarChart3 size={15} />
            Dashboard & Médias
          </button>
          <button
            id="tab-orders"
            className={`nav-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <ListFilter size={15} />
            Pedidos & Histórico
          </button>
          <button
            id="tab-team"
            className={`nav-tab-btn ${activeTab === 'team' ? 'active' : ''}`}
            onClick={() => setActiveTab('team')}
          >
            <Users size={15} />
            Equipe & Metas
          </button>
        </nav>

        {/* Action Buttons for the Leader */}
        <div className="header-actions">
          {/* Status Supabase */}
          <button
            id="btn-supabase-status"
            className="btn btn-secondary btn-sm"
            onClick={onOpenSupabase}
            title={isSupabaseActive ? "Conectado ao Supabase (Nuvem)" : "Clique para conectar ao Supabase"}
          >
            <span 
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: isSupabaseActive ? 'var(--accent-emerald)' : 'var(--text-muted)',
                display: 'inline-block'
              }}
            />
            <Database size={13} />
            {isSupabaseActive ? "Supabase Nuvem" : "Banco Local"}
          </button>

          <button
            id="btn-quick-entry"
            className="btn btn-primary"
            onClick={() => setIsQuickEntryOpen(true)}
            title="Lançamento Rápido de Pedido Concluído"
          >
            <PlusCircle size={15} />
            + Lançar Pedido
          </button>

          <button
            id="btn-batch-entry"
            className="btn btn-secondary"
            onClick={() => setIsBatchEntryOpen(true)}
            title="Lançamento Múltiplo / Em Lote de Pedidos"
          >
            <Layers size={14} />
            Em Lote
          </button>

          <button
            id="btn-executive-report"
            className="btn btn-secondary"
            onClick={() => setIsReportOpen(true)}
            title="Abrir Relatório Executivo para o Patrão"
          >
            <Printer size={14} />
            Relatório do Patrão
          </button>

          <div style={{ position: 'relative' }}>
            <button
              id="btn-settings-data"
              className="btn btn-secondary btn-icon-only"
              onClick={() => setShowOptionsDropdown(!showOptionsDropdown)}
              title="Opções de Dados e Backup"
            >
              <Download size={14} />
            </button>

            {showOptionsDropdown && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '40px',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  padding: '6px',
                  width: '210px',
                  zIndex: 50
                }}
              >
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 10px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '0.78rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-sm)'
                  }}
                  onClick={() => {
                    setShowOptionsDropdown(false);
                    onOpenSupabase();
                  }}
                >
                  <Database size={13} />
                  Configurar Supabase
                </button>

                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 10px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '0.78rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-sm)'
                  }}
                  onClick={() => {
                    setShowOptionsDropdown(false);
                    onOpenBackup();
                  }}
                >
                  <Download size={13} />
                  Backup & Exportação
                </button>

                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 10px',
                    background: 'transparent',
                    border: 'none',
                    color: '#f87171',
                    fontSize: '0.78rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-sm)',
                    borderTop: '1px solid var(--border-subtle)',
                    marginTop: '4px',
                    paddingTop: '8px'
                  }}
                  onClick={() => {
                    if (window.confirm('Atenção: deseja limpar e zerar todo o banco de dados para começar do zero?')) {
                      clearAllData();
                      setShowOptionsDropdown(false);
                    }
                  }}
                >
                  <Trash2 size={13} />
                  Zerar Banco de Dados
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
