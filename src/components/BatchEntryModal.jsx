import React, { useState, useEffect, useMemo } from 'react';
import { useProduction } from '../context/ProductionContext';
import { WORK_TYPES, getLocalDateStr } from '../constants/initialData';
import { X, Plus, Trash2, Save, Layers } from 'lucide-react';

export function BatchEntryModal() {
  const { isBatchEntryOpen, setIsBatchEntryOpen, designers, addBatchEntries } = useProduction();

  const activeDesigners = useMemo(() => {
    const active = designers.filter((d) => d.active !== false);
    return active.length > 0 ? active : designers;
  }, [designers]);

  const createEmptyRow = (index, defaultDesignerId = '') => ({
    id: `row_${Date.now()}_${index}`,
    date: getLocalDateStr(),
    orderNumber: `PED-${Math.floor(1000 + Math.random() * 9000)}`,
    clientName: '',
    designerId: defaultDesignerId || activeDesigners[0]?.id || '',
    stage: 'criacao',
    workType: 'arte_nova',
    piecesCount: '1',
    meters: '',
    orderType: 'sublimacao_total'
  });

  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (isBatchEntryOpen) {
      const defDes = activeDesigners[0]?.id || '';
      setRows([
        createEmptyRow(1, defDes),
        createEmptyRow(2, defDes),
        createEmptyRow(3, defDes)
      ]);
    }
  }, [isBatchEntryOpen, activeDesigners]);

  if (!isBatchEntryOpen) return null;

  const handleClose = () => {
    setIsBatchEntryOpen(false);
  };

  const handleRowChange = (index, field, value) => {
    setRows((prev) => {
      const copy = [...prev];
      const updated = { ...copy[index], [field]: value };
      if (field === 'stage') {
        if ((value === 'criacao' || value === 'exportacao') && !updated.piecesCount) {
          updated.piecesCount = '1';
        }
      }
      copy[index] = updated;
      return copy;
    });
  };

  const addRow = () => {
    setRows((prev) => [...prev, createEmptyRow(prev.length + 1, activeDesigners[0]?.id || '')]);
  };

  const removeRow = (index) => {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveAll = async (e) => {
    e.preventDefault();

    const validRows = rows.filter((r) => r.clientName.trim() !== '');

    if (validRows.length === 0) {
      alert('Preencha ao menos uma linha com o nome do cliente/pedido.');
      return;
    }

    await addBatchEntries(validRows);
    handleClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '940px' }}>
        {/* Cabeçalho */}
        <div className="modal-header">
          <div className="modal-title">
            <Layers size={20} color="var(--accent-blue)" />
            Lançamento em Lote (Múltiplos Pedidos ou Etapas de uma vez)
          </div>
          <button className="btn btn-secondary btn-icon-only btn-sm" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        {/* Formulário em Tabela */}
        <form onSubmit={handleSaveAll}>
          <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Preencha rapidamente os pedidos ou etapas do dia. Se você repetir o mesmo <strong>Nº Pedido</strong> de um pedido já existente, a nova etapa será vinculada a ele automaticamente!
            </p>

            <div className="table-responsive">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th style={{ width: '115px' }}>Data</th>
                    <th style={{ width: '105px' }}>Nº Pedido</th>
                    <th>Cliente / Detalhe Uniforme</th>
                    <th style={{ width: '155px' }}>Designer</th>
                    <th style={{ width: '120px' }}>Etapa</th>
                    <th style={{ width: '125px' }}>Tipo</th>
                    <th style={{ width: '75px' }}>Qtd/Pçs</th>
                    <th style={{ width: '75px' }}>Metros</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.id}>
                      {/* Data */}
                      <td>
                        <input
                          type="date"
                          className="form-input"
                          style={{ padding: '6px 8px', fontSize: '0.76rem' }}
                          value={row.date}
                          onChange={(e) => handleRowChange(index, 'date', e.target.value)}
                          required
                        />
                      </td>

                      {/* Pedido */}
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          style={{ padding: '6px 8px', fontSize: '0.78rem', fontFamily: 'monospace' }}
                          value={row.orderNumber}
                          onChange={(e) => handleRowChange(index, 'orderNumber', e.target.value)}
                          placeholder="PED-000"
                        />
                      </td>

                      {/* Cliente */}
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          style={{ padding: '6px 8px', fontSize: '0.8rem' }}
                          value={row.clientName}
                          onChange={(e) => handleRowChange(index, 'clientName', e.target.value)}
                          placeholder="Ex: Time Azul - Jogo 2026"
                        />
                      </td>

                      {/* Designer */}
                      <td>
                        <select
                          className="form-select"
                          style={{ padding: '6px 8px', fontSize: '0.78rem' }}
                          value={row.designerId}
                          onChange={(e) => handleRowChange(index, 'designerId', e.target.value)}
                        >
                          {activeDesigners.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name.split(' ')[0]} ({d.nickname || d.role})
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Etapa */}
                      <td>
                        <select
                          className="form-select"
                          style={{ padding: '6px 8px', fontSize: '0.78rem' }}
                          value={row.stage}
                          onChange={(e) => handleRowChange(index, 'stage', e.target.value)}
                        >
                          <option value="criacao">Criação</option>
                          <option value="exportacao">Exportação</option>
                          <option value="impressao">Impressão</option>
                        </select>
                      </td>

                      {/* Tipo / Motivo */}
                      <td>
                        <select
                          className="form-select"
                          style={{ padding: '6px 8px', fontSize: '0.78rem' }}
                          value={row.workType || 'arte_nova'}
                          onChange={(e) => handleRowChange(index, 'workType', e.target.value)}
                        >
                          {Object.values(WORK_TYPES).map((wt) => (
                            <option key={wt.id} value={wt.id}>
                              {wt.shortName || wt.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Peças / Qtd */}
                      <td>
                        <input
                          type="number"
                          min="0"
                          className="form-input"
                          style={{ padding: '6px 8px', fontSize: '0.78rem', textAlign: 'center' }}
                          value={row.piecesCount}
                          onChange={(e) => handleRowChange(index, 'piecesCount', e.target.value)}
                          placeholder={row.stage === 'impressao' ? 'Pçs' : '1'}
                          title={row.stage === 'impressao' ? 'Quantidade de peças impressas' : 'Quantidade de artes ou fechamentos'}
                        />
                      </td>

                      {/* Metros */}
                      <td>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          className="form-input"
                          style={{ padding: '6px 8px', fontSize: '0.78rem', textAlign: 'center' }}
                          value={row.meters}
                          onChange={(e) => handleRowChange(index, 'meters', e.target.value)}
                          placeholder="0"
                          disabled={row.stage !== 'impressao'}
                        />
                      </td>

                      {/* Remover Linha */}
                      <td>
                        <button
                          type="button"
                          className="btn btn-danger btn-icon-only btn-sm"
                          style={{ width: '28px', height: '28px' }}
                          onClick={() => removeRow(index)}
                          disabled={rows.length === 1}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '14px' }}
              onClick={addRow}
            >
              <Plus size={15} />
              + Adicionar Mais Uma Linha
            </button>
          </div>

          {/* Rodapé */}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              Cancelar
            </button>
            <button id="btn-save-batch-all" type="submit" className="btn btn-primary">
              <Save size={16} />
              Salvar Todos os Pedidos Válidos
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
