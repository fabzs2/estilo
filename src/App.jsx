import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProductionProvider, useProduction } from './context/ProductionContext';
import { Header } from './components/Header';
import { PeriodBar } from './components/PeriodBar';
import { Dashboard } from './components/Dashboard';
import { OrdersTable } from './components/OrdersTable';
import { TeamManagement } from './components/TeamManagement';
import { SuperAdminPanel } from './components/SuperAdminPanel';
import { LoginScreen } from './components/LoginScreen';
import { QuickEntryModal } from './components/QuickEntryModal';
import { BatchEntryModal } from './components/BatchEntryModal';
import { ExecutiveReportModal } from './components/ExecutiveReportModal';
import { BackupModal } from './components/BackupModal';
import { SupabaseModal } from './components/SupabaseModal';
import { SectorGoalsModal } from './components/SectorGoalsModal';
import { StageEntryModal } from './components/StageEntryModal';
import { ShieldCheck, ArrowLeft, AlertTriangle, MessageCircle } from 'lucide-react';

export function AppContent() {
  const {
    currentUser,
    activeTenant,
    saasConfig,
    impersonatedTenantId,
    setImpersonatedTenantId
  } = useAuth();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  const {
    isQuickEntryOpen,
    setIsQuickEntryOpen,
    setEditingOrder,
    isBatchEntryOpen,
    setIsBatchEntryOpen,
    isStageModalOpen,
    setIsStageModalOpen,
    targetOrderForStage,
    editingStageEntry,
    initialStageForModal,
    toastNotice,
    setToastNotice
  } = useProduction();

  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Atalhos Globais de Teclado (N = Novo Pedido, B = Lançamento em Lote, Ctrl+K = Buscar na Fila)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+K ou Cmd+K -> Ir para Fila de Pedidos e focar na busca
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setActiveTab('orders');
        setTimeout(() => {
          const searchInput = document.getElementById('search-orders-input');
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
        }, 40);
        return;
      }

      // Ignora teclas simples se estiver digitando em campos de texto ou se algum modal estiver aberto
      const tag = (e.target?.tagName || '').toUpperCase();
      const isEditable =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        e.target?.isContentEditable;
      if (isEditable || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isQuickEntryOpen || isBatchEntryOpen || isStageModalOpen || isBackupModalOpen || isSupabaseModalOpen) return;

      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setEditingOrder(null);
        setIsQuickEntryOpen(true);
      } else if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsBatchEntryOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isQuickEntryOpen,
    isBatchEntryOpen,
    isStageModalOpen,
    isBackupModalOpen,
    isSupabaseModalOpen,
    setEditingOrder,
    setIsQuickEntryOpen,
    setIsBatchEntryOpen
  ]);

  // Cálculo de Dias Restantes para Aviso Automático de Vencimento de Licença (<= 5 dias)
  const daysUntilExpiry = (() => {
    if (!activeTenant?.expiresAt) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(activeTenant.expiresAt + 'T00:00:00');
    const diffMs = exp.getTime() - today.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  })();

  const showLicenseWarning =
    !isSuperAdmin && daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 5;

  const buildWhatsappRenewLink = () => {
    const rawPhone = (saasConfig?.supportWhatsapp || '').replace(/\D/g, '');
    const msg = encodeURIComponent(
      `Olá! Gostaria de renovar a licença do sistema KromaOPS da empresa *${activeTenant?.name || 'Minha Empresa'}* (vencimento: ${activeTenant?.expiresAt?.split('-').reverse().join('/')}).`
    );
    return rawPhone ? `https://wa.me/${rawPhone}?text=${msg}` : `https://wa.me/?text=${msg}`;
  };

  return (
    <div className="app-shell">
      {/* Sidebar Lateral Fixa */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenBackup={() => setIsBackupModalOpen(true)}
        onOpenSupabase={() => setIsSupabaseModalOpen(true)}
      />

      {/* Área de Trabalho Principal */}
      <div className="app-workspace">
        {/* Régua Automática de Cobrança: Aviso quando faltam <= 5 dias para vencer a licença */}
        {showLicenseWarning && (
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.12)',
              borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
              padding: '8px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              fontSize: '0.76rem'
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <AlertTriangle size={14} color="var(--accent-amber)" />
              <span>
                {daysUntilExpiry === 0 ? (
                  <>A licença de uso da empresa <strong>{activeTenant?.name}</strong> vence <strong>HOJE</strong>.</>
                ) : (
                  <>
                    A licença de uso da empresa <strong>{activeTenant?.name}</strong> vence em{' '}
                    <strong>{daysUntilExpiry} dia(s)</strong> ({activeTenant?.expiresAt?.split('-').reverse().join('/')}).
                  </>
                )}{' '}
                Renove antecipadamente para manter o acesso ininterrupto.
              </span>
            </span>

            <a
              href={buildWhatsappRenewLink()}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#10b981',
                color: '#052e16',
                fontWeight: 700,
                fontSize: '0.72rem',
                padding: '4px 10px',
                borderRadius: '4px',
                textDecoration: 'none'
              }}
            >
              <MessageCircle size={13} />
              Renovar no WhatsApp
            </a>
          </div>
        )}
        {/* Barra Superior de Inspecionar Empresa (Quando Super Admin entra em uma empresa cliente) */}
        {isSuperAdmin && impersonatedTenantId && activeTab !== 'super_admin' && (
          <div
            style={{
              background: 'rgba(59, 130, 246, 0.1)',
              borderBottom: '1px solid rgba(59, 130, 246, 0.25)',
              padding: '7px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              fontSize: '0.75rem'
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', color: 'var(--text-primary)' }}>
              <ShieldCheck size={14} color="var(--accent-blue)" />
              Visualizando ambiente da empresa: <strong>{activeTenant?.name}</strong>
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ padding: '3px 9px', fontSize: '0.7rem' }}
              onClick={() => {
                setImpersonatedTenantId(null);
                setActiveTab('super_admin');
              }}
            >
              <ArrowLeft size={12} />
              Voltar para Central SaaS
            </button>
          </div>
        )}

        <main className="main-content">
          {/* Barra de Seleção de Período (visível no Dashboard e em Pedidos) */}
          {(activeTab === 'dashboard' || activeTab === 'orders') && <PeriodBar />}

          {/* Telas Dinâmicas */}
          {activeTab === 'super_admin' && isSuperAdmin && (
            <SuperAdminPanel onEnterCompanyWorkspace={() => setActiveTab('dashboard')} />
          )}

          {activeTab === 'dashboard' && (
            <Dashboard
              onSelectDesigner={() => setActiveTab('orders')}
              onGoToTeam={() => setActiveTab('team')}
            />
          )}

          {activeTab === 'orders' && <OrdersTable />}

          {activeTab === 'team' && <TeamManagement />}
        </main>
      </div>

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

      {/* Toast Global de Celebração / Feedback */}
      {toastNotice && (
        <div
          className="toast-notice"
          style={{
            borderColor: toastNotice.type === 'celebration' ? '#34d399' : 'var(--border-light)',
            background: toastNotice.type === 'celebration' ? '#132520' : 'var(--bg-surface-elevated)',
            cursor: 'pointer'
          }}
          onClick={() => setToastNotice(null)}
        >
          <span>{toastNotice.message}</span>
        </div>
      )}
    </div>
  );
}

function AuthenticatedAppGate() {
  const { isInitializing, currentUser, activeTenantId, activeTenant } = useAuth();

  if (isInitializing) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#09090b',
          color: '#fafafa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          fontSize: '0.82rem'
        }}
      >
        <span className="spinner" />
        <span>Inicializando KromaOPS...</span>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <ProductionProvider key={activeTenantId} tenantId={activeTenantId} tenantInfo={activeTenant}>
      <AppContent />
    </ProductionProvider>
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
          background: '#09090b',
          color: '#fafafa',
          padding: '20px',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            background: '#111113',
            border: '1px solid rgba(248, 113, 113, 0.3)',
            borderRadius: '10px',
            padding: '32px',
            maxWidth: '500px',
            width: '100%'
          }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#f87171' }}>
              Falha ao Carregar o Painel
            </h2>
            <p style={{ fontSize: '0.83rem', color: '#a1a1aa', marginBottom: '20px', lineHeight: 1.5 }}>
              {this.state.error?.message || 'Ocorreu um erro inesperado ao inicializar a interface.'}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '8px 16px',
                  background: '#fafafa',
                  color: '#09090b',
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
                  padding: '8px 16px',
                  background: 'transparent',
                  color: '#a1a1aa',
                  borderRadius: '6px',
                  border: '1px solid #2e2e34',
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
      <AuthProvider>
        <AuthenticatedAppGate />
      </AuthProvider>
    </ErrorBoundary>
  );
}
