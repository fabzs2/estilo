import React, { useState, useMemo } from 'react';
import { useProduction, getOrderQueueStatus } from '../context/ProductionContext';
import { useAuth } from '../context/AuthContext';
import { STAGES, ORDER_TYPES, WORK_TYPES } from '../constants/initialData';
import {
  Search,
  Download,
  PlusCircle,
  Edit3,
  Trash2,
  Layers,
  Calendar,
  PenTool,
  Printer,
  Inbox,
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  LayoutList,
  Columns
} from 'lucide-react';

export function OrdersTable() {
  const { currentUser } = useAuth();
  const isOperator = currentUser?.role === 'company_operator';

  const {
    filteredOrders,
    queueStatusCounts,
    designers,
    selectedStageFilter,
    setSelectedStageFilter,
    selectedQueueStatusFilter,
    setSelectedQueueStatusFilter,
    selectedDesignerFilter,
    setSelectedDesignerFilter,
    selectedWorkTypeFilter,
    setSelectedWorkTypeFilter,
    searchTerm,
    setSearchTerm,
    exportToCSV,
    deleteOrder,
    deleteEntryFromOrder,
    setEditingOrder,
    setIsQuickEntryOpen,
    openAddStageToOrder,
    openEditStageInOrder
  } = useProduction();

  // Alternância entre Modo Tabela e Modo Quadro Kanban
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'kanban'

  // Controle de linhas expandidas para ver o histórico de lançamentos do pedido
  const [expandedOrders, setExpandedOrders] = useState(new Set());

  // Ordenação por coluna
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: key === 'clientName' || key === 'orderNumber' ? 'asc' : 'desc' };
    });
  };

  // Lista ordenada conforme coluna selecionada
  const sortedOrders = useMemo(() => {
    const list = [...filteredOrders];
    const dir = sortConfig.direction === 'asc' ? 1 : -1;

    const statusWeight = {
      aguardando_arte: 1,
      falta_exportar: 2,
      falta_imprimir: 3,
      concluido: 4
    };

    list.sort((a, b) => {
      switch (sortConfig.key) {
        case 'date': {
          const da = a.date || '';
          const db = b.date || '';
          if (da !== db) return da.localeCompare(db) * dir;
          return (a.orderNumber || '').localeCompare(b.orderNumber || '') * dir;
        }
        case 'orderNumber':
          return (a.orderNumber || '').localeCompare(b.orderNumber || '', undefined, { numeric: true }) * dir;
        case 'clientName':
          return (a.clientName || '').localeCompare(b.clientName || '') * dir;
        case 'totalPieces':
          return ((Number(a.totalPieces) || 0) - (Number(b.totalPieces) || 0)) * dir;
        case 'status': {
          const wa = statusWeight[getOrderQueueStatus(a)] || 0;
          const wb = statusWeight[getOrderQueueStatus(b)] || 0;
          return (wa - wb) * dir;
        }
        default:
          return 0;
      }
    });

    return list;
  }, [filteredOrders, sortConfig]);

  // Totais em tempo real dos pedidos filtrados na tela
  const filteredTotals = useMemo(() => {
    let totalPieces = 0;
    let printedPieces = 0;
    let totalMeters = 0;
    let artesCount = 0;
    let exportacoesCount = 0;

    filteredOrders.forEach((ord) => {
      totalPieces += Number(ord.totalPieces) || 0;
      (ord.entries || []).forEach((ent) => {
        totalMeters += Number(ent.meters) || 0;
        if (ent.stage === 'criacao') {
          artesCount += Number(ent.piecesCount) > 0 ? Number(ent.piecesCount) : 1;
        } else if (ent.stage === 'exportacao') {
          exportacoesCount += Number(ent.piecesCount) > 0 ? Number(ent.piecesCount) : 1;
        } else if (ent.stage === 'impressao') {
          printedPieces += Number(ent.piecesCount) || 0;
        }
      });
    });

    return {
      ordersCount: filteredOrders.length,
      totalPieces,
      printedPieces,
      totalMeters: Number(totalMeters.toFixed(1)),
      artesCount,
      exportacoesCount
    };
  }, [filteredOrders]);

  const toggleExpand = (orderId) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const handleEditOrder = (order) => {
    setEditingOrder(order);
    setIsQuickEntryOpen(true);
  };

  const handleDeleteOrder = (order) => {
    if (window.confirm(`Tem certeza que deseja excluir o pedido ${order.orderNumber} (${order.clientName}) e todos os seus lançamentos?`)) {
      deleteOrder(order.id);
    }
  };

  const handleDeleteLaunch = (orderId, entryId, stageName) => {
    if (window.confirm(`Deseja excluir este lançamento de ${stageName}?`)) {
      deleteEntryFromOrder(orderId, entryId);
    }
  };

  const formatDateBR = (dateStr) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const renderSortIcon = (colKey) => {
    if (sortConfig.key !== colKey) {
      return <ArrowUpDown size={11} color="var(--text-muted)" style={{ opacity: 0.5 }} />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp size={11} color="var(--accent-blue)" />
    ) : (
      <ArrowDown size={11} color="var(--accent-blue)" />
    );
  };

  const hasAnyFilter =
    selectedQueueStatusFilter !== 'all' ||
    selectedDesignerFilter !== 'all' ||
    selectedStageFilter !== 'all' ||
    selectedWorkTypeFilter !== 'all' ||
    Boolean(searchTerm);

  const queuePills = [
    { id: 'all', label: 'Todos na Fila', count: queueStatusCounts?.all || 0, color: 'var(--text-primary)', dot: null },
    { id: 'aguardando_arte', label: 'Aguardando Arte', count: queueStatusCounts?.aguardando_arte || 0, color: 'var(--text-secondary)', dot: '#71717a' },
    { id: 'falta_exportar', label: 'Falta Exportar', count: queueStatusCounts?.falta_exportar || 0, color: '#3b82f6', dot: '#3b82f6' },
    { id: 'falta_imprimir', label: 'Pronto p/ Imprimir', count: queueStatusCounts?.falta_imprimir || 0, color: '#8b5cf6', dot: '#8b5cf6' },
    { id: 'concluido', label: 'Concluídos', count: queueStatusCounts?.concluido || 0, color: '#10b981', dot: '#10b981' }
  ];

  return (
    <div className="orders-view">
      {/* 1. Pílulas Rápidas de Status da Fila de Pendências + Seletor Tabela / Kanban */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          marginBottom: '12px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--text-muted)', marginRight: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Fila:
          </span>
          {queuePills.map((pill) => {
            const isActive = selectedQueueStatusFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setSelectedQueueStatusFilter(pill.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '5px 11px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.75rem',
                  fontWeight: isActive ? 600 : 500,
                  background: isActive ? 'var(--bg-surface-elevated)' : 'var(--bg-secondary)',
                  border: isActive ? '1px solid var(--border-light)' : '1px solid var(--border-subtle)',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'var(--trans-fast)'
                }}
              >
                {pill.dot && <span className="status-dot" style={{ background: pill.dot }} />}
                <span>{pill.label}</span>
                <span
                  className="mono"
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    padding: '0px 5px',
                    borderRadius: 'var(--radius-sm)',
                    background: isActive ? 'var(--bg-primary)' : 'var(--bg-surface)',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Seletor de Modo: Tabela vs Quadro Kanban */}
        <div
          style={{
            display: 'inline-flex',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '2px',
            gap: '2px'
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode('table')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.73rem',
              fontWeight: viewMode === 'table' ? 600 : 500,
              background: viewMode === 'table' ? 'var(--bg-surface-elevated)' : 'transparent',
              color: viewMode === 'table' ? 'var(--text-primary)' : 'var(--text-muted)',
              border: viewMode === 'table' ? '1px solid var(--border-light)' : '1px solid transparent',
              cursor: 'pointer'
            }}
          >
            <LayoutList size={13} />
            Tabela
          </button>
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.73rem',
              fontWeight: viewMode === 'kanban' ? 600 : 500,
              background: viewMode === 'kanban' ? 'var(--bg-surface-elevated)' : 'transparent',
              color: viewMode === 'kanban' ? 'var(--text-primary)' : 'var(--text-muted)',
              border: viewMode === 'kanban' ? '1px solid var(--border-light)' : '1px solid transparent',
              cursor: 'pointer'
            }}
          >
            <Columns size={13} />
            Quadro Kanban
          </button>
        </div>
      </div>

      {/* 2. Barra de Filtros e Busca */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 18px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap'
        }}
      >
        {/* Campo de Busca */}
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search
            size={15}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            id="search-orders-input"
            type="text"
            className="form-input"
            style={{ paddingLeft: '34px' }}
            placeholder="Buscar por cliente, pedido, designer... (Ctrl+K)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filtros Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Filtro por Designer */}
          <select
            id="filter-designer-select"
            className="form-select"
            style={{ width: 'auto', minWidth: '150px' }}
            value={selectedDesignerFilter}
            onChange={(e) => setSelectedDesignerFilter(e.target.value)}
          >
            <option value="all">Todos os Designers</option>
            {designers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Filtro por Etapa Realizada */}
          <select
            id="filter-stage-select"
            className="form-select"
            style={{ width: 'auto', minWidth: '145px' }}
            value={selectedStageFilter}
            onChange={(e) => setSelectedStageFilter(e.target.value)}
          >
            <option value="all">Qualquer Etapa</option>
            <option value="criacao">Com Criação</option>
            <option value="exportacao">Com Exportação</option>
            <option value="impressao">Com Impressão</option>
          </select>

          {/* Filtro por Tipo de Lançamento */}
          <select
            id="filter-work-type-select"
            className="form-select"
            style={{ width: 'auto', minWidth: '135px' }}
            value={selectedWorkTypeFilter}
            onChange={(e) => setSelectedWorkTypeFilter(e.target.value)}
          >
            <option value="all">Todos os Tipos</option>
            <option value="arte_nova">Arte Nova</option>
            <option value="ajuste_refacao">Ajuste / Refação</option>
            <option value="reposicao">Reposição</option>
          </select>

          {/* Botão Exportar CSV (apenas Gestor / Super Admin) */}
          {!isOperator && (
            <button
              id="btn-export-csv"
              className="btn btn-secondary btn-sm"
              onClick={exportToCSV}
              title="Exportar dados filtrados para planilha Excel/CSV"
            >
              <Download size={14} />
              CSV
            </button>
          )}

          {/* Botão Novo Pedido */}
          <button
            id="btn-new-order-table"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setEditingOrder(null);
              setIsQuickEntryOpen(true);
            }}
          >
            <PlusCircle size={14} />
            + Novo Pedido
          </button>
        </div>
      </div>

      {/* 3. Tabela de Pedidos Únicos */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden'
        }}
      >
        {/* Barra de Resumo & Totais da Busca */}
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            background: 'var(--bg-surface)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>
              Exibindo <strong className="mono" style={{ color: 'var(--text-primary)' }}>{filteredTotals.ordersCount}</strong> pedido(s)
            </span>
            <span>·</span>
            <span>
              Peças: <strong className="mono" style={{ color: 'var(--text-primary)' }}>{filteredTotals.totalPieces.toLocaleString('pt-BR')}</strong>
            </span>
            <span>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span className="status-dot" style={{ background: '#3b82f6', width: '5px', height: '5px' }} />
              Artes: <strong className="mono" style={{ color: 'var(--text-primary)' }}>{filteredTotals.artesCount}</strong>
            </span>
            <span>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span className="status-dot" style={{ background: '#8b5cf6', width: '5px', height: '5px' }} />
              Fechamentos: <strong className="mono" style={{ color: 'var(--text-primary)' }}>{filteredTotals.exportacoesCount}</strong>
            </span>
            <span>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span className="status-dot" style={{ background: '#10b981', width: '5px', height: '5px' }} />
              Impressas: <strong className="mono" style={{ color: 'var(--text-primary)' }}>{filteredTotals.printedPieces.toLocaleString('pt-BR')} pçs</strong>
              {filteredTotals.totalMeters > 0 && <span className="mono">({filteredTotals.totalMeters}m)</span>}
            </span>
          </div>

          {hasAnyFilter && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSelectedQueueStatusFilter('all');
                setSelectedDesignerFilter('all');
                setSelectedStageFilter('all');
                setSelectedWorkTypeFilter('all');
                setSearchTerm('');
              }}
            >
              Limpar Filtros
            </button>
          )}
        </div>

        {sortedOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
            <Inbox size={40} strokeWidth={1.5} color="var(--border-light)" style={{ marginBottom: '12px' }} />
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px', fontSize: '0.95rem' }}>Nenhum pedido encontrado</h4>
            <p style={{ fontSize: '0.78rem', maxWidth: '380px', margin: '0 auto 16px' }}>
              Nenhum pedido corresponde aos filtros ou período selecionado.
            </p>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditingOrder(null);
                setIsQuickEntryOpen(true);
              }}
            >
              <PlusCircle size={14} />
              Criar Primeiro Pedido
            </button>
          </div>
        ) : viewMode === 'kanban' ? (
          /* MODO QUADRO KANBAN (4 COLUNAS) */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(255px, 1fr))',
              gap: '14px',
              padding: '16px',
              background: 'var(--bg-primary)'
            }}
          >
            {[
              {
                id: 'aguardando_arte',
                title: '1. Aguardando Arte',
                color: '#a1a1aa',
                dot: '#71717a',
                nextStage: 'criacao',
                nextLabel: '+ Criar Arte',
                nextColor: '#60a5fa'
              },
              {
                id: 'falta_exportar',
                title: '2. Falta Exportar',
                color: '#60a5fa',
                dot: '#3b82f6',
                nextStage: 'exportacao',
                nextLabel: '+ Exportar',
                nextColor: '#a78bfa'
              },
              {
                id: 'falta_imprimir',
                title: '3. Pronto p/ Imprimir',
                color: '#a78bfa',
                dot: '#8b5cf6',
                nextStage: 'impressao',
                nextLabel: '+ Imprimir',
                nextColor: '#34d399'
              },
              {
                id: 'concluido',
                title: '4. Concluídos (100%)',
                color: '#34d399',
                dot: '#10b981',
                nextStage: null,
                nextLabel: null,
                nextColor: null
              }
            ].map((col) => {
              const colOrders = sortedOrders.filter((o) => getOrderQueueStatus(o) === col.id);
              const colPieces = colOrders.reduce((acc, o) => acc + (Number(o.totalPieces) || 0), 0);

              return (
                <div
                  key={col.id}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '680px'
                  }}
                >
                  {/* Cabeçalho da Coluna Kanban */}
                  <div
                    style={{
                      padding: '10px 12px',
                      borderBottom: '1px solid var(--border-subtle)',
                      background: 'var(--bg-surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <span className="status-dot" style={{ background: col.dot }} />
                      <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {col.title}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span className="mono" style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>
                        {colPieces} pçs
                      </span>
                      <span
                        className="mono"
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-light)',
                          color: col.color
                        }}
                      >
                        {colOrders.length}
                      </span>
                    </div>
                  </div>

                  {/* Lista de Cards da Coluna */}
                  <div
                    style={{
                      padding: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      overflowY: 'auto',
                      flex: 1
                    }}
                  >
                    {colOrders.length === 0 ? (
                      <div
                        style={{
                          padding: '28px 12px',
                          textAlign: 'center',
                          fontSize: '0.73rem',
                          color: 'var(--text-muted)',
                          border: '1px dashed var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        Nenhum pedido nesta etapa
                      </div>
                    ) : (
                      colOrders.map((ord) => {
                        const wt = WORK_TYPES[ord.workType || 'arte_nova'] || WORK_TYPES.arte_nova;
                        const ordEntries = ord.entries || [];
                        return (
                          <div
                            key={ord.id}
                            style={{
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-light)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '10px 12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '7px'
                            }}
                          >
                            {/* Linha 1: Código + Data + Ações */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span
                                  className="mono"
                                  style={{
                                    fontSize: '0.73rem',
                                    fontWeight: 700,
                                    color: 'var(--text-primary)',
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-subtle)',
                                    padding: '1px 6px',
                                    borderRadius: '3px'
                                  }}
                                >
                                  {ord.orderNumber}
                                </span>
                                <span
                                  style={{
                                    fontSize: '0.62rem',
                                    fontWeight: 600,
                                    color: wt.color,
                                    background: wt.bgLight,
                                    border: `1px solid ${wt.border}`,
                                    padding: '0px 5px',
                                    borderRadius: '3px'
                                  }}
                                >
                                  {wt.name}
                                </span>
                              </div>
                              <span className="mono" style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>
                                {formatDateBR(ord.date)}
                              </span>
                            </div>

                            {/* Linha 2: Nome do Cliente + Observação */}
                            <div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.25 }}>
                                {ord.clientName}
                              </div>
                              {ord.notes && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  {ord.notes}
                                </div>
                              )}
                            </div>

                            {/* Linha 3: Peças + Designers que já atuaram */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px', fontSize: '0.7rem' }}>
                              <span className="mono" style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                                {ord.totalPieces > 0 ? `${ord.totalPieces} pçs` : 'Sem qtd'}
                              </span>
                              {ordEntries.length > 0 && (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
                                  {Array.from(new Set(ordEntries.map((e) => e.designerName))).join(', ')}
                                </span>
                              )}
                            </div>

                            {/* Linha 4: Botão de Avanço Rápido 1-Clique + Editar */}
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '6px',
                                paddingTop: '6px',
                                borderTop: '1px solid var(--border-subtle)'
                              }}
                            >
                              {col.nextStage ? (
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  style={{
                                    flex: 1,
                                    padding: '4px 8px',
                                    fontSize: '0.71rem',
                                    color: col.nextColor,
                                    borderColor: 'var(--border-light)',
                                    justifyContent: 'center'
                                  }}
                                  onClick={() => openAddStageToOrder(ord, col.nextStage)}
                                >
                                  {col.nextLabel}
                                </button>
                              ) : (
                                <span
                                  className="mono"
                                  style={{
                                    fontSize: '0.68rem',
                                    color: 'var(--accent-emerald)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontWeight: 600
                                  }}
                                >
                                  <Check size={11} /> Finalizado
                                </span>
                              )}

                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-icon-only btn-sm"
                                  style={{ width: '24px', height: '24px' }}
                                  onClick={() => handleEditOrder(ord)}
                                  title="Editar pedido"
                                >
                                  <Edit3 size={11} />
                                </button>
                                {!isOperator && (
                                  <button
                                    type="button"
                                    className="btn btn-danger btn-icon-only btn-sm"
                                    style={{ width: '24px', height: '24px' }}
                                    onClick={() => handleDeleteOrder(ord)}
                                    title="Excluir pedido"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}></th>
                  <th
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('date')}
                    title="Clique para ordenar por Data"
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      Data {renderSortIcon('date')}
                    </div>
                  </th>
                  <th
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('orderNumber')}
                    title="Clique para ordenar por Nº do Pedido"
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      Nº Pedido {renderSortIcon('orderNumber')}
                    </div>
                  </th>
                  <th
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('clientName')}
                    title="Clique para ordenar por Cliente"
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      Cliente & Detalhes do Uniforme {renderSortIcon('clientName')}
                    </div>
                  </th>
                  <th
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('totalPieces')}
                    title="Clique para ordenar por Quantidade de Peças"
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      Processo & Peças {renderSortIcon('totalPieces')}
                    </div>
                  </th>
                  <th
                    style={{ minWidth: '220px', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('status')}
                    title="Clique para ordenar pelo Status de Produção"
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      Etapas / Status de Produção {renderSortIcon('status')}
                    </div>
                  </th>
                  <th style={{ minWidth: '120px' }}>Próxima Ação</th>
                  <th style={{ textAlign: 'center', width: '130px' }}>Gerenciar</th>
                </tr>
              </thead>
              <tbody>
                {sortedOrders.map((order) => {
                  const isExpanded = expandedOrders.has(order.id);
                  const orderEntries = order.entries || [];

                  // Identifica lançamentos de cada etapa
                  const criacaoEntries = orderEntries.filter((e) => e.stage === 'criacao');
                  const exportacaoEntries = orderEntries.filter((e) => e.stage === 'exportacao');
                  const impressaoEntries = orderEntries.filter((e) => e.stage === 'impressao');

                  const hasCriacao = criacaoEntries.length > 0;
                  const hasExportacao = exportacaoEntries.length > 0;
                  const hasImpressao = impressaoEntries.length > 0;

                  // Status Geral do Pedido
                  let statusLabel = 'Aguardando Início';
                  let statusColor = '#64748b';
                  let statusBg = 'rgba(100, 116, 139, 0.12)';
                  let statusBorder = 'rgba(100, 116, 139, 0.3)';

                  if (hasImpressao) {
                    statusLabel = 'Concluído (100%)';
                    statusColor = '#34d399';
                    statusBg = 'rgba(52, 211, 153, 0.12)';
                    statusBorder = 'rgba(52, 211, 153, 0.3)';
                  } else if (hasExportacao) {
                    statusLabel = 'Pronto p/ Imprimir';
                    statusColor = '#a78bfa';
                    statusBg = 'rgba(167, 139, 250, 0.12)';
                    statusBorder = 'rgba(167, 139, 250, 0.3)';
                  } else if (hasCriacao) {
                    statusLabel = 'Falta Exportar';
                    statusColor = '#60a5fa';
                    statusBg = 'rgba(96, 165, 250, 0.12)';
                    statusBorder = 'rgba(96, 165, 250, 0.3)';
                  }

                  const wt = WORK_TYPES[order.workType || 'arte_nova'] || WORK_TYPES.arte_nova;
                  const orderTypeObj = ORDER_TYPES.find((t) => t.id === order.orderType);

                  return (
                    <React.Fragment key={order.id}>
                      <tr
                        style={{
                          background: isExpanded ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        {/* Botão de Expandir / Recolher */}
                        <td style={{ textAlign: 'center', padding: '10px 6px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-icon-only btn-sm"
                            style={{ width: '24px', height: '24px', borderRadius: '4px' }}
                            onClick={() => toggleExpand(order.id)}
                            title={isExpanded ? 'Recolher lançamentos' : `Ver ${orderEntries.length} lançamento(s) deste pedido`}
                          >
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        </td>

                        {/* Data */}
                        <td className="mono" style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                          {formatDateBR(order.date)}
                        </td>

                        {/* Pedido */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                            <span
                              className="order-code-badge"
                              style={{
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                background: 'var(--bg-surface)',
                                padding: '2px 7px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-subtle)',
                                fontSize: '0.77rem'
                              }}
                            >
                              {order.orderNumber}
                            </span>
                            {/* Tag do Tipo de Trabalho */}
                            <span
                              style={{
                                fontSize: '0.64rem',
                                fontWeight: 600,
                                color: wt.color,
                                background: wt.bgLight,
                                border: `1px solid ${wt.border}`,
                                padding: '1px 5px',
                                borderRadius: 'var(--radius-sm)',
                                whiteSpace: 'nowrap',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title={wt.description}
                            >
                              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: wt.color, display: 'inline-block' }} />
                              {wt.name}
                            </span>
                          </div>
                        </td>

                        {/* Cliente e Detalhes */}
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.83rem' }}>
                            {order.clientName}
                          </div>
                          {order.notes && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                              {order.notes}
                            </div>
                          )}
                        </td>

                        {/* Processo & Total de Peças */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                            <span
                              style={{
                                fontSize: '0.73rem',
                                color: 'var(--text-secondary)',
                                fontWeight: 500
                              }}
                            >
                              {orderTypeObj?.name || order.orderType}
                            </span>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                background: 'var(--bg-surface-elevated)',
                                padding: '1px 6px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-light)'
                              }}
                            >
                              {order.totalPieces > 0 ? `${order.totalPieces} peças` : 'Qtd não informada'}
                            </span>
                          </div>
                        </td>

                        {/* Etapas / Status de Produção */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {/* Badge do Status Geral */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  color: statusColor,
                                  background: statusBg,
                                  border: `1px solid ${statusBorder}`,
                                  padding: '1px 6px',
                                  borderRadius: 'var(--radius-sm)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                {statusLabel}
                              </span>
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                ({orderEntries.length} lançamento{orderEntries.length !== 1 ? 's' : ''})
                              </span>
                            </div>

                            {/* Chips das Etapas Realizadas */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                              {/* Chip Criação */}
                              {hasCriacao ? (
                                <span
                                  className="stage-badge"
                                  style={{ color: '#60a5fa', borderColor: 'rgba(96, 165, 250, 0.3)', fontSize: '0.7rem', padding: '1px 6px' }}
                                  title={`Criação feita por ${criacaoEntries.map((e) => e.designerName).join(', ')}`}
                                >
                                  <PenTool size={10} />
                                  {criacaoEntries[0]?.designerName || 'Criação'}
                                  {criacaoEntries.length > 1 && ` (${criacaoEntries.length}x)`}
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', border: '1px dashed var(--border-subtle)', padding: '1px 5px', borderRadius: '4px' }}>
                                  Arte Pendente
                                </span>
                              )}

                              {/* Chip Exportação */}
                              {hasExportacao ? (
                                <span
                                  className="stage-badge"
                                  style={{ color: '#a78bfa', borderColor: 'rgba(167, 139, 250, 0.3)', fontSize: '0.7rem', padding: '1px 6px' }}
                                  title={`Exportado por ${exportacaoEntries.map((e) => e.designerName).join(', ')}`}
                                >
                                  <Layers size={10} />
                                  {exportacaoEntries[0]?.designerName || 'Exp'}
                                  {exportacaoEntries.length > 1 && ` (${exportacaoEntries.length}x)`}
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', border: '1px dashed var(--border-subtle)', padding: '1px 5px', borderRadius: '4px' }}>
                                  Exp Pendente
                                </span>
                              )}

                              {/* Chip Impressão */}
                              {hasImpressao ? (
                                <span
                                  className="stage-badge"
                                  style={{ color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.3)', fontSize: '0.7rem', padding: '1px 6px' }}
                                  title={`Impresso por ${impressaoEntries.map((e) => e.designerName).join(', ')}`}
                                >
                                  <Printer size={10} />
                                  {impressaoEntries[0]?.designerName || 'Plotter'}
                                  {impressaoEntries.length > 1 && ` (${impressaoEntries.length}x)`}
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', border: '1px dashed var(--border-subtle)', padding: '1px 5px', borderRadius: '4px' }}>
                                  Imp Pendente
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Próxima Ação Rápida */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {hasImpressao ? (
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  color: '#34d399',
                                  background: 'rgba(52, 211, 153, 0.08)',
                                  border: '1px solid rgba(52, 211, 153, 0.25)',
                                  padding: '2px 6px',
                                  borderRadius: 'var(--radius-sm)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Check size={11} /> 100% Finalizado
                              </span>
                            ) : !hasCriacao ? (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{
                                  padding: '2px 7px',
                                  fontSize: '0.68rem',
                                  borderColor: 'rgba(96, 165, 250, 0.4)',
                                  color: '#93c5fd',
                                  height: 'auto',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                onClick={() => openAddStageToOrder(order, 'criacao')}
                                title="Lançar etapa de Criação de Arte para este pedido"
                              >
                                <PenTool size={11} /> + Criar Arte
                              </button>
                            ) : !hasExportacao ? (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{
                                  padding: '2px 7px',
                                  fontSize: '0.68rem',
                                  borderColor: 'rgba(167, 139, 250, 0.4)',
                                  color: '#c4b5fd',
                                  height: 'auto',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                onClick={() => openAddStageToOrder(order, 'exportacao')}
                                title="Lançar etapa de Exportação para este pedido"
                              >
                                <Layers size={11} /> + Exportar
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{
                                  padding: '2px 7px',
                                  fontSize: '0.68rem',
                                  borderColor: 'rgba(52, 211, 153, 0.4)',
                                  color: '#6ee7b7',
                                  height: 'auto',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                onClick={() => openAddStageToOrder(order, 'impressao')}
                                title="Lançar etapa de Impressão para este pedido"
                              >
                                <Printer size={11} /> + Imprimir
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Gerenciar Pedido & Lançamentos */}
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {/* Botão + Lançamento */}
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              style={{ padding: '3px 7px', fontSize: '0.68rem', height: '26px', gap: '3px' }}
                              onClick={() =>
                                openAddStageToOrder(
                                  order,
                                  !hasCriacao ? 'criacao' : !hasExportacao ? 'exportacao' : 'impressao'
                                )
                              }
                              title="Adicionar um lançamento neste pedido (etapa seguinte ou refação)"
                            >
                              <Plus size={11} />
                              Lançar
                            </button>

                            {/* Editar Pedido */}
                            <button
                              type="button"
                              className="btn btn-secondary btn-icon-only btn-sm"
                              style={{ width: '26px', height: '26px' }}
                              onClick={() => handleEditOrder(order)}
                              title="Editar dados gerais e etapas do pedido"
                            >
                              <Edit3 size={12} />
                            </button>

                            {/* Excluir Pedido (oculto para Operadores) */}
                            {!isOperator && (
                              <button
                                type="button"
                                className="btn btn-danger btn-icon-only btn-sm"
                                style={{ width: '26px', height: '26px' }}
                                onClick={() => handleDeleteOrder(order)}
                                title="Excluir este pedido e seus lançamentos"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* GAVETA EXPANDIDA: Histórico de Lançamentos Internos deste Pedido */}
                      {isExpanded && (
                        <tr style={{ background: 'rgba(14, 17, 23, 0.65)' }}>
                          <td colSpan={8} style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-light)' }}>
                            <div
                              style={{
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border-light)',
                                borderRadius: 'var(--radius-md)',
                                padding: '14px 16px'
                              }}
                            >
                              {/* Header da Gaveta */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <FileText size={13} color="var(--text-muted)" />
                                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    Histórico de Etapas — <span className="mono">{order.orderNumber}</span> ({order.clientName})
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  style={{ fontSize: '0.72rem', padding: '4px 10px', gap: '4px' }}
                                  onClick={() => openAddStageToOrder(order, 'criacao')}
                                >
                                  <Plus size={12} />
                                  Adicionar Etapa
                                </button>
                              </div>

                              {/* Lista de Lançamentos */}
                              {orderEntries.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                  Nenhum lançamento interno registrado neste pedido ainda. Clique em "+ Adicionar Lançamento" acima.
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {orderEntries.map((entry, idx) => {
                                    const entryStage = STAGES[entry.stage] || STAGES.criacao;
                                    const entryWork = WORK_TYPES[entry.workType || 'arte_nova'] || WORK_TYPES.arte_nova;
                                    const entryDesigner = designers.find((d) => d.id === entry.designerId);

                                    return (
                                      <div
                                        key={entry.id || idx}
                                        style={{
                                          background: 'var(--bg-secondary)',
                                          border: '1px solid var(--border-subtle)',
                                          borderRadius: 'var(--radius-sm)',
                                          padding: '10px 14px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          flexWrap: 'wrap',
                                          gap: '12px'
                                        }}
                                      >
                                        {/* Informações da Etapa */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                          {/* Badge da Etapa */}
                                          <span
                                            className="stage-badge"
                                            style={{
                                              color: entryStage.color,
                                              background: entryStage.bgLight,
                                              borderColor: entryStage.color,
                                              fontWeight: 600
                                            }}
                                          >
                                            {entry.stage === 'criacao' && <PenTool size={11} />}
                                            {entry.stage === 'exportacao' && <Layers size={11} />}
                                            {entry.stage === 'impressao' && <Printer size={11} />}
                                            {entryStage.name}
                                          </span>

                                          {/* Responsável */}
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div
                                              className="avatar-badge"
                                              style={{
                                                width: '22px',
                                                height: '22px',
                                                fontSize: '0.68rem',
                                                background: entryDesigner?.avatarColor || 'var(--bg-surface-elevated)',
                                                color: '#ffffff',
                                                borderColor: 'rgba(255,255,255,0.2)'
                                              }}
                                            >
                                              {(entry.designerName || 'D').charAt(0)}
                                            </div>
                                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                              {entry.designerName}
                                            </span>
                                          </div>

                                          {/* Data do Lançamento */}
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                                            <Calendar size={11} />
                                            {formatDateBR(entry.date)}
                                          </div>

                                          {/* Tipo de Trabalho */}
                                          <span
                                            style={{
                                              fontSize: '0.65rem',
                                              color: entryWork.color,
                                              background: entryWork.bgLight,
                                              border: `1px solid ${entryWork.border}`,
                                              padding: '1px 5px',
                                              borderRadius: 'var(--radius-sm)',
                                              fontWeight: 600
                                            }}
                                          >
                                            {entryWork.name}
                                          </span>

                                          {/* Quantidade Produzida */}
                                          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {entry.stage === 'criacao' && `${entry.piecesCount > 0 ? entry.piecesCount : 1} arte(s)`}
                                            {entry.stage === 'exportacao' && `${entry.piecesCount > 0 ? entry.piecesCount : 1} fechamento(s)`}
                                            {entry.stage === 'impressao' && `${entry.piecesCount || 0} peça(s)`}
                                            {Number(entry.meters) > 0 && ` • ${entry.meters}m lineares`}
                                          </div>

                                          {/* Observações */}
                                          {entry.notes && (
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                              "{entry.notes}"
                                            </div>
                                          )}
                                        </div>

                                        {/* Ações do Lançamento */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <button
                                            type="button"
                                            className="btn btn-secondary btn-icon-only btn-sm"
                                            style={{ width: '24px', height: '24px' }}
                                            onClick={() => openEditStageInOrder(order, entry)}
                                            title="Editar este lançamento"
                                          >
                                            <Edit3 size={11} />
                                          </button>
                                          {!isOperator && (
                                            <button
                                              type="button"
                                              className="btn btn-danger btn-icon-only btn-sm"
                                              style={{ width: '24px', height: '24px' }}
                                              onClick={() => handleDeleteLaunch(order.id, entry.id, entryStage.name)}
                                              title="Excluir este lançamento"
                                            >
                                              <Trash2 size={11} />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
