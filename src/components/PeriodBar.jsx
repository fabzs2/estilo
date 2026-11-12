import React from 'react';
import { useProduction } from '../context/ProductionContext';
import { Calendar, SlidersHorizontal } from 'lucide-react';

export function PeriodBar() {
  const {
    periodFilter,
    setPeriodFilter,
    customRange,
    setCustomRange,
    metrics,
    workingDaysConfig,
    setIsSectorGoalsModalOpen
  } = useProduction();

  const modeLabel =
    workingDaysConfig?.mode === 'calendar'
      ? workingDaysConfig.includeSaturday
        ? 'Seg–Sáb'
        : 'Seg–Sex'
      : workingDaysConfig?.mode === 'manual'
      ? 'Fixo'
      : 'Dias c/ Lançamento';

  const holidaysDiscountedCount = metrics.discountedHolidaysInPeriod?.length || 0;

  return (
    <div className="period-bar">
      {/* Seletor de Período */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 500 }}>
          <Calendar size={13} color="var(--text-muted)" />
          <span>Período</span>
        </div>

        <div className="period-pills">
          <button
            id="period-today"
            className={`period-pill ${periodFilter === 'today' ? 'active' : ''}`}
            onClick={() => setPeriodFilter('today')}
          >
            Hoje
          </button>
          <button
            id="period-yesterday"
            className={`period-pill ${periodFilter === 'yesterday' ? 'active' : ''}`}
            onClick={() => setPeriodFilter('yesterday')}
          >
            Ontem
          </button>
          <button
            id="period-week"
            className={`period-pill ${periodFilter === 'this_week' ? 'active' : ''}`}
            onClick={() => setPeriodFilter('this_week')}
          >
            7 Dias
          </button>
          <button
            id="period-month"
            className={`period-pill ${periodFilter === 'this_month' ? 'active' : ''}`}
            onClick={() => setPeriodFilter('this_month')}
          >
            Este Mês
          </button>
          <button
            id="period-all"
            className={`period-pill ${periodFilter === 'all' ? 'active' : ''}`}
            onClick={() => setPeriodFilter('all')}
          >
            Histórico
          </button>
          <button
            id="period-custom"
            className={`period-pill ${periodFilter === 'custom' ? 'active' : ''}`}
            onClick={() => setPeriodFilter('custom')}
          >
            Personalizado
          </button>
        </div>

        {/* Inputs de Data Personalizada */}
        {periodFilter === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="date"
              className="form-input mono"
              style={{ padding: '3px 8px', fontSize: '0.73rem', width: 'auto' }}
              value={customRange.start}
              onChange={(e) => setCustomRange((prev) => ({ ...prev, start: e.target.value }))}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.73rem' }}>→</span>
            <input
              type="date"
              className="form-input mono"
              style={{ padding: '3px 8px', fontSize: '0.73rem', width: 'auto' }}
              value={customRange.end}
              onChange={(e) => setCustomRange((prev) => ({ ...prev, end: e.target.value }))}
            />
          </div>
        )}
      </div>

      {/* Telemetria Rápida de Dias Úteis & Configuração */}
      <div className="period-info-tag" style={{ flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Base útil:</span>
          <strong className="mono">
            {periodFilter === 'this_month' && workingDaysConfig?.mode === 'calendar'
              ? `${metrics.workingDaysCount}/${metrics.totalMonthWorkingDays}d`
              : `${metrics.workingDaysCount}d`}
          </strong>
          <span
            className="mono"
            style={{
              fontSize: '0.67rem',
              padding: '1px 6px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)'
            }}
          >
            {modeLabel}
            {holidaysDiscountedCount > 0 ? ` · -${holidaysDiscountedCount} fer` : ''}
          </span>
        </div>

        <span style={{ color: 'var(--border-light)' }}>|</span>

        <span>
          Pedidos: <strong className="mono">{metrics.totalOrders}</strong>
        </span>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ padding: '3px 8px', fontSize: '0.72rem', gap: '5px' }}
          onClick={() => setIsSectorGoalsModalOpen(true)}
          title="Configurar Dias Úteis Reais, Feriados e Metas Mensais"
        >
          <SlidersHorizontal size={12} />
          Configurar Base
        </button>
      </div>
    </div>
  );
}
