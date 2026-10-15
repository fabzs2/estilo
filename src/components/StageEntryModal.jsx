import React, { useState, useEffect } from 'react';
import { useProduction } from '../context/ProductionContext';
import { STAGES, WORK_TYPES } from '../constants/initialData';
import { 
  X, 
  Save, 
  PenTool, 
  Layers, 
  Printer, 
  Tag, 
  Calendar, 
  User, 
  Hash, 
  FileText 
} from 'lucide-react';

export function StageEntryModal({ isOpen, onClose, order, entry = null, initialStage = 'criacao' }) {
  const { designers, addEntryToOrder, updateEntryInOrder } = useProduction();

  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const [stage, setStage] = useState(initialStage);
  const [designerId, setDesignerId] = useState('');
  const [date, setDate] = useState(getTodayStr());
  const [workType, setWorkType] = useState('arte_nova');
  const [piecesCount, setPiecesCount] = useState('1');
  const [meters, setMeters] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (entry) {
      // Modo edição de lançamento existente
      setStage(entry.stage || 'criacao');
      setDesignerId(entry.designerId || (designers[0]?.id || ''));
      setDate(entry.date || getTodayStr());
      setWorkType(entry.workType || 'arte_nova');
      setPiecesCount(String(entry.piecesCount ?? '1'));
      setMeters(entry.meters ? String(entry.meters) : '');
      setNotes(entry.notes || '');
    } else {
      // Modo novo lançamento
      const currentStage = initialStage || 'criacao';
      setStage(currentStage);

      // Sugere o designer conforme especialidade
      let defaultDes = designers[0]?.id || '';
      if (currentStage === 'criacao') {
        defaultDes = designers.find((d) => (d.role || '').toLowerCase().includes('cria'))?.id || defaultDes;
      } else if (currentStage === 'exportacao') {
        defaultDes = designers.find((d) => (d.role || '').toLowerCase().includes('export') || (d.role || '').toLowerCase().includes('fechamento'))?.id || defaultDes;
      } else if (currentStage === 'impressao') {
        defaultDes = designers.find((d) => (d.role || '').toLowerCase().includes('impress') || (d.role || '').toLowerCase().includes('rip'))?.id || defaultDes;
      }
      setDesignerId(defaultDes);

      setDate(getTodayStr());
      setWorkType('arte_nova');

      // Quantidade padrão conforme etapa
      if (currentStage === 'impressao') {
        setPiecesCount(order?.totalPieces ? String(order.totalPieces) : '');
      } else {
        setPiecesCount('1');
      }
      setMeters('');
      setNotes('');
    }
  }, [isOpen, entry, initialStage, order, designers]);

  if (!isOpen || !order) return null;

  const handleStageSelect = (stg) => {
    setStage(stg);
    if (!entry) {
      let defaultDes = designers[0]?.id || '';
      if (stg === 'criacao') {
        defaultDes = designers.find((d) => (d.role || '').toLowerCase().includes('cria'))?.id || defaultDes;
        setPiecesCount('1');
      } else if (stg === 'exportacao') {
        defaultDes = designers.find((d) => (d.role || '').toLowerCase().includes('export') || (d.role || '').toLowerCase().includes('fechamento'))?.id || defaultDes;
        setPiecesCount('1');
      } else if (stg === 'impressao') {
        defaultDes = designers.find((d) => (d.role || '').toLowerCase().includes('impress') || (d.role || '').toLowerCase().includes('rip'))?.id || defaultDes;
        setPiecesCount(order?.totalPieces ? String(order.totalPieces) : '');
      }
      setDesignerId(defaultDes);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!designerId) {
      alert('Selecione o responsável pelo lançamento.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      stage,
      designerId,
      date,
      workType,
      piecesCount: Number(piecesCount) || 0,
      meters: stage === 'impressao' ? (Number(meters) || 0) : 0,
      notes: notes.trim()
    };

    if (entry) {
      await updateEntryInOrder(order.id, entry.id, payload);
    } else {
      await addEntryToOrder(order.id, payload);
    }

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '580px' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {stage === 'criacao' && <PenTool size={17} color="#60a5fa" />}
              {stage === 'exportacao' && <Layers size={17} color="#a78bfa" />}
              {stage === 'impressao' && <Printer size={17} color="#34d399" />}
              {entry ? 'Editar Lançamento de Produção' : '+ Novo Lançamento de Produção'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Pedido <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{order.orderNumber}</strong> • {order.clientName} {order.totalPieces ? `(${order.totalPieces} peças)` : ''}
            </div>
          </div>
          <button className="btn btn-secondary btn-icon-only btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 1. Seleção de Etapa */}
            <div>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                Etapa do Lançamento
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleStageSelect('criacao')}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 'var(--radius-md)',
                    border: stage === 'criacao' ? '2px solid #60a5fa' : '1px solid var(--border-subtle)',
                    background: stage === 'criacao' ? 'rgba(96, 165, 250, 0.12)' : 'var(--bg-surface)',
                    color: stage === 'criacao' ? '#60a5fa' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    transition: 'var(--trans-fast)'
                  }}
                >
                  <PenTool size={16} />
                  <span>Criação de Arte</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStageSelect('exportacao')}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 'var(--radius-md)',
                    border: stage === 'exportacao' ? '2px solid #a78bfa' : '1px solid var(--border-subtle)',
                    background: stage === 'exportacao' ? 'rgba(167, 139, 250, 0.12)' : 'var(--bg-surface)',
                    color: stage === 'exportacao' ? '#a78bfa' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    transition: 'var(--trans-fast)'
                  }}
                >
                  <Layers size={16} />
                  <span>Exportação</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStageSelect('impressao')}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 'var(--radius-md)',
                    border: stage === 'impressao' ? '2px solid #34d399' : '1px solid var(--border-subtle)',
                    background: stage === 'impressao' ? 'rgba(52, 211, 153, 0.12)' : 'var(--bg-surface)',
                    color: stage === 'impressao' ? '#34d399' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    transition: 'var(--trans-fast)'
                  }}
                >
                  <Printer size={16} />
                  <span>Impressão / Plotter</span>
                </button>
              </div>
            </div>

            {/* 2. Responsável e Data */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <User size={13} />
                  Responsável *
                </label>
                <select
                  className="form-select"
                  value={designerId}
                  onChange={(e) => setDesignerId(e.target.value)}
                  required
                >
                  <option value="">Selecione o profissional...</option>
                  {designers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Calendar size={13} />
                  Data da Etapa *
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                >
                </input>
              </div>
            </div>

            {/* 3. Motivo / Tipo de Lançamento */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Tag size={13} />
                Motivo / Tipo do Trabalho
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {Object.values(WORK_TYPES).map((wt) => {
                  const isSel = workType === wt.id;
                  return (
                    <button
                      key={wt.id}
                      type="button"
                      onClick={() => setWorkType(wt.id)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        border: isSel ? `1px solid ${wt.color}` : '1px solid var(--border-subtle)',
                        background: isSel ? wt.bgLight : 'var(--bg-surface)',
                        color: isSel ? wt.color : 'var(--text-muted)',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      {wt.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Quantidades e Metragem */}
            <div style={{ display: 'grid', gridTemplateColumns: stage === 'impressao' ? '1fr 1fr' : '1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Hash size={13} />
                  {stage === 'criacao' && 'Quantidade de Artes Produzidas *'}
                  {stage === 'exportacao' && 'Quantidade de Fechamentos / Gabaritos *'}
                  {stage === 'impressao' && 'Quantidade de Peças Impressas *'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="form-input"
                  placeholder={stage === 'impressao' ? 'Ex: 50 peças' : 'Ex: 1'}
                  value={piecesCount}
                  onChange={(e) => setPiecesCount(e.target.value)}
                  required
                />
              </div>

              {stage === 'impressao' && (
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Printer size={13} />
                    Metros Lineares Plotter (m)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    className="form-input"
                    placeholder="Ex: 14.5"
                    value={meters}
                    onChange={(e) => setMeters(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* 5. Observações */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <FileText size={13} />
                Observações deste Lançamento (opcional)
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Ajuste solicitado no patrocinador, ou papel 75g..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
              <Save size={14} />
              {isSubmitting ? 'Salvando...' : entry ? 'Salvar Alterações' : 'Confirmar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
