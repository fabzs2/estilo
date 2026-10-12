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
  Check
} from 'lucide-react';

export function QuickEntryModal() {
  const { 
    isQuickEntryOpen, 
    setIsQuickEntryOpen, 
    designers, 
    addEntry, 
    updateEntry, 
    editingEntry, 
    setEditingEntry 
  } = useProduction();

  const [formData, setFormData] = useState({
    orderNumber: '',
    clientName: '',
    designerId: '',
    stage: 'criacao',
    date: new Date().toISOString().split('T')[0],
    piecesCount: '',
    meters: '',
    orderType: 'sublimacao_total',
    complexity: 'media',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preenche dados ao abrir para edição ou define valores padrão
  useEffect(() => {
    if (editingEntry) {
      setFormData({
        orderNumber: editingEntry.orderNumber || '',
        clientName: editingEntry.clientName || '',
        designerId: editingEntry.designerId || (designers[0]?.id || ''),
        stage: editingEntry.stage || 'criacao',
        date: editingEntry.date || new Date().toISOString().split('T')[0],
        piecesCount: editingEntry.piecesCount || '',
        meters: editingEntry.meters || '',
        orderType: editingEntry.orderType || 'sublimacao_total',
        complexity: editingEntry.complexity || 'media',
        notes: editingEntry.notes || ''
      });
    } else {
      setFormData({
        orderNumber: `PED-${Math.floor(1000 + Math.random() * 9000)}`,
        clientName: '',
        designerId: designers[0]?.id || '',
        stage: 'criacao',
        date: new Date().toISOString().split('T')[0],
        piecesCount: '',
        meters: '',
        orderType: 'sublimacao_total',
        complexity: 'media',
        notes: ''
      });
    }
  }, [editingEntry, isQuickEntryOpen, designers]);

  if (!isQuickEntryOpen) return null;

  const handleClose = () => {
    setIsQuickEntryOpen(false);
    setEditingEntry(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.designerId) {
      alert('Selecione o designer responsável.');
      return;
    }

    if (!formData.clientName.trim()) {
      alert('Informe o nome do cliente ou descrição do uniforme.');
      return;
    }

    setIsSubmitting(true);

    if (editingEntry) {
      updateEntry(editingEntry.id, formData);
    } else {
      addEntry(formData);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      handleClose();
    }, 120);
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Cabeçalho do Modal */}
        <div className="modal-header">
          <div className="modal-title">
            {editingEntry ? (
              <>
                <FileText size={17} />
                Editar Lançamento
              </>
            ) : (
              <>
                <PlusCircle size={17} />
                Lançar Pedido Concluído
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
          <div className="modal-body">
            {/* 1. Seleção da Etapa */}
            <div className="form-group">
              <label className="form-label">Etapa de Trabalho:</label>
              <div className="stage-selector">
                {/* Criação */}
                <button
                  type="button"
                  className={`stage-selector-btn ${formData.stage === 'criacao' ? 'active' : ''}`}
                  onClick={() => setFormData({ ...formData, stage: 'criacao' })}
                >
                  <PenTool size={18} color="#60a5fa" />
                  <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>Criação de Arte</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Layout & Mockup</span>
                </button>

                {/* Exportação */}
                <button
                  type="button"
                  className={`stage-selector-btn ${formData.stage === 'exportacao' ? 'active' : ''}`}
                  onClick={() => setFormData({ ...formData, stage: 'exportacao' })}
                >
                  <Layers size={18} color="#a78bfa" />
                  <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>Exportação</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Molde & Fechamento</span>
                </button>

                {/* Impressão */}
                <button
                  type="button"
                  className={`stage-selector-btn ${formData.stage === 'impressao' ? 'active' : ''}`}
                  onClick={() => setFormData({ ...formData, stage: 'impressao' })}
                >
                  <Printer size={18} color="#34d399" />
                  <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>Impressão</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Plotter / Sublimação</span>
                </button>
              </div>
            </div>

            {/* 2. Designer e Data */}
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="entry-designer">
                  Designer Responsável:
                </label>
                <select
                  id="entry-designer"
                  className="form-select"
                  value={formData.designerId}
                  onChange={(e) => setFormData({ ...formData, designerId: e.target.value })}
                  required
                >
                  {designers.length === 0 ? (
                    <option value="">Nenhum designer cadastrado (Cadastre na aba Equipe)</option>
                  ) : (
                    designers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.nickname || d.role})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="entry-date">
                  Data de Conclusão:
                </label>
                <input
                  id="entry-date"
                  type="date"
                  className="form-input"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* 3. Pedido e Cliente */}
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="entry-order-number">
                  Número do Pedido:
                </label>
                <input
                  id="entry-order-number"
                  type="text"
                  className="form-input"
                  placeholder="Ex: PED-4925 ou 1042"
                  value={formData.orderNumber}
                  onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="entry-client">
                  Cliente / Descrição:
                </label>
                <input
                  id="entry-client"
                  type="text"
                  className="form-input"
                  placeholder="Ex: Colégio Objetivo - Agasalhos"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* 4. Métrica Principal por Categoria e Tipo */}
            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label" htmlFor="entry-pieces">
                  {formData.stage === 'criacao' && '🎨 Quantidade de Artes:'}
                  {formData.stage === 'exportacao' && '📐 Quantidade de Exportações:'}
                  {formData.stage === 'impressao' && '🖨️ Peças Impressas (Meta):'}
                </label>
                <input
                  id="entry-pieces"
                  type="number"
                  min="0"
                  className="form-input"
                  placeholder={
                    formData.stage === 'criacao' 
                      ? 'Ex: 1 (padrão 1 arte)' 
                      : formData.stage === 'exportacao'
                      ? 'Ex: 1 (padrão 1 exp)'
                      : 'Ex: 120 peças'
                  }
                  value={formData.piecesCount}
                  onChange={(e) => setFormData({ ...formData, piecesCount: e.target.value })}
                />
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  {formData.stage === 'criacao' && 'Conta para a meta de artes diárias'}
                  {formData.stage === 'exportacao' && 'Conta para a meta de exportações diárias'}
                  {formData.stage === 'impressao' && 'Conta para a meta de peças impressas'}
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="entry-meters">
                  {formData.stage === 'impressao' ? 'Metros Lineares (Plotter):' : 'Metros Lineares (Opcional):'}
                </label>
                <input
                  id="entry-meters"
                  type="number"
                  step="0.1"
                  min="0"
                  className="form-input"
                  placeholder={formData.stage === 'impressao' ? 'Ex: 45.5' : '0'}
                  value={formData.meters}
                  onChange={(e) => setFormData({ ...formData, meters: e.target.value })}
                />
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  {formData.stage === 'impressao' ? 'Extensão linear de papel/filme' : 'Opcional'}
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="entry-type">
                  Tipo de Uniforme / Estampa:
                </label>
                <select
                  id="entry-type"
                  className="form-select"
                  value={formData.orderType}
                  onChange={(e) => setFormData({ ...formData, orderType: e.target.value })}
                >
                  {ORDER_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  Processo têxtil
                </span>
              </div>
            </div>

            {/* 5. Observações */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="entry-notes">
                Observações (Opcional):
              </label>
              <textarea
                id="entry-notes"
                className="form-textarea"
                rows="2"
                placeholder="Ex: Arte aprovada, grade PP a GG, tecido Dry."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          {/* Rodapé */}
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
              {isSubmitting ? 'Salvando...' : editingEntry ? 'Salvar Alterações' : 'Confirmar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
