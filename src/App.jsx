import React, { useState } from 'react';
import { ProductionProvider } from './context/ProductionContext';
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

export function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

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
    </div>
  );
}

export default function App() {
  return (
    <ProductionProvider>
      <AppContent />
    </ProductionProvider>
  );
}
