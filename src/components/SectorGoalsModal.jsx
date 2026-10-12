import React, { useState, useEffect } from 'react';
import { useProduction } from '../context/ProductionContext';
import { Target, X, Check, RotateCcw, PenTool, Layers, Printer } from 'lucide-react';

export function SectorGoalsModal() {
  const { 
    isSectorGoalsModalOpen, 
    setIsSectorGoalsModalOpen, 
    sectorGoals, 
    updateSectorGoals, 
    resetSectorGoals,
    metrics
  } = useProduction();

  const [formGoals, setFormGoals] = useState({
    criacao: 8,
    exportacao: 10,
    impressao: 120
  });

  useEffect(() => {
    if (isSectorGoalsModalOpen) {
      setFormGoals({
        criacao: metrics.teamDailyGoalCriacao,
        exportacao: metrics.teamDailyGoalExportacao,
        impressao: metrics.teamDailyGoalImpressaoPieces
      });
    }
  }, [isSectorGoalsModalOpen, metrics]);

  if (!isSectorGoalsModalOpen) return null;

  const handleClose = () => {
    setIsSectorGoalsModalOpen(false);
  };

  const handleSave = (e) => {
    e.preventDefault();
    updateSectorGoals({
      criacao: Number(formGoals.criacao) || 0,
      exportacao: Number(formGoals.exportacao) || 0,
      impressao: Number(formGoals.impressao) || 0
    });
    handleClose();
  };

  const handleResetToTeam = () => {
    resetSectorGoals();
    handleClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div className="modal-title">
            <Target size={18} color="var(--accent-sky)" />
            Metas Personalizadas por Categoria do Setor
          </div>
          <button className="btn btn-secondary btn-icon-only btn-sm" onClick={handleClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Defina o objetivo diário esperado para o setor de design de uniformes. As metas são separadas por categoria:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Criação */}
              <div 
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label htmlFor="sec-goal-criacao" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <PenTool size={14} color="#60a5fa" />
                    🎨 Meta Criação de Arte:
                  </label>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>artes diárias</span>
                </div>
                <input
                  id="sec-goal-criacao"
                  type="number"
                  min="0"
                  className="form-input"
                  value={formGoals.criacao}
                  onChange={(e) => setFormGoals({ ...formGoals, criacao: e.target.value })}
                  required
                />
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Objetivo diário de novas artes/layouts desenvolvidos pela equipe.
                </span>
              </div>

              {/* Exportação */}
              <div 
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label htmlFor="sec-goal-exportacao" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={14} color="#a78bfa" />
                    📐 Meta Exportação / Fechamento:
                  </label>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>exportações/dia</span>
                </div>
                <input
                  id="sec-goal-exportacao"
                  type="number"
                  min="0"
                  className="form-input"
                  value={formGoals.exportacao}
                  onChange={(e) => setFormGoals({ ...formGoals, exportacao: e.target.value })}
                  required
                />
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Objetivo diário de arquivos fechados e encaixados em gabaritos para estamparia.
                </span>
              </div>

              {/* Impressão */}
              <div 
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label htmlFor="sec-goal-impressao" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Printer size={14} color="#34d399" />
                    🖨️ Meta Impressão / Plotter:
                  </label>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>somente peças impressas/dia</span>
                </div>
                <input
                  id="sec-goal-impressao"
                  type="number"
                  min="0"
                  className="form-input"
                  value={formGoals.impressao}
                  onChange={(e) => setFormGoals({ ...formGoals, impressao: e.target.value })}
                  required
                />
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Contagem baseada exclusivamente em peças físicas impressas para confecção.
                </span>
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleResetToTeam}
              title="Calcular meta somando individualmente cada designer da equipe"
            >
              <RotateCcw size={13} />
              Somar da Equipe
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                <Check size={14} />
                Salvar Metas
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
