import React, { useState, useEffect, useMemo } from 'react';
import { useProduction } from '../context/ProductionContext';
import { ORDER_TYPES, WORK_TYPES, STAGES, getLocalDateStr } from '../constants/initialData';
import {
  X,
  Save,
  Layers,
  Printer,
  PenTool,
  Users,
  Calendar,
  Tag,
  Hash,
  FileText,
  Package,
  AlertCircle,
  Plus,
  RefreshCw,
  Edit3,
  Trash2
} from 'lucide-react';

export function QuickEntryModal() {
  const {
    isQuickEntryOpen,
    setIsQuickEntryOpen,
    designers,
    orders,
    addOrder,
    updateOrder,
    editingOrder,
    setEditingOrder,
    openAddStageToOrder,
    openEditStageInOrder,
    deleteEntryFromOrder
  } = useProduction();

  const activeDesigners = useMemo(() => {
    const active = designers.filter((d) => d.active !== false);
    return active.length > 0 ? active : designers;
  }, [designers]);

  // Pedido ao vivo (para refletir imediatamente lançamentos adicionados/editados enquanto o modal está aberto)
  const liveEditingOrder = useMemo(() => {
    if (!editingOrder) return null;
    return orders.find((o) => o.id === editingOrder.id) || editingOrder;
  }, [editingOrder, orders]);

  // Dados Gerais do Pedido
  const [generalData, setGeneralData] = useState({
    orderNumber: '',
    clientName: '',
    date: getLocalDateStr(),
    orderType: 'sublimacao_total',
    workType: 'arte_nova',
    totalPieces: '',
    notes: ''
  });

  // Etapa 1: Criação de Arte
  const [stageCriacao, setStageCriacao] = useState({
    enabled: true,
    designerId: '',
    artesCount: '1',
    date: getLocalDateStr(),
    workType: 'arte_nova',
    notes: ''
  });

  // Etapa 2: Exportação / Fechamento
  const [stageExportacao, setStageExportacao] = useState({
    enabled: true,
    designerId: '',
    exportacoesCount: '1',
    date: getLocalDateStr(),
    notes: ''
  });

  // Etapa 3: Impressão / Plotter
  const [stageImpressao, setStageImpressao] = useState({
    enabled: true,
    designerId: '',
    piecesCount: '',
    meters: '',
    date: getLocalDateStr(),
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateUniqueOrderNumber = () => {
    const existingNums = new Set(orders.map((o) => (o.orderNumber || '').toUpperCase()));
    for (let i = 0; i < 20; i++) {
      const candidate = `PED-${Math.floor(1000 + Math.random() * 9000)}`;
      if (!existingNums.has(candidate)) return candidate;
    }
    return `PED-${Date.now().toString().slice(-4)}`;
  };

  // Inicializar formulário ao abrir
  useEffect(() => {
    if (!isQuickEntryOpen) return;

    const today = getLocalDateStr();

    if (editingOrder) {
      setGeneralData({
        orderNumber: editingOrder.orderNumber || '',
        clientName: editingOrder.clientName || '',
        date: editingOrder.date || today,
        orderType: editingOrder.orderType || 'sublimacao_total',
        workType: editingOrder.workType || 'arte_nova',
        totalPieces: String(editingOrder.totalPieces ?? ''),
        notes: editingOrder.notes || ''
      });
    } else {
      const criacaoDefault =
        activeDesigners.find((d) => (d.role || '').toLowerCase().includes('cria'))?.id ||
        activeDesigners[0]?.id ||
        '';
      const exportacaoDefault =
        activeDesigners.find(
          (d) =>
            (d.role || '').toLowerCase().includes('export') ||
            (d.role || '').toLowerCase().includes('fechamento')
        )?.id ||
        activeDesigners[1]?.id ||
        activeDesigners[0]?.id ||
        '';
      const impressaoDefault =
        activeDesigners.find(
          (d) =>
            (d.role || '').toLowerCase().includes('impress') ||
            (d.role || '').toLowerCase().includes('rip')
        )?.id ||
        activeDesigners[2]?.id ||
        activeDesigners[0]?.id ||
        '';

      setGeneralData({
        orderNumber: generateUniqueOrderNumber(),
        clientName: '',
        date: today,
        orderType: 'sublimacao_total',
        workType: 'arte_nova',
        totalPieces: '',
        notes: ''
      });

      setStageCriacao({
        enabled: true,
        designerId: criacaoDefault,
        artesCount: '1',
        date: today,
        workType: 'arte_nova',
        notes: ''
      });

      setStageExportacao({
        enabled: true,
        designerId: exportacaoDefault,
        exportacoesCount: '1',
        date: today,
        notes: ''
      });

      setStageImpressao({
        enabled: true,
        designerId: impressaoDefault,
        piecesCount: '',
        meters: '',
        date: today,
        notes: ''
      });
    }
  }, [editingOrder, isQuickEntryOpen, activeDesigners]);

  // Verifica se o número de pedido digitado já existe na base
  const duplicateOrder = useMemo(() => {
    const cleanNum = (generalData.orderNumber || '').trim().toLowerCase();
    if (!cleanNum) return null;
    return orders.find(
      (o) =>
        (o.orderNumber || '').trim().toLowerCase() === cleanNum &&
        (!editingOrder || o.id !== editingOrder.id)
    );
  }, [generalData.orderNumber, orders, editingOrder]);

  if (!isQuickEntryOpen) return null;

  const handleClose = () => {
    setIsQuickEntryOpen(false);
    setEditingOrder(null);
  };

  const handleGeneralPiecesChange = (val) => {
    setGeneralData((prev) => ({ ...prev, totalPieces: val }));
    setStageImpressao((prev) => ({ ...prev, piecesCount: val }));
  };

  const handleApplySameDesigner = (designerId) => {
    if (!designerId) return;
    setStageCriacao((prev) => ({ ...prev, designerId }));
    setStageExportacao((prev) => ({ ...prev, designerId }));
    setStageImpressao((prev) => ({ ...prev, designerId }));
  };

  const handleCopyDateFromCriacao = () => {
    if (stageCriacao.date) {
      setStageExportacao((prev) => ({ ...prev, date: stageCriacao.date }));
      setStageImpressao((prev) => ({ ...prev, date: stageCriacao.date }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!generalData.clientName.trim()) {
      alert('Informe o nome do cliente ou descrição do uniforme.');
      return;
    }

    if (duplicateOrder) {
      const confirmDup = window.confirm(
        `Já existe um pedido cadastrado com o número "${duplicateOrder.orderNumber}" (${duplicateOrder.clientName}). Deseja continuar mesmo assim?`
      );
      if (!confirmDup) return;
    }

    // 1. Modo Edição do Pedido
    if (editingOrder) {
      setIsSubmitting(true);
      await updateOrder(editingOrder.id, {
        previousOrderNumber: editingOrder.orderNumber,
        orderNumber: generalData.orderNumber.trim() || editingOrder.orderNumber,
        clientName: generalData.clientName.trim(),
        date: generalData.date,
        orderType: generalData.orderType,
        workType: generalData.workType,
        totalPieces: Number(generalData.totalPieces) || 0,
        notes: generalData.notes
      });
      setIsSubmitting(false);
      handleClose();
      return;
    }

    // 2. Modo Criação de Novo Pedido (com lançamentos opcionais)
    const stageEntries = [];

    if (stageCriacao.enabled) {
      if (!stageCriacao.designerId) {
        alert('Selecione o designer responsável pela Criação da Arte.');
        return;
      }
      stageEntries.push({
        stage: 'criacao',
        designerId: stageCriacao.designerId,
        date: stageCriacao.date || generalData.date,
        piecesCount: Number(stageCriacao.artesCount) || 1,
        meters: 0,
        workType: stageCriacao.workType || generalData.workType || 'arte_nova',
        notes: stageCriacao.notes || ''
      });
    }

    if (stageExportacao.enabled) {
      if (!stageExportacao.designerId) {
        alert('Selecione o designer responsável pela Exportação/Fechamento.');
        return;
      }
      stageEntries.push({
        stage: 'exportacao',
        designerId: stageExportacao.designerId,
        date: stageExportacao.date || generalData.date,
        piecesCount: Number(stageExportacao.exportacoesCount) || 1,
        meters: 0,
        workType: generalData.workType || 'arte_nova',
        notes: stageExportacao.notes || ''
      });
    }

    if (stageImpressao.enabled) {
      if (!stageImpressao.designerId) {
        alert('Selecione o operador responsável pela Impressão.');
        return;
      }
      stageEntries.push({
        stage: 'impressao',
        designerId: stageImpressao.designerId,
        date: stageImpressao.date || generalData.date,
        piecesCount: Number(stageImpressao.piecesCount) || (Number(generalData.totalPieces) || 0),
        meters: Number(stageImpressao.meters) || 0,
        workType: generalData.workType || 'arte_nova',
        notes: stageImpressao.notes || ''
      });
    }

    setIsSubmitting(true);
    await addOrder(generalData, stageEntries);
    setIsSubmitting(false);
    handleClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content modal-lg"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '820px' }}
      >
        {/* Header do Modal */}
        <div className="modal-header">
          <div>
            <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={18} color="var(--accent-blue)" />
              {editingOrder ? `Editar Pedido ${liveEditingOrder?.orderNumber || editingOrder.orderNumber}` : 'Novo Pedido de Produção'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {editingOrder
                ? 'Atualize os dados do cabeçalho ou gerencie as etapas de produção registradas neste pedido abaixo'
                : 'Cadastre o pedido e, se desejar, já preencha as etapas concluídas (Criação, Exportação e Impressão)'}
            </div>
          </div>
          <button className="btn btn-secondary btn-icon-only btn-sm" onClick={handleClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* SEÇÃO 1: DADOS GERAIS DO PEDIDO */}
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
                  1. Dados do Pedido (Uniforme)
                </span>
              </div>

              {/* Aviso de Pedido Duplicado */}
              {duplicateOrder && (
                <div
                  style={{
                    marginBottom: '14px',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                    fontSize: '0.76rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24' }}>
                    <AlertCircle size={15} />
                    <span>
                      O pedido <strong>{duplicateOrder.orderNumber}</strong> já existe ({duplicateOrder.clientName}).
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {!editingOrder && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '3px 8px', fontSize: '0.7rem', borderColor: '#fbbf24', color: '#fbbf24' }}
                        onClick={() => {
                          handleClose();
                          openAddStageToOrder(duplicateOrder, 'exportacao');
                        }}
                      >
                        <Plus size={11} />
                        Lançar Etapa no Existente
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                      onClick={() => setGeneralData((prev) => ({ ...prev, orderNumber: generateUniqueOrderNumber() }))}
                    >
                      <RefreshCw size={11} />
                      Gerar Outro Nº
                    </button>
                  </div>
                </div>
              )}

              {/* Linha 1: Número, Cliente, Data */}
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 150px', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Hash size={12} />
                    Nº do Pedido *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontFamily: 'monospace', fontWeight: 600 }}
                    placeholder="PED-1001"
                    value={generalData.orderNumber}
                    onChange={(e) => setGeneralData({ ...generalData, orderNumber: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Users size={12} />
                    Nome do Cliente & Descrição *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: Colégio Santa Maria - Futsal Masculino"
                    value={generalData.clientName}
                    onChange={(e) => setGeneralData({ ...generalData, clientName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} />
                    Data de Entrada
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={generalData.date}
                    onChange={(e) => setGeneralData({ ...generalData, date: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Linha 2: Tipo de Uniforme, Peças Totais, Tipo de Lançamento */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Tipo de Uniforme / Processo</label>
                  <select
                    className="form-select"
                    value={generalData.orderType}
                    onChange={(e) => setGeneralData({ ...generalData, orderType: e.target.value })}
                  >
                    {ORDER_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Package size={12} />
                    Total Peças
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="form-input"
                    placeholder="Ex: 50"
                    value={generalData.totalPieces}
                    onChange={(e) => handleGeneralPiecesChange(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Tag size={12} />
                    Motivo Geral
                  </label>
                  <select
                    className="form-select"
                    value={generalData.workType}
                    onChange={(e) => setGeneralData({ ...generalData, workType: e.target.value })}
                  >
                    {Object.values(WORK_TYPES).map((wt) => (
                      <option key={wt.id} value={wt.id}>
                        {wt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Linha 3: Observações Gerais */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FileText size={12} />
                  Observações Gerais do Uniforme (Opcional)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Uniforme titular com manga raglan, tecido Dry Fit 130g..."
                  value={generalData.notes}
                  onChange={(e) => setGeneralData({ ...generalData, notes: e.target.value })}
                />
              </div>
            </div>

            {/* SEÇÃO 2 (MODO EDIÇÃO): GERENCIAR ETAPAS JÁ LANÇADAS OU ADICIONAR NOVA ETAPA */}
            {editingOrder && liveEditingOrder && (
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
                      2. Etapas de Produção Registradas ({liveEditingOrder.entries?.length || 0})
                    </span>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Edite uma etapa existente ou lance uma nova etapa diretamente neste pedido.
                    </div>
                  </div>

                  {/* Botões rápidos para adicionar etapa */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.7rem', padding: '4px 8px', borderColor: 'rgba(96, 165, 250, 0.4)', color: '#60a5fa' }}
                      onClick={() => openAddStageToOrder(liveEditingOrder, 'criacao')}
                    >
                      <PenTool size={11} /> + Criação
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.7rem', padding: '4px 8px', borderColor: 'rgba(167, 139, 250, 0.4)', color: '#a78bfa' }}
                      onClick={() => openAddStageToOrder(liveEditingOrder, 'exportacao')}
                    >
                      <Layers size={11} /> + Exportação
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.7rem', padding: '4px 8px', borderColor: 'rgba(52, 211, 153, 0.4)', color: '#34d399' }}
                      onClick={() => openAddStageToOrder(liveEditingOrder, 'impressao')}
                    >
                      <Printer size={11} /> + Impressão
                    </button>
                  </div>
                </div>

                {(!liveEditingOrder.entries || liveEditingOrder.entries.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '18px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-subtle)', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Nenhuma etapa lançada ainda (Pedido em "Aguardando Início"). Use os botões acima para registrar Criação, Exportação ou Impressão.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {liveEditingOrder.entries.map((entry, idx) => {
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
                            padding: '9px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '10px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div
                                className="avatar-badge"
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  fontSize: '0.65rem',
                                  background: entryDesigner?.avatarColor || 'var(--bg-surface-elevated)',
                                  color: '#fff'
                                }}
                              >
                                {(entry.designerName || 'D').charAt(0)}
                              </div>
                              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {entry.designerName}
                              </span>
                            </div>

                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {formatDateBR(entry.date)}
                            </span>

                            <span
                              style={{
                                fontSize: '0.64rem',
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

                            <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {entry.stage === 'criacao' && `${entry.piecesCount > 0 ? entry.piecesCount : 1} arte(s)`}
                              {entry.stage === 'exportacao' && `${entry.piecesCount > 0 ? entry.piecesCount : 1} fechamento(s)`}
                              {entry.stage === 'impressao' && `${entry.piecesCount || 0} peça(s)`}
                              {Number(entry.meters) > 0 && ` • ${entry.meters}m`}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-icon-only btn-sm"
                              style={{ width: '24px', height: '24px' }}
                              onClick={() => openEditStageInOrder(liveEditingOrder, entry)}
                              title="Editar esta etapa"
                            >
                              <Edit3 size={11} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-icon-only btn-sm"
                              style={{ width: '24px', height: '24px' }}
                              onClick={() => {
                                if (window.confirm(`Deseja remover este lançamento de ${entryStage.name}?`)) {
                                  deleteEntryFromOrder(liveEditingOrder.id, entry.id);
                                }
                              }}
                              title="Excluir esta etapa"
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
            )}

            {/* SEÇÃO 2 (MODO NOVO PEDIDO): LANÇAMENTOS DE ETAPAS */}
            {!editingOrder && (
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
                      2. Lançamentos de Produção (Etapas Realizadas)
                    </span>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Marque as etapas que já foram feitas para creditar a produtividade da equipe. Você também poderá adicionar novas etapas depois!
                    </div>
                  </div>

                  {/* Atalhos */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                      onClick={handleCopyDateFromCriacao}
                      title="Copiar data da criação para exportação e impressão"
                    >
                      <Calendar size={11} /> Replicar Data
                    </button>
                    {stageCriacao.designerId && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                        onClick={() => handleApplySameDesigner(stageCriacao.designerId)}
                        title="Replicar responsável da arte nas outras etapas"
                      >
                        <Users size={11} /> Mesmo Designer
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* ETAPA 1: CRIAÇÃO */}
                  <div
                    style={{
                      border: stageCriacao.enabled ? '1px solid rgba(96, 165, 250, 0.4)' : '1px solid var(--border-subtle)',
                      background: stageCriacao.enabled ? 'rgba(96, 165, 250, 0.04)' : 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                      transition: 'var(--trans-fast)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: stageCriacao.enabled ? '12px' : 0 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', color: '#60a5fa' }}>
                        <input
                          type="checkbox"
                          checked={stageCriacao.enabled}
                          onChange={(e) => setStageCriacao({ ...stageCriacao, enabled: e.target.checked })}
                          style={{ width: '16px', height: '16px', accentColor: '#60a5fa', cursor: 'pointer' }}
                        />
                        <PenTool size={14} />
                        Criação de Arte
                      </label>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {stageCriacao.enabled ? 'Etapa Concluída' : 'Não realizada ainda'}
                      </span>
                    </div>

                    {stageCriacao.enabled && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 100px', gap: '10px' }}>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.72rem' }}>Designer Responsável</label>
                          <select
                            className="form-select"
                            value={stageCriacao.designerId}
                            onChange={(e) => setStageCriacao({ ...stageCriacao, designerId: e.target.value })}
                            required={stageCriacao.enabled}
                          >
                            <option value="">Selecione...</option>
                            {activeDesigners.map((d) => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.72rem' }}>Data da Arte</label>
                          <input
                            type="date"
                            className="form-input"
                            value={stageCriacao.date}
                            onChange={(e) => setStageCriacao({ ...stageCriacao, date: e.target.value })}
                            required={stageCriacao.enabled}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.72rem' }}>Qtd Artes</label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            className="form-input"
                            value={stageCriacao.artesCount}
                            onChange={(e) => setStageCriacao({ ...stageCriacao, artesCount: e.target.value })}
                            required={stageCriacao.enabled}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ETAPA 2: EXPORTAÇÃO */}
                  <div
                    style={{
                      border: stageExportacao.enabled ? '1px solid rgba(167, 139, 250, 0.4)' : '1px solid var(--border-subtle)',
                      background: stageExportacao.enabled ? 'rgba(167, 139, 250, 0.04)' : 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                      transition: 'var(--trans-fast)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: stageExportacao.enabled ? '12px' : 0 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', color: '#a78bfa' }}>
                        <input
                          type="checkbox"
                          checked={stageExportacao.enabled}
                          onChange={(e) => setStageExportacao({ ...stageExportacao, enabled: e.target.checked })}
                          style={{ width: '16px', height: '16px', accentColor: '#a78bfa', cursor: 'pointer' }}
                        />
                        <Layers size={14} />
                        Exportação / Fechamento
                      </label>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {stageExportacao.enabled ? 'Etapa Concluída' : 'Não realizada ainda'}
                      </span>
                    </div>

                    {stageExportacao.enabled && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 100px', gap: '10px' }}>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.72rem' }}>Designer Responsável</label>
                          <select
                            className="form-select"
                            value={stageExportacao.designerId}
                            onChange={(e) => setStageExportacao({ ...stageExportacao, designerId: e.target.value })}
                            required={stageExportacao.enabled}
                          >
                            <option value="">Selecione...</option>
                            {activeDesigners.map((d) => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.72rem' }}>Data do Fechamento</label>
                          <input
                            type="date"
                            className="form-input"
                            value={stageExportacao.date}
                            onChange={(e) => setStageExportacao({ ...stageExportacao, date: e.target.value })}
                            required={stageExportacao.enabled}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.72rem' }}>Qtd Fech.</label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            className="form-input"
                            value={stageExportacao.exportacoesCount}
                            onChange={(e) => setStageExportacao({ ...stageExportacao, exportacoesCount: e.target.value })}
                            required={stageExportacao.enabled}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ETAPA 3: IMPRESSÃO */}
                  <div
                    style={{
                      border: stageImpressao.enabled ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid var(--border-subtle)',
                      background: stageImpressao.enabled ? 'rgba(52, 211, 153, 0.04)' : 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                      transition: 'var(--trans-fast)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: stageImpressao.enabled ? '12px' : 0 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', color: '#34d399' }}>
                        <input
                          type="checkbox"
                          checked={stageImpressao.enabled}
                          onChange={(e) => setStageImpressao({ ...stageImpressao, enabled: e.target.checked })}
                          style={{ width: '16px', height: '16px', accentColor: '#34d399', cursor: 'pointer' }}
                        />
                        <Printer size={14} />
                        Impressão / Plotter
                      </label>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {stageImpressao.enabled ? 'Etapa Concluída' : 'Não realizada ainda'}
                      </span>
                    </div>

                    {stageImpressao.enabled && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 100px 110px', gap: '10px' }}>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.72rem' }}>Operador Responsável</label>
                          <select
                            className="form-select"
                            value={stageImpressao.designerId}
                            onChange={(e) => setStageImpressao({ ...stageImpressao, designerId: e.target.value })}
                            required={stageImpressao.enabled}
                          >
                            <option value="">Selecione...</option>
                            {activeDesigners.map((d) => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.72rem' }}>Data da Impressão</label>
                          <input
                            type="date"
                            className="form-input"
                            value={stageImpressao.date}
                            onChange={(e) => setStageImpressao({ ...stageImpressao, date: e.target.value })}
                            required={stageImpressao.enabled}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.72rem' }}>Peças Impressas</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            className="form-input"
                            placeholder="Peças"
                            value={stageImpressao.piecesCount}
                            onChange={(e) => setStageImpressao({ ...stageImpressao, piecesCount: e.target.value })}
                            required={stageImpressao.enabled}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.72rem' }}>Metros (m)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            className="form-input"
                            placeholder="Ex: 12.5"
                            value={stageImpressao.meters}
                            onChange={(e) => setStageImpressao({ ...stageImpressao, meters: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Rodapé com Ações */}
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={isSubmitting}
            >
              <Save size={14} />
              {isSubmitting
                ? 'Salvando...'
                : editingOrder
                ? 'Salvar Alterações do Pedido'
                : 'Criar Pedido & Salvar Lançamentos'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
