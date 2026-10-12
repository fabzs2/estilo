import React from 'react';
import { useProduction } from '../context/ProductionContext';
import { STAGES, ORDER_TYPES } from '../constants/initialData';
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
  Inbox
} from 'lucide-react';

export function OrdersTable({ onOpenQuickEntry }) {
  const { 
    filteredEntries, 
    designers, 
    selectedStageFilter, 
    setSelectedStageFilter,
    selectedDesignerFilter, 
    setSelectedDesignerFilter,
    searchTerm, 
    setSearchTerm,
    exportToCSV,
    deleteEntry,
    setEditingEntry,
    setIsQuickEntryOpen
  } = useProduction();

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setIsQuickEntryOpen(true);
  };

  const handleDelete = (id, orderNumber) => {
    if (window.confirm(`Tem certeza que deseja excluir o lançamento do pedido ${orderNumber || ''}?`)) {
      deleteEntry(id);
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
            style={{ width: 'auto' }}
            value={selectedDesignerFilter}
            onChange={(e) => setSelectedDesignerFilter(e.target.value)}
          >
            <option value="all">Todos os Designers</option>
            {designers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.nickname || d.role})
              </option>
            ))}
          </select>

          {/* Filtro por Etapa */}
          <select
            id="filter-stage-select"
            className="form-select"
            style={{ width: 'auto' }}
            value={selectedStageFilter}
            onChange={(e) => setSelectedStageFilter(e.target.value)}
          >
            <option value="all">Todas as Etapas</option>
            <option value="criacao">Criação de Arte</option>
            <option value="exportacao">Exportação / Fechamento</option>
            <option value="impressao">Impressão / Plotter</option>
          </select>

          {/* Botão Exportar CSV */}
          <button
            id="btn-export-csv"
            className="btn btn-secondary"
            onClick={exportToCSV}
            title="Exportar dados filtrados para planilha Excel/CSV"
          >
            <Download size={14} />
            Exportar CSV
          </button>

          {/* Botão Novo Pedido */}
          <button
            id="btn-new-order-from-list"
            className="btn btn-primary"
            onClick={() => {
              setEditingEntry(null);
              setIsQuickEntryOpen(true);
            }}
          >
            <PlusCircle size={14} />
            + Novo Lançamento
          </button>
        </div>
      </div>

      {/* Tabela de Pedidos */}
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
            Exibindo <strong style={{ color: 'var(--text-primary)' }}>{filteredEntries.length}</strong> lançamentos no período
          </span>

          {(selectedDesignerFilter !== 'all' || selectedStageFilter !== 'all' || searchTerm) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSelectedDesignerFilter('all');
                setSelectedStageFilter('all');
                setSearchTerm('');
              }}
            >
              Limpar Filtros
            </button>
          )}
        </div>

        {filteredEntries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
            <Inbox size={40} strokeWidth={1.5} color="var(--border-light)" style={{ marginBottom: '12px' }} />
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px', fontSize: '0.95rem' }}>Nenhum pedido encontrado</h4>
            <p style={{ fontSize: '0.78rem', maxWidth: '380px', margin: '0 auto 16px' }}>
              Nenhum lançamento corresponde aos filtros ou período selecionado.
            </p>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditingEntry(null);
                setIsQuickEntryOpen(true);
              }}
            >
              <PlusCircle size={14} />
              Lançar Pedido Agora
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Pedido</th>
                  <th>Cliente & Detalhes do Uniforme</th>
                  <th>Etapa</th>
                  <th>Designer Responsável</th>
                  <th style={{ textAlign: 'center' }}>Produção (Artes / Exp / Peças)</th>
                  <th>Tipo / Processo</th>
                  <th>Obs</th>
                  <th style={{ textAlign: 'center', width: '80px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((item) => {
                  const stageInfo = STAGES[item.stage] || STAGES.criacao;
                  const designer = designers.find((d) => d.id === item.designerId);

                  return (
                    <tr key={item.id}>
                      {/* Data */}
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Calendar size={12} color="var(--text-muted)" />
                          {formatDateBR(item.date)}
                        </div>
                      </td>

                      {/* Pedido */}
                      <td>
                        <span 
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            background: 'var(--bg-surface)',
                            padding: '2px 7px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-subtle)',
                            fontSize: '0.78rem'
                          }}
                        >
                          {item.orderNumber || 'S/N'}
                        </span>
                      </td>

                      {/* Cliente e Detalhes */}
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.clientName}
                        </div>
                      </td>

                      {/* Etapa com Badge */}
                      <td>
                        <span
                          className="stage-badge"
                          style={{
                            color: stageInfo.color,
                            borderColor: 'var(--border-subtle)'
                          }}
                        >
                          {item.stage === 'criacao' && <PenTool size={11} />}
                          {item.stage === 'exportacao' && <Layers size={11} />}
                          {item.stage === 'impressao' && <Printer size={11} />}
                          {stageInfo.shortName}
                        </span>
                      </td>

                      {/* Designer */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          <div
                            className="avatar-badge"
                            style={{
                              width: '24px',
                              height: '24px',
                              fontSize: '0.7rem'
                            }}
                          >
                            {(item.designerName || 'D').charAt(0)}
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 500 }}>
                            {item.designerName}
                          </span>
                        </div>
                      </td>

                      {/* Produção por Categoria e Metros */}
                      <td style={{ textAlign: 'center', fontSize: '0.78rem' }}>
                        <div style={{ fontWeight: 600 }}>
                          {item.stage === 'criacao' && `${item.piecesCount > 0 ? item.piecesCount : 1} arte(s)`}
                          {item.stage === 'exportacao' && `${item.piecesCount > 0 ? item.piecesCount : 1} exp`}
                          {item.stage === 'impressao' && `${item.piecesCount || 0} peças`}
                        </div>
                        {Number(item.meters) > 0 && (
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                            {item.meters}m lineares
                          </div>
                        )}
                      </td>

                      {/* Tipo de Uniforme */}
                      <td>
                        <span 
                          style={{
                            fontSize: '0.72rem',
                            color: 'var(--text-muted)',
                            background: 'var(--bg-surface)',
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-subtle)'
                          }}
                        >
                          {ORDER_TYPES.find((t) => t.id === item.orderType)?.name || item.orderType || 'Geral'}
                        </span>
                      </td>

                      {/* Observações */}
                      <td style={{ maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {item.notes || '-'}
                      </td>

                      {/* Ações */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '4px' }}>
                          <button
                            className="btn btn-secondary btn-icon-only btn-sm"
                            style={{ width: '26px', height: '26px' }}
                            onClick={() => handleEdit(item)}
                            title="Editar lançamento"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            className="btn btn-danger btn-icon-only btn-sm"
                            style={{ width: '26px', height: '26px' }}
                            onClick={() => handleDelete(item.id, item.orderNumber)}
                            title="Excluir lançamento"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
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
