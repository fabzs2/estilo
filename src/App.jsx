import React, { useState } from 'react';
import { ProductionProvider, useProduction } from './context/ProductionContext';
import { Header } from './components/Header';
import { PeriodBar } from './components/PeriodBar';
import { Dashboard } from './components/Dashboard';
import { OrdersTable } from './components/OrdersTable';
import { TeamManagement } from './components/TeamManagement';
import { QuickEntryModal } from './components/QuickEntryModal';
import { BatchEntryModal } from './components/BatchEntryModal';
import { ExecutiveReportModal } from './components/ExecutiveReportModal';
import { BackupModal } from './components/BackupModal';
import { SupabaseModal } from './components/SupabaseModal';
import { SectorGoalsModal } from './components/SectorGoalsModal';
import { StageEntryModal } from './components/StageEntryModal';

export function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  const {
    isStageModalOpen,
    setIsStageModalOpen,
    targetOrderForStage,
    editingStageEntry,
    initialStageForModal
  } = useProduction();

  return (
    <div className="app-container">
      {/* Barra de Navegação e Topbar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenBackup={() => setIsBackupModalOpen(true)}
        onOpenSupabase={() => setIsSupabaseModalOpen(true)}
      />

      {/* Conteúdo Principal */}
      <main className="main-content">
        {/* Barra de Seleção de Período (visível no Dashboard e em Pedidos) */}
        {(activeTab === 'dashboard' || activeTab === 'orders') && <PeriodBar />}

        {/* Telas Dinâmicas */}
        {activeTab === 'dashboard' && (
          <Dashboard
            onSelectDesigner={() => setActiveTab('orders')}
          />
        )}

        {activeTab === 'orders' && <OrdersTable />}

        {activeTab === 'team' && <TeamManagement />}
      </main>

      {/* Modais Globais de Lançamento e Relatórios */}
      <QuickEntryModal />
      <StageEntryModal
        isOpen={isStageModalOpen}
        onClose={() => setIsStageModalOpen(false)}
        order={targetOrderForStage}
        entry={editingStageEntry}
        initialStage={initialStageForModal}
      />
      <BatchEntryModal />
      <ExecutiveReportModal />
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />
      <SectorGoalsModal />
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0c10',
          color: '#f8fafc',
          padding: '20px',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            background: '#141820',
            border: '1px solid rgba(248, 113, 113, 0.3)',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '500px',
            width: '100%'
          }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '10px', color: '#f87171' }}>
              Falha ao Carregar o Painel
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '20px', lineHeight: 1.5 }}>
              {this.state.error?.message || 'Ocorreu um erro inesperado ao inicializar a interface.'}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '9px 18px',
                  background: '#38bdf8',
                  color: '#0a0c10',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Recarregar Página
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                style={{
                  padding: '9px 18px',
                  background: 'transparent',
                  color: '#94a3b8',
                  borderRadius: '6px',
                  border: '1px solid #334155',
                  cursor: 'pointer'
                }}
              >
                Limpar Cache Local
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <ProductionProvider>
        <AppContent />
      </ProductionProvider>
    </ErrorBoundary>
  );
}
