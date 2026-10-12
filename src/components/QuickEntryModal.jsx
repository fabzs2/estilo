import React, { useState, useEffect } from 'react';
import { useProduction } from '../context/ProductionContext';
import { ORDER_TYPES } from '../constants/initialData';
import { 
  X, 
  Save, 
  Layers, 
  Printer, 
  PlusCircle, 
  FileText, 
  PenTool, 
  Check, 
  Users 
} from 'lucide-react';

export function QuickEntryModal() {
  const { 
    isQuickEntryOpen, 
    setIsQuickEntryOpen, 
    designers, 
    addEntry, 
    addBatchEntries, 
    updateEntry, 
    editingEntry, 
    setEditingEntry 
  } = useProduction();

  // Dados Gerais do Pedido
  const [generalData, setGeneralData] = useState({
    orderNumber: '',
    clientName: '',
    date: new Date().toISOString().split('T')[0],
    orderType: 'sublimacao_total',
    totalPieces: '',
    notes: ''
  });

  // Etapas Individuais com seleção de responsável para cada parte
  const [stageCriacao, setStageCriacao] = useState({
    enabled: true,
    designerId: '',
    artesCount: 1
  });

  const [stageExportacao, setStageExportacao] = useState({
    enabled: true,
    designerId: '',
    exportacoesCount: 1
  });

  const [stageImpressao, setStageImpressao] = useState({
    enabled: true,
    designerId: '',
    piecesCount: '',
    meters: ''
  });

  // Estado caso esteja em modo de edição de um único lançamento existente
  const [singleEditData, setSingleEditData] = useState({
    orderNumber: '',
    clientName: '',
    designerId: '',
    stage: 'criacao',
    date: new Date().toISOString().split('T')[0],
    piecesCount: '',
    meters: '',
    orderType: 'sublimacao_total',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializar formulário ao abrir
  useEffect(() => {
    if (!isQuickEntryOpen) return;

    if (editingEntry) {
      // Modo edição de uma linha específica
      setSingleEditData({
        orderNumber: editingEntry.orderNumber || '',
        clientName: editingEntry.clientName || '',
        designerId: editingEntry.designerId || (designers[0]?.id || ''),
        stage: editingEntry.stage || 'criacao',
        date: editingEntry.date || new Date().toISOString().split('T')[0],
        piecesCount: editingEntry.piecesCount || '',
        meters: editingEntry.meters || '',
        orderType: editingEntry.orderType || 'sublimacao_total',
        notes: editingEntry.notes || ''
      });
    } else {
      // Novo pedido unificado: encontra os melhores designers padrão por especialidade
      const criacaoDefault = designers.find((d) => (d.role || '').toLowerCase().includes('cria'))?.id || designers[0]?.id || '';
      const exportacaoDefault = designers.find((d) => (d.role || '').toLowerCase().includes('export') || (d.role || '').toLowerCase().includes('fechamento'))?.id || designers[1]?.id || designers[0]?.id || '';
      const impressaoDefault = designers.find((d) => (d.role || '').toLowerCase().includes('impress') || (d.role || '').toLowerCase().includes('rip'))?.id || designers[2]?.id || designers[0]?.id || '';

      setGeneralData({
        orderNumber: `PED-${Math.floor(1000 + Math.random() * 9000)}`,
        clientName: '',
        date: new Date().toISOString().split('T')[0],
        orderType: 'sublimacao_total',
        totalPieces: '',
        notes: ''
      });

      setStageCriacao({
        enabled: true,
        designerId: criacaoDefault,
        artesCount: 1
      });

      setStageExportacao({
        enabled: true,
        designerId: exportacaoDefault,
        exportacoesCount: 1
      });

      setStageImpressao({
        enabled: true,
        designerId: impressaoDefault,
        piecesCount: '',
        meters: ''
      });
    }
  }, [editingEntry, isQuickEntryOpen, designers]);

  if (!isQuickEntryOpen) return null;

  const handleClose = () => {
    setIsQuickEntryOpen(false);
    setEditingEntry(null);
  };

  // Quando o usuário preenche a quantidade geral de peças do pedido, sugere na Impressão
  const handleGeneralPiecesChange = (val) => {
    setGeneralData((prev) => ({ ...prev, totalPieces: val }));
    setStageImpressao((prev) => ({ ...prev, piecesCount: val }));
  };

  // Atalho para replicar um mesmo designer nas 3 etapas
  const handleApplySameDesigner = (designerId) => {
    if (!designerId) return;
    setStageCriacao((prev) => ({ ...prev, designerId }));
    setStageExportacao((prev) => ({ ...prev, designerId }));
    setStageImpressao((prev) => ({ ...prev, designerId }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // 1. Caso de Edição de um lançamento existente
    if (editingEntry) {
      if (!singleEditData.designerId) {
        alert('Selecione o designer responsável.');
        return;
      }
      if (!singleEditData.clientName.trim()) {
        alert('Informe o nome do cliente.');
        return;
      }

      setIsSubmitting(true);
      updateEntry(editingEntry.id, singleEditData);
      setTimeout(() => {
        setIsSubmitting(false);
        handleClose();
      }, 100);
      return;
    }

    // 2. Caso de Lançamento de Novo Pedido (por partes)
    if (!generalData.clientName.trim()) {
      alert('Informe o nome do cliente ou descrição do uniforme.');
      return;
    }

    // Valida se ao menos uma etapa foi selecionada
    if (!stageCriacao.enabled && !stageExportacao.enabled && !stageImpressao.enabled) {
      alert('Marque ao menos uma etapa de trabalho (Arte, Exportação ou Impressão) para lançar o pedido.');
      return;
    }

    // Valida se cada etapa selecionada tem um designer escolhido
    if (stageCriacao.enabled && !stageCriacao.designerId) {
      alert('Selecione o designer responsável pela Criação da Arte.');
      return;
    }
    if (stageExportacao.enabled && !stageExportacao.designerId) {
      alert('Selecione o designer responsável pela Exportação/Fechamento.');
      return;
    }
    if (stageImpressao.enabled && !stageImpressao.designerId) {
      alert('Selecione o operador responsável pela Impressão.');
      return;
    }

    setIsSubmitting(true);

    const entriesToCreate = [];

    // 1. Criação de Arte
    if (stageCriacao.enabled) {
      entriesToCreate.push({
        orderNumber: generalData.orderNumber,
        clientName: generalData.clientName,
        date: generalData.date,
        orderType: generalData.orderType,
        notes: generalData.notes,
        stage: 'criacao',
        designerId: stageCriacao.designerId,
        piecesCount: Number(stageCriacao.artesCount) || 1,
        meters: 0
      });
    }

    // 2. Exportação / Fechamento
    if (stageExportacao.enabled) {
      entriesToCreate.push({
        orderNumber: generalData.orderNumber,
        clientName: generalData.clientName,
        date: generalData.date,
        orderType: generalData.orderType,
        notes: generalData.notes,
        stage: 'exportacao',
        designerId: stageExportacao.designerId,
        piecesCount: Number(stageExportacao.exportacoesCount) || 1,
        meters: 0
      });
    }

    // 3. Impressão / Plotter
    if (stageImpressao.enabled) {
      entriesToCreate.push({
        orderNumber: generalData.orderNumber,
        clientName: generalData.clientName,
        date: generalData.date,
        orderType: generalData.orderType,
        notes: generalData.notes,
        stage: 'impressao',
        designerId: stageImpressao.designerId,
        piecesCount: Number(stageImpressao.piecesCount) || (Number(generalData.totalPieces) || 0),
        meters: Number(stageImpressao.meters) || 0
      });
    }

    if (entriesToCreate.length === 1) {
      addEntry(entriesToCreate[0]);
    } else if (entriesToCreate.length > 1) {
      addBatchEntries(entriesToCreate);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      handleClose();
    }, 120);
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div 
        className="modal-content modal-lg" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '820px' }}
      >
        {/* Cabeçalho do Modal */}
        <div className="modal-header">
          <div className="modal-title">
            {editingEntry ? (
              <>
                <FileText size={17} />
                Editar Lançamento: {editingEntry.orderNumber}
              </>
            ) : (
              <>
                <PlusCircle size={17} />
                Lançar Pedido & Atribuir Designers por Etapa
              </>
            )}
          </div>
          <button
            className="btn btn-secondary btn-icon-only btn-sm"
            onClick={handleClose}
          >
            <X size={16} />
          </button>
        </div>

        {/* Corpo do Formulário */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '78vh', overflowY: 'auto' }}>
            {/* Se for MODO DE EDIÇÃO DE ENTRADA ÚNICA */}
            {editingEntry ? (
              <div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                  Editando o lançamento da etapa <strong>{editingEntry.stage.toUpperCase()}</strong>.
                </p>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Número do Pedido:</label>
                    <input
                      type="text"
                      className="form-input"
                      value={singleEditData.orderNumber}
                      onChange={(e) => setSingleEditData({ ...singleEditData, orderNumber: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Cliente / Detalhes:</label>
                    <input
                      type="text"
                      className="form-input"
                      value={singleEditData.clientName}
                      onChange={(e) => setSingleEditData({ ...singleEditData, clientName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Designer Responsável:</label>
                    <select
                      className="form-select"
                      value={singleEditData.designerId}
                      onChange={(e) => setSingleEditData({ ...singleEditData, designerId: e.target.value })}
                      required
                    >
                      {designers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.nickname || d.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Data de Conclusão:</label>
                    <input
                      type="date"
                      className="form-input"
                      value={singleEditData.date}
                      onChange={(e) => setSingleEditData({ ...singleEditData, date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">
                      {singleEditData.stage === 'criacao' && 'Quantidade de Artes:'}
                      {singleEditData.stage === 'exportacao' && 'Quantidade de Exportações:'}
                      {singleEditData.stage === 'impressao' && 'Peças Impressas:'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={singleEditData.piecesCount}
                      onChange={(e) => setSingleEditData({ ...singleEditData, piecesCount: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Metros Lineares (m):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      className="form-input"
                      value={singleEditData.meters}
                      onChange={(e) => setSingleEditData({ ...singleEditData, meters: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Observações:</label>
                  <textarea
                    className="form-textarea"
                    rows="2"
                    value={singleEditData.notes}
                    onChange={(e) => setSingleEditData({ ...singleEditData, notes: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              /* MODO NOVO PEDIDO COMPLETO: Permite escolher designer para Arte, Exportação e Impressão */
              <div>
                {/* 1. Informações Gerais do Pedido */}
                <div 
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                    marginBottom: '16px'
                  }}
                >
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
                    1. Dados Gerais do Pedido
                  </div>

                  <div className="form-grid-3">
                    <div className="form-group">
                      <label className="form-label" htmlFor="gen-order-number">
                        Nº do Pedido:
                      </label>
                      <input
                        id="gen-order-number"
                        type="text"
                        className="form-input"
                        placeholder="Ex: PED-1025"
                        value={generalData.orderNumber}
                        onChange={(e) => setGeneralData({ ...generalData, orderNumber: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label" htmlFor="gen-client-name">
                        Cliente / Descrição do Uniforme:
                      </label>
                      <input
                        id="gen-client-name"
                        type="text"
                        className="form-input"
                        placeholder="Ex: Colégio Objetivo - Agasalhos Esportivos"
                        value={generalData.clientName}
                        onChange={(e) => setGeneralData({ ...generalData, clientName: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-grid-3">
                    <div className="form-group">
                      <label className="form-label" htmlFor="gen-date">
                        Data de Conclusão:
                      </label>
                      <input
                        id="gen-date"
                        type="date"
                        className="form-input"
                        value={generalData.date}
                        onChange={(e) => setGeneralData({ ...generalData, date: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="gen-pieces">
                        Total de Peças do Pedido:
                      </label>
                      <input
                        id="gen-pieces"
                        type="number"
                        min="0"
                        className="form-input"
                        placeholder="Ex: 50"
                        value={generalData.totalPieces}
                        onChange={(e) => handleGeneralPiecesChange(e.target.value)}
                      />
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        Replica automaticamente na Impressão
                      </span>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="gen-type">
                        Tipo de Uniforme / Estampa:
                      </label>
                      <select
                        id="gen-type"
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
                  </div>
                </div>

                {/* 2. Etapas e Designers Responsáveis (Os 3 Blocos) */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        2. Responsáveis por Cada Etapa do Pedido
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Selecione quem fez cada parte. Você pode desmarcar etapas que não foram feitas.
                      </div>
                    </div>

                    {/* Atalho para replicar designer */}
                    {designers.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Mesmo designer em tudo:</span>
                        <select
                          className="form-select"
                          style={{ padding: '3px 8px', fontSize: '0.72rem', width: 'auto' }}
                          onChange={(e) => handleApplySameDesigner(e.target.value)}
                          defaultValue=""
                        >
                          <option value="" disabled>Selecionar...</option>
                          {designers.map((d) => (
                            <option key={d.id} value={d.id}>{d.name.split(' ')[0]}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div 
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                      gap: '12px'
                    }}
                  >
                    {/* PARTE 1: ARTE / CRIAÇÃO */}
                    <div 
                      style={{
                        background: 'var(--bg-secondary)',
                        border: stageCriacao.enabled ? '1px solid rgba(96, 165, 250, 0.3)' : '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 14px',
                        opacity: stageCriacao.enabled ? 1 : 0.5,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <label 
                          style={{ 
                            fontSize: '0.8125rem', 
                            fontWeight: 600, 
                            color: '#60a5fa', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={stageCriacao.enabled}
                            onChange={(e) => setStageCriacao({ ...stageCriacao, enabled: e.target.checked })}
                            style={{ accentColor: '#60a5fa', cursor: 'pointer' }}
                          />
                          <PenTool size={14} color="#60a5fa" />
                          Arte / Criação
                        </label>

                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          {stageCriacao.enabled ? 'Ativo' : 'Ignorar'}
                        </span>
                      </div>

                      <div className="form-group" style={{ marginBottom: '8px' }}>
                        <label className="form-label" style={{ fontSize: '0.72rem' }}>
                          Designer da Arte:
                        </label>
                        <select
                          className="form-select"
                          style={{ fontSize: '0.78rem' }}
                          value={stageCriacao.designerId}
                          onChange={(e) => setStageCriacao({ ...stageCriacao, designerId: e.target.value })}
                          disabled={!stageCriacao.enabled}
                        >
                          <option value="">Selecione o designer da arte...</option>
                          {designers.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.nickname || d.role})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.72rem' }}>
                          Qtd. de Artes Criadas:
                        </label>
                        <input
                          type="number"
                          min="1"
                          className="form-input"
                          style={{ fontSize: '0.78rem' }}
                          placeholder="Padrão 1"
                          value={stageCriacao.artesCount}
                          onChange={(e) => setStageCriacao({ ...stageCriacao, artesCount: e.target.value })}
                          disabled={!stageCriacao.enabled}
                        />
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                          Meta: artes diárias
                        </span>
                      </div>
                    </div>

                    {/* PARTE 2: EXPORTAÇÃO / FECHAMENTO */}
                    <div 
                      style={{
                        background: 'var(--bg-secondary)',
                        border: stageExportacao.enabled ? '1px solid rgba(167, 139, 250, 0.3)' : '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 14px',
                        opacity: stageExportacao.enabled ? 1 : 0.5,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <label 
                          style={{ 
                            fontSize: '0.8125rem', 
                            fontWeight: 600, 
                            color: '#a78bfa', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={stageExportacao.enabled}
                            onChange={(e) => setStageExportacao({ ...stageExportacao, enabled: e.target.checked })}
                            style={{ accentColor: '#a78bfa', cursor: 'pointer' }}
                          />
                          <Layers size={14} color="#a78bfa" />
                          Exportação
                        </label>

                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          {stageExportacao.enabled ? 'Ativo' : 'Ignorar'}
                        </span>
                      </div>

                      <div className="form-group" style={{ marginBottom: '8px' }}>
                        <label className="form-label" style={{ fontSize: '0.72rem' }}>
                          Designer da Exportação:
                        </label>
                        <select
                          className="form-select"
                          style={{ fontSize: '0.78rem' }}
                          value={stageExportacao.designerId}
                          onChange={(e) => setStageExportacao({ ...stageExportacao, designerId: e.target.value })}
                          disabled={!stageExportacao.enabled}
                        >
                          <option value="">Selecione o arte-finalista...</option>
                          {designers.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.nickname || d.role})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.72rem' }}>
                          Qtd. de Fechamentos:
                        </label>
                        <input
                          type="number"
                          min="1"
                          className="form-input"
                          style={{ fontSize: '0.78rem' }}
                          placeholder="Padrão 1"
                          value={stageExportacao.exportacoesCount}
                          onChange={(e) => setStageExportacao({ ...stageExportacao, exportacoesCount: e.target.value })}
                          disabled={!stageExportacao.enabled}
                        />
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                          Meta: exportações/dia
                        </span>
                      </div>
                    </div>

                    {/* PARTE 3: IMPRESSÃO / PLOTTER */}
                    <div 
                      style={{
                        background: 'var(--bg-secondary)',
                        border: stageImpressao.enabled ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 14px',
                        opacity: stageImpressao.enabled ? 1 : 0.5,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <label 
                          style={{ 
                            fontSize: '0.8125rem', 
                            fontWeight: 600, 
                            color: '#34d399', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={stageImpressao.enabled}
                            onChange={(e) => setStageImpressao({ ...stageImpressao, enabled: e.target.checked })}
                            style={{ accentColor: '#34d399', cursor: 'pointer' }}
                          />
                          <Printer size={14} color="#34d399" />
                          Impressão (Peças)
                        </label>

                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          {stageImpressao.enabled ? 'Ativo' : 'Ignorar'}
                        </span>
                      </div>

                      <div className="form-group" style={{ marginBottom: '8px' }}>
                        <label className="form-label" style={{ fontSize: '0.72rem' }}>
                          Operador de Impressão:
                        </label>
                        <select
                          className="form-select"
                          style={{ fontSize: '0.78rem' }}
                          value={stageImpressao.designerId}
                          onChange={(e) => setStageImpressao({ ...stageImpressao, designerId: e.target.value })}
                          disabled={!stageImpressao.enabled}
                        >
                          <option value="">Selecione o operador...</option>
                          {designers.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.nickname || d.role})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.7rem' }}>
                            Peças Impressas:
                          </label>
                          <input
                            type="number"
                            min="0"
                            className="form-input"
                            style={{ fontSize: '0.78rem' }}
                            placeholder="Ex: 50"
                            value={stageImpressao.piecesCount}
                            onChange={(e) => setStageImpressao({ ...stageImpressao, piecesCount: e.target.value })}
                            disabled={!stageImpressao.enabled}
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.7rem' }}>
                            Metros (Plotter):
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            className="form-input"
                            style={{ fontSize: '0.78rem' }}
                            placeholder="Ex: 35.5"
                            value={stageImpressao.meters}
                            onChange={(e) => setStageImpressao({ ...stageImpressao, meters: e.target.value })}
                            disabled={!stageImpressao.enabled}
                          />
                        </div>
                      </div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                        Meta: somente peças impressas
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Observações */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="gen-notes">
                    Observações do Pedido (Opcional):
                  </label>
                  <textarea
                    id="gen-notes"
                    className="form-textarea"
                    rows="2"
                    placeholder="Ex: Tecido Dry-Fit, estampas frente e costas, aprovação pelo WhatsApp."
                    value={generalData.notes}
                    onChange={(e) => setGeneralData({ ...generalData, notes: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Rodapé do Modal */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              id="btn-save-entry"
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              <Save size={15} />
              {isSubmitting 
                ? 'Salvando...' 
                : editingEntry 
                ? 'Salvar Alterações' 
                : 'Salvar Pedido Completo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
