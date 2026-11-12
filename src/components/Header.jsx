import React, { useState, useEffect } from 'react';
import { useProduction } from '../context/ProductionContext';
import {
  BarChart3,
  ListFilter,
  Users,
  Plus,
  Layers,
  Printer,
  Download,
  Database,
  Trash2,
  SlidersHorizontal,
  Sun,
  Moon,
  Building2,
  Edit3
} from 'lucide-react';

export function Header({ activeTab, setActiveTab, onOpenBackup, onOpenSupabase }) {
  const {
    setIsQuickEntryOpen,
    setEditingOrder,
    setIsBatchEntryOpen,
    setIsReportOpen,
    setIsSectorGoalsModalOpen,
    isSupabaseActive,
    clearAllData,
    metrics,
    designers,
    workingDaysConfig
  } = useProduction();

  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('designflow_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('designflow_theme', theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const activeDesignersCount = designers.filter((d) => d.active !== false).length;
  const companyName = workingDaysConfig?.companyName || 'Estamparia & Uniformes';
  const companySub = workingDaysConfig?.companySub || 'Setor de Arte & Impressão';

  return (
    <aside className="app-sidebar">
      <div className="sidebar-top">
        {/* Identidade da Plataforma KromaOPS + Empresa Cliente (White-Label) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="sidebar-brand">
            <div className="brand-mark">KR</div>
            <div className="brand-text-wrap">
              <div className="brand-name">
                Kroma<span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>OPS</span>
                <span
                  className="mono"
                  style={{
                    fontSize: '0.58rem',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    fontWeight: 600
                  }}
                >
                  PRO
                </span>
              </div>
              <div className="brand-sub">Production OS</div>
            </div>
          </div>

          {/* Card White-Label da Empresa / Fábrica Cliente */}
          <button
            type="button"
            onClick={() => setIsSectorGoalsModalOpen(true)}
            title="Clique para personalizar o nome da empresa/fábrica cliente (Modo White-Label)"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              width: '100%',
              padding: '7px 10px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'border-color var(--trans-fast)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <Building2 size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {companyName}
                </div>
                <div
                  style={{
                    fontSize: '0.66rem',
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {companySub}
                </div>
              </div>
            </div>
            <Edit3 size={11} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          </button>
        </div>

        {/* Ações de Lançamento */}
        <div className="sidebar-quick-actions">
          <button
            id="btn-quick-entry"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '8px 12px' }}
            onClick={() => {
              setEditingOrder(null);
              setIsQuickEntryOpen(true);
            }}
          >
            <Plus size={15} strokeWidth={2.4} />
            Lançar Pedido
          </button>

          <button
            id="btn-batch-entry"
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => setIsBatchEntryOpen(true)}
          >
            <Layers size={13} />
            Lançamento em Lote
          </button>
        </div>

        {/* Navegação Principal */}
        <div>
          <div className="sidebar-section-label">Operação</div>
          <nav className="sidebar-nav">
            <button
              id="tab-dashboard"
              className={`sidebar-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <span className="sidebar-nav-item-left">
                <BarChart3 size={15} />
                Visão Geral
              </span>
            </button>

            <button
              id="tab-orders"
              className={`sidebar-nav-item ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              <span className="sidebar-nav-item-left">
                <ListFilter size={15} />
                Fila de Pedidos
              </span>
              <span className="sidebar-counter">{metrics.totalOrders}</span>
            </button>

            <button
              id="tab-team"
              className={`sidebar-nav-item ${activeTab === 'team' ? 'active' : ''}`}
              onClick={() => setActiveTab('team')}
            >
              <span className="sidebar-nav-item-left">
                <Users size={15} />
                Equipe & Metas
              </span>
              <span className="sidebar-counter">{activeDesignersCount}</span>
            </button>
          </nav>
        </div>

        {/* Ferramentas e Gestão */}
        <div>
          <div className="sidebar-section-label">Gestão</div>
          <nav className="sidebar-nav">
            <button
              id="btn-sidebar-goals"
              className="sidebar-nav-item"
              onClick={() => setIsSectorGoalsModalOpen(true)}
            >
              <span className="sidebar-nav-item-left">
                <SlidersHorizontal size={15} />
                Empresa, Dias & Metas
              </span>
              <span className="sidebar-counter">{metrics.workingDaysCount}d</span>
            </button>

            <button
              id="btn-executive-report"
              className="sidebar-nav-item"
              onClick={() => setIsReportOpen(true)}
            >
              <span className="sidebar-nav-item-left">
                <Printer size={15} />
                Relatório Executivo
              </span>
            </button>

            <button
              id="btn-settings-data"
              className="sidebar-nav-item"
              onClick={onOpenBackup}
            >
              <span className="sidebar-nav-item-left">
                <Download size={15} />
                Backup & CSV
              </span>
            </button>
          </nav>
        </div>
      </div>

      {/* Rodapé da Sidebar: Banco, Tema e Reset */}
      <div className="sidebar-footer">
        <button
          id="btn-supabase-status"
          className="sidebar-status-btn"
          onClick={onOpenSupabase}
          title={isSupabaseActive ? 'Conectado ao Supabase (Nuvem)' : 'Clique para configurar banco em nuvem'}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
            <span
              className="status-dot"
              style={{
                background: isSupabaseActive ? 'var(--accent-emerald)' : 'var(--text-muted)'
              }}
            />
            <Database size={13} />
            <span>{isSupabaseActive ? 'Supabase Online' : 'Banco Local'}</span>
          </span>
          <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            {isSupabaseActive ? 'SYNC' : 'LOCAL'}
          </span>
        </button>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={toggleTheme}
            title="Alternar entre Modo Carbono Escuro e Modo Claro"
          >
            {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
            {theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-icon-only btn-sm"
            onClick={() => {
              if (window.confirm('Atenção: deseja limpar e zerar todo o banco de dados para começar do zero?')) {
                clearAllData();
              }
            }}
            title="Zerar banco de dados"
            style={{ color: 'var(--text-muted)' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
