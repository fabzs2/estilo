import React, { useState } from 'react';
import { useProduction } from '../context/ProductionContext';
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
  Clock,
  Tag,
  Package,
  Plus,
  FileText
} from 'lucide-react';

export function OrdersTable({ onOpenQuickEntry }) {
  const { 
    orders,
    filteredOrders, 
    designers, 
    selectedStageFilter, 
    setSelectedStageFilter,
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

  // Controle de linhas expandidas para ver o histórico de lançamentos do pedido
  const [expandedOrders, setExpandedOrders] = useState(new Set());

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

  return (
    <div className="orders-view">
      {/* Barra de Filtros e Busca */}
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
            placeholder="Buscar por cliente, pedido, designer..."
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

          {/* Filtro por Etapa */}
          <select
            id="filter-stage-select"
            className="form-select"
            style={{ width: 'auto', minWidth: '145px' }}
            value={selectedStageFilter}
            onChange={(e) => setSelectedStageFilter(e.target.value)}
          >
            <option value="all">Todas as Etapas</option>
            <option value="criacao">🎨 Criação de Arte</option>
            <option value="exportacao">📐 Exportação</option>
            <option value="impressao">🖨️ Impressão</option>
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

          {/* Botão Exportar CSV */}
          <button
            id="btn-export-csv"
            className="btn btn-secondary btn-sm"
            onClick={exportToCSV}
            title="Exportar dados filtrados para planilha Excel/CSV"
          >
            <Download size={14} />
            CSV
          </button>

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

      {/* Tabela de Pedidos Únicos */}
      <div 
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden'
        }}
      >
        <div 
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface)'
          }}
        >
          <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-muted)' }}>
            Exibindo <strong style={{ color: 'var(--text-primary)' }}>{filteredOrders.length}</strong> pedido(s) únicos no período
          </span>

          {(selectedDesignerFilter !== 'all' || selectedStageFilter !== 'all' || selectedWorkTypeFilter !== 'all' || searchTerm) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
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

        {filteredOrders.length === 0 ? (
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
        ) : (
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}></th>
                  <th>Data</th>
                  <th>Nº Pedido</th>
                  <th>Cliente & Detalhes do Uniforme</th>
                  <th>Processo & Peças</th>
                  <th style={{ minWidth: '220px' }}>Etapas / Status de Produção</th>
                  <th style={{ minWidth: '120px' }}>Próxima Ação</th>
                  <th style={{ textAlign: 'center', width: '130px' }}>Gerenciar</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
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
                    statusLabel = 'Arte Concluída';
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
                        <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Calendar size={12} color="var(--text-muted)" />
                            {formatDateBR(order.date)}
                          </div>
                        </td>

                        {/* Pedido */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                            <span 
                              style={{
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                color: 'var(--text-primary)',
                                background: 'var(--bg-surface)',
                                padding: '2px 7px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-subtle)',
                                fontSize: '0.8rem'
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
                              onClick={() => openAddStageToOrder(order, !hasExportacao ? 'exportacao' : 'impressao')}
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
                              title="Editar dados gerais do pedido"
                            >
                              <Edit3 size={12} />
                            </button>

                            {/* Excluir Pedido */}
                            <button
                              type="button"
                              className="btn btn-danger btn-icon-only btn-sm"
                              style={{ width: '26px', height: '26px' }}
                              onClick={() => handleDeleteOrder(order)}
                              title="Excluir este pedido e seus lançamentos"
                            >
                              <Trash2 size={12} />
                            </button>
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
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                                <div>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <FileText size={14} color="var(--accent-blue)" />
                                    Lançamentos Internos do Pedido {order.orderNumber} ({order.clientName})
                                  </span>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    Aqui estão registradas as etapas de quem fez, quando fez e quanto produziu neste pedido.
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  style={{ fontSize: '0.72rem', padding: '4px 10px', gap: '4px' }}
                                  onClick={() => openAddStageToOrder(order, 'criacao')}
                                >
                                  <Plus size={12} />
                                  + Adicionar Lançamento
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
                                              style={{ width: '22px', height: '22px', fontSize: '0.68rem' }}
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
                                          <button
                                            type="button"
                                            className="btn btn-danger btn-icon-only btn-sm"
                                            style={{ width: '24px', height: '24px' }}
                                            onClick={() => handleDeleteLaunch(order.id, entry.id, entryStage.name)}
                                            title="Excluir este lançamento"
                                          >
                                            <Trash2 size={11} />
                                          </button>
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
