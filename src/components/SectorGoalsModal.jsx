import React, { useState, useEffect } from 'react';
import { useProduction } from '../context/ProductionContext';
import { getBrazilianHolidays, getLocalDateStr } from '../constants/initialData';
import {
  Target,
  X,
  Check,
  RotateCcw,
  PenTool,
  Layers,
  Printer,
  Calendar,
  Plus,
  Trash2,
  Sparkles
} from 'lucide-react';

export function SectorGoalsModal() {
  const {
    isSectorGoalsModalOpen,
    setIsSectorGoalsModalOpen,
    updateSectorGoals,
    resetSectorGoals,
    metrics,
    workingDaysConfig,
    updateWorkingDaysConfig,
    addHolidayDate,
    removeHolidayDate,
    resetNationalHolidays
  } = useProduction();

  const [formGoals, setFormGoals] = useState({
    criacao: 8,
    exportacao: 10,
    impressao: 120
  });

  const [newHolidayDate, setNewHolidayDate] = useState(() => getLocalDateStr());
  const [showAllYearHolidays, setShowAllYearHolidays] = useState(false);

  useEffect(() => {
    if (isSectorGoalsModalOpen) {
      setFormGoals({
        criacao: metrics.teamDailyGoalCriacao,
        exportacao: metrics.teamDailyGoalExportacao,
        impressao: metrics.teamDailyGoalImpressaoPieces
      });
    }
  }, [isSectorGoalsModalOpen, metrics.teamDailyGoalCriacao, metrics.teamDailyGoalExportacao, metrics.teamDailyGoalImpressaoPieces]);

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

  const currentYear = new Date().getFullYear();
  const currentMonthPrefix = getLocalDateStr().slice(0, 7); // YYYY-MM
  const knownHolidaysMap = new Map(
    getBrazilianHolidays(currentYear).map((h) => [h.date, h.name])
  );

  const allHolidays = workingDaysConfig?.holidays || [];
  const currentMonthHolidays = allHolidays.filter((d) => d.startsWith(currentMonthPrefix));
  const displayedHolidays = showAllYearHolidays ? allHolidays : currentMonthHolidays;

  const formatDateBR = (dStr) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length !== 3) return dStr;
    const dt = new Date(dStr + 'T12:00:00');
    const wk = dt.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    return `${parts[2]}/${parts[1]}/${parts[0]} (${wk})`;
  };

  const effectiveMonthDays = metrics.totalMonthWorkingDays || 22;
  const projectedMonthCriacao = (Number(formGoals.criacao) || 0) * effectiveMonthDays;
  const projectedMonthExportacao = (Number(formGoals.exportacao) || 0) * effectiveMonthDays;
  const projectedMonthImpressao = (Number(formGoals.impressao) || 0) * effectiveMonthDays;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content modal-lg"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '680px' }}
      >
        <div className="modal-header">
          <div className="modal-title">
            <Target size={18} color="var(--accent-blue)" />
            Dias Úteis Reais, Feriados & Metas do Setor
          </div>
          <button className="btn btn-secondary btn-icon-only btn-sm" onClick={handleClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body" style={{ maxHeight: '74vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* SEÇÃO 1: FILTRO DE DIAS ÚTEIS REAIS NA META MENSAL / PERÍODO */}
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={15} color="#38bdf8" />
                    1. Filtro de Dias Úteis Reais (Base de Cálculo das Médias & Meta Mensal)
                  </h4>
                  <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Escolha como o sistema deve contabilizar os dias úteis para calcular a média diária e a meta mensal da equipe.
                  </p>
                </div>
              </div>

              {/* Seletor de Modo (3 Opções) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                <button
                  type="button"
                  onClick={() => updateWorkingDaysConfig({ mode: 'calendar' })}
                  style={{
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    border: workingDaysConfig.mode === 'calendar' ? '1px solid var(--text-primary)' : '1px solid var(--border-subtle)',
                    background: workingDaysConfig.mode === 'calendar' ? 'var(--bg-surface-elevated)' : 'var(--bg-secondary)',
                    color: workingDaysConfig.mode === 'calendar' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: '2px' }}>
                    Calendário Real
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                    Seg a Sex (desconta fins de semana e feriados)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => updateWorkingDaysConfig({ mode: 'registered' })}
                  style={{
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    border: workingDaysConfig.mode === 'registered' ? '1px solid var(--text-primary)' : '1px solid var(--border-subtle)',
                    background: workingDaysConfig.mode === 'registered' ? 'var(--bg-surface-elevated)' : 'var(--bg-secondary)',
                    color: workingDaysConfig.mode === 'registered' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: '2px' }}>
                    Dias c/ Lançamento
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                    Conta só os dias em que houve pedido lançado
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => updateWorkingDaysConfig({ mode: 'manual' })}
                  style={{
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    border: workingDaysConfig.mode === 'manual' ? '1px solid var(--text-primary)' : '1px solid var(--border-subtle)',
                    background: workingDaysConfig.mode === 'manual' ? 'var(--bg-surface-elevated)' : 'var(--bg-secondary)',
                    color: workingDaysConfig.mode === 'manual' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: '2px' }}>
                    Fixo / Manual
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                    Você digita o nº exato de dias úteis (ex: 21d)
                  </div>
                </button>
              </div>

              {/* Opções do Modo Calendário ou Manual */}
              {workingDaysConfig.mode === 'manual' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <label htmlFor="manual-working-days" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Quantidade Fixa de Dias Úteis no Período/Mês:
                  </label>
                  <input
                    id="manual-working-days"
                    type="number"
                    min="1"
                    max="365"
                    className="form-input"
                    style={{ width: '90px', textAlign: 'center', fontWeight: 700 }}
                    value={workingDaysConfig.manualDays}
                    onChange={(e) => updateWorkingDaysConfig({ manualDays: Math.max(1, Number(e.target.value) || 1) })}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>dias úteis</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Checkbox Sábado + Resumo do Mês */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={ Boolean(workingDaysConfig.includeSaturday) }
                        onChange={(e) => updateWorkingDaysConfig({ includeSaturday: e.target.checked })}
                        style={{ width: '15px', height: '15px', accentColor: '#38bdf8', cursor: 'pointer' }}
                      />
                      Considerar Sábados como dia útil na fábrica
                    </label>

                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      Mês atual: <strong style={{ color: '#38bdf8' }}>{metrics.totalMonthWorkingDays} dias úteis totais</strong> ({metrics.workingDaysCount} decorridos)
                    </div>
                  </div>

                  {/* Gerenciador de Feriados / Dias sem Expediente */}
                  <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Feriados & Dias sem Expediente (Descontados da Meta):
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 7px', fontSize: '0.68rem' }}
                          onClick={() => setShowAllYearHolidays(!showAllYearHolidays)}
                        >
                          {showAllYearHolidays ? 'Ver Só Este Mês' : `Ver Ano Inteiro (${allHolidays.length})`}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 7px', fontSize: '0.68rem' }}
                          onClick={() => resetNationalHolidays(currentYear)}
                          title="Recarregar feriados nacionais do Brasil"
                        >
                          <Sparkles size={11} />
                          Feriados BR {currentYear}
                        </button>
                      </div>
                    </div>

                    {/* Adicionar Data de Feriado / Ponte */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                      <input
                        type="date"
                        className="form-input"
                        style={{ padding: '5px 10px', fontSize: '0.76rem', maxWidth: '170px' }}
                        value={newHolidayDate}
                        onChange={(e) => setNewHolidayDate(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => addHolidayDate(newHolidayDate)}
                      >
                        <Plus size={13} />
                        + Adicionar Feriado / Recesso
                      </button>
                    </div>

                    {/* Chips dos Feriados */}
                    {displayedHolidays.length === 0 ? (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Nenhum feriado ou recesso cadastrado para este mês.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '110px', overflowY: 'auto' }}>
                        {displayedHolidays.map((hDate) => {
                          const hName = knownHolidaysMap.get(hDate);
                          return (
                            <span
                              key={hDate}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '3px 8px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border-light)',
                                fontSize: '0.7rem',
                                color: 'var(--text-primary)'
                              }}
                              title={hName || 'Dia sem expediente / Feriado'}
                            >
                              <span>
                                <strong>{formatDateBR(hDate)}</strong>
                                {hName ? ` • ${hName}` : ''}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeHolidayDate(hDate)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#f87171',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  padding: '1px'
                                }}
                                title="Remover feriado (contar como dia trabalhado)"
                              >
                                <Trash2 size={11} />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* SEÇÃO 2: METAS DIÁRIAS & META MENSAL PROJETADA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  2. Metas Diárias & Meta Mensal Calculada ({effectiveMonthDays} dias úteis no mês)
                </h4>
              </div>

              {/* Criação */}
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                  <label htmlFor="sec-goal-criacao" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <PenTool size={14} color="#3b82f6" />
                    Meta Diária de Criação de Arte:
                  </label>
                  <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Meta Mensal ({effectiveMonthDays}d): {projectedMonthCriacao} artes
                  </span>
                </div>
                <input
                  id="sec-goal-criacao"
                  type="number"
                  min="0"
                  className="form-input mono"
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                  <label htmlFor="sec-goal-exportacao" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={14} color="#8b5cf6" />
                    Meta Diária de Exportação / Fechamento:
                  </label>
                  <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Meta Mensal ({effectiveMonthDays}d): {projectedMonthExportacao} exp
                  </span>
                </div>
                <input
                  id="sec-goal-exportacao"
                  type="number"
                  min="0"
                  className="form-input mono"
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                  <label htmlFor="sec-goal-impressao" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Printer size={14} color="#10b981" />
                    Meta Diária de Impressão / Plotter:
                  </label>
                  <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Meta Mensal ({effectiveMonthDays}d): {projectedMonthImpressao.toLocaleString('pt-BR')} peças
                  </span>
                </div>
                <input
                  id="sec-goal-impressao"
                  type="number"
                  min="0"
                  className="form-input mono"
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

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleResetToTeam}
              title="Calcular meta diária somando individualmente cada designer ativo da equipe"
            >
              <RotateCcw size={13} />
              Somar Metas da Equipe
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                <Check size={14} />
                Salvar Configurações
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
